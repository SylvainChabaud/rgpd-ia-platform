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

export class PgAuditEventReader implements AuditEventReader {
  async list(filters: ListAuditEventsFilters): Promise<AuditEventRecord[]> {
    const {
      tenantId,
      eventType,
      limit = 100,
      offset = 0,
    } = filters;

    const whereClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by tenant (TENANT admin scope)
    if (tenantId !== undefined) {
      whereClauses.push(`tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    // Filter by event type
    if (eventType) {
      whereClauses.push(`event_name = $${paramIndex++}`);
      values.push(eventType);
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    values.push(limit, offset);

    const res = await pool.query(
      `SELECT id, event_name, actor_id, tenant_id, target_id, created_at
       FROM audit_events
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );

    return res.rows.map(row => ({
      id: row.id,
      eventType: row.event_name,
      actorId: row.actor_id,
      tenantId: row.tenant_id,
      targetId: row.target_id,
      createdAt: new Date(row.created_at),
    }));
  }
}
