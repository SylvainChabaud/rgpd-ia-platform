import type { AuditEvent } from "@/app/audit/AuditEvent";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";

export class InMemoryAuditEventWriter implements AuditEventWriter {
  readonly events: AuditEvent[] = [];

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}
