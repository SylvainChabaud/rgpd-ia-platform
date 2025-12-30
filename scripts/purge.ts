#!/usr/bin/env tsx
/**
 * LOT 4.1 — CLI: Execute data purge job
 *
 * Usage:
 *   npm run purge              # Full purge (all tenants)
 *   npm run purge:dry-run      # Dry run (preview only)
 *   npm run purge:tenant <id>  # Purge single tenant
 *
 * CRITICAL RGPD:
 * - Purge is idempotent (safe to run multiple times)
 * - Respects retention policy
 * - Logs P1 only (counts, no sensitive data)
 * - Does NOT delete audit trails or consents
 */

import { executePurgeJob, executeTenantPurgeJob } from "@/app/jobs/purge";
import { getDefaultRetentionPolicy } from "@/domain/retention/RetentionPolicy";
import { pool } from "@/infrastructure/db/pg";
import { PgTenantRepo } from "@/infrastructure/repositories/PgTenantRepo";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tenantId = args[1];

  const tenantRepo = new PgTenantRepo();

  try {
    console.log("Starting purge job...");

    if (command === "tenant" && tenantId) {
      // Purge single tenant
      console.log(`Purging tenant: ${tenantId}`);
      const result = await executeTenantPurgeJob(tenantId);
      console.log("✅ Tenant purge completed:", result);
    } else if (command === "dry-run") {
      // Dry run: preview only (no actual deletion)
      console.log("DRY RUN MODE: preview purge (no deletion)");
      const policy = getDefaultRetentionPolicy();
      policy.dryRun = true;
      const result = await executePurgeJob(tenantRepo, policy);
      console.log("✅ Dry run completed:", result);
    } else {
      // Full purge (all tenants)
      console.log("Purging all tenants...");
      const result = await executePurgeJob(tenantRepo);
      console.log("✅ Full purge completed:", result);
    }
  } catch (error) {
    console.error("❌ Purge failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
