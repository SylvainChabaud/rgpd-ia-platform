/**
 * rgpd.pii-scan-logs.test.ts — Test PII log scanner compliance
 *
 * RGPD Compliance:
 * - Art. 32 (Security): Proactive PII leak detection
 * - Art. 33 (Breach Notification): Alert on violations
 * - LOT 8.2: PII Log Scanner
 */

import {
  scanLogLine,
  scanLogLines,
  parseLogFile,
} from "@/infrastructure/pii/scanner";
import type { LogLine } from "@/infrastructure/pii/scanner";

describe("RGPD - PII Log Scanner", () => {
  describe("scanLogLine", () => {
    it("detects PII in log line", () => {
      const logLine: LogLine = {
        content: "User jean@example.com logged in",
        lineNumber: 42,
      };

      const result = scanLogLine(logLine);

      expect(result).toBeDefined();
      expect(result?.piiTypes).toContain("EMAIL");
      expect(result?.piiCount).toBeGreaterThan(0);
      expect(result?.severity).toBeDefined();
    });

    it("returns null when no PII detected", () => {
      const logLine: LogLine = {
        content: "User logged in successfully",
        lineNumber: 42,
      };

      const result = scanLogLine(logLine);

      expect(result).toBeNull();
    });

    it("assigns critical severity to SSN and IBAN", () => {
      const ssnLine: LogLine = {
        content: "SSN: 1 89 05 75 123 456 78",
        lineNumber: 1,
      };

      const ibanLine: LogLine = {
        content: "IBAN: FR76 1234 5678 90AB CDEF 1234 567",
        lineNumber: 2,
      };

      const ssnResult = scanLogLine(ssnLine);
      const ibanResult = scanLogLine(ibanLine);

      expect(ssnResult?.severity).toBe("critical");
      expect(ibanResult?.severity).toBe("critical");
    });

    it("assigns warning severity to EMAIL and PHONE", () => {
      const emailLine: LogLine = {
        content: "Contact: jean@example.com",
        lineNumber: 1,
      };

      const phoneLine: LogLine = {
        content: "Phone: 06 12 34 56 78",
        lineNumber: 2,
      };

      const emailResult = scanLogLine(emailLine);
      const phoneResult = scanLogLine(phoneLine);

      expect(emailResult?.severity).toBe("warning");
      expect(phoneResult?.severity).toBe("warning");
    });
  });

  describe("scanLogLines", () => {
    it("scans multiple log lines and detects all leaks", () => {
      const logLines: LogLine[] = [
        { content: "User logged in", lineNumber: 1 },
        { content: "Email: jean@example.com", lineNumber: 2 },
        { content: "Phone: 06 12 34 56 78", lineNumber: 3 },
        { content: "No PII here", lineNumber: 4 },
      ];

      const result = scanLogLines(logLines);

      expect(result.totalLines).toBe(4);
      expect(result.leakCount).toBe(2);
      expect(result.leaks).toHaveLength(2);
      expect(result.duration_ms).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("returns empty leaks for clean logs", () => {
      const logLines: LogLine[] = [
        { content: "User logged in", lineNumber: 1 },
        { content: "Request completed", lineNumber: 2 },
        { content: "Cache hit", lineNumber: 3 },
      ];

      const result = scanLogLines(logLines);

      expect(result.totalLines).toBe(3);
      expect(result.leakCount).toBe(0);
      expect(result.leaks).toHaveLength(0);
    });

    it("completes scan in reasonable time (<100ms for 1000 lines)", () => {
      const logLines: LogLine[] = Array.from({ length: 1000 }, (_, i) => ({
        content: `Log line ${i} - no PII`,
        lineNumber: i + 1,
      }));

      const result = scanLogLines(logLines);

      expect(result.duration_ms).toBeLessThan(100);
    });
  });

  describe("parseLogFile", () => {
    it("parses log file into log lines", () => {
      const logContent = "Line 1\nLine 2\nLine 3";
      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(3);
      expect(logLines[0]).toEqual({ content: "Line 1", lineNumber: 1 });
      expect(logLines[1]).toEqual({ content: "Line 2", lineNumber: 2 });
      expect(logLines[2]).toEqual({ content: "Line 3", lineNumber: 3 });
    });

    it("handles empty log file", () => {
      const logContent = "";
      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(1);
      expect(logLines[0].content).toBe("");
    });

    it("handles single line", () => {
      const logContent = "Single line";
      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(1);
      expect(logLines[0].content).toBe("Single line");
    });
  });
});
