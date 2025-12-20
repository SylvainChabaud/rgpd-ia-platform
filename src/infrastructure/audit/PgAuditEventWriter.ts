import type {
  AuditEvent,
  AuditEventWriter,
} from "@/app/ports/AuditEventWriter";
import { pool } from "@/infrastructure/db/pg";

export class PgAuditEventWriter implements AuditEventWriter {
  async write(e: AuditEvent): Promise<void> {
    await pool.query(
      `INSERT INTO audit_events (id, event_name, actor_scope, actor_id, tenant_id, target_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        e.id,
        e.eventName,
        e.actorScope,
        e.actorId ?? null,
        e.tenantId ?? null,
        e.targetId ?? null,
        e.metadata ? JSON.stringify(e.metadata) : null,
      ]
    );
  }
}
