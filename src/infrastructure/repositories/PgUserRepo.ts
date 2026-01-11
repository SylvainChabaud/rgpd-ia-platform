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
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
              data_suspended, data_suspended_at, data_suspended_reason
       FROM users
       WHERE email_hash = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [emailHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowWithSuspension(result.rows[0]);
  }

  async findById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
              data_suspended, data_suspended_at, data_suspended_reason
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowWithSuspension(result.rows[0]);
  }

  async listByTenant(tenantId: string, limit: number = 20, offset: number = 0): Promise<User[]> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
              data_suspended, data_suspended_at, data_suspended_reason
       FROM users
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    return result.rows.map((row: Record<string, unknown>) => this.mapRowWithSuspension(row));
  }

  async listAll(limit: number = 20, offset: number = 0): Promise<User[]> {
    const result = await pool.query(
      `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
              data_suspended, data_suspended_at, data_suspended_reason
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map((row: Record<string, unknown>) => this.mapRowWithSuspension(row));
  }

  async listSuspendedByTenant(tenantId: string): Promise<User[]> {
    // BLOCKER: validate tenantId (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for suspension list');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
                data_suspended, data_suspended_at, data_suspended_reason
         FROM users
         WHERE tenant_id = $1 AND data_suspended = true AND deleted_at IS NULL
         ORDER BY data_suspended_at DESC`,
        [tenantId]
      );

      return result.rows.map((row: Record<string, unknown>) => this.mapRowWithSuspension(row));
    });
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

  async updateDataSuspension(
    userId: string,
    suspended: boolean,
    reason?: string
  ): Promise<User> {
    const result = await pool.query(
      `UPDATE users
       SET data_suspended = $1,
           data_suspended_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
           data_suspended_reason = $2
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
                 data_suspended, data_suspended_at, data_suspended_reason`,
      [suspended, reason || null, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return this.mapRowWithSuspension(result.rows[0]);
  }

  async listFiltered({ limit = 20, offset = 0, tenantId, role, status }: {
    limit?: number
    offset?: number
    tenantId?: string
    role?: string
    status?: 'active' | 'suspended'
  }): Promise<User[]> {
    const where: string[] = ['deleted_at IS NULL']
    const values: unknown[] = []
    let idx = 1
    if (tenantId) {
      where.push(`tenant_id = $${idx++}`)
      values.push(tenantId)
    }
    if (role) {
      where.push(`role = $${idx++}`)
      values.push(role)
    }
    if (status === 'active') {
      where.push(`(data_suspended IS NULL OR data_suspended = false)`)
    }
    if (status === 'suspended') {
      where.push(`data_suspended = true`)
    }
    const sql = `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
      data_suspended, data_suspended_at, data_suspended_reason
      FROM users
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`
    values.push(limit)
    values.push(offset)
    const result = await pool.query(sql, values)
    return result.rows.map((row: Record<string, unknown>) => this.mapRowWithSuspension(row))
  }

  /**
   * List users by tenant with extended filters (LOT 12.1)
   */
  async listFilteredByTenant({
    tenantId,
    limit = 50,
    offset = 0,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }: {
    tenantId: string
    limit?: number
    offset?: number
    role?: string
    status?: 'active' | 'suspended'
    search?: string
    sortBy?: 'name' | 'createdAt' | 'role'
    sortOrder?: 'asc' | 'desc'
  }): Promise<User[]> {
    // BLOCKER: validate tenantId (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for user list');
    }

    const where: string[] = ['tenant_id = $1', 'deleted_at IS NULL']
    const values: unknown[] = [tenantId]
    let idx = 2

    if (role) {
      where.push(`role = $${idx++}`)
      values.push(role)
    }

    if (status === 'active') {
      where.push(`(data_suspended IS NULL OR data_suspended = false)`)
    } else if (status === 'suspended') {
      where.push(`data_suspended = true`)
    }

    if (search) {
      where.push(`display_name ILIKE $${idx++}`)
      values.push(`%${search}%`)
    }

    // Map sortBy to actual column names
    const sortColumn = {
      name: 'display_name',
      createdAt: 'created_at',
      role: 'role',
    }[sortBy] || 'created_at'

    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const sql = `SELECT id, tenant_id, email_hash, display_name, password_hash, scope, role, created_at, deleted_at,
      data_suspended, data_suspended_at, data_suspended_reason
      FROM users
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${idx++} OFFSET $${idx++}`

    values.push(limit)
    values.push(offset)

    const result = await pool.query(sql, values)
    return result.rows.map((row: Record<string, unknown>) => this.mapRowWithSuspension(row))
  }

  /**
   * Count users by tenant with filters (LOT 12.1)
   */
  async countByTenant({
    tenantId,
    role,
    status,
    search,
  }: {
    tenantId: string
    role?: string
    status?: 'active' | 'suspended'
    search?: string
  }): Promise<number> {
    // BLOCKER: validate tenantId (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for user count');
    }

    const where: string[] = ['tenant_id = $1', 'deleted_at IS NULL']
    const values: unknown[] = [tenantId]
    let idx = 2

    if (role) {
      where.push(`role = $${idx++}`)
      values.push(role)
    }

    if (status === 'active') {
      where.push(`(data_suspended IS NULL OR data_suspended = false)`)
    } else if (status === 'suspended') {
      where.push(`data_suspended = true`)
    }

    if (search) {
      where.push(`display_name ILIKE $${idx++}`)
      values.push(`%${search}%`)
    }

    const sql = `SELECT COUNT(*) as total FROM users WHERE ${where.join(' AND ')}`
    const result = await pool.query(sql, values)
    return parseInt(result.rows[0]?.total || '0', 10)
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

  private mapRowWithSuspension(row: Record<string, unknown>): User {
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
      dataSuspended: row.data_suspended as boolean | undefined,
      dataSuspendedAt: row.data_suspended_at ? new Date(row.data_suspended_at as string | number | Date) : null,
      dataSuspendedReason: row.data_suspended_reason as string | null | undefined,
    };
  }
}
