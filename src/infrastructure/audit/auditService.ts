/**
 * Audit Service
 * EPIC 10 - LOT 10.6
 *
 * Simple audit event emission for RGPD compliance
 * Logs to console in development, writes to DB in production
 */

export interface AuditEvent {
  eventType: string;
  actorId: string;
  tenantId: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Emit an audit event
 * In production, this would write to the audit log table
 */
export async function emitAuditEvent(event: AuditEvent): Promise<void> {
  // For now, just log to console
  // TODO: Write to PgAuditEventWriter in production
  console.log('[AUDIT]', {
    type: event.eventType,
    actor: event.actorId,
    tenant: event.tenantId,
    timestamp: new Date().toISOString(),
    metadata: event.metadata,
  });

  // In production, use:
  // const writer = new PgAuditEventWriter(pool);
  // await writer.create({
  //   eventType: event.eventType,
  //   actorId: event.actorId,
  //   tenantId: event.tenantId,
  //   metadata: event.metadata,
  //   timestamp: new Date(),
  // });
}
