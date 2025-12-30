/**
 * Request Context Extraction
 * LOT 5.3 - API Layer
 *
 * Extracts authenticated user context from Next.js request
 * Populated by auth middleware
 *
 * USAGE:
 *   const context = extractContext(req);
 *   if (!context) return NextResponse.json(unauthorizedError(), { status: 401 });
 */

import { NextRequest } from 'next/server';

export interface RequestContext {
  userId: string;
  tenantId: string | null; // null for PLATFORM scope users
  scope: 'PLATFORM' | 'TENANT';
  role: string;
}

/**
 * Extract request context from authenticated request
 * Returns null if request is not authenticated
 *
 * IMPORTANT: This requires auth middleware to run first
 * Auth middleware attaches `user` to request object
 */
export function extractContext(req: NextRequest): RequestContext | null {
  // Access user context attached by auth middleware
  const user = (req as NextRequest & { user?: RequestContext }).user;

  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    tenantId: user.tenantId || null,
    scope: user.scope,
    role: user.role,
  };
}

/**
 * Extract context and throw if missing
 * Use when endpoint requires authentication
 */
export function requireContext(req: NextRequest): RequestContext {
  const context = extractContext(req);
  if (!context) {
    throw new Error('Authentication required');
  }
  return context;
}

/**
 * Check if user has PLATFORM scope
 */
export function isPlatformAdmin(context: RequestContext): boolean {
  return context.scope === 'PLATFORM';
}

/**
 * Check if user has specific role
 */
export function hasRole(context: RequestContext, role: string | string[]): boolean {
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(context.role);
}

/**
 * Check if user belongs to specific tenant
 * Returns false for PLATFORM scope users
 */
export function isTenantMember(context: RequestContext, tenantId: string): boolean {
  return context.scope === 'TENANT' && context.tenantId === tenantId;
}

/**
 * Check if user is a tenant admin
 * Returns false for PLATFORM scope users
 */
export function isTenantAdmin(context: RequestContext): boolean {
  return context.scope === 'TENANT' && (context.role === 'admin' || context.role === 'TENANT_ADMIN');
}
