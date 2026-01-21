/**
 * Purge Repository Port
 *
 * LOT 4.1 — Data Purge (RGPD minimization)
 *
 * RGPD Compliance:
 * - Art. 5.1.e: Data minimization (storage limitation)
 * - Tenant-scoped purge (isolation)
 * - Idempotent operations (safe to run multiple times)
 */

/**
 * Repository interface for data purge operations
 */
export interface PurgeRepo {
  /**
   * Delete AI jobs older than cutoff date for a specific tenant
   *
   * @param tenantId - Tenant to purge (REQUIRED for isolation)
   * @param cutoffDate - Delete jobs created before this date
   * @returns Number of deleted rows
   */
  purgeAiJobs(tenantId: string, cutoffDate: Date): Promise<number>;

  /**
   * Count AI jobs that would be purged (for dry-run)
   *
   * @param tenantId - Tenant to check
   * @param cutoffDate - Count jobs created before this date
   * @returns Number of jobs that would be purged
   */
  countPurgeableAiJobs(tenantId: string, cutoffDate: Date): Promise<number>;
}
