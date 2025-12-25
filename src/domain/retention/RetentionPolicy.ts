/**
 * LOT 4.1 — Retention & Minimization Policy (RGPD compliance)
 *
 * EPIC 4 / EPIC 5: Data retention policy definition
 * DATA_CLASSIFICATION.md: retention periods by data class
 *
 * CRITICAL RGPD:
 * - Retention must be MINIMAL and JUSTIFIED
 * - Purge must NOT delete audit trails required for compliance
 * - Purge must NOT prevent RGPD rights (export/delete)
 */

/**
 * Retention periods by data type (in days)
 *
 * Based on DATA_CLASSIFICATION.md section 5
 */
export const RETENTION_PERIODS = {
  /**
   * P1: Technical metadata (ai_jobs)
   * - Status, timing, model references
   * - NO CONTENT (prompts/outputs forbidden)
   * - Retention: 90 days max
   */
  AI_JOBS_METADATA: 90,

  /**
   * P2: Consents
   * - User consent records (RGPD mandatory)
   * - Retention: account lifetime (no auto-purge)
   * - Purged only on explicit user deletion request
   */
  CONSENTS: null, // no auto-purge (account lifetime)

  /**
   * P1: Audit events
   * - Technical events for RGPD compliance proof
   * - Retention: minimum required for legal obligations
   * - Typically 3 years (configurable per jurisdiction)
   */
  AUDIT_EVENTS: 365 * 3, // 3 years (adjust per legal requirements)

  /**
   * P1: Technical logs
   * - Application logs (technical events only)
   * - NO sensitive data allowed
   * - Retention: 30 days
   */
  TECHNICAL_LOGS: 30,
} as const;

/**
 * Retention policy configuration
 *
 * Can be overridden per tenant if required (future enhancement)
 */
export interface RetentionPolicy {
  /**
   * AI jobs metadata retention (days)
   * Default: 90 days
   */
  aiJobsRetentionDays: number;

  /**
   * Audit events retention (days)
   * Default: 1095 days (3 years)
   */
  auditEventsRetentionDays: number;

  /**
   * Consents retention policy
   * null = no auto-purge (account lifetime)
   */
  consentsRetentionDays: null;

  /**
   * Dry run mode: if true, purge only logs what would be deleted
   * (no actual deletion)
   */
  dryRun: boolean;
}

/**
 * Get default retention policy (platform-wide)
 */
export function getDefaultRetentionPolicy(): RetentionPolicy {
  return {
    aiJobsRetentionDays: RETENTION_PERIODS.AI_JOBS_METADATA,
    auditEventsRetentionDays: RETENTION_PERIODS.AUDIT_EVENTS,
    consentsRetentionDays: RETENTION_PERIODS.CONSENTS,
    dryRun: false,
  };
}

/**
 * Validate retention policy (business rules)
 *
 * BLOCKER: retention periods must comply with RGPD minimization
 */
export function validateRetentionPolicy(policy: RetentionPolicy): void {
  // AI jobs: must not exceed maximum retention
  if (policy.aiJobsRetentionDays > RETENTION_PERIODS.AI_JOBS_METADATA) {
    throw new Error(
      `AI jobs retention exceeds maximum allowed (${RETENTION_PERIODS.AI_JOBS_METADATA} days)`
    );
  }

  // Audit events: must meet minimum legal requirements
  const MIN_AUDIT_RETENTION = 365; // 1 year minimum
  if (policy.auditEventsRetentionDays < MIN_AUDIT_RETENTION) {
    throw new Error(
      `Audit events retention below legal minimum (${MIN_AUDIT_RETENTION} days)`
    );
  }

  // Consents: no auto-purge allowed
  if (policy.consentsRetentionDays !== null) {
    throw new Error(
      "Consents auto-purge forbidden (RGPD compliance: must survive until account deletion)"
    );
  }
}

/**
 * Calculate cutoff date for purge (data older than this date will be purged)
 */
export function calculateCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}
