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
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (...args: any[]) => {
      const req = args[0] as NextRequest;

      const context = extractContext(req);

      if (!context) {
        return NextResponse.json(
          forbiddenError('Authentication required'),
          { status: 403 }
        );
      }

      // Check PLATFORM scope requirement
      if (requirePlatformScope && !isPlatformAdmin(context)) {
        return NextResponse.json(
          forbiddenError('Platform admin access required'),
          { status: 403 }
        );
      }

      // Check role permission
      if (!allowedRoles.includes(context.role)) {
        return NextResponse.json(
          forbiddenError('Insufficient permissions'),
          { status: 403 }
        );
      }

      // Permission granted
      return handler(...args);
    }) as T;
  };
}

/**
 * Platform admin only middleware
 * Shorthand for withRBAC([], true) - only allows PLATFORM scope
 */
export function withPlatformAdmin<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest;

    const context = extractContext(req);

    if (!context) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    if (!isPlatformAdmin(context)) {
      return NextResponse.json(
        forbiddenError('Platform admin access required'),
        { status: 403 }
      );
    }

    return handler(...args);
  }) as T;
}

/**
 * Tenant admin only middleware
 * Requires TENANT scope and ADMIN-like role
 */
export function withTenantAdmin<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest;

    const context = extractContext(req);

    if (!context) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    if (context.scope !== 'TENANT') {
      return NextResponse.json(
        forbiddenError('Tenant scope required'),
        { status: 403 }
      );
    }

    // Check if role contains 'ADMIN' (flexible matching)
    if (!context.role.includes('ADMIN')) {
      return NextResponse.json(
        forbiddenError('Tenant admin access required'),
        { status: 403 }
      );
    }

    return handler(...args);
  }) as T;
}
