/**
 * LOT 4.1 — Data Purge Job (RGPD minimization)
 *
 * EPIC 4 / EPIC 5: automated retention & minimization
 * TASKS.md LOT 4.1: idempotent purge respecting audit & RGPD rights
 *
 * CRITICAL REQUIREMENTS:
 * - Purge MUST be idempotent (safe to run multiple times)
 * - Purge MUST NOT delete audit trails (compliance proof)
 * - Purge MUST NOT prevent RGPD rights (export/delete)
 * - Purge MUST respect retention policy
 * - Purge MUST be tenant-scoped (isolation)
 *
 * LOGS:
 * - P1 only: counts, technical events, no content
 * - No tenant/user identifying info in logs
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import type { TenantRepo } from "@/app/ports/TenantRepo";
import type {
  RetentionPolicy} from "@/domain/retention/RetentionPolicy";
import {
  calculateCutoffDate,
  getDefaultRetentionPolicy,
  validateRetentionPolicy,
} from "@/domain/retention/RetentionPolicy";
import { logger } from "@/infrastructure/logging/logger";

/**
 * Purge result (aggregated stats, RGPD-safe)
 */
export interface PurgeResult {
  aiJobsPurged: number;
  // Future: add other purged data types
  dryRun: boolean;
  executedAt: Date;
}

/**
 * Purge AI jobs metadata older than retention period
 *
 * BLOCKER: tenant-scoped purge only
 * BLOCKER: idempotent (safe to run multiple times)
 *
 * @param tenantId - Tenant to purge (REQUIRED for isolation)
 * @param policy - Retention policy (defaults to platform policy)
 * @param dryRun - If true, only log what would be deleted (no actual deletion)
 */
export async function purgeAiJobs(
  tenantId: string,
  policy: RetentionPolicy,
  dryRun = false
): Promise<number> {
  // BLOCKER: validate tenantId (RGPD isolation)
  if (!tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required for purge operations");
  }

  // Calculate cutoff date
  const cutoffDate = calculateCutoffDate(policy.aiJobsRetentionDays);

  if (dryRun) {
    // Dry run: count only (no deletion)
    const countResult = await withTenantContext(pool, tenantId, async (client) => {
      return await client.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM ai_jobs
         WHERE tenant_id = $1
           AND created_at < $2`,
        [tenantId, cutoffDate]
      );
    });

    return parseInt(countResult.rows[0]?.count || "0", 10);
  }

  // Actual purge: DELETE with tenant isolation
  const deleteResult = await withTenantContext(pool, tenantId, async (client) => {
    return await client.query(
      `DELETE FROM ai_jobs
       WHERE tenant_id = $1
         AND created_at < $2`,
      [tenantId, cutoffDate]
    );
  });

  return deleteResult.rowCount || 0;
}

/**
 * Execute full purge job (all data types, all tenants)
 *
 * BLOCKER: idempotent, respects retention policy
 *
 * @param tenantRepo - Tenant repository for listing all tenants
 * @param policy - Optional custom retention policy (defaults to platform policy)
 */
export async function executePurgeJob(
  tenantRepo: TenantRepo,
  policy?: RetentionPolicy
): Promise<PurgeResult> {
  // Use default policy if not provided
  const retentionPolicy = policy || getDefaultRetentionPolicy();

  // Validate policy (business rules)
  validateRetentionPolicy(retentionPolicy);

  const dryRun = retentionPolicy.dryRun;

  // Get all tenants (purge per tenant for isolation) via repository
  const tenants = await tenantRepo.listAll(1000, 0);

  let totalAiJobsPurged = 0;

  // Purge AI jobs for each tenant
  for (const tenant of tenants) {
    const purged = await purgeAiJobs(tenant.id, retentionPolicy, dryRun);
    totalAiJobsPurged += purged;
  }

  // Log purge stats (P1 only: counts, no identifying data)
  const result: PurgeResult = {
    aiJobsPurged: totalAiJobsPurged,
    dryRun,
    executedAt: new Date(),
  };

  // RGPD-safe log (P1: counts only)
  logger.info({
    event: 'purge_job_completed',
    aiJobsPurged: result.aiJobsPurged,
    dryRun: result.dryRun,
    timestamp: result.executedAt.toISOString(),
  }, 'Purge job completed');

  return result;
}

/**
 * Execute purge job for a single tenant
 *
 * Useful for tenant-specific purge or testing
 *
 * @param tenantId - Tenant to purge
 * @param policy - Optional custom retention policy
 */
export async function executeTenantPurgeJob(
  tenantId: string,
  policy?: RetentionPolicy
): Promise<PurgeResult> {
  // BLOCKER: validate tenantId
  if (!tenantId) {
    throw new Error("RGPD VIOLATION: tenantId required for purge operations");
  }

  // Use default policy if not provided
  const retentionPolicy = policy || getDefaultRetentionPolicy();

  // Validate policy
  validateRetentionPolicy(retentionPolicy);

  const dryRun = retentionPolicy.dryRun;

  // Purge AI jobs for this tenant only
  const aiJobsPurged = await purgeAiJobs(tenantId, retentionPolicy, dryRun);

  // Log purge stats (P1: tenant ID + counts, RGPD-safe)
  const result: PurgeResult = {
    aiJobsPurged,
    dryRun,
    executedAt: new Date(),
  };

  logger.info({
    event: 'tenant_purge_completed',
    tenantId, // P1: UUID opaque
    aiJobsPurged: result.aiJobsPurged,
    dryRun: result.dryRun,
    timestamp: result.executedAt.toISOString(),
  }, 'Tenant purge completed');

  return result;
}
