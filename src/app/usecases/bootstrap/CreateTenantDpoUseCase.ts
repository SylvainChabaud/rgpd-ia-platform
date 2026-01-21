import { z } from "zod";
import { newId, hashEmail } from "@/shared/ids";
import {
  ForbiddenError,
  InvalidTenantError,
  ValidationError,
} from "@/shared/errors";
import { logEvent } from "@/shared/logger";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { RequestContext } from "@/app/context/RequestContext";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { DISABLED_PASSWORD_HASH } from "@/shared/security/password";
import type { PolicyEngine } from "@/app/auth/policyEngine";
import type { PasswordHasher } from "@/app/ports/PasswordHasher";
import { ACTOR_SCOPE } from "@/shared/actorScope";

const InputSchema = z.object({
  tenantSlug: z.string().min(3).max(80),
  email: z.email(),
  displayName: z.string().min(1).max(120),
  password: z.string().min(8).optional(), // Optional password for development
});

/**
 * Use Case: Create Tenant DPO (Data Protection Officer)
 * LOT 12.4 - Fonctionnalités DPO
 *
 * Creates a DPO user with access to:
 * - DPIA list and validation (Art. 35)
 * - Registre Art. 30 view and export
 * - RGPD compliance dashboards
 *
 * RGPD Compliance:
 * - Art. 37: DPO designation
 * - Art. 38: Position of the DPO (independence, no instructions)
 * - Art. 39: Tasks of the DPO
 */
export class CreateTenantDpoUseCase {
  constructor(
    private readonly tenants: TenantRepo,
    private readonly tenantUsers: TenantUserRepo,
    private readonly audit: AuditEventWriter,
    private readonly policy: PolicyEngine,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(
    ctx: RequestContext,
    raw: unknown
  ): Promise<{ tenantDpoId: string; tenantId: string }> {
    // Check permission via policy engine (reuse tenant-admin:create policy for bootstrap)
    const decision = await this.policy.check(ctx, "tenant-admin:create");
    if (!decision.allowed) {
      throw new ForbiddenError(decision.reason ?? "Permission denied");
    }

    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }
    const { tenantSlug, email, displayName, password } = parsed.data;

    const tenant = await this.tenants.findBySlug(tenantSlug);
    if (!tenant) {
      throw new InvalidTenantError("Unknown tenant");
    }

    const id = newId();
    const emailHash = hashEmail(email);

    // If password provided (development), hash it; otherwise disable login (production)
    let passwordHash = DISABLED_PASSWORD_HASH;
    if (password) {
      passwordHash = await this.passwordHasher.hash(password);
    }

    // Create DPO user
    await this.tenantUsers.createTenantDpo({
      id,
      tenantId: tenant.id,
      emailHash,
      displayName,
      passwordHash,
    });

    await emitAuditEvent(this.audit, {
      id: newId(),
      eventName: "tenant.dpo.created",
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === ACTOR_SCOPE.SYSTEM ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
      metadata: { displayNameLength: displayName.length },
    });

    logEvent("tenant.dpo.created", undefined, {
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === ACTOR_SCOPE.SYSTEM ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
    });

    return { tenantDpoId: id, tenantId: tenant.id };
  }
}
