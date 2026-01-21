/**
 * PostgreSQL implementation of PurgeRepo
 *
 * LOT 4.1 — Data Purge (RGPD minimization)
 *
 * RGPD Compliance:
 * - Art. 5.1.e: Data minimization (storage limitation)
 * - Tenant-scoped purge with RLS (isolation)
 * - Idempotent operations
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import type { PurgeRepo } from "@/app/ports/PurgeRepo";

export class PgPurgeRepo implements PurgeRepo {
  /**
   * Delete AI jobs older than cutoff date for a specific tenant
   */
  async purgeAiJobs(tenantId: string, cutoffDate: Date): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purge operations");
    }

    const result = await withTenantContext(pool, tenantId, async (client) => {
      return await client.query(
        `DELETE FROM ai_jobs
         WHERE tenant_id = $1
           AND created_at < $2`,
        [tenantId, cutoffDate]
      );
    });

    return result.rowCount || 0;
  }

  /**
   * Count AI jobs that would be purged (for dry-run)
   */
  async countPurgeableAiJobs(tenantId: string, cutoffDate: Date): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for purge operations");
    }

    const result = await withTenantContext(pool, tenantId, async (client) => {
      return await client.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM ai_jobs
         WHERE tenant_id = $1
           AND created_at < $2`,
        [tenantId, cutoffDate]
      );
    });

    return parseInt(result.rows[0]?.count || "0", 10);
  }
}
