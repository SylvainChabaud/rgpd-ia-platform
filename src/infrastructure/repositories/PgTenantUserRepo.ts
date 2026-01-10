import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import { pool } from "@/infrastructure/db/pg";
import { ACTOR_ROLE } from "@/shared/actorRole";

export class PgTenantUserRepo implements TenantUserRepo {
  async createTenantAdmin(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    // CRITICAL RGPD: tenant_id is stored but not validated at DB layer
    // Isolation enforced at use-case layer (CreateTenantAdminUseCase)
    // TODO EPIC4: add DB constraint CHECK (scope='TENANT' => tenant_id IS NOT NULL)
    await pool.query(
      "INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1,$2,$3,$4,$5,'TENANT',$6)",
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_ROLE.TENANT_ADMIN,
      ]
    );
  }

  async createTenantUser(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    // Create regular tenant user (MEMBER role)
    // CRITICAL RGPD: tenant_id is stored but not validated at DB layer
    // Isolation enforced at use-case layer (CreateTenantUserUseCase)
    await pool.query(
      "INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1,$2,$3,$4,$5,'TENANT',$6)",
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_ROLE.MEMBER,
      ]
    );
  }
}
