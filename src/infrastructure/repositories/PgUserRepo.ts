/**
 * PostgreSQL User Repository Implementation
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Tenant isolation enforced at query level
 * - Soft delete support (deleted_at column)
 * - Email stored as hash only (P2 protection)
 */

import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import type { UserScope } from '@/shared/actorScope';

export class PgUserRepo implements UserRepo {
  async findByEmailHash(emailHash: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at
       FROM users
       WHERE email_hash = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [emailHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async listByTenant(tenantId: string, limit: number = 20, offset: number = 0): Promise<User[]> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at
       FROM users
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    return result.rows.map(this.mapRow);
  }

  async createUser(user: Omit<User, 'createdAt' | 'deletedAt'>): Promise<void> {
    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.tenantId, user.emailHash, user.displayName, user.passwordHash, user.scope, user.role]
    );
  }

  async updateUser(userId: string, updates: { displayName?: string; role?: string }): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }

    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }

    if (setClauses.length === 0) {
      return; // No updates
    }

    values.push(userId);

    await pool.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      values
    );
  }

  async softDeleteUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET deleted_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
  }

  async softDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    // BLOCKER: validate tenantId (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for user soft delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE users
         SET deleted_at = NOW()
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async hardDeleteUserByTenant(tenantId: string, userId: string): Promise<number> {
    // BLOCKER: validate tenantId (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for user hard delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `DELETE FROM users
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }

  private mapRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      emailHash: row.email_hash as string,
      displayName: row.display_name as string,
      passwordHash: row.password_hash as string,
      scope: row.scope as UserScope,
      role: row.role as string,
      createdAt: new Date(row.created_at as string | number | Date),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string | number | Date) : null,
    };
  }
}
