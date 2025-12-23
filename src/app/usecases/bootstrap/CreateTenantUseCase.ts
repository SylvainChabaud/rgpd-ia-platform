import { z } from "zod";
import { newId } from "@/shared/ids";
import { ConflictError, ForbiddenError, ValidationError } from "@/shared/errors";
import { logEvent } from "@/shared/logger";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { RequestContext } from "@/app/context/RequestContext";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";

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
    private readonly audit: AuditEventWriter
  ) {}

  async execute(
    ctx: RequestContext,
    raw: unknown
  ): Promise<{ tenantId: string }> {
    const isBootstrapSystem =
      ctx.actorScope === "SYSTEM" && ctx.bootstrapMode === true;
    if (ctx.actorScope !== "PLATFORM" && !isBootstrapSystem) {
      throw new ForbiddenError(
        "Only PLATFORM or SYSTEM in bootstrap mode can create tenants"
      );
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
