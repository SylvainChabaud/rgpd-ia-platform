import type { ActorScope } from "@/shared/actorScope";
import type { SafeMetaValue } from "@/shared/rgpd/safeEvent";

export type AuditEvent = {
  id: string;
  eventName: string;
  actorScope: ActorScope;
  actorId?: string;
  tenantId?: string;
  targetId?: string;
  metadata?: Record<string, SafeMetaValue>;
  occurredAt?: Date;
};
