import type {
  OppositionRepo,
  CreateOppositionInput,
  ReviewOppositionInput,
} from '@/app/ports/OppositionRepo';
import type { UserOpposition, OppositionStatus, TreatmentType } from '@/domain/legal/UserOpposition';
import { OPPOSITION_STATUS } from '@/domain/legal/UserOpposition';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';
import { randomUUID } from 'crypto';

/**
 * PostgreSQL implementation of OppositionRepo
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: Manage user oppositions to data processing
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - SLA response: 30 days (Art. 12.3)
 * - Email notifications mandatory
 *
 * LOT 10.6 — Droits complémentaires Art. 21 (Opposition)
 */

interface OppositionRow {
  id: string;
  tenant_id: string;
  user_id: string;
  treatment_type: TreatmentType;
  reason: string;
  status: OppositionStatus;
  admin_response: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
}

function mapRowToOpposition(row: OppositionRow): UserOpposition {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    treatmentType: row.treatment_type,
    reason: row.reason,
    status: row.status,
    adminResponse: row.admin_response,
    reviewedBy: row.reviewed_by,
    createdAt: new Date(row.created_at),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    metadata: row.metadata ?? undefined,
  };
}

export class PgOppositionRepo implements OppositionRepo {
  async findById(tenantId: string, id: string): Promise<UserOpposition | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      return res.rowCount ? mapRowToOpposition(res.rows[0]) : null;
    });
  }

  async create(tenantId: string, input: CreateOppositionInput): Promise<UserOpposition> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition creation');
    }

    // Validation: raison minimale
    const MIN_REASON_LENGTH = 10;
    if (!input.reason || input.reason.trim().length < MIN_REASON_LENGTH) {
      throw new Error(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
    }

    const MAX_REASON_LENGTH = 2000;
    if (input.reason.length > MAX_REASON_LENGTH) {
      throw new Error(`Reason must not exceed ${MAX_REASON_LENGTH} characters`);
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const id = randomUUID();
      const now = new Date();

      const res: QueryResult<OppositionRow> = await client.query(
        `INSERT INTO user_oppositions
         (id, tenant_id, user_id, treatment_type, reason, status,
          admin_response, reviewed_by, created_at, reviewed_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id,
          tenantId,
          input.userId,
          input.treatmentType,
          input.reason.trim(),
          OPPOSITION_STATUS.PENDING,
          null,
          null,
          now,
          null,
          input.metadata ?? null,
        ]
      );

      return mapRowToOpposition(res.rows[0]);
    });
  }

  async review(
    tenantId: string,
    id: string,
    review: ReviewOppositionInput
  ): Promise<UserOpposition> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition review');
    }

    // Validation: réponse admin
    const MIN_RESPONSE_LENGTH = 10;
    if (!review.adminResponse || review.adminResponse.trim().length < MIN_RESPONSE_LENGTH) {
      throw new Error('Admin response is required and must be detailed');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Vérifier que opposition existe et est pending
      const checkRes: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [tenantId, id]
      );

      if (checkRes.rowCount === 0) {
        throw new Error('Opposition not found');
      }

      const opposition = mapRowToOpposition(checkRes.rows[0]);
      if (opposition.status !== OPPOSITION_STATUS.PENDING) {
        throw new Error('Only pending oppositions can be reviewed');
      }

      // Mettre à jour
      const now = new Date();
      const updateRes: QueryResult<OppositionRow> = await client.query(
        `UPDATE user_oppositions
         SET status = $1,
             admin_response = $2,
             reviewed_by = $3,
             reviewed_at = $4
         WHERE tenant_id = $5 AND id = $6
         RETURNING *`,
        [review.status, review.adminResponse.trim(), review.reviewedBy, now, tenantId, id]
      );

      return mapRowToOpposition(updateRes.rows[0]);
    });
  }

  async findByUser(tenantId: string, userId: string): Promise<UserOpposition[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId, userId]
      );

      return res.rows.map(mapRowToOpposition);
    });
  }

  async findByTenant(tenantId: string): Promise<UserOpposition[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return res.rows.map(mapRowToOpposition);
    });
  }

  async findPending(tenantId: string): Promise<UserOpposition[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1 AND status = $2 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId, OPPOSITION_STATUS.PENDING]
      );

      return res.rows.map(mapRowToOpposition);
    });
  }

  async findExceedingSla(tenantId: string): Promise<UserOpposition[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    const SLA_DAYS = 30;

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<OppositionRow> = await client.query(
        `SELECT id, tenant_id, user_id, treatment_type, reason, status,
                admin_response, reviewed_by, created_at, reviewed_at, metadata
         FROM user_oppositions
         WHERE tenant_id = $1
           AND status = $2
           AND created_at < NOW() - INTERVAL '${SLA_DAYS} days'
           AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId, OPPOSITION_STATUS.PENDING]
      );

      return res.rows.map(mapRowToOpposition);
    });
  }

  async countPending(tenantId: string): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res = await client.query(
        `SELECT COUNT(*) as count
         FROM user_oppositions
         WHERE tenant_id = $1 AND status = $2 AND deleted_at IS NULL`,
        [tenantId, OPPOSITION_STATUS.PENDING]
      );

      return parseInt(res.rows[0].count, 10);
    });
  }

  async softDeleteByUser(tenantId: string, userId: string): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for opposition soft delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE user_oppositions
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
      throw new Error('RGPD VIOLATION: tenantId required for opposition hard delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `DELETE FROM user_oppositions
         WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }
}
