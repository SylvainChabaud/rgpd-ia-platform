/**
 * User Repository - Unified read access
 * LOT 5.3 - API Layer
 *
 * Provides read access to both PLATFORM and TENANT users
 * Used by authentication and user management use-cases
 */

import type { UserScope } from '@/shared/actorScope';

/**
 * User data status for filtering (Art. 18 RGPD)
 */
export const USER_DATA_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type UserDataStatus = (typeof USER_DATA_STATUS)[keyof typeof USER_DATA_STATUS];

export interface User {
  id: string;
  tenantId: string | null;
  emailHash: string;
  displayName: string;
  passwordHash: string;
  scope: UserScope;
  role: string;
  createdAt: Date;
  deletedAt?: Date | null;
  // EPIC 10 - Art. 18 (Droit à la limitation du traitement)
  dataSuspended?: boolean;
  dataSuspendedAt?: Date | null;
  dataSuspendedReason?: string | null;
}

export interface UserRepo {
  /**
   * Find user by email hash (for authentication)
   * Returns null if user not found or soft-deleted
   */
  findByEmailHash(emailHash: string): Promise<User | null>;

  /**
   * Find user by ID
   * Returns null if user not found or soft-deleted
   */
  findById(userId: string): Promise<User | null>;

  /**
   * List users in a tenant (tenant-scoped)
   * Excludes soft-deleted users
   */
  listByTenant(tenantId: string, limit?: number, offset?: number): Promise<User[]>;

  /**
   * List users with data suspension enabled (Art. 18 RGPD)
   * Tenant-scoped for admin monitoring
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Users with data_suspended = true
   */
  listSuspendedByTenant(tenantId: string): Promise<User[]>;

  /**
   * Create user (TENANT scope)
   */
  createUser(user: Omit<User, 'createdAt' | 'deletedAt'>): Promise<void>;

  /**
   * Update user
   */
  updateUser(userId: string, updates: { displayName?: string; role?: string }): Promise<void>;

  /**
   * Soft delete user
   */
  softDeleteUser(userId: string): Promise<void>;

  /**
   * Soft delete user (tenant-scoped RGPD deletion)
   * LOT 5.2 - Art. 17 RGPD
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected (0 or 1)
   */
  softDeleteUserByTenant(tenantId: string, userId: string): Promise<number>;

  /**
   * Hard delete user (purge after retention period)
   * LOT 5.2 - Art. 17 RGPD
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected (0 or 1)
   */
  hardDeleteUserByTenant(tenantId: string, userId: string): Promise<number>;

  /**
   * Update data suspension status (Art. 18 RGPD)
   * EPIC 10 - LOT 10.6
   *
   * @param userId - user identifier
   * @param suspended - true to suspend, false to unsuspend
   * @param reason - reason for suspension (required if suspended=true)
   * @returns Updated user
   */
  updateDataSuspension(
    userId: string,
    suspended: boolean,
    reason?: string
  ): Promise<User>;
}
