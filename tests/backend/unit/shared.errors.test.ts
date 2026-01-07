/**
 * shared.errors.test.ts — Error classes tests
 *
 * Coverage target: All error class branches
 *
 * RGPD Compliance:
 * - Error messages don't leak sensitive data
 */

import {
  AppError,
  BootstrapAlreadyCompletedError,
  ConflictError,
  ForbiddenError,
  InvalidTenantError,
  UnauthorizedError,
  ValidationError,
  isAppError,
} from "@/shared/errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("creates error with all properties", () => {
      const error = new AppError("Test message", "TEST_CODE", 422);

      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.status).toBe(422);
      expect(error.name).toBe("AppError");
    });

    it("uses default status 400", () => {
      const error = new AppError("Test", "TEST");

      expect(error.status).toBe(400);
    });
  });

  describe("BootstrapAlreadyCompletedError", () => {
    it("creates error with default message", () => {
      const error = new BootstrapAlreadyCompletedError();

      expect(error.message).toBe("Bootstrap already completed");
      expect(error.name).toBe("BootstrapAlreadyCompletedError");
      expect(error instanceof Error).toBe(true);
    });

    it("creates error with custom message", () => {
      const error = new BootstrapAlreadyCompletedError("Custom bootstrap error");

      expect(error.message).toBe("Custom bootstrap error");
    });
  });

  describe("ConflictError", () => {
    it("creates error with message", () => {
      const error = new ConflictError("Resource already exists");

      expect(error.message).toBe("Resource already exists");
      expect(error.code).toBe("CONFLICT");
      expect(error.status).toBe(409);
    });

    it("creates error with default message", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Conflict");
    });
  });

  describe("ForbiddenError", () => {
    it("creates error with message", () => {
      const error = new ForbiddenError("Access denied");

      expect(error.message).toBe("Access denied");
      expect(error.code).toBe("FORBIDDEN");
    });

    it("creates error with default message", () => {
      const error = new ForbiddenError();

      expect(error.message).toBe("Forbidden");
      expect(error.status).toBe(403);
    });
  });

  describe("InvalidTenantError", () => {
    it("creates error with message", () => {
      const error = new InvalidTenantError("Tenant not found");

      expect(error.message).toBe("Tenant not found");
      expect(error.code).toBe("INVALID_TENANT");
    });

    it("creates error with default message", () => {
      const error = new InvalidTenantError();

      expect(error.message).toBe("Invalid tenant");
      expect(error.status).toBe(400);
    });
  });

  describe("UnauthorizedError", () => {
    it("creates error with message", () => {
      const error = new UnauthorizedError("Authentication required");

      expect(error.message).toBe("Authentication required");
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("creates error with default message", () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe("Unauthorized");
      expect(error.status).toBe(401);
    });
  });

  describe("ValidationError", () => {
    it("creates error with message", () => {
      const error = new ValidationError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("creates error with default message", () => {
      const error = new ValidationError();

      expect(error.message).toBe("Validation error");
      expect(error.status).toBe(400);
    });
  });

  describe("Error inheritance", () => {
    it("all errors extend AppError", () => {
      expect(new BootstrapAlreadyCompletedError() instanceof AppError).toBe(true);
      expect(new ConflictError() instanceof AppError).toBe(true);
      expect(new ForbiddenError() instanceof AppError).toBe(true);
      expect(new InvalidTenantError() instanceof AppError).toBe(true);
      expect(new UnauthorizedError() instanceof AppError).toBe(true);
      expect(new ValidationError() instanceof AppError).toBe(true);
    });

    it("all errors extend Error", () => {
      expect(new BootstrapAlreadyCompletedError() instanceof Error).toBe(true);
      expect(new ConflictError() instanceof Error).toBe(true);
      expect(new ForbiddenError() instanceof Error).toBe(true);
      expect(new InvalidTenantError() instanceof Error).toBe(true);
      expect(new UnauthorizedError() instanceof Error).toBe(true);
      expect(new ValidationError() instanceof Error).toBe(true);
    });

    it("errors have stack trace", () => {
      const error = new ForbiddenError("Test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("Test");
    });
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError("test", "TEST"))).toBe(true);
    expect(isAppError(new ForbiddenError())).toBe(true);
    expect(isAppError(new UnauthorizedError())).toBe(true);
    expect(isAppError(new InvalidTenantError())).toBe(true);
    expect(isAppError(new ConflictError())).toBe(true);
    expect(isAppError(new ValidationError())).toBe(true);
    expect(isAppError(new BootstrapAlreadyCompletedError())).toBe(true);
  });

  it("returns false for non-AppError", () => {
    expect(isAppError(new Error("test"))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError("error")).toBe(false);
    expect(isAppError({ message: "error" })).toBe(false);
  });
});
