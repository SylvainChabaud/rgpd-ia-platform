/**
 * PostgreSQL implementation of DpiaHistoryRepo
 * LOT 12.4 - Historique des échanges DPO/Tenant Admin
 *
 * Classification: P1 (technical metadata)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 *
 * Art. 5.2: Accountability - all decisions are traceable
 * Art. 35: DPIA documentation requirements
 */

import type {
  DpiaHistoryEntry,
  CreateDpiaHistoryInput,
  DpiaHistoryAction,
} from '@/domain/dpia';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext, withPlatformContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';

// =============================================================================
// Row mapper
// =============================================================================

interface DpiaHistoryRow {
  id: string;
  dpia_id: string;
  tenant_id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  comments: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Joined fields
  actor_display_name?: string;
}

function mapRowToHistoryEntry(row: DpiaHistoryRow): DpiaHistoryEntry {
  return {
    id: row.id,
    dpiaId: row.dpia_id,
    tenantId: row.tenant_id,
    action: row.action as DpiaHistoryAction,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    comments: row.comments,
    rejectionReason: row.rejection_reason,
    createdAt: new Date(row.created_at),
    actorDisplayName: row.actor_display_name,
  };
}

// =============================================================================
// Repository
// =============================================================================

export class PgDpiaHistoryRepo {
  /**
   * Create a new history entry
   * CRITICAL: Requires tenant context for RLS
   */
  async create(input: CreateDpiaHistoryInput): Promise<DpiaHistoryEntry> {
    if (!input.tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA history creation');
    }

    return await withTenantContext(pool, input.tenantId, async (client) => {
      const res: QueryResult<DpiaHistoryRow> = await client.query(
        `INSERT INTO dpia_history (
          dpia_id, tenant_id, action, actor_id, actor_role, comments, rejection_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          input.dpiaId,
          input.tenantId,
          input.action,
          input.actorId,
          input.actorRole,
          input.comments || null,
          input.rejectionReason || null,
        ]
      );

      return mapRowToHistoryEntry(res.rows[0]);
    });
  }

  /**
   * Get history for a specific DPIA (tenant-scoped)
   * Returns entries in reverse chronological order (most recent first)
   */
  async findByDpiaId(tenantId: string, dpiaId: string): Promise<DpiaHistoryEntry[]> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA history queries');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DpiaHistoryRow> = await client.query(
        `SELECT
          h.*,
          u.display_name as actor_display_name
        FROM dpia_history h
        LEFT JOIN users u ON h.actor_id = u.id
        WHERE h.dpia_id = $1 AND h.tenant_id = $2
        ORDER BY h.created_at DESC`,
        [dpiaId, tenantId]
      );

      return res.rows.map(mapRowToHistoryEntry);
    });
  }

  /**
   * Get history for a specific DPIA (platform-scoped for SUPERADMIN)
   * Returns entries in reverse chronological order (most recent first)
   */
  async findByDpiaIdPlatform(dpiaId: string): Promise<DpiaHistoryEntry[]> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<DpiaHistoryRow> = await client.query(
        `SELECT
          h.*,
          u.display_name as actor_display_name
        FROM dpia_history h
        LEFT JOIN users u ON h.actor_id = u.id
        WHERE h.dpia_id = $1
        ORDER BY h.created_at DESC`,
        [dpiaId]
      );

      return res.rows.map(mapRowToHistoryEntry);
    });
  }

  /**
   * Get all history entries for a tenant (for audit purposes)
   * Returns entries in reverse chronological order
   */
  async findAllByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ entries: DpiaHistoryEntry[]; total: number }> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for DPIA history queries');
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    return await withTenantContext(pool, tenantId, async (client) => {
      // Get total count
      const countRes = await client.query(
        `SELECT COUNT(*) as total FROM dpia_history WHERE tenant_id = $1`,
        [tenantId]
      );
      const total = parseInt(countRes.rows[0].total, 10);

      // Get paginated entries
      const res: QueryResult<DpiaHistoryRow> = await client.query(
        `SELECT
          h.*,
          u.display_name as actor_display_name
        FROM dpia_history h
        LEFT JOIN users u ON h.actor_id = u.id
        WHERE h.tenant_id = $1
        ORDER BY h.created_at DESC
        LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]
      );

      return {
        entries: res.rows.map(mapRowToHistoryEntry),
        total,
      };
    });
  }
}
