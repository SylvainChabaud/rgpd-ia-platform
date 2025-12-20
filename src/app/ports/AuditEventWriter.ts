export type AuditEvent = {
  id: string;
  eventName: string;
  actorScope: "PLATFORM" | "TENANT" | "SYSTEM";
  actorId?: string;
  tenantId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export interface AuditEventWriter {
  write(e: AuditEvent): Promise<void>;
}
