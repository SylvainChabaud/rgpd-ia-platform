/**
 * Error Response Helpers
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Error messages are generic (no P2/P3 data leakage)
 * - Details field is optional (use only for validation errors)
 *
 * USAGE:
 *   return NextResponse.json(unauthorizedError(), { status: 401 });
 */

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Generic error response
 */
export function errorResponse(
  error: string,
  message: string,
  details?: any
): ErrorResponse {
  const response: ErrorResponse = { error, message };
  if (details !== undefined) {
    response.details = details;
  }
  return response;
}

/**
 * Validation error (400)
 * Used for Zod validation failures
 */
export function validationError(details: any): ErrorResponse {
  return errorResponse('Validation error', 'Invalid request data', details);
}

/**
 * Unauthorized error (401)
 * Used when authentication is missing or invalid
 */
export function unauthorizedError(
  message: string = 'Authentication required'
): ErrorResponse {
  return errorResponse('Unauthorized', message);
}

/**
 * Forbidden error (403)
 * Used when user lacks permissions
 */
export function forbiddenError(
  message: string = 'Insufficient permissions'
): ErrorResponse {
  return errorResponse('Forbidden', message);
}

/**
 * Not found error (404)
 */
export function notFoundError(resource?: string): ErrorResponse {
  const message = resource ? `${resource} not found` : 'Resource not found';
  return errorResponse('Not found', message);
}

/**
 * Rate limit error (429)
 */
export function rateLimitError(): ErrorResponse {
  return errorResponse('Rate limit exceeded', 'Too many requests, please try again later');
}

/**
 * Internal server error (500)
 * IMPORTANT: Never expose internal error details to client (RGPD)
 */
export function internalError(
  message: string = 'Internal server error'
): ErrorResponse {
  return errorResponse('Internal error', message);
}

/**
 * Conflict error (409)
 * Used for duplicate resources
 */
export function conflictError(
  message: string = 'Resource already exists'
): ErrorResponse {
  return errorResponse('Conflict', message);
}
