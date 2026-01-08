/**
 * Actor role constants for RBAC
 * Use these constants instead of string literals for type safety
 *
 * LOT 11.2 - Consolidated role taxonomy:
 * - SUPERADMIN: Platform-level super administrator (aligned with DB)
 * - TENANT_ADMIN: Tenant administrator
 * - ADMIN: Standard admin role
 * - MEMBER: Standard member/user role
 * - DPO: Data Protection Officer (LOT 10.4/10.5 RGPD compliance)
 * - USER: Generic user role
 */
export const ACTOR_ROLE = {
  SUPERADMIN: 'SUPERADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  DPO: 'DPO',
  USER: 'USER',
} as const;

export type ActorRole = (typeof ACTOR_ROLE)[keyof typeof ACTOR_ROLE];
