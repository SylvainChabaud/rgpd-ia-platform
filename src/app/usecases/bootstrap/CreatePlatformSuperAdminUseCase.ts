import { z } from "zod";
import { newId, hashEmail } from "@/shared/ids";
import { ConflictError, ValidationError } from "@/shared/errors";
import { logInfo } from "@/shared/logger";
import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import type { PasswordHasher } from "@/app/ports/PasswordHasher";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { systemContext } from "@/app/context/RequestContext";

const InputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  password: z.string().min(12).max(200),
});

export class CreatePlatformSuperAdminUseCase {
  constructor(
    private readonly bootstrapState: BootstrapStateRepo,
    private readonly platformUsers: PlatformUserRepo,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: AuditEventWriter
  ) {}

  async execute(raw: unknown): Promise<{ platformUserId: string }> {
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }
    const { email, displayName, password } = parsed.data;

    // Non-replayable bootstrap
    if (await this.bootstrapState.isBootstrapped()) {
      throw new ConflictError("Bootstrap already completed");
    }
    if (await this.platformUsers.existsSuperAdmin()) {
      throw new ConflictError("SuperAdmin already exists");
    }

    const id = newId();
    const emailHash = hashEmail(email);
    const ctx = systemContext();
    const passwordHash = await this.passwordHasher.hash(password);

    await this.platformUsers.createSuperAdmin({
      id,
      emailHash,
      displayName,
      passwordHash,
    });
    await this.bootstrapState.markBootstrapped();

    await this.audit.write({
      id: newId(),
      eventName: "platform.superadmin.created",
      actorScope: ctx.actorScope,
      actorId: undefined,
      tenantId: undefined,
      targetId: id,
      metadata: { displayNameLength: displayName.length },
    });

    logInfo({
      event: "bootstrap.superadmin.created",
      actorScope: "SYSTEM",
      targetId: id,
    });

    return { platformUserId: id };
  }
}
