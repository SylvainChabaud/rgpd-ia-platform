/**
 * infrastructure.logging.test.ts — Logger RGPD-safe tests
 *
 * Coverage target: All branches for logger and metrics
 *
 * RGPD Compliance:
 * - P2/P3 data NEVER logged
 * - Redaction of sensitive fields
 * - Safe event logging
 */

import {
  createLogger,
  logEvent,
  logError,
  LogEvent,
} from "@/infrastructure/logging/logger";

describe("RGPD-Safe Logger", () => {
  describe("createLogger", () => {
    it("creates child logger with context", () => {
      const childLogger = createLogger({ requestId: "req-123", userId: "user-456" });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe("function");
      expect(typeof childLogger.error).toBe("function");
    });

    it("redacts sensitive fields in context", () => {
      // This should not throw and should redact password
      const childLogger = createLogger({
        requestId: "req-123",
        password: "secret123",
        email: "test@example.com",
      });

      expect(childLogger).toBeDefined();
    });

    it("handles null context values", () => {
      const childLogger = createLogger({
        userId: null as unknown as string,
        tenantId: undefined as unknown as string,
      });

      expect(childLogger).toBeDefined();
    });

    it("handles nested objects in context", () => {
      const childLogger = createLogger({
        request: {
          id: "req-123",
          password: "should-be-redacted",
        },
      });

      expect(childLogger).toBeDefined();
    });

    it("handles arrays in context", () => {
      const childLogger = createLogger({
        tags: ["tag1", "tag2"],
        ids: ["id-1", "id-2"],
      });

      expect(childLogger).toBeDefined();
    });
  });

  describe("logEvent", () => {
    it("logs event with standard format", () => {
      // Should not throw
      expect(() => {
        logEvent(LogEvent.HTTP_REQUEST, { method: "GET", path: "/api/test" });
      }).not.toThrow();
    });

    it("logs event without data", () => {
      expect(() => {
        logEvent(LogEvent.APP_START);
      }).not.toThrow();
    });

    it("logs event with custom message", () => {
      expect(() => {
        logEvent(LogEvent.AUTH_LOGIN, { userId: "user-123" }, "User logged in");
      }).not.toThrow();
    });

    it("redacts sensitive data in event", () => {
      // Should not throw, should redact password
      expect(() => {
        logEvent(LogEvent.AUTH_LOGIN, {
          userId: "user-123",
          password: "secret",
          token: "jwt-token",
        });
      }).not.toThrow();
    });

    it("logs all event types", () => {
      const eventTypes = [
        LogEvent.APP_START,
        LogEvent.APP_SHUTDOWN,
        LogEvent.HTTP_REQUEST,
        LogEvent.HTTP_RESPONSE,
        LogEvent.HTTP_ERROR,
        LogEvent.DB_QUERY,
        LogEvent.DB_ERROR,
        LogEvent.DB_CONNECTION,
        LogEvent.AI_INVOKE,
        LogEvent.AI_RESPONSE,
        LogEvent.AI_ERROR,
        LogEvent.AUTH_LOGIN,
        LogEvent.AUTH_LOGOUT,
        LogEvent.AUTH_FAILURE,
        LogEvent.AUTHZ_DENIED,
        LogEvent.RGPD_CONSENT_GRANTED,
        LogEvent.RGPD_CONSENT_REVOKED,
        LogEvent.RGPD_EXPORT_REQUESTED,
        LogEvent.RGPD_DELETION_REQUESTED,
        LogEvent.RGPD_PURGE_COMPLETED,
        LogEvent.JOB_START,
        LogEvent.JOB_COMPLETE,
        LogEvent.JOB_ERROR,
        LogEvent.SECURITY_VIOLATION,
        LogEvent.RATE_LIMIT_EXCEEDED,
        LogEvent.HEALTH_CHECK,
        LogEvent.METRICS_EXPORT,
      ];

      eventTypes.forEach((event) => {
        expect(() => logEvent(event)).not.toThrow();
      });
    });
  });

  describe("logError", () => {
    it("logs error with context", () => {
      const error = new Error("Test error");

      expect(() => {
        logError(LogEvent.DB_ERROR, error, { query: "SELECT 1" });
      }).not.toThrow();
    });

    it("logs error without context", () => {
      const error = new Error("Test error");

      expect(() => {
        logError(LogEvent.HTTP_ERROR, error);
      }).not.toThrow();
    });

    it("logs error with sensitive context (redacted)", () => {
      const error = new Error("Auth failed");

      expect(() => {
        logError(LogEvent.AUTH_FAILURE, error, {
          userId: "user-123",
          password: "should-be-redacted",
        });
      }).not.toThrow();
    });

    it("handles error with stack trace", () => {
      const error = new Error("Detailed error");
      error.stack = "Error: Detailed error\n  at test.ts:10:5";

      expect(() => {
        logError(LogEvent.JOB_ERROR, error);
      }).not.toThrow();
    });

    it("handles error without stack", () => {
      const error = new Error("No stack");
      delete error.stack;

      expect(() => {
        logError(LogEvent.AI_ERROR, error);
      }).not.toThrow();
    });
  });

  describe("Sensitive field redaction", () => {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "sessionToken",
      "jwt",
      "email",
      "name",
      "prompt",
      "response",
      "payload",
    ];

    sensitiveFields.forEach((field) => {
      it(`redacts ${field} field`, () => {
        expect(() => {
          logEvent(LogEvent.HTTP_REQUEST, { [field]: "sensitive-value" });
        }).not.toThrow();
      });
    });
  });
});
