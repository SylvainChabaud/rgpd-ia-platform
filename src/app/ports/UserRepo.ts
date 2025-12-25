/**
 * User Repository - Unified read access
 * LOT 5.3 - API Layer
 *
 * Provides read access to both PLATFORM and TENANT users
 * Used by authentication and user management use-cases
 */

export interface User {
  id: string;
  tenantId: string | null;
  emailHash: string;
  displayName: string;
  passwordHash: string;
  scope: 'PLATFORM' | 'TENANT';
  role: string;
  createdAt: Date;
  deletedAt?: Date | null;
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
}
