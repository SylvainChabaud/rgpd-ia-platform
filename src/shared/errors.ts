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

// =========================
// RGPD Error Messages
// =========================

/**
 * Standardized RGPD violation error messages
 * Used in repositories and services for consistent error handling
 */
export const RGPD_ERROR_MESSAGES = {
  TENANT_ID_REQUIRED: 'RGPD VIOLATION: tenantId required',
  TENANT_ID_REQUIRED_QUERY: 'RGPD VIOLATION: tenantId required for purpose queries',
  TENANT_ID_REQUIRED_CREATE: 'RGPD VIOLATION: tenantId required for purpose creation',
  TENANT_ID_REQUIRED_UPDATE: 'RGPD VIOLATION: tenantId required for purpose update',
  TENANT_ID_REQUIRED_DELETE: 'RGPD VIOLATION: tenantId required for purpose deletion',
  CROSS_TENANT_ACCESS: 'RGPD VIOLATION: cross-tenant access denied',
} as const;

/**
 * Purpose-specific error messages
 */
export const PURPOSE_ERROR_MESSAGES = {
  CANNOT_DELETE_SYSTEM: 'Cannot delete system purpose. Deactivate it instead.',
  TEMPLATE_NOT_FOUND: 'Template not found or inactive',
  TEMPLATE_ALREADY_ADOPTED: 'Template already adopted by this tenant',
  LABEL_ALREADY_EXISTS: 'A purpose with this label already exists',
} as const;
