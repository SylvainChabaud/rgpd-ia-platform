/**
 * Auth Constants
 * Centralized authentication-related constants
 *
 * SECURITY:
 * - Cookie names must be consistent across all auth endpoints
 * - httpOnly cookies prevent XSS token theft
 *
 * Used by:
 * - src/app/http/requireAuth.ts
 * - src/middleware.ts
 * - src/middleware/auth.ts
 * - app/api/auth/login/route.ts
 * - app/api/auth/logout/route.ts
 * - app/api/auth/refresh/route.ts
 */

// =========================
// Cookie Names
// =========================

/**
 * Auth cookie names
 * CRITICAL: These must match across all auth-related code
 */
export const AUTH_COOKIES = {
  /** Access token cookie - short-lived (15 min), httpOnly */
  ACCESS_TOKEN: 'auth_token',
  /** Refresh token cookie - long-lived (7 days), httpOnly, restricted path */
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Refresh token cookie path
 * Restricted to refresh endpoint only for security
 */
export const REFRESH_TOKEN_PATH = '/api/auth/refresh' as const;

// =========================
// Error Messages
// =========================

/**
 * Auth error messages (RGPD-safe - no sensitive data)
 */
export const AUTH_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact support.',
  TENANT_SUSPENDED: 'Your organization account has been suspended. Please contact support.',
} as const;
