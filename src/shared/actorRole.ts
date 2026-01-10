/**
 * Actor role constants for RBAC
 * Use these constants instead of string literals for type safety
 *
 * LOT 11.2 - Normalized role taxonomy:
 * - SUPERADMIN: Platform-level super administrator (scope: PLATFORM)
 * - TENANT_ADMIN: Tenant administrator (scope: TENANT, full tenant management)
 * - MEMBER: Standard tenant member/user (scope: TENANT, services usage)
 * - DPO: Data Protection Officer (scope: TENANT, RGPD compliance - LOT 10.4/10.5)
 *
 * IMPORTANT: Always use these constants instead of hardcoded strings
 *
 * Migration notes (consistency fix):
 * - ❌ ADMIN: Removed (ambiguous, replaced by TENANT_ADMIN everywhere)
 * - ❌ USER: Removed (ambiguous, replaced by MEMBER everywhere)
 * - ❌ TENANT_USER: Never was in constants, was hardcoded in repo (now MEMBER)
 */
export const ACTOR_ROLE = {
  SUPERADMIN: 'SUPERADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  MEMBER: 'MEMBER',
  DPO: 'DPO',
} as const;

export type ActorRole = (typeof ACTOR_ROLE)[keyof typeof ACTOR_ROLE];
