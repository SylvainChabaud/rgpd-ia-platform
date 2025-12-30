import type { TenantRepo, Tenant } from "@/app/ports/TenantRepo";
import { pool } from "@/infrastructure/db/pg";

/**
 * PostgreSQL Tenant Repository Implementation
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Soft delete support (deleted_at column)
 * - All queries exclude soft-deleted tenants by default
 */
export class PgTenantRepo implements TenantRepo {
  private _hasDeletedAt: boolean | null = null;

  /**
   * Check if deleted_at column exists in tenants table
   * Cached after first check for performance
   */
  private async hasDeletedAtColumn(): Promise<boolean> {
    if (this._hasDeletedAt !== null) {
      return this._hasDeletedAt;
    }

    const res = await pool.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'deleted_at'
      ) as exists`
    );

    const exists = res.rows[0].exists as boolean;
    this._hasDeletedAt = exists;
    return exists;
  }

  async findBySlug(
    slug: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    // Check if deleted_at column exists
    const hasDeletedAt = await this.hasDeletedAtColumn();
    const whereClause = hasDeletedAt
      ? "WHERE slug=$1 AND deleted_at IS NULL"
      : "WHERE slug=$1";

    const res = await pool.query(
      `SELECT id, slug, name FROM tenants ${whereClause} LIMIT 1`,
      [slug]
    );
    return res.rowCount ? res.rows[0] : null;
  }

  async create(input: {
    id: string;
    slug: string;
    name: string;
  }): Promise<void> {
    await pool.query("INSERT INTO tenants (id, slug, name) VALUES ($1,$2,$3)", [
      input.id,
      input.slug,
      input.name,
    ]);
  }

  async findById(tenantId: string): Promise<Tenant | null> {
    const hasDeletedAt = await this.hasDeletedAtColumn();
    const selectClause = hasDeletedAt
      ? "SELECT id, slug, name, created_at, deleted_at"
      : "SELECT id, slug, name, created_at, NULL as deleted_at";
    const whereClause = hasDeletedAt
      ? "WHERE id = $1 AND deleted_at IS NULL"
      : "WHERE id = $1";

    const res = await pool.query(
      `${selectClause}
       FROM tenants
       ${whereClause}
       LIMIT 1`,
      [tenantId]
    );

    if (res.rowCount === 0) {
      return null;
    }

    return this.mapRow(res.rows[0]);
  }

  async listAll(limit: number = 20, offset: number = 0): Promise<Tenant[]> {
    const hasDeletedAt = await this.hasDeletedAtColumn();
    const selectClause = hasDeletedAt
      ? "SELECT id, slug, name, created_at, deleted_at"
      : "SELECT id, slug, name, created_at, NULL as deleted_at";
    const whereClause = hasDeletedAt ? "WHERE deleted_at IS NULL" : "";

    const res = await pool.query(
      `${selectClause}
       FROM tenants
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows.map((row) => this.mapRow(row));
  }

  async update(tenantId: string, updates: { name?: string }): Promise<void> {
    const hasDeletedAt = await this.hasDeletedAtColumn();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (setClauses.length === 0) {
      return; // No updates
    }

    values.push(tenantId);
    const whereClause = hasDeletedAt
      ? `WHERE id = $${paramIndex} AND deleted_at IS NULL`
      : `WHERE id = $${paramIndex}`;

    await pool.query(
      `UPDATE tenants
       SET ${setClauses.join(', ')}
       ${whereClause}`,
      values
    );
  }

  async softDelete(tenantId: string): Promise<void> {
    const hasDeletedAt = await this.hasDeletedAtColumn();
    if (!hasDeletedAt) {
      throw new Error("Soft delete not supported: deleted_at column does not exist");
    }

    // Soft delete tenant
    await pool.query(
      `UPDATE tenants
       SET deleted_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    // Cascade soft delete users of this tenant
    await pool.query(
      `UPDATE users
       SET deleted_at = now()
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
  }

  private mapRow(row: Record<string, unknown>): Tenant {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as string | number | Date),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string | number | Date) : null,
    };
  }
}
