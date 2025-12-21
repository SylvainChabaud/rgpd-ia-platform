import { z } from "zod";
import { newId, hashEmail } from "@/shared/ids";
import { ValidationError } from "@/shared/errors";
import { logInfo } from "@/shared/logger";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { TenantUserRepo } from "@/app/ports/TenantUserRepo";
import type { PasswordHasher } from "@/app/ports/PasswordHasher";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { RequestContext } from "@/app/context/RequestContext";

const InputSchema = z.object({
  tenantSlug: z.string().min(3).max(80),
  email: z.email(),
  displayName: z.string().min(1).max(120),
  password: z.string().min(12).max(200),
});

export class CreateTenantAdminUseCase {
  constructor(
    private readonly tenants: TenantRepo,
    private readonly tenantUsers: TenantUserRepo,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: AuditEventWriter
  ) {}

  async execute(
    ctx: RequestContext,
    raw: unknown
  ): Promise<{ tenantAdminId: string; tenantId: string }> {
    const isBootstrapSystem =
      ctx.actorScope === "SYSTEM" && ctx.bootstrapMode === true;
    const allowed = ctx.actorScope === "PLATFORM" || isBootstrapSystem;
    if (!allowed) {
      throw new Error(
        "FORBIDDEN: only PLATFORM or SYSTEM in bootstrap mode can create tenant admins"
      );
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
      throw new ValidationError("Unknown tenantSlug");
    }

    const id = newId();
    const emailHash = hashEmail(email);
    const passwordHash = await this.passwordHasher.hash(password);

    await this.tenantUsers.createTenantAdmin({
      id,
      tenantId: tenant.id,
      emailHash,
      displayName,
      passwordHash,
    });

    await this.audit.write({
      id: newId(),
      eventName: "tenant.admin.created",
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === "SYSTEM" ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
      metadata: { displayNameLength: displayName.length },
    });

    logInfo({
      event: "tenant.admin.created",
      actorScope: ctx.actorScope,
      actorId: ctx.actorScope === "SYSTEM" ? undefined : ctx.actorId,
      tenantId: tenant.id,
      targetId: id,
    });

    return { tenantAdminId: id, tenantId: tenant.id };
  }
}
