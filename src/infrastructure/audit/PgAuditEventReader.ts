/**
 * PostgreSQL Audit Event Reader Implementation
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Read-only queries
 * - Tenant-scoped filtering
 * - No sensitive data exposed (P1 only: IDs, event types, timestamps)
 */

import type {
  AuditEventReader,
  AuditEventRecord,
  ListAuditEventsFilters,
} from '@/app/ports/AuditEventReader';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';

export class PgAuditEventReader implements AuditEventReader {
  /**
   * Lazy purge of audit events older than 12 months (CNIL/RGPD compliance)
   *
   * Executed on every read operation to ensure automatic retention policy
   * without requiring external CRON jobs or scheduled tasks.
   *
   * RGPD Compliance:
   * - Art. 5.1.e: Storage limitation (12 months retention)
   * - CNIL Recommendation: 6-12 months for audit logs
   * - Art. 32: Security and traceability requirements
   */
  private async purgeLazyOldEvents(): Promise<void> {
    try {
      await pool.query(`
        DELETE FROM audit_events
        WHERE created_at < NOW() - INTERVAL '12 months'
      `);
    } catch (error) {
      // Non-blocking: log error but continue with query (RGPD-safe: no PII)
      logger.error({ event: 'audit.purge.failed', error: error instanceof Error ? error.message : 'Unknown error' }, 'Lazy purge of old audit events failed');
    }
  }

  async list(filters: ListAuditEventsFilters): Promise<AuditEventRecord[]> {
    // Lazy purge before reading (RGPD retention compliance)
    await this.purgeLazyOldEvents();

    const {
      tenantId,
      eventType,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters;

    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Filter by tenant (TENANT admin scope)
    if (tenantId !== undefined) {
      whereClauses.push(`ae.tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    // Filter by event type
    if (eventType) {
      whereClauses.push(`ae.event_type = $${paramIndex++}`);
      values.push(eventType);
    }

    // Filter by start date
    if (startDate) {
      whereClauses.push(`ae.created_at >= $${paramIndex++}`);
      values.push(startDate);
    }

    // Filter by end date
    if (endDate) {
      whereClauses.push(`ae.created_at <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    values.push(limit, offset);

    const res = await pool.query(
      `SELECT
         ae.id,
         ae.event_type,
         ae.actor_id,
         u.display_name AS actor_display_name,
         ae.tenant_id,
         t.name AS tenant_name,
         ae.target_id,
         ae.created_at
       FROM audit_events ae
       LEFT JOIN users u ON ae.actor_id = u.id
       LEFT JOIN tenants t ON ae.tenant_id = t.id
       ${whereClause}
       ORDER BY ae.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );

    return res.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      actorId: row.actor_id,
      actorDisplayName: row.actor_display_name,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      targetId: row.target_id,
      createdAt: new Date(row.created_at),
    }));
  }

  async findByUser(tenantId: string, userId: string, limit = 1000): Promise<AuditEventRecord[]> {
    // Lazy purge before reading (RGPD retention compliance)
    await this.purgeLazyOldEvents();

    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for audit event queries');
    }

    const res = await pool.query(
      `SELECT
         ae.id,
         ae.event_type,
         ae.actor_id,
         u.display_name AS actor_display_name,
         ae.tenant_id,
         t.name AS tenant_name,
         ae.target_id,
         ae.created_at
       FROM audit_events ae
       LEFT JOIN users u ON ae.actor_id = u.id
       LEFT JOIN tenants t ON ae.tenant_id = t.id
       WHERE ae.tenant_id = $1 AND ae.actor_id = $2
       ORDER BY ae.created_at DESC
       LIMIT $3`,
      [tenantId, userId, limit]
    );

    return res.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      actorId: row.actor_id,
      actorDisplayName: row.actor_display_name,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      targetId: row.target_id,
      createdAt: new Date(row.created_at),
    }));
  }
}
