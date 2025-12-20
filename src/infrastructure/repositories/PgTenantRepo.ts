import type { TenantRepo } from "@/app/ports/TenantRepo";
import { pool } from "@/infrastructure/db/pg";

export class PgTenantRepo implements TenantRepo {
  async findBySlug(
    slug: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    const res = await pool.query(
      "SELECT id, slug, name FROM tenants WHERE slug=$1 LIMIT 1",
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
}
