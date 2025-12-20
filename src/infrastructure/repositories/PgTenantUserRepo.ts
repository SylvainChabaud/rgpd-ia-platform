import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import { pool } from "@/infrastructure/db/pg";

export class PgTenantUserRepo implements TenantUserRepo {
  async createTenantAdmin(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    await pool.query(
      "INSERT INTO tenant_users (id, tenant_id, email_hash, display_name, password_hash, role) VALUES ($1,$2,$3,$4,$5,'TENANT_ADMIN')",
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
      ]
    );
  }
}
