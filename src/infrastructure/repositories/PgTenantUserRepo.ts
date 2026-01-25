import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import { pool } from "@/infrastructure/db/pg";
import { ACTOR_ROLE } from "@/shared/actorRole";
import { ACTOR_SCOPE } from "@/shared/actorScope";

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
    // SECURITY: Use parameterized query for all values (no string interpolation)
    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_SCOPE.TENANT,
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
    // Create regular tenant user (MEMBER scope + role)
    // CRITICAL RGPD: tenant_id is stored but not validated at DB layer
    // Isolation enforced at use-case layer (CreateTenantUserUseCase)
    // SECURITY: Use parameterized query for all values (no string interpolation)
    // NOTE: MEMBER scope redirects to /app (end-user interface)
    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_SCOPE.MEMBER,
        ACTOR_ROLE.MEMBER,
      ]
    );
  }

  /**
   * Create DPO user (Data Protection Officer)
   * LOT 12.4 - Fonctionnalités DPO
   *
   * RGPD Compliance:
   * - Art. 37: DPO designation
   * - Art. 38: Position of the DPO (independence)
   * - Art. 39: Tasks of the DPO
   */
  async createTenantDpo(input: {
    id: string;
    tenantId: string;
    emailHash: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    // CRITICAL RGPD: DPO has special independence (Art. 38.3)
    // DPO can access DPIA, Registre Art. 30, and validate/reject DPIAs
    // SECURITY: Use parameterized query for all values (no string interpolation)
    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.tenantId,
        input.emailHash,
        input.displayName,
        input.passwordHash,
        ACTOR_SCOPE.TENANT,
        ACTOR_ROLE.DPO,
      ]
    );
  }
}
