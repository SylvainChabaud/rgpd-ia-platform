/**
 * Storage Estimates
 * LOT 12.1 - Tenant Stats
 *
 * Average row size estimates for storage calculation.
 * Used for tenant storage quota estimation in stats endpoints.
 *
 * IMPORTANT: These are conservative estimates based on actual database schema.
 * They should be reviewed periodically against real data sizes.
 */

/**
 * Average row size in bytes per entity type
 *
 * Estimates based on:
 * - AI Jobs: metadata only (no prompt/output per RGPD policy - stored in LLM gateway)
 * - Consents: boolean + timestamps + foreign keys
 * - Users: hashed email (64 chars) + display name + metadata
 * - RGPD Requests: request type + status + timestamps + reason text
 * - Audit Events: event type + actor/target IDs + metadata JSON
 */
export const ROW_SIZE_BYTES = {
  /** AI job metadata (no PII per RGPD) */
  AI_JOB: 500,
  /** Consent record (boolean + timestamps) */
  CONSENT: 200,
  /** User record (hashed data only) */
  USER: 300,
  /** RGPD request (deletion, export, etc.) */
  RGPD_REQUEST: 400,
  /** Audit event (event + IDs) */
  AUDIT_EVENT: 250,
  /** Purpose definition */
  PURPOSE: 350,
  /** DPIA document */
  DPIA: 600,
  /** Registre entry (Art. 30) */
  REGISTRE_ENTRY: 450,
} as const;

/**
 * Storage units for display
 */
export const STORAGE_UNITS = {
  BYTES: 'B',
  KILOBYTES: 'KB',
  MEGABYTES: 'MB',
  GIGABYTES: 'GB',
} as const;

/**
 * Format bytes to human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} ${STORAGE_UNITS.BYTES}`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} ${STORAGE_UNITS.KILOBYTES}`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${STORAGE_UNITS.MEGABYTES}`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ${STORAGE_UNITS.GIGABYTES}`;
}
