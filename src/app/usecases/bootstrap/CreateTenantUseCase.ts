import { z } from "zod";
import { newId } from "@/shared/ids";
import { ConflictError, ForbiddenError, ValidationError } from "@/shared/errors";
import { logEvent } from "@/shared/logger";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { RequestContext } from "@/app/context/RequestContext";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import type { PolicyEngine } from "@/app/auth/policyEngine";

const InputSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

export class CreateTenantUseCase {
  constructor(
    private readonly tenants: TenantRepo,
    private readonly audit: AuditEventWriter,
    private readonly policy: PolicyEngine
  ) {}

  async execute(
    ctx: RequestContext,
    raw: unknown
  ): Promise<{ tenantId: string }> {
    // Check permission via policy engine (LOT 1.2 compliance)
    const decision = await this.policy.check(ctx, "tenant:create");
    if (!decision.allowed) {
      throw new ForbiddenError(decision.reason ?? "Permission denied");
    }

    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }
    const { name, slug } = parsed.data;

    const existing = await this.tenants.findBySlug(slug);
    if (existing) throw new ConflictError("Tenant slug already exists");

    const id = newId();
    await this.tenants.create({ id, slug, name });

    await emitAuditEvent(this.audit, {
      id: newId(),
      eventName: "tenant.created",
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === "SYSTEM" ? undefined : ctx.actorId,
      tenantId: id,
      targetId: id,
      metadata: { slugLength: slug.length },
    });

    logEvent("tenant.created", undefined, {
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === "SYSTEM" ? undefined : ctx.actorId,
      tenantId: id,
      targetId: id,
    });
    return { tenantId: id };
  }
}
