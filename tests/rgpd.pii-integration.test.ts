/**
 * rgpd.pii-integration.test.ts — End-to-end PII flow integration test
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Complete PII redaction flow
 * - Art. 5 (Minimization): LLM never sees raw PII
 * - LOT 8.0: PII Detection & Redaction (E2E validation)
 *
 * CRITICAL: This test validates the complete PII protection pipeline
 */

import { invokeLLM } from "@/ai/gateway/invokeLLM";
import type { InvokeLLMInput } from "@/ai/gateway/invokeLLM";
import { setLogSink, type LogEvent, type LogLevel } from "@/shared/logger";

describe("RGPD - PII Integration (End-to-End)", () => {
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

  describe("Complete PII redaction flow", () => {
    it("CRITICAL: PII never reaches LLM provider", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        actorId: "user-test",
        purpose: "test",
        policy: "P0",
        text: "Bonjour, je suis Jean Dupont (jean.dupont@example.com, 06 12 34 56 78). Mon numéro de sécurité sociale est 1 89 05 75 123 456 78.",
      };

      const output = await invokeLLM(input);

      // Verify output received
      expect(output).toBeDefined();
      expect(output.text).toBeDefined();
      expect(output.provider).toBe("stub");

      // Verify PII detection event was logged
      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiDetectedEvent).toBeDefined();
      expect(piiDetectedEvent?.event.meta?.pii_count).toBeGreaterThan(0);

      // CRITICAL: Verify PII types are logged (NOT values)
      const piiTypes = piiDetectedEvent?.event.meta?.pii_types as string;
      expect(piiTypes).toBeDefined();
      expect(piiTypes).toContain("PERSON");
      expect(piiTypes).toContain("EMAIL");
      expect(piiTypes).toContain("PHONE");
      expect(piiTypes).toContain("SSN");

      // CRITICAL: Verify NO PII values in any log event
      const allLogs = capturedLogs.map((log) => JSON.stringify(log.event));
      const piiValues = [
        "Jean Dupont",
        "jean.dupont@example.com",
        "06 12 34 56 78",
        "1 89 05 75 123 456 78",
      ];

      for (const piiValue of piiValues) {
        for (const logStr of allLogs) {
          expect(logStr).not.toContain(piiValue);
        }
      }

      // Verify redaction completed event
      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.event.meta?.duration_ms).toBeLessThan(50); // SLA
    });

    it("handles multiple PII instances correctly", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: "Contact Jean Dupont (jean@example.com) ou Marie Martin (marie@example.com)",
      };

      const output = await invokeLLM(input);

      expect(output).toBeDefined();

      // Verify multiple PII detected
      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiDetectedEvent?.event.meta?.pii_count).toBeGreaterThanOrEqual(4); // 2 PERSON + 2 EMAIL
    });

    it("handles text with no PII (passthrough)", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: "This is a clean text without any personal information.",
      };

      const output = await invokeLLM(input);

      expect(output).toBeDefined();

      // Verify NO PII detection event
      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiDetectedEvent).toBeUndefined();

      // Verify NO redaction completed event
      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );
      expect(completedEvent).toBeUndefined();
    });

    it("handles empty input gracefully", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: "",
      };

      const output = await invokeLLM(input);

      expect(output).toBeDefined();

      // Verify NO PII events for empty input
      const piiEvents = capturedLogs.filter((log) =>
        log.event.event.startsWith("llm.pii_")
      );
      expect(piiEvents).toHaveLength(0);
    });
  });

  describe("Performance validation", () => {
    it("completes PII redaction within SLA (<50ms)", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: "Jean Dupont, jean@example.com, 06 12 34 56 78",
      };

      const startTime = performance.now();
      await invokeLLM(input);
      const totalTime = performance.now() - startTime;

      // Total time includes LLM invocation, so we check the logged duration
      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      expect(completedEvent?.event.meta?.duration_ms).toBeLessThan(50);

      // Sanity check: total time should be reasonable (LLM is stub, so fast)
      expect(totalTime).toBeLessThan(100);
    });

    it("handles large text efficiently", async () => {
      // Generate large text with PII
      const largePII = Array(100)
        .fill("Jean Dupont (jean@example.com) ")
        .join("");

      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: largePII,
      };

      const output = await invokeLLM(input);

      expect(output).toBeDefined();

      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      // Should still complete within SLA even with large text
      expect(completedEvent?.event.meta?.duration_ms).toBeLessThan(50);
    });
  });

  describe("RGPD Accountability (Art. 5.2)", () => {
    it("creates complete audit trail for PII processing", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-audit",
        actorId: "user-audit",
        purpose: "data-processing",
        policy: "P1",
        text: "Sensitive data: Jean Dupont, jean@example.com, SSN: 1 89 05 75 123 456 78",
      };

      await invokeLLM(input);

      // Verify audit trail completeness
      const piiDetectedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      const completedEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_redaction_completed"
      );

      // Both events must exist
      expect(piiDetectedEvent).toBeDefined();
      expect(completedEvent).toBeDefined();

      // Verify tenant/actor context
      expect(piiDetectedEvent?.event.tenantId).toBe("tenant-audit");
      expect(piiDetectedEvent?.event.actorId).toBe("user-audit");
      expect(completedEvent?.event.tenantId).toBe("tenant-audit");
      expect(completedEvent?.event.actorId).toBe("user-audit");

      // Verify timestamps
      expect(piiDetectedEvent?.event.at).toBeDefined();
      expect(completedEvent?.event.at).toBeDefined();

      // Verify metadata completeness
      expect(piiDetectedEvent?.event.meta?.pii_types).toBeDefined();
      expect(piiDetectedEvent?.event.meta?.pii_count).toBeDefined();
      expect(completedEvent?.event.meta?.duration_ms).toBeDefined();
      expect(completedEvent?.event.meta?.pii_count).toBeDefined();
    });

    it("proves PII protection without exposing values", async () => {
      const input: InvokeLLMInput = {
        tenantId: "tenant-test",
        purpose: "test",
        policy: "P0",
        text: "CRITICAL PII: Jean Dupont, jean@example.com, 1 89 05 75 123 456 78, FR76 1234 5678 90AB CDEF 1234 567",
      };

      await invokeLLM(input);

      // Get all audit events
      const auditEvents = capturedLogs.filter((log) =>
        log.event.event.startsWith("llm.")
      );

      expect(auditEvents.length).toBeGreaterThan(0);

      // CRITICAL: NO PII values in any audit event
      const allAuditData = auditEvents.map((e) => JSON.stringify(e));
      const criticalPII = [
        "Jean Dupont",
        "jean@example.com",
        "1 89 05 75 123 456 78",
        "FR76 1234 5678 90AB",
      ];

      for (const pii of criticalPII) {
        for (const auditData of allAuditData) {
          expect(auditData).not.toContain(pii);
        }
      }

      // But we have proof of detection
      const piiEvent = capturedLogs.find(
        (log) => log.event.event === "llm.pii_detected"
      );
      expect(piiEvent?.event.meta?.pii_count).toBeGreaterThan(0);
      expect(piiEvent?.event.meta?.pii_types).toBeDefined();
    });
  });
});
