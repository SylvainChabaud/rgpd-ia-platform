/**
 * rgpd.pii-audit.test.ts — Test PII audit event compliance
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Validate audit trail
 * - Art. 5 (Accountability): Prove PII redaction without storing values
 * - LOT 8.0: PII Audit Events
 *
 * CRITICAL: Audit events must NEVER contain PII values
 */

import { detectPII } from "@/infrastructure/pii/detector";
import { maskPII, getPIISummary } from "@/infrastructure/pii/masker";
import { redactInput, restoreOutput } from "@/ai/gateway/pii-middleware";
import type { InvokeLLMInput } from "@/ai/gateway/invokeLLM";
import { setLogSink, type LogEvent, type LogLevel } from "@/shared/logger";

describe("RGPD - PII Audit Events", () => {
  const capturedLogs: Array<{ level: LogLevel; event: LogEvent }> = [];

  beforeEach(() => {
    capturedLogs.length = 0;
    setLogSink((level, event) => {
      capturedLogs.push({ level, event });
    });
  });

  afterEach(() => {
    setLogSink(); // Restore default sink
  });

  describe("Audit event creation", () => {
    it("emits llm.pii_detected event when PII found", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        actorId: "user-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont email is jean@example.com",
      };

      await redactInput(input);

      // Debug: log what was captured
      if (capturedLogs.length === 0) {
        console.log("WARNING: No logs captured");
      } else {
        console.log("Captured logs:", capturedLogs.map(l => l.event.event));
      }

      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      expect(piiDetectedEvent).toBeDefined();
      expect(piiDetectedEvent?.level).toBe("info");
    });

    it("does not emit llm.pii_detected when no PII found", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        actorId: "user-1",
        purpose: "test",
        policy: "P0",
        text: "Clean text without any personal information",
      };

      await redactInput(input);

      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      expect(piiDetectedEvent).toBeUndefined();
    });
  });

  describe("Audit event metadata (CRITICAL: NO PII VALUES)", () => {
    it("includes PII types in metadata, NOT values", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        actorId: "user-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont, jean@example.com, 06 12 34 56 78",
      };

      await redactInput(input);

      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      expect(piiEvent?.event.meta).toBeDefined();
      expect(piiEvent?.event.meta?.pii_types).toBeDefined();
      expect(typeof piiEvent?.event.meta?.pii_types).toBe("string"); // Should be comma-separated string

      // CRITICAL: Metadata must NOT contain actual PII values
      const metaStr = JSON.stringify(piiEvent?.event.meta);
      expect(metaStr).not.toContain("Jean Dupont");
      expect(metaStr).not.toContain("jean@example.com");
      expect(metaStr).not.toContain("06 12 34 56 78");
    });

    it("includes PII count in metadata", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        actorId: "user-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont et Marie Martin",
      };

      await redactInput(input);

      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      expect(piiEvent?.event.meta?.pii_count).toBeGreaterThanOrEqual(2);
    });

    it("includes tenant and actor context", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-123",
        actorId: "user-456",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont",
      };

      await redactInput(input);

      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      expect(piiEvent?.event.tenantId).toBe("tenant-123");
      expect(piiEvent?.event.actorId).toBe("user-456");
    });
  });

  describe("Performance tracking", () => {
    it("emits llm.pii_redaction_completed event", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont",
      };

      await redactInput(input);

      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      expect(completedEvent).toBeDefined();
    });

    it("includes duration in completion event", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont, jean@example.com",
      };

      await redactInput(input);

      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      expect(completedEvent?.event.meta?.duration_ms).toBeDefined();
      expect(typeof completedEvent?.event.meta?.duration_ms).toBe("number");

      // Should complete in reasonable time (<50ms SLA)
      expect(completedEvent?.event.meta?.duration_ms as number).toBeLessThan(50);
    });

    it("includes PII count in completion event", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont et Marie Martin",
      };

      await redactInput(input);

      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      expect(completedEvent?.event.meta?.pii_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Error handling audit", () => {
    it("emits warning on redaction timeout", async () => {
      // Mock performance.now to simulate timeout
      const originalNow = performance.now;
      let callCount = 0;
      jest.spyOn(performance, "now").mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 100; // Simulate 100ms elapsed
      });

      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont",
      };

      await redactInput(input);

      const timeoutEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_timeout"
      );

      // Restore original
      performance.now = originalNow;

      expect(timeoutEvent).toBeDefined();
      expect(timeoutEvent?.level).toBe("warn");
    });
  });

  describe("getPIISummary compliance", () => {
    it("summary contains only safe metadata", () => {
      const text = "Jean Dupont, jean@example.com, 06 12 34 56 78";
      const entities = detectPII(text).entities;
      const masked = maskPII(text, entities);

      const summary = getPIISummary(masked.mappings);

      // CRITICAL: Summary must NOT contain PII values
      expect(summary).toHaveProperty("pii_types");
      expect(summary).toHaveProperty("pii_count");
      expect(summary).not.toHaveProperty("pii_values");
      expect(summary).not.toHaveProperty("mappings");

      const summaryJson = JSON.stringify(summary);
      expect(summaryJson).not.toContain("Jean Dupont");
      expect(summaryJson).not.toContain("jean@example.com");
      expect(summaryJson).not.toContain("06 12 34 56 78");
    });

    it("summary includes all detected PII types", () => {
      const text = "Jean Dupont, jean@example.com, 06 12 34 56 78";
      const entities = detectPII(text).entities;
      const masked = maskPII(text, entities);

      const summary = getPIISummary(masked.mappings);

      // pii_types is an array
      expect(Array.isArray(summary.pii_types)).toBe(true);
      expect(summary.pii_types).toContain("PERSON");
      expect(summary.pii_types).toContain("EMAIL");
      expect(summary.pii_types).toContain("PHONE");
    });
  });

  describe("RGPD Accountability (Art. 5.2)", () => {
    it("CRITICAL: Audit trail proves PII detection without storing values", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        actorId: "user-1",
        purpose: "test",
        policy: "P0",
        text: "Sensitive: Jean Dupont, jean@example.com, 06 12 34 56 78, 1 89 05 75 123 456 78, FR76 1234 5678 90AB",
      };

      await redactInput(input);

      // Capture all log events
      const allLogs = capturedLogs.map((log) => JSON.stringify(log.event));

      // CRITICAL: No PII values in ANY log event
      const piiValues = [
        "Jean Dupont",
        "jean@example.com",
        "06 12 34 56 78",
        "1 89 05 75 123 456 78",
        "FR76 1234 5678 90AB",
      ];

      for (const piiValue of piiValues) {
        for (const logStr of allLogs) {
          expect(logStr).not.toContain(piiValue);
        }
      }

      // But we should have proof of detection
      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiDetectedEvent).toBeDefined();
      expect(piiDetectedEvent?.event.meta?.pii_count).toBeGreaterThan(0);
    });

    it("Audit trail includes all required context for compliance", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-123",
        actorId: "user-456",
        purpose: "data-processing",
        policy: "P1",
        text: "Jean Dupont",
      };

      await redactInput(input);

      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );

      // Required context for CNIL audit
      expect(piiEvent?.event.tenantId).toBe("tenant-123");
      expect(piiEvent?.event.actorId).toBe("user-456");
      expect(piiEvent?.event.at).toBeDefined(); // Timestamp
      expect(piiEvent?.event.meta?.pii_types).toBeDefined();
      expect(piiEvent?.event.meta?.pii_count).toBeDefined();
    });
  });

  describe("Integration with Gateway LLM", () => {
    it("redactInput creates audit trail automatically", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-1",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont",
      };

      const { redactedInput, context } = await redactInput(input);

      // Audit event should be created
      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiEvent).toBeDefined();

      // Context should contain mappings
      expect(context.piiDetected).toBe(true);
      expect(context.mappings.length).toBeGreaterThan(0);

      // Redacted input should not contain PII
      expect(redactedInput.text).not.toContain("Jean Dupont");
    });

    it("restoreOutput does not create audit events", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      capturedLogs.length = 0; // Clear logs

      const context = {
        tenantId: "tenant-1",
        mappings: Array.from(masked.mappings),
        piiDetected: true,
        redactedAt: new Date(),
      };

      const llmOutput = "[PERSON_1] will respond";
      restoreOutput(llmOutput, context);

      // No audit events should be created during restoration
      expect(capturedLogs).toHaveLength(0);
    });
  });
});
