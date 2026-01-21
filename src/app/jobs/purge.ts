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

import type { TenantRepo } from "@/app/ports/TenantRepo";
import type { PurgeRepo } from "@/app/ports/PurgeRepo";
import type {
  RetentionPolicy} from "@/domain/retention/RetentionPolicy";
import {
  calculateCutoffDate,
  getDefaultRetentionPolicy,
  validateRetentionPolicy,
} from "@/domain/retention/RetentionPolicy";
import { logEvent } from "@/shared/logger";

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
 * @param purgeRepo - Repository for purge operations
 * @param dryRun - If true, only log what would be deleted (no actual deletion)
 */
export async function purgeAiJobs(
  tenantId: string,
  policy: RetentionPolicy,
  purgeRepo: PurgeRepo,
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
    return await purgeRepo.countPurgeableAiJobs(tenantId, cutoffDate);
  }

  // Actual purge: DELETE with tenant isolation
  return await purgeRepo.purgeAiJobs(tenantId, cutoffDate);
}

/**
 * Dependencies for purge job execution
 */
export interface PurgeJobDeps {
  tenantRepo: TenantRepo;
  purgeRepo: PurgeRepo;
}

/**
 * Execute full purge job (all data types, all tenants)
 *
 * BLOCKER: idempotent, respects retention policy
 *
 * @param deps - Repository dependencies
 * @param policy - Optional custom retention policy (defaults to platform policy)
 */
export async function executePurgeJob(
  deps: PurgeJobDeps,
  policy?: RetentionPolicy
): Promise<PurgeResult> {
  // Use default policy if not provided
  const retentionPolicy = policy || getDefaultRetentionPolicy();

  // Validate policy (business rules)
  validateRetentionPolicy(retentionPolicy);

  const dryRun = retentionPolicy.dryRun;

  // Get all tenants (purge per tenant for isolation) via repository
  const tenants = await deps.tenantRepo.listAll(1000, 0);

  let totalAiJobsPurged = 0;

  // Purge AI jobs for each tenant
  for (const tenant of tenants) {
    const purged = await purgeAiJobs(tenant.id, retentionPolicy, deps.purgeRepo, dryRun);
    totalAiJobsPurged += purged;
  }

  // Log purge stats (P1 only: counts, no identifying data)
  const result: PurgeResult = {
    aiJobsPurged: totalAiJobsPurged,
    dryRun,
    executedAt: new Date(),
  };

  // RGPD-safe log (P1: counts only)
  logEvent('purge_job_completed', {
    aiJobsPurged: result.aiJobsPurged,
    dryRun: result.dryRun,
  });

  return result;
}

/**
 * Execute purge job for a single tenant
 *
 * Useful for tenant-specific purge or testing
 *
 * @param tenantId - Tenant to purge
 * @param purgeRepo - Repository for purge operations
 * @param policy - Optional custom retention policy
 */
export async function executeTenantPurgeJob(
  tenantId: string,
  purgeRepo: PurgeRepo,
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
  const aiJobsPurged = await purgeAiJobs(tenantId, retentionPolicy, purgeRepo, dryRun);

  // Log purge stats (P1: tenant ID + counts, RGPD-safe)
  const result: PurgeResult = {
    aiJobsPurged,
    dryRun,
    executedAt: new Date(),
  };

  logEvent('tenant_purge_completed', {
    aiJobsPurged: result.aiJobsPurged,
    dryRun: result.dryRun,
  }, { tenantId });

  return result;
}
