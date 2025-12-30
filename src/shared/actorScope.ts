/**
 * Actor scope constants for RBAC
 * Use these constants instead of string literals for type safety
 */
export const ACTOR_SCOPE = {
  SYSTEM: "SYSTEM",
  PLATFORM: "PLATFORM",
  TENANT: "TENANT",
} as const;

/**
 * Actor scope type derived from constants
 */
export type ActorScope = (typeof ACTOR_SCOPE)[keyof typeof ACTOR_SCOPE];

/**
 * User scope type (excludes SYSTEM - for user-facing contexts)
 */
export type UserScope = typeof ACTOR_SCOPE.PLATFORM | typeof ACTOR_SCOPE.TENANT;
