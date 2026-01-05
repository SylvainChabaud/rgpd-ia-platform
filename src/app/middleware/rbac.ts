/**
 * RBAC helper for API routes
 * EPIC 10 - LOT 10.6
 */

export interface RBACOptions {
  allowedRoles: string[];
}

/**
 * Simple permission check for API routes
 * Returns true if user has one of the allowed roles
 */
export function requirePermission(
  user: { role: string },
  _permissions: string[],
  options: RBACOptions
): boolean {
  return options.allowedRoles.includes(user.role);
}
