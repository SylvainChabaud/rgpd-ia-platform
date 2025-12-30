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
} from "@/app/ports/RgpdRequestRepo";
import type { RgpdRequest } from "@/domain/rgpd/DeletionRequest";

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
       WHERE type = 'DELETE'
         AND status = 'PENDING'
         AND scheduled_purge_at IS NOT NULL
         AND scheduled_purge_at <= NOW()
       ORDER BY scheduled_purge_at ASC`
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
           AND type = 'DELETE'
           AND status IN ('PENDING', 'COMPLETED')
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, userId]
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
}
