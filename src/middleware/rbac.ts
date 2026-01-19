/**
 * Role-Based Access Control (RBAC) Middleware
 * LOT 5.3 - API Layer
 *
 * Enforces role-based permissions
 * Must be used after withAuth middleware
 *
 * USAGE:
 *   export const POST = withLogging(
 *     withAuth(
 *       withRBAC(['TENANT_ADMIN', 'PLATFORM_ADMIN'])(
 *         async (req) => { ... }
 *       )
 *     )
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractContext, isPlatformAdmin } from '@/lib/requestContext';
import { forbiddenError } from '@/lib/errorResponse';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

/**
 * RBAC middleware factory
 * Checks if user has one of the allowed roles
 *
 * @param allowedRoles - Array of role names that are allowed
 * @param requirePlatformScope - If true, only PLATFORM scope users allowed (default: false)
 */
export function withRBAC(
  allowedRoles: string[],
  requirePlatformScope: boolean = false
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NextHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;
  return function <T extends NextHandler>(
    handler: T
  ): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (async (req: NextRequest, context?: any) => {
      const ctx = extractContext(req);

      if (!ctx) {
        return NextResponse.json(
          forbiddenError('Authentication required'),
          { status: 403 }
        );
      }

      // Check PLATFORM scope requirement
      if (requirePlatformScope && !isPlatformAdmin(ctx)) {
        return NextResponse.json(
          forbiddenError('Platform admin access required'),
          { status: 403 }
        );
      }

      // Check role permission
      if (!allowedRoles.includes(ctx.role)) {
        return NextResponse.json(
          forbiddenError('Insufficient permissions'),
          { status: 403 }
        );
      }

      // Permission granted
      return handler(req, context);
    }) as T;
  };
}

/**
 * Platform admin only middleware
 * Shorthand for withRBAC([], true) - only allows PLATFORM scope
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withPlatformAdmin<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {
    const ctx = extractContext(req);

    if (!ctx) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    if (!isPlatformAdmin(ctx)) {
      return NextResponse.json(
        forbiddenError('Platform admin access required'),
        { status: 403 }
      );
    }

    return handler(req, context);
  }) as T;
}

/**
 * Tenant admin only middleware
 * Requires TENANT scope and ADMIN-like role
 */
export function withTenantAdmin<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {
    const ctx = extractContext(req);

    if (!ctx) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    if (ctx.scope !== ACTOR_SCOPE.TENANT) {
      return NextResponse.json(
        forbiddenError('Tenant scope required'),
        { status: 403 }
      );
    }

    // Check if role is TENANT_ADMIN (strict check, no legacy support)
    if (ctx.role !== ACTOR_ROLE.TENANT_ADMIN) {
      return NextResponse.json(
        forbiddenError('Tenant admin access required'),
        { status: 403 }
      );
    }

    return handler(req, context);
  }) as T;
}

/**
 * Tenant admin or DPO middleware
 * Requires TENANT scope and either TENANT_ADMIN or DPO role
 * DPO needs access to view users and consents for RGPD compliance oversight
 */
export function withTenantAdminOrDpo<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {
    const ctx = extractContext(req);

    if (!ctx) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    if (ctx.scope !== ACTOR_SCOPE.TENANT) {
      return NextResponse.json(
        forbiddenError('Tenant scope required'),
        { status: 403 }
      );
    }

    // Check if role is TENANT_ADMIN or DPO
    if (ctx.role !== ACTOR_ROLE.TENANT_ADMIN && ctx.role !== ACTOR_ROLE.DPO) {
      return NextResponse.json(
        forbiddenError('Tenant admin or DPO access required'),
        { status: 403 }
      );
    }

    return handler(req, context);
  }) as T;
}
