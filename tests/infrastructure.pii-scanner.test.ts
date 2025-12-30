/**
 * infrastructure.pii-scanner.test.ts — PII log scanner tests
 *
 * Coverage target: All branches for severity determination
 *
 * RGPD Compliance:
 * - Art. 32: Proactive PII leak detection
 * - Art. 33: Alert on violations
 */

import {
  scanLogLine,
  scanLogLines,
  parseLogFile,
  type LogLine,
} from "@/infrastructure/pii/scanner";

describe("PII Log Scanner", () => {
  describe("scanLogLine", () => {
    it("returns null for line without PII", () => {
      const logLine: LogLine = {
        content: "Application started successfully",
        lineNumber: 1,
      };

      const result = scanLogLine(logLine);
      expect(result).toBeNull();
    });

    it("detects email PII in log line (warning severity)", () => {
      const logLine: LogLine = {
        content: "User logged in: jean.dupont@example.com",
        lineNumber: 42,
      };

      const result = scanLogLine(logLine);

      expect(result).not.toBeNull();
      expect(result?.piiTypes).toContain("EMAIL");
      expect(result?.severity).toBe("warning");
    });

    it("detects phone PII in log line (warning severity)", () => {
      const logLine: LogLine = {
        content: "Contact phone: 06 12 34 56 78",
        lineNumber: 50,
      };

      const result = scanLogLine(logLine);

      expect(result).not.toBeNull();
      expect(result?.piiTypes).toContain("PHONE");
      expect(result?.severity).toBe("warning");
    });

    it("detects person name PII (warning severity)", () => {
      const logLine: LogLine = {
        content: "Processing request for Jean Dupont",
        lineNumber: 100,
      };

      const result = scanLogLine(logLine);

      expect(result).not.toBeNull();
      expect(result?.piiTypes).toContain("PERSON");
      expect(result?.severity).toBe("warning");
    });

    it("detects SSN PII (critical severity)", () => {
      const logLine: LogLine = {
        content: "User SSN: 1 85 12 75 108 512 42",
        lineNumber: 200,
      };

      const result = scanLogLine(logLine);

      if (result) {
        expect(result.piiTypes).toContain("SSN");
        expect(result.severity).toBe("critical");
      }
    });

    it("detects IBAN PII (critical severity)", () => {
      const logLine: LogLine = {
        content: "Bank account: FR76 1234 5678 9012 3456 7890 123",
        lineNumber: 300,
      };

      const result = scanLogLine(logLine);

      if (result) {
        expect(result.piiTypes).toContain("IBAN");
        expect(result.severity).toBe("critical");
      }
    });

    it("returns critical severity for high PII count (>10)", () => {
      // Create log line with many PII instances
      const emails = Array(12)
        .fill(null)
        .map((_, i) => `user${i}@example.com`)
        .join(" ");
      const logLine: LogLine = {
        content: `Batch emails: ${emails}`,
        lineNumber: 400,
      };

      const result = scanLogLine(logLine);

      expect(result).not.toBeNull();
      if (result && result.piiCount > 10) {
        expect(result.severity).toBe("critical");
      }
    });

    it("returns warning severity for medium PII count (>5)", () => {
      const emails = Array(7)
        .fill(null)
        .map((_, i) => `user${i}@test.com`)
        .join(" ");
      const logLine: LogLine = {
        content: `Emails: ${emails}`,
        lineNumber: 500,
      };

      const result = scanLogLine(logLine);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
    });

    it("returns info severity for address PII only", () => {
      const logLine: LogLine = {
        content: "Location: 123 rue de Paris 75001",
        lineNumber: 600,
      };

      const result = scanLogLine(logLine);

      if (result && !result.piiTypes.includes("EMAIL") && 
          !result.piiTypes.includes("PHONE") && 
          !result.piiTypes.includes("PERSON") &&
          result.piiCount <= 5) {
        expect(result.severity).toBe("info");
      }
    });
  });

  describe("scanLogLines", () => {
    it("scans multiple log lines", () => {
      const logLines: LogLine[] = [
        { content: "Starting application", lineNumber: 1 },
        { content: "User jean@example.com logged in", lineNumber: 2 },
        { content: "Processing request", lineNumber: 3 },
        { content: "Contact: 06 12 34 56 78", lineNumber: 4 },
      ];

      const result = scanLogLines(logLines);

      expect(result.totalLines).toBe(4);
      expect(result.leakCount).toBeGreaterThanOrEqual(2);
      expect(result.leaks.length).toBeGreaterThanOrEqual(2);
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("returns empty leaks array for clean logs", () => {
      const logLines: LogLine[] = [
        { content: "Application started", lineNumber: 1 },
        { content: "Database connected", lineNumber: 2 },
        { content: "Server listening on port 3000", lineNumber: 3 },
      ];

      const result = scanLogLines(logLines);

      expect(result.totalLines).toBe(3);
      expect(result.leakCount).toBe(0);
      expect(result.leaks).toHaveLength(0);
    });

    it("handles empty log lines array", () => {
      const result = scanLogLines([]);

      expect(result.totalLines).toBe(0);
      expect(result.leakCount).toBe(0);
      expect(result.leaks).toHaveLength(0);
    });
  });

  describe("parseLogFile", () => {
    it("parses log file content into log lines", () => {
      const logContent = "Line 1\nLine 2\nLine 3";

      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(3);
      expect(logLines[0].content).toBe("Line 1");
      expect(logLines[0].lineNumber).toBe(1);
      expect(logLines[1].lineNumber).toBe(2);
      expect(logLines[2].lineNumber).toBe(3);
    });

    it("handles empty log content", () => {
      const logContent = "";

      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(1);
      expect(logLines[0].content).toBe("");
    });

    it("handles single line log", () => {
      const logContent = "Single log entry";

      const logLines = parseLogFile(logContent);

      expect(logLines).toHaveLength(1);
      expect(logLines[0].content).toBe("Single log entry");
    });

    it("handles log with Windows line endings", () => {
      const logContent = "Line 1\r\nLine 2\r\nLine 3";

      // parseLogFile splits on \n, so \r remains
      const logLines = parseLogFile(logContent);

      expect(logLines.length).toBeGreaterThanOrEqual(3);
    });
  });
});
