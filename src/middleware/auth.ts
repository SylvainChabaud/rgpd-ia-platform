/**
 * Authentication Middleware
 * LOT 5.3 - API Layer
 *
 * Verifies JWT token and attaches user context to request
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
    // Extract Authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        unauthorizedError('No token provided'),
        { status: 401 }
      );
    }

    // Parse Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/);
    if (!match) {
      return NextResponse.json(
        unauthorizedError('Invalid Authorization header format'),
        { status: 401 }
      );
    }

    const token = match[1];

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
        } catch {
          // Invalid token, continue without auth
        }
      }
    }

    return handler(req, context);
  }) as T;
}
