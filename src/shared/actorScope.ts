/**
 * Actor scope constants for RBAC
 * Use these constants instead of string literals for type safety
 *
 * LOT 13.0 - Added MEMBER scope for End User interface
 *
 * Scopes hierarchy:
 * - SYSTEM: Internal system processes (not user-facing)
 * - PLATFORM: Super Admin (platform-level access)
 * - TENANT: Tenant Admin (tenant-level access)
 * - MEMBER: End User (user-level access, EPIC 13)
 */
export const ACTOR_SCOPE = {
  SYSTEM: "SYSTEM",
  PLATFORM: "PLATFORM",
  TENANT: "TENANT",
  MEMBER: "MEMBER",
} as const;

/**
 * Actor scope type derived from constants
 */
export type ActorScope = (typeof ACTOR_SCOPE)[keyof typeof ACTOR_SCOPE];

/**
 * User scope type (excludes SYSTEM - for user-facing contexts)
 */
export type UserScope = typeof ACTOR_SCOPE.PLATFORM | typeof ACTOR_SCOPE.TENANT | typeof ACTOR_SCOPE.MEMBER;
