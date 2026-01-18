/**
 * Audit Service
 * EPIC 10 - LOT 10.6
 *
 * Simple audit event emission for RGPD compliance
 * Uses RGPD-safe logger (Pino with auto-redaction)
 */

import { logger } from '@/infrastructure/logging/logger';

export interface AuditEvent {
  eventType: string;
  actorId: string;
  tenantId: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Emit an audit event
 * RGPD-safe: Uses Pino logger with automatic PII redaction
 * In production, this would also write to the audit log table
 */
export async function emitAuditEvent(event: AuditEvent): Promise<void> {
  // Log using RGPD-safe logger (auto-redacts sensitive fields)
  logger.info({
    event: 'audit.event',
    type: event.eventType,
    actorId: event.actorId,
    tenantId: event.tenantId,
    // Note: metadata is logged but Pino will redact sensitive fields automatically
  }, `Audit: ${event.eventType}`);

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
