/**
 * PostgreSQL implementation of RgpdRequestRepo
 *
 * RGPD compliance:
 * - Tenant-scoped queries (WHERE tenant_id = $1)
 * - Deletion request tracking
 * - Purge scheduling
 *
 * LOT 5.2 — Effacement RGPD
 */

import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import { randomUUID } from "crypto";
import type {
  RgpdRequestRepo,
  CreateRgpdRequestInput,
  RgpdRequestWithUser,
} from "@/app/ports/RgpdRequestRepo";
import type { RgpdRequest } from "@/domain/rgpd/DeletionRequest";
import { RGPD_REQUEST_TYPE, RGPD_REQUEST_STATUS } from "@/domain/rgpd/DeletionRequest";
import {
  RGPD_EXPORT_RETENTION_DAYS,
  RGPD_DELETION_RETENTION_DAYS,
  RGPD_SUSPENSION_RETENTION_DAYS,
  RGPD_OPPOSITION_RETENTION_DAYS,
  RGPD_CONTEST_RETENTION_DAYS,
} from "@/domain/retention/RetentionPolicy";

export class PgRgpdRequestRepo implements RgpdRequestRepo {
  async create(
    tenantId: string,
    input: CreateRgpdRequestInput
  ): Promise<RgpdRequest> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for RGPD request creation"
      );
    }

    const id = randomUUID();
    const now = new Date();

    await withTenantContext(pool, tenantId, async (client) => {
      await client.query(
        `INSERT INTO rgpd_requests
         (id, tenant_id, user_id, type, status, created_at, scheduled_purge_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          tenantId,
          input.userId,
          input.type,
          input.status,
          now,
          input.scheduledPurgeAt || null,
        ]
      );
    });

    return {
      id,
      tenantId,
      userId: input.userId,
      type: input.type,
      status: input.status,
      createdAt: now,
      scheduledPurgeAt: input.scheduledPurgeAt,
    };
  }

  async findById(
    tenantId: string,
    requestId: string
  ): Promise<RgpdRequest | null> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for RGPD request lookup"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT id, tenant_id, user_id, type, status, created_at,
                scheduled_purge_at, completed_at
         FROM rgpd_requests
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, requestId]
      );

      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        type: row.type,
        status: row.status,
        createdAt: new Date(row.created_at),
        scheduledPurgeAt: row.scheduled_purge_at
          ? new Date(row.scheduled_purge_at)
          : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      };
    });
  }

  async findPendingPurges(): Promise<RgpdRequest[]> {
    const res = await pool.query(
      `SELECT id, tenant_id, user_id, type, status, created_at,
              scheduled_purge_at, completed_at
       FROM rgpd_requests
       WHERE type = $1
         AND status = $2
         AND scheduled_purge_at IS NOT NULL
         AND scheduled_purge_at <= NOW()
       ORDER BY scheduled_purge_at ASC`,
      [RGPD_REQUEST_TYPE.DELETE, RGPD_REQUEST_STATUS.PENDING]
    );

    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      createdAt: new Date(row.created_at),
      scheduledPurgeAt: row.scheduled_purge_at
        ? new Date(row.scheduled_purge_at)
        : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }));
  }

  async updateStatus(
    requestId: string,
    status: string,
    completedAt?: Date
  ): Promise<void> {
    await pool.query(
      `UPDATE rgpd_requests
       SET status = $1, completed_at = $2
       WHERE id = $3`,
      [status, completedAt || null, requestId]
    );
  }

  async findDeletionRequest(
    tenantId: string,
    userId: string
  ): Promise<RgpdRequest | null> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for deletion request lookup"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT id, tenant_id, user_id, type, status, created_at,
                scheduled_purge_at, completed_at
         FROM rgpd_requests
         WHERE tenant_id = $1
           AND user_id = $2
           AND type = $3
           AND status IN ($4, $5)
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, userId, RGPD_REQUEST_TYPE.DELETE, RGPD_REQUEST_STATUS.PENDING, RGPD_REQUEST_STATUS.COMPLETED]
      );

      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        type: row.type,
        status: row.status,
        createdAt: new Date(row.created_at),
        scheduledPurgeAt: row.scheduled_purge_at
          ? new Date(row.scheduled_purge_at)
          : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      };
    });
  }

  /**
   * Find all RGPD requests for a tenant (paginated)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Tenant isolation enforced via tenantId parameter
   * RGPD: Returns userDisplayName (NO email) - consistent with /portal/users
   */
  async findByTenant(
    tenantId: string,
    params?: {
      limit?: number;
      offset?: number;
      type?: string;
      status?: string;
    }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for RGPD request listing"
      );
    }

    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    return await withTenantContext(pool, tenantId, async (client) => {
      // Build WHERE clause
      const conditions: string[] = ["r.tenant_id = $1"];
      const queryParams: (string | number)[] = [tenantId];
      let paramIndex = 2;

      if (params?.type) {
        conditions.push(`r.type = $${paramIndex}`);
        queryParams.push(params.type);
        paramIndex++;
      }

      if (params?.status) {
        conditions.push(`r.status = $${paramIndex}`);
        queryParams.push(params.status);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // Count total
      const countRes = await client.query(
        `SELECT COUNT(*) as total FROM rgpd_requests r WHERE ${whereClause}`,
        queryParams
      );
      const total = parseInt(countRes.rows[0].total, 10);

      // Fetch paginated requests with user display name (LEFT JOIN for deleted users)
      // RGPD: Only display_name returned - NO email (P2 data)
      const res = await client.query(
        `SELECT r.id, r.tenant_id, r.user_id, r.type, r.status, r.created_at,
                r.scheduled_purge_at, r.completed_at,
                COALESCE(u.display_name, 'Utilisateur supprimé') as user_display_name
         FROM rgpd_requests r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      const requests: RgpdRequestWithUser[] = res.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        userDisplayName: row.user_display_name,
        type: row.type,
        status: row.status,
        createdAt: new Date(row.created_at),
        scheduledPurgeAt: row.scheduled_purge_at
          ? new Date(row.scheduled_purge_at)
          : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      }));

      return { requests, total };
    });
  }

  /**
   * Find export requests for a tenant (Art. 15, 20)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Returns userDisplayName (NO email) - consistent with /portal/users
   */
  async findExportsByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number; status?: string }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }> {
    return this.findByTenant(tenantId, {
      ...params,
      type: RGPD_REQUEST_TYPE.EXPORT,
    });
  }

  /**
   * Find deletion requests for a tenant (Art. 17)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Returns userDisplayName (NO email) - consistent with /portal/users
   */
  async findDeletionsByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number; status?: string }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }> {
    return this.findByTenant(tenantId, {
      ...params,
      type: RGPD_REQUEST_TYPE.DELETE,
    });
  }

  /**
   * Count pending requests by type (for KPI widgets)
   * LOT 12.3 - Tenant Admin RGPD Management
   */
  async countByTenant(tenantId: string): Promise<{
    exports: { pending: number; completed: number };
    deletions: { pending: number; completed: number };
  }> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for RGPD request counting"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT type, status, COUNT(*) as count
         FROM rgpd_requests
         WHERE tenant_id = $1
         GROUP BY type, status`,
        [tenantId]
      );

      const counts = {
        exports: { pending: 0, completed: 0 },
        deletions: { pending: 0, completed: 0 },
      };

      for (const row of res.rows) {
        const count = parseInt(row.count, 10);
        if (row.type === RGPD_REQUEST_TYPE.EXPORT) {
          if (row.status === RGPD_REQUEST_STATUS.PENDING) {
            counts.exports.pending = count;
          } else if (row.status === RGPD_REQUEST_STATUS.COMPLETED) {
            counts.exports.completed = count;
          }
        } else if (row.type === RGPD_REQUEST_TYPE.DELETE) {
          if (row.status === RGPD_REQUEST_STATUS.PENDING) {
            counts.deletions.pending = count;
          } else if (row.status === RGPD_REQUEST_STATUS.COMPLETED) {
            counts.deletions.completed = count;
          }
        }
      }

      return counts;
    });
  }

  /**
   * Get export statistics for RGPD compliance monitoring
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Art. 5.1.e (Storage limitation) - monitors retention compliance
   */
  async getExportStats(tenantId: string): Promise<{
    totalCount: number;
    expiredCount: number;
    oldestAgeDays: number | null;
  }> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for export stats"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Get total count and oldest export date
      const statsRes = await client.query(
        `SELECT
           COUNT(*) as total_count,
           MIN(created_at) as oldest_created_at
         FROM rgpd_requests
         WHERE tenant_id = $1
           AND type = $2`,
        [tenantId, RGPD_REQUEST_TYPE.EXPORT]
      );

      const totalCount = parseInt(statsRes.rows[0].total_count, 10);
      const oldestCreatedAt = statsRes.rows[0].oldest_created_at;

      // Calculate oldest age in days
      let oldestAgeDays: number | null = null;
      if (oldestCreatedAt) {
        const ageMs = Date.now() - new Date(oldestCreatedAt).getTime();
        oldestAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Count expired exports (older than RGPD_EXPORT_RETENTION_DAYS)
      const expiredRes = await client.query(
        `SELECT COUNT(*) as expired_count
         FROM rgpd_requests
         WHERE tenant_id = $1
           AND type = $2
           AND created_at < NOW() - $3 * INTERVAL '1 day'`,
        [tenantId, RGPD_REQUEST_TYPE.EXPORT, RGPD_EXPORT_RETENTION_DAYS]
      );

      const expiredCount = parseInt(expiredRes.rows[0].expired_count, 10);

      return {
        totalCount,
        expiredCount,
        oldestAgeDays,
      };
    });
  }

  /**
   * Purge expired exports (older than retention period)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Art. 5.1.e (Storage limitation) - enforces retention policy
   * CRITICAL: This permanently deletes export data
   */
  async purgeExpiredExports(
    tenantId: string,
    retentionDays: number = RGPD_EXPORT_RETENTION_DAYS
  ): Promise<number> {
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for export purge"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Delete expired exports and return count
      const res = await client.query(
        `DELETE FROM rgpd_requests
         WHERE tenant_id = $1
           AND type = $2
           AND created_at < NOW() - $3 * INTERVAL '1 day'
         RETURNING id`,
        [tenantId, RGPD_REQUEST_TYPE.EXPORT, retentionDays]
      );

      return res.rowCount ?? 0;
    });
  }

  // ============================================
  // DELETION STATS & PURGE (Art. 17)
  // ============================================

  async getDeletionStats(tenantId: string): Promise<{
    totalCount: number;
    completedCount: number;
    expiredCount: number;
    oldestCompletedAgeDays: number | null;
  }> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for deletion stats");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Total deletions
      const totalRes = await client.query(
        `SELECT COUNT(*) as total FROM rgpd_requests WHERE tenant_id = $1 AND type = $2`,
        [tenantId, RGPD_REQUEST_TYPE.DELETE]
      );
      const totalCount = parseInt(totalRes.rows[0].total, 10);

      // Completed deletions
      const completedRes = await client.query(
        `SELECT COUNT(*) as completed, MIN(completed_at) as oldest_completed
         FROM rgpd_requests
         WHERE tenant_id = $1 AND type = $2 AND status = $3`,
        [tenantId, RGPD_REQUEST_TYPE.DELETE, RGPD_REQUEST_STATUS.COMPLETED]
      );
      const completedCount = parseInt(completedRes.rows[0].completed, 10);
      const oldestCompleted = completedRes.rows[0].oldest_completed;

      let oldestCompletedAgeDays: number | null = null;
      if (oldestCompleted) {
        const ageMs = Date.now() - new Date(oldestCompleted).getTime();
        oldestCompletedAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Expired (completed > RGPD_DELETION_RETENTION_DAYS)
      const expiredRes = await client.query(
        `SELECT COUNT(*) as expired
         FROM rgpd_requests
         WHERE tenant_id = $1 AND type = $2 AND status = $3
           AND completed_at < NOW() - $4 * INTERVAL '1 day'`,
        [tenantId, RGPD_REQUEST_TYPE.DELETE, RGPD_REQUEST_STATUS.COMPLETED, RGPD_DELETION_RETENTION_DAYS]
      );
      const expiredCount = parseInt(expiredRes.rows[0].expired, 10);

      return { totalCount, completedCount, expiredCount, oldestCompletedAgeDays };
    });
  }

  async purgeExpiredDeletions(
    tenantId: string,
    retentionDays: number = RGPD_DELETION_RETENTION_DAYS
  ): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for deletion purge");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `DELETE FROM rgpd_requests
         WHERE tenant_id = $1 AND type = $2 AND status = $3
           AND completed_at < NOW() - $4 * INTERVAL '1 day'
         RETURNING id`,
        [tenantId, RGPD_REQUEST_TYPE.DELETE, RGPD_REQUEST_STATUS.COMPLETED, retentionDays]
      );
      return res.rowCount ?? 0;
    });
  }

  // ============================================
  // OPPOSITION STATS & PURGE (Art. 21)
  // ============================================

  async getOppositionStats(tenantId: string): Promise<{
    totalCount: number;
    processedCount: number;
    expiredCount: number;
    oldestProcessedAgeDays: number | null;
  }> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for opposition stats");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Total oppositions
      const totalRes = await client.query(
        `SELECT COUNT(*) as total FROM user_oppositions WHERE tenant_id = $1`,
        [tenantId]
      );
      const totalCount = parseInt(totalRes.rows[0].total, 10);

      // Processed oppositions (ACCEPTED or REJECTED)
      const processedRes = await client.query(
        `SELECT COUNT(*) as processed, MIN(reviewed_at) as oldest_reviewed
         FROM user_oppositions
         WHERE tenant_id = $1 AND status IN ('ACCEPTED', 'REJECTED')`,
        [tenantId]
      );
      const processedCount = parseInt(processedRes.rows[0].processed, 10);
      const oldestReviewed = processedRes.rows[0].oldest_reviewed;

      let oldestProcessedAgeDays: number | null = null;
      if (oldestReviewed) {
        const ageMs = Date.now() - new Date(oldestReviewed).getTime();
        oldestProcessedAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Expired (reviewed > RGPD_OPPOSITION_RETENTION_DAYS)
      const expiredRes = await client.query(
        `SELECT COUNT(*) as expired
         FROM user_oppositions
         WHERE tenant_id = $1 AND status IN ('ACCEPTED', 'REJECTED')
           AND reviewed_at < NOW() - $2 * INTERVAL '1 day'`,
        [tenantId, RGPD_OPPOSITION_RETENTION_DAYS]
      );
      const expiredCount = parseInt(expiredRes.rows[0].expired, 10);

      return { totalCount, processedCount, expiredCount, oldestProcessedAgeDays };
    });
  }

  async purgeExpiredOppositions(
    tenantId: string,
    retentionDays: number = RGPD_OPPOSITION_RETENTION_DAYS
  ): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for opposition purge");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `DELETE FROM user_oppositions
         WHERE tenant_id = $1 AND status IN ('ACCEPTED', 'REJECTED')
           AND reviewed_at < NOW() - $2 * INTERVAL '1 day'
         RETURNING id`,
        [tenantId, retentionDays]
      );
      return res.rowCount ?? 0;
    });
  }

  // ============================================
  // SUSPENSION STATS & PURGE (Art. 18)
  // ============================================

  /**
   * NOTE: Current implementation uses columns on `users` table (data_suspended,
   * data_suspended_at, data_suspended_reason). When a user is unsuspended,
   * data_suspended becomes false and the suspension info is cleared.
   *
   * The user_suspensions table can be used for historical tracking if needed,
   * but the current system only tracks active suspensions on the users table.
   */

  async getSuspensionStats(tenantId: string): Promise<{
    totalCount: number;
    activeCount: number;
    liftedCount: number;
    expiredCount: number;
    oldestLiftedAgeDays: number | null;
  }> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for suspension stats");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Count active suspensions from users table (current implementation)
      const activeRes = await client.query(
        `SELECT COUNT(*) as active, MIN(data_suspended_at) as oldest_suspended
         FROM users
         WHERE tenant_id = $1 AND data_suspended = true AND deleted_at IS NULL`,
        [tenantId]
      );
      const activeCount = parseInt(activeRes.rows[0].active, 10);
      const oldestSuspended = activeRes.rows[0].oldest_suspended;

      // Calculate oldest active suspension age in days
      let oldestLiftedAgeDays: number | null = null;
      if (oldestSuspended) {
        const ageMs = Date.now() - new Date(oldestSuspended).getTime();
        oldestLiftedAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Check if user_suspensions table has historical data
      let liftedCount = 0;
      let expiredCount = 0;
      let oldestLiftedFromHistory: number | null = null;

      try {
        // Try to get lifted suspensions from history table (if it exists and has data)
        const liftedRes = await client.query(
          `SELECT COUNT(*) as lifted, MIN(lifted_at) as oldest_lifted
           FROM user_suspensions
           WHERE tenant_id = $1 AND status = 'LIFTED'`,
          [tenantId]
        );
        liftedCount = parseInt(liftedRes.rows[0].lifted, 10);
        const oldestLifted = liftedRes.rows[0].oldest_lifted;

        if (oldestLifted) {
          const ageMs = Date.now() - new Date(oldestLifted).getTime();
          oldestLiftedFromHistory = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        }

        // Expired (lifted > RGPD_SUSPENSION_RETENTION_DAYS)
        const expiredRes = await client.query(
          `SELECT COUNT(*) as expired
           FROM user_suspensions
           WHERE tenant_id = $1 AND status = 'LIFTED'
             AND lifted_at < NOW() - $2 * INTERVAL '1 day'`,
          [tenantId, RGPD_SUSPENSION_RETENTION_DAYS]
        );
        expiredCount = parseInt(expiredRes.rows[0].expired, 10);
      } catch {
        // Table might not exist or be empty - that's OK, use defaults
        liftedCount = 0;
        expiredCount = 0;
      }

      // Use the oldest from history if available, otherwise use active suspension age
      const finalOldestAge = oldestLiftedFromHistory ?? oldestLiftedAgeDays;

      return {
        totalCount: activeCount + liftedCount,
        activeCount,
        liftedCount,
        expiredCount,
        oldestLiftedAgeDays: finalOldestAge,
      };
    });
  }

  async purgeExpiredSuspensions(
    tenantId: string,
    retentionDays: number = RGPD_SUSPENSION_RETENTION_DAYS
  ): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for suspension purge");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      try {
        // Purge from history table (if it exists)
        const res = await client.query(
          `DELETE FROM user_suspensions
           WHERE tenant_id = $1 AND status = 'LIFTED'
             AND lifted_at < NOW() - $2 * INTERVAL '1 day'
           RETURNING id`,
          [tenantId, retentionDays]
        );
        return res.rowCount ?? 0;
      } catch {
        // Table might not exist - nothing to purge
        return 0;
      }
    });
  }

  // ============================================
  // CONTEST STATS & PURGE (Art. 22)
  // ============================================

  async getContestStats(tenantId: string): Promise<{
    totalCount: number;
    resolvedCount: number;
    expiredCount: number;
    oldestResolvedAgeDays: number | null;
  }> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for contest stats");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Total contests
      const totalRes = await client.query(
        `SELECT COUNT(*) as total FROM user_disputes WHERE tenant_id = $1`,
        [tenantId]
      );
      const totalCount = parseInt(totalRes.rows[0].total, 10);

      // Resolved contests
      const resolvedRes = await client.query(
        `SELECT COUNT(*) as resolved, MIN(resolved_at) as oldest_resolved
         FROM user_disputes
         WHERE tenant_id = $1 AND status IN ('resolved', 'rejected')`,
        [tenantId]
      );
      const resolvedCount = parseInt(resolvedRes.rows[0].resolved, 10);
      const oldestResolved = resolvedRes.rows[0].oldest_resolved;

      let oldestResolvedAgeDays: number | null = null;
      if (oldestResolved) {
        const ageMs = Date.now() - new Date(oldestResolved).getTime();
        oldestResolvedAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      // Expired (resolved > RGPD_CONTEST_RETENTION_DAYS)
      const expiredRes = await client.query(
        `SELECT COUNT(*) as expired
         FROM user_disputes
         WHERE tenant_id = $1 AND status IN ('resolved', 'rejected')
           AND resolved_at < NOW() - $2 * INTERVAL '1 day'`,
        [tenantId, RGPD_CONTEST_RETENTION_DAYS]
      );
      const expiredCount = parseInt(expiredRes.rows[0].expired, 10);

      return { totalCount, resolvedCount, expiredCount, oldestResolvedAgeDays };
    });
  }

  async purgeExpiredContests(
    tenantId: string,
    retentionDays: number = RGPD_CONTEST_RETENTION_DAYS
  ): Promise<number> {
    if (!tenantId) {
      throw new Error("RGPD VIOLATION: tenantId required for contest purge");
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `DELETE FROM user_disputes
         WHERE tenant_id = $1 AND status IN ('resolved', 'rejected')
           AND resolved_at < NOW() - $2 * INTERVAL '1 day'
         RETURNING id`,
        [tenantId, retentionDays]
      );
      return res.rowCount ?? 0;
    });
  }
}
