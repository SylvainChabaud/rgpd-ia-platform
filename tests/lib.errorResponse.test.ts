/**
 * Tests for error response helpers
 * LOT 5.3 - API Layer
 *
 * These tests cover all error response helper functions
 * to improve branch coverage.
 */

import {
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  rateLimitError,
  internalError,
  conflictError,
} from "@/lib/errorResponse";

describe("errorResponse helpers", () => {
  describe("errorResponse", () => {
    it("should return error response without details", () => {
      const result = errorResponse("TestError", "Test message");
      expect(result).toEqual({
        error: "TestError",
        message: "Test message",
      });
      expect(result.details).toBeUndefined();
    });

    it("should return error response with details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const result = errorResponse("ValidationError", "Invalid data", details);
      expect(result).toEqual({
        error: "ValidationError",
        message: "Invalid data",
        details: { field: "email", reason: "invalid format" },
      });
    });

    it("should include details when explicitly undefined is not passed", () => {
      const result = errorResponse("Error", "msg", null);
      expect(result.details).toBeNull();
    });
  });

  describe("validationError", () => {
    it("should return validation error with details", () => {
      const details = [{ path: ["email"], message: "Invalid email" }];
      const result = validationError(details);
      expect(result.error).toBe("Validation error");
      expect(result.message).toBe("Invalid request data");
      expect(result.details).toEqual(details);
    });
  });

  describe("unauthorizedError", () => {
    it("should return unauthorized error with default message", () => {
      const result = unauthorizedError();
      expect(result.error).toBe("Unauthorized");
      expect(result.message).toBe("Authentication required");
    });

    it("should return unauthorized error with custom message", () => {
      const result = unauthorizedError("Token expired");
      expect(result.error).toBe("Unauthorized");
      expect(result.message).toBe("Token expired");
    });
  });

  describe("forbiddenError", () => {
    it("should return forbidden error with default message", () => {
      const result = forbiddenError();
      expect(result.error).toBe("Forbidden");
      expect(result.message).toBe("Insufficient permissions");
    });

    it("should return forbidden error with custom message", () => {
      const result = forbiddenError("Admin access required");
      expect(result.error).toBe("Forbidden");
      expect(result.message).toBe("Admin access required");
    });
  });

  describe("notFoundError", () => {
    it("should return not found error with default message", () => {
      const result = notFoundError();
      expect(result.error).toBe("Not found");
      expect(result.message).toBe("Resource not found");
    });

    it("should return not found error with resource name", () => {
      const result = notFoundError("User");
      expect(result.error).toBe("Not found");
      expect(result.message).toBe("User not found");
    });
  });

  describe("rateLimitError", () => {
    it("should return rate limit error", () => {
      const result = rateLimitError();
      expect(result.error).toBe("Rate limit exceeded");
      expect(result.message).toBe("Too many requests, please try again later");
    });
  });

  describe("internalError", () => {
    it("should return internal error with default message", () => {
      const result = internalError();
      expect(result.error).toBe("Internal error");
      expect(result.message).toBe("Internal server error");
    });

    it("should return internal error with custom message", () => {
      const result = internalError("Database connection failed");
      expect(result.error).toBe("Internal error");
      expect(result.message).toBe("Database connection failed");
    });
  });

  describe("conflictError", () => {
    it("should return conflict error with default message", () => {
      const result = conflictError();
      expect(result.error).toBe("Conflict");
      expect(result.message).toBe("Resource already exists");
    });

    it("should return conflict error with custom message", () => {
      const result = conflictError("Email already registered");
      expect(result.error).toBe("Conflict");
      expect(result.message).toBe("Email already registered");
    });
  });
});
