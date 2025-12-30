/**
 * Audit Event Reader Port
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Read-only access to audit events
 * - Tenant-scoped filtering for TENANT admins
 * - No sensitive data in audit events (P1 only)
 */

export interface AuditEventRecord {
  id: string;
  eventType: string;
  actorId: string | null;
  tenantId: string | null;
  targetId: string | null;
  createdAt: Date;
}

export interface ListAuditEventsFilters {
  tenantId?: string; // Filter by tenant (for TENANT admin)
  eventType?: string; // Filter by event type
  limit?: number;
  offset?: number;
}

export interface AuditEventReader {
  /**
   * List audit events
   *
   * SECURITY:
   * - PLATFORM admin: can see all events
   * - TENANT admin: can only see events for their tenant (tenantId filter enforced)
   */
  list(filters: ListAuditEventsFilters): Promise<AuditEventRecord[]>;

  /**
   * Find audit events by user (RGPD export)
   * LOT 5.1 - Art. 15 RGPD
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier (actor_id)
   * @param limit - maximum number of events to return (default: 1000)
   */
  findByUser(tenantId: string, userId: string, limit?: number): Promise<AuditEventRecord[]>;
}
