import type {
  AuditEvent,
  AuditEventWriter,
} from "@/app/ports/AuditEventWriter";
import { pool } from "@/infrastructure/db/pg";

export class PgAuditEventWriter implements AuditEventWriter {
  async write(e: AuditEvent): Promise<void> {
    // CRITICAL: metadata should NEVER contain sensitive payload
    // Validation is done in emitAuditEvent() but added defense-in-depth check
    if (e.metadata) {
      const metaStr = JSON.stringify(e.metadata);
      if (metaStr.includes("@") || metaStr.length > 2000) {
        throw new Error(
          "RGPD_AUDIT_GUARD: metadata contains forbidden patterns or is too large"
        );
      }
    }

    await pool.query(
      `INSERT INTO audit_events (id, event_type, actor_id, tenant_id, target_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        e.id,
        e.eventName,
        e.actorId ?? null,
        e.tenantId ?? null,
        e.targetId ?? null,
      ]
    );
  }
}
