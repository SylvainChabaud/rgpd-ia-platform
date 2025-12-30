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
import { ACTOR_SCOPE } from "@/shared/actorScope";

const InputSchema = z.object({
  tenantSlug: z.string().min(3).max(80),
  email: z.email(),
  displayName: z.string().min(1).max(120),
});

export class CreateTenantAdminUseCase {
  constructor(
    private readonly tenants: TenantRepo,
    private readonly tenantUsers: TenantUserRepo,
    private readonly audit: AuditEventWriter,
    private readonly policy: PolicyEngine
  ) {}

  async execute(
    ctx: RequestContext,
    raw: unknown
  ): Promise<{ tenantAdminId: string; tenantId: string }> {
    // Check permission via policy engine (LOT 1.2 compliance)
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
    const { tenantSlug, email, displayName } = parsed.data;

    const tenant = await this.tenants.findBySlug(tenantSlug);
    if (!tenant) {
      throw new InvalidTenantError("Unknown tenant");
    }

    const id = newId();
    const emailHash = hashEmail(email);
    const passwordHash = DISABLED_PASSWORD_HASH;

    await this.tenantUsers.createTenantAdmin({
      id,
      tenantId: tenant.id,
      emailHash,
      displayName,
      passwordHash,
    });

    await emitAuditEvent(this.audit, {
      id: newId(),
      eventName: "tenant.admin.created",
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === ACTOR_SCOPE.SYSTEM ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
      metadata: { displayNameLength: displayName.length },
    });

    logEvent("tenant.admin.created", undefined, {
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === ACTOR_SCOPE.SYSTEM ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
    });

    return { tenantAdminId: id, tenantId: tenant.id };
  }
}
