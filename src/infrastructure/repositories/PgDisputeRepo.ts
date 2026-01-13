import type {
  DisputeRepo,
  CreateDisputeInput,
  ReviewDisputeInput,
} from '@/app/ports/DisputeRepo';
import type { UserDispute, DisputeStatus } from '@/domain/legal/UserDispute';
import { DISPUTE_STATUS } from '@/domain/legal/UserDispute';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';
import { randomUUID } from 'crypto';

/**
 * PostgreSQL implementation of DisputeRepo
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: Manage user disputes on automated AI decisions
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - SLA response: 30 days (Art. 12.3)
 * - Human review mandatory (Art. 22 RGPD)
 * - Email notifications mandatory
 *
 * LOT 10.6 — Droits complémentaires Art. 22 (Révision humaine)
 */

interface DisputeRow {
  id: string;
  tenant_id: string;
  user_id: string;
  ai_job_id: string | null;
  reason: string;
  attachment_url: string | null;
  status: DisputeStatus;
  admin_response: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
}

function mapRowToDispute(row: DisputeRow): UserDispute {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    aiJobId: row.ai_job_id,
    reason: row.reason,
    attachmentUrl: row.attachment_url,
    status: row.status,
    adminResponse: row.admin_response,
    reviewedBy: row.reviewed_by,
    createdAt: new Date(row.created_at),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    metadata: row.metadata ?? undefined,
  };
}

export class PgDisputeRepo implements DisputeRepo {
  async findById(tenantId: string, id: string): Promise<UserDispute | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      return res.rowCount ? mapRowToDispute(res.rows[0]) : null;
    });
  }

  async create(tenantId: string, input: CreateDisputeInput): Promise<UserDispute> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute creation');
    }

    // Validation: raison minimale
    const MIN_REASON_LENGTH = 20;
    if (!input.reason || input.reason.trim().length < MIN_REASON_LENGTH) {
      throw new Error(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
    }

    const MAX_REASON_LENGTH = 5000;
    if (input.reason.length > MAX_REASON_LENGTH) {
      throw new Error(`Reason must not exceed ${MAX_REASON_LENGTH} characters`);
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const id = randomUUID();
      const now = new Date();

      const res: QueryResult<DisputeRow> = await client.query(
        `INSERT INTO user_disputes
         (id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
          admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          id,
          tenantId,
          input.userId,
          input.aiJobId ?? null,
          input.reason.trim(),
          input.attachmentUrl ?? null,
          DISPUTE_STATUS.PENDING,
          null,
          null,
          now,
          null,
          null,
          input.metadata ?? null,
        ]
      );

      return mapRowToDispute(res.rows[0]);
    });
  }

  async review(
    tenantId: string,
    id: string,
    review: ReviewDisputeInput
  ): Promise<UserDispute> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute review');
    }

    // Validation: réponse admin obligatoire si resolved/rejected
    if ((review.status === DISPUTE_STATUS.RESOLVED || review.status === DISPUTE_STATUS.REJECTED) && !review.adminResponse) {
      throw new Error('Admin response is required when resolving or rejecting a dispute');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Vérifier que dispute existe et est modifiable
      const checkRes: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      if (checkRes.rowCount === 0) {
        throw new Error('Dispute not found');
      }

      const dispute = mapRowToDispute(checkRes.rows[0]);
      if (dispute.status !== DISPUTE_STATUS.PENDING && dispute.status !== DISPUTE_STATUS.UNDER_REVIEW) {
        throw new Error('Only pending or under_review disputes can be updated');
      }

      // Mettre à jour
      const now = new Date();
      const isResolved = review.status === DISPUTE_STATUS.RESOLVED || review.status === DISPUTE_STATUS.REJECTED;

      const updateRes: QueryResult<DisputeRow> = await client.query(
        `UPDATE user_disputes
         SET status = $1,
             admin_response = COALESCE($2, admin_response),
             reviewed_by = $3,
             reviewed_at = $4,
             resolved_at = CASE WHEN $5 THEN $6 ELSE resolved_at END
         WHERE tenant_id = $7 AND id = $8
         RETURNING *`,
        [
          review.status,
          review.adminResponse ?? null,
          review.reviewedBy,
          now,
          isResolved,
          isResolved ? now : null,
          tenantId,
          id,
        ]
      );

      return mapRowToDispute(updateRes.rows[0]);
    });
  }

  async findByUser(tenantId: string, userId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId, userId]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async findByTenant(tenantId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async findByAiJob(tenantId: string, aiJobId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND ai_job_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId, aiJobId]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async findPending(tenantId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND status = $2 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId, DISPUTE_STATUS.PENDING]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async findUnderReview(tenantId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1 AND status = $2 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId, DISPUTE_STATUS.UNDER_REVIEW]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async findExceedingSla(tenantId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    const SLA_DAYS = 30;

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1
           AND status IN ($2, $3)
           AND created_at < NOW() - INTERVAL '${SLA_DAYS} days'
           AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId, DISPUTE_STATUS.PENDING, DISPUTE_STATUS.UNDER_REVIEW]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async countPending(tenantId: string): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT COUNT(*) as count
         FROM user_disputes
         WHERE tenant_id = $1 AND status = $2 AND deleted_at IS NULL`,
        [tenantId, DISPUTE_STATUS.PENDING]
      );

      return parseInt(res.rows[0].count, 10);
    });
  }

  async findWithExpiredAttachments(tenantId: string): Promise<UserDispute[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute query');
    }

    const ATTACHMENT_TTL_DAYS = 90;

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<DisputeRow> = await client.query(
        `SELECT id, tenant_id, user_id, ai_job_id, reason, attachment_url, status,
                admin_response, reviewed_by, created_at, reviewed_at, resolved_at, metadata
         FROM user_disputes
         WHERE tenant_id = $1
           AND attachment_url IS NOT NULL
           AND created_at < NOW() - INTERVAL '${ATTACHMENT_TTL_DAYS} days'
           AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId]
      );

      return res.rows.map(mapRowToDispute);
    });
  }

  async softDeleteByUser(tenantId: string, userId: string): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute soft delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE user_disputes
         SET deleted_at = NOW()
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async hardDeleteByUser(tenantId: string, userId: string): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for dispute hard delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `DELETE FROM user_disputes
         WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }
}
