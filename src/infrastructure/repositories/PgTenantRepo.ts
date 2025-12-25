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
  async findBySlug(
    slug: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    const res = await pool.query(
      "SELECT id, slug, name FROM tenants WHERE slug=$1 AND deleted_at IS NULL LIMIT 1",
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
    const res = await pool.query(
      `SELECT id, slug, name, created_at, deleted_at
       FROM tenants
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [tenantId]
    );

    if (res.rowCount === 0) {
      return null;
    }

    return this.mapRow(res.rows[0]);
  }

  async listAll(limit: number = 20, offset: number = 0): Promise<Tenant[]> {
    const res = await pool.query(
      `SELECT id, slug, name, created_at, deleted_at
       FROM tenants
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows.map(this.mapRow);
  }

  async update(tenantId: string, updates: { name?: string }): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (setClauses.length === 0) {
      return; // No updates
    }

    values.push(tenantId);

    await pool.query(
      `UPDATE tenants
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      values
    );
  }

  async softDelete(tenantId: string): Promise<void> {
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

  private mapRow(row: any): Tenant {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }
}
