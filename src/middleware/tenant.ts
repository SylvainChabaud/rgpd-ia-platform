/**
 * Tenant Isolation Middleware
 * LOT 5.3 - API Layer
 *
 * Enforces tenant-scoped access control
 * Prevents cross-tenant data access
 *
 * RGPD CRITICAL:
 * - This middleware is MANDATORY for all tenant-scoped endpoints
 * - Prevents data leakage between tenants
 * - PLATFORM scope users can access any tenant (by design)
 *
 * USAGE:
 *   export const GET = withLogging(
 *     withAuth(
 *       withTenantScope(
 *         async (req, { params }) => {
 *           const tenantId = params.tenantId;
 *           // Safe to use tenantId - tenant access verified
 *         }
 *       )
 *     )
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractContext, isPlatformAdmin, isTenantMember } from '@/lib/requestContext';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { forbiddenError } from '@/lib/errorResponse';

/**
 * Tenant scope enforcement middleware
 * Verifies user has access to requested tenant
 *
 * Access rules:
 * - PLATFORM scope users: access to all tenants
 * - TENANT scope users: access only to their own tenant
 *
 * @param handler - Route handler
 * @param options - { paramName: 'tenantId' } - param name for tenant ID (default: 'tenantId')
 */
export function withTenantScope<T extends (req: NextRequest, context: { params?: Record<string, string> }) => Promise<NextResponse>>(
  handler: T,
  options: { paramName?: string } = {}
): T {
  const paramName = options.paramName || 'tenantId';

  return (async (req: NextRequest, context: { params?: Record<string, string> }) => {
    const userContext = extractContext(req);

    if (!userContext) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    // Extract tenantId from route params
    const routeTenantId = context?.params?.[paramName];

    if (!routeTenantId) {
      // No tenant ID in route - check if user is TENANT scope
      // If so, they can only access their own tenant's resources
      if (userContext.scope === ACTOR_SCOPE.TENANT && !userContext.tenantId) {
        return NextResponse.json(
          forbiddenError('Invalid tenant context'),
          { status: 403 }
        );
      }

      // PLATFORM scope users can access without tenant ID
      return handler(req, context);
    }

    // PLATFORM scope users can access any tenant
    if (isPlatformAdmin(userContext)) {
      return handler(req, context);
    }

    // TENANT scope users can only access their own tenant
    if (!isTenantMember(userContext, routeTenantId)) {
      return NextResponse.json(
        forbiddenError('Cross-tenant access forbidden'),
        { status: 403 }
      );
    }

    return handler(req, context);
  }) as T;
}

/**
 * Current user scope middleware
 * Verifies user is accessing their own resources
 * Used for user-scoped endpoints (e.g., /api/consents, /api/rgpd/export)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withCurrentUser<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {

    const userContext = extractContext(req);

    if (!userContext) {
      return NextResponse.json(
        forbiddenError('Authentication required'),
        { status: 403 }
      );
    }

    // Extract userId from route params (if present)
    const routeUserId = context?.params?.userId;

    if (routeUserId) {
      // PLATFORM scope users can access any user
      if (isPlatformAdmin(userContext)) {
        return handler(req, context);
      }

      // TENANT scope users can only access themselves
      if (userContext.userId !== routeUserId) {
        return NextResponse.json(
          forbiddenError('Cross-user access forbidden'),
          { status: 403 }
        );
      }
    }

    return handler(req, context);
  }) as T;
}
