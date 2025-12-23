import type { AuditEvent } from "@/app/audit/AuditEvent";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { logEvent } from "@/shared/logger";
import {
  assertSafeEventName,
  assertSafeMeta,
  assertSafeStringValue,
} from "@/shared/rgpd/safeEvent";

function assertSafeAuditEvent(event: AuditEvent): void {
  assertSafeEventName(event.eventName);
  assertSafeStringValue(event.id, "audit.id");
  if (event.actorId) assertSafeStringValue(event.actorId, "audit.actorId");
  if (event.tenantId) assertSafeStringValue(event.tenantId, "audit.tenantId");
  if (event.targetId) assertSafeStringValue(event.targetId, "audit.targetId");
  if (event.metadata) assertSafeMeta(event.metadata);
}

export async function emitAuditEvent(
  writer: AuditEventWriter,
  event: AuditEvent
): Promise<void> {
  assertSafeAuditEvent(event);
  const toWrite: AuditEvent = {
    ...event,
    occurredAt: event.occurredAt ?? new Date(),
  };
  await writer.write(toWrite);

  logEvent("audit.event.emitted", { auditEventName: event.eventName }, {
    actorScope: event.actorScope,
    actorId: event.actorId,
    tenantId: event.tenantId,
    targetId: event.targetId,
  });
}
