import { z } from "zod";
import { newId, hashEmail } from "@/shared/ids";
import {
  BootstrapAlreadyCompletedError,
  ConflictError,
  ValidationError,
} from "@/shared/errors";
import { logEvent } from "@/shared/logger";
import type { BootstrapStateRepo } from "@/app/ports/BootstrapStateRepo";
import type { PlatformUserRepo } from "@/app/ports/PlatformUserRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { systemContext } from "@/app/context/RequestContext";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { DISABLED_PASSWORD_HASH } from "@/shared/security/password";
import { ACTOR_SCOPE } from "@/shared/actorScope";

const InputSchema = z.object({
  email: z.email(),
  displayName: z.string().min(1).max(120),
});

export class CreatePlatformSuperAdminUseCase {
  constructor(
    private readonly bootstrapState: BootstrapStateRepo,
    private readonly platformUsers: PlatformUserRepo,
    private readonly audit: AuditEventWriter
  ) {}

  async execute(raw: unknown): Promise<{ platformUserId: string }> {
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }
    const { email, displayName } = parsed.data;

    // Non-replayable bootstrap
    if (await this.bootstrapState.isBootstrapped()) {
      throw new BootstrapAlreadyCompletedError();
    }
    if (await this.platformUsers.existsSuperAdmin()) {
      throw new ConflictError("SuperAdmin already exists");
    }

    const id = newId();
    const emailHash = hashEmail(email);
    const ctx = systemContext();
    const passwordHash = DISABLED_PASSWORD_HASH;

    await this.platformUsers.createSuperAdmin({
      id,
      emailHash,
      displayName,
      passwordHash,
    });
    await this.bootstrapState.markBootstrapped();

    await emitAuditEvent(this.audit, {
      id: newId(),
      eventName: "platform.superadmin.created",
      actorScope: ctx.actorScope,
      actorId: undefined,
      tenantId: undefined,
      targetId: id,
      metadata: { displayNameLength: displayName.length },
    });

    logEvent("bootstrap.superadmin.created", undefined, {
      actorScope: ACTOR_SCOPE.SYSTEM,
      targetId: id,
    });

    return { platformUserId: id };
  }
}
