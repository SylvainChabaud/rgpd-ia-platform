/**
 * Authentication Middleware
 * LOT 5.3 - API Layer
 *
 * Verifies JWT token and attaches user context to request
 *
 * SECURITY:
 * - Reads JWT from httpOnly cookie (primary) or Authorization header (fallback)
 * - Cookie-based auth prevents XSS token theft
 * - Header fallback maintained for API clients and backwards compatibility
 *
 * RGPD compliance:
 * - JWT contains only P1 data (userId, tenantId, scope, role)
 * - Failed auth attempts logged without sensitive data
 *
 * USAGE:
 *   export const GET = withLogging(withAuth(async (req) => { ... }));
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { unauthorizedError } from '@/lib/errorResponse';
import { logWarn } from '@/shared/logger';

/**
 * Request with authenticated user context
 */
export type NextRequestWithUser = NextRequest & {
  user: {
    userId: string;
    tenantId: string | null;
    scope: string;
    role: string;
  };
};

/**
 * Authentication middleware wrapper
 * Verifies JWT and attaches user to request context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withAuth<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {
    // 1. Try to get token from httpOnly cookie (preferred - XSS-safe)
    let token = req.cookies.get('auth_token')?.value;

    // 2. Fallback to Authorization header (for API clients, backwards compatibility)
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const match = authHeader.match(/^Bearer\s+(.+)$/);
        if (match) {
          token = match[1];
        }
      }
    }

    // No token found in cookie or header
    if (!token) {
      return NextResponse.json(
        unauthorizedError('No token provided'),
        { status: 401 }
      );
    }

    try {
      // Verify and decode JWT
      const payload = verifyJwt(token);

      // Attach user context to request
      (req as NextRequest & { user?: unknown }).user = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        scope: payload.scope,
        role: payload.role,
      };

      // Call handler with authenticated request
      return handler(req, context);
    } catch (error) {
      // JWT verification failed
      const message = error instanceof Error ? error.message : 'Invalid token';
      return NextResponse.json(
        unauthorizedError(message),
        { status: 401 }
      );
    }
  }) as T;
}

/**
 * Optional authentication middleware
 * Attaches user context if token present, but doesn't require it
 * Use for public endpoints that have optional auth features
 */
/**
 * Extract user from authenticated request
 * Use in handlers wrapped with withAuth
 * Throws if user context is not present
 */
export function requireUser(req: NextRequest): NextRequestWithUser['user'] {
  const user = (req as NextRequest & { user?: unknown }).user as NextRequestWithUser['user'] | undefined;
  if (!user) {
    throw new Error('User context not found. Ensure handler is wrapped with withAuth.');
  }
  return user;
}

export function withOptionalAuth<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {

    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/);
      if (match) {
        try {
          const payload = verifyJwt(match[1]);
          (req as NextRequest & { user?: unknown }).user = {
            userId: payload.userId,
            tenantId: payload.tenantId,
            scope: payload.scope,
            role: payload.role,
          };
        } catch (error) {
          // SECURITY: Log failed token verification attempts (RGPD-safe: no token logged)
          logWarn({
            event: 'auth.credential_verification_failed',
            meta: {
              error: error instanceof Error ? error.message : 'Unknown error',
              path: req.nextUrl.pathname,
            },
          });
          // Invalid token, continue without auth
        }
      }
    }

    return handler(req, context);
  }) as T;
}
