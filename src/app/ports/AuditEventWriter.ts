import type { AuditEvent } from "@/app/audit/AuditEvent";

export type { AuditEvent };

export interface AuditEventWriter {
  write(e: AuditEvent): Promise<void>;
}
