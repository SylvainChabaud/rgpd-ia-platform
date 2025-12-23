export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class InvalidTenantError extends AppError {
  constructor(message = "Invalid tenant") {
    super(message, "INVALID_TENANT", 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, "CONFLICT", 409);
  }
}

export class BootstrapAlreadyCompletedError extends AppError {
  constructor(message = "Bootstrap already completed") {
    super(message, "BOOTSTRAP_ALREADY_COMPLETED", 409);
    this.name = "BootstrapAlreadyCompletedError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation error") {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
