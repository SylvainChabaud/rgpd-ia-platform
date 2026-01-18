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

import { RGPD_DELETION_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

/**
 * RGPD request type constants
 */
export const RGPD_REQUEST_TYPE = {
  EXPORT: 'EXPORT',
  DELETE: 'DELETE',
} as const;

/**
 * RGPD request type (EXPORT or DELETE)
 */
export type RgpdRequestType = (typeof RGPD_REQUEST_TYPE)[keyof typeof RGPD_REQUEST_TYPE];

/**
 * RGPD request status constants
 * - PENDING: Soft delete done, awaiting purge
 * - COMPLETED: Hard delete done, data irrecoverable
 * - CANCELLED: Request cancelled before purge
 */
export const RGPD_REQUEST_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * RGPD request status
 */
export type RgpdRequestStatus = (typeof RGPD_REQUEST_STATUS)[keyof typeof RGPD_REQUEST_STATUS];

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
 * Calculate scheduled purge date from deletion request
 */
export function calculatePurgeDate(deletedAt: Date): Date {
  const purgeAt = new Date(deletedAt);
  purgeAt.setDate(purgeAt.getDate() + RGPD_DELETION_RETENTION_DAYS);
  return purgeAt;
}
