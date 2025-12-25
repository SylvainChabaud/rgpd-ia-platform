/**
 * Domain model for RGPD deletion requests
 *
 * RGPD compliance:
 * - Right to erasure (Art. 17)
 * - Tenant-scoped isolation
 * - Soft delete → Hard delete workflow
 * - Retention period before purge
 *
 * LOT 5.2 — Effacement RGPD (delete + purge + crypto-shredding)
 */

/**
 * RGPD request type (EXPORT or DELETE)
 */
export type RgpdRequestType = "EXPORT" | "DELETE";

/**
 * RGPD request status
 * - PENDING: Soft delete done, awaiting purge
 * - COMPLETED: Hard delete done, data irrecoverable
 * - CANCELLED: Request cancelled before purge
 */
export type RgpdRequestStatus = "PENDING" | "COMPLETED" | "CANCELLED";

/**
 * RGPD Request (persisted in rgpd_requests table)
 */
export type RgpdRequest = {
  id: string;
  tenantId: string;
  userId: string;
  type: RgpdRequestType;
  status: RgpdRequestStatus;
  createdAt: Date;
  scheduledPurgeAt?: Date; // When hard delete will occur
  completedAt?: Date; // When hard delete was completed
};

/**
 * Retention period before hard delete (configurable)
 * Default: 30 days (RGPD best practice for right to erasure)
 */
export const DELETION_RETENTION_DAYS = 30;

/**
 * Calculate scheduled purge date from deletion request
 */
export function calculatePurgeDate(deletedAt: Date): Date {
  const purgeAt = new Date(deletedAt);
  purgeAt.setDate(purgeAt.getDate() + DELETION_RETENTION_DAYS);
  return purgeAt;
}
