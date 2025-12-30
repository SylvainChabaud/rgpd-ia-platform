import type {
  AiJobRepo,
  AiJob,
  AiJobStatus,
  CreateAiJobInput,
  UpdateAiJobStatusInput,
} from "@/app/ports/AiJobRepo";
import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import type { QueryResult } from "pg";
import { newId } from "@/shared/ids";

/**
 * PostgreSQL implementation of AiJobRepo
 *
 * Classification: P1 (metadata only)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 * CRITICAL SECURITY: NO CONTENT storage (prompts, outputs, embeddings)
 *
 * LOT 4.0 — Stockage IA & données utilisateur RGPD
 */

interface AiJobRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  purpose: string;
  model_ref: string | null;
  status: AiJobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function mapRowToAiJob(row: AiJobRow): AiJob {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    purpose: row.purpose,
    modelRef: row.model_ref,
    status: row.status,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

export class PgAiJobRepo implements AiJobRepo {
  async create(tenantId: string, input: CreateAiJobInput): Promise<string> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for AI job storage"
      );
    }

    // BLOCKER: validate purpose is not empty (DB constraint)
    if (!input.purpose || input.purpose.trim() === "") {
      throw new Error("AI job purpose is required");
    }

    const id = newId();

    await withTenantContext(pool, tenantId, async (client) => {
      await client.query(
        `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, model_ref, status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
        [
          id,
          tenantId,
          input.userId || null,
          input.purpose,
          input.modelRef || null,
        ]
      );
    });

    return id;
  }

  async updateStatus(
    tenantId: string,
    jobId: string,
    input: UpdateAiJobStatusInput
  ): Promise<void> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for AI job updates"
      );
    }

    await withTenantContext(pool, tenantId, async (client) => {
      // Update status only if job belongs to tenant (isolation enforcement)
      const res = await client.query(
        `UPDATE ai_jobs
         SET status = $1,
             started_at = COALESCE($2, started_at),
             completed_at = COALESCE($3, completed_at)
         WHERE id = $4 AND tenant_id = $5`,
        [
          input.status,
          input.startedAt || null,
          input.completedAt || null,
          jobId,
          tenantId,
        ]
      );

      if (res.rowCount === 0) {
        throw new Error(`AI job ${jobId} not found or access denied`);
      }
    });
  }

  async findById(tenantId: string, jobId: string): Promise<AiJob | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for AI job queries"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<AiJobRow> = await client.query(
        `SELECT id, tenant_id, user_id, purpose, model_ref, status,
                created_at, started_at, completed_at
         FROM ai_jobs
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [jobId, tenantId]
      );

      return res.rowCount ? mapRowToAiJob(res.rows[0]) : null;
    });
  }

  async findByUser(
    tenantId: string,
    userId: string,
    limit = 100
  ): Promise<AiJob[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for AI job queries"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<AiJobRow> = await client.query(
        `SELECT id, tenant_id, user_id, purpose, model_ref, status,
                created_at, started_at, completed_at
         FROM ai_jobs
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [tenantId, userId, limit]
      );

      return res.rows.map(mapRowToAiJob);
    });
  }
}
