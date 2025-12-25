import type {
  ConsentRepo,
  Consent,
  CreateConsentInput,
} from "@/app/ports/ConsentRepo";
import { pool } from "@/infrastructure/db/pg";
import type { QueryResult } from "pg";

/**
 * PostgreSQL implementation of ConsentRepo
 *
 * Classification: P2 (personal data)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 *
 * LOT 4.0 — Stockage IA & données utilisateur RGPD
 */

interface ConsentRow {
  id: string;
  tenant_id: string;
  user_id: string;
  purpose: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function mapRowToConsent(row: ConsentRow): Consent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    purpose: row.purpose,
    granted: row.granted,
    grantedAt: row.granted_at ? new Date(row.granted_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export class PgConsentRepo implements ConsentRepo {
  async findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purpose: string
  ): Promise<Consent | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent queries"
      );
    }

    const res: QueryResult<ConsentRow> = await pool.query(
      `SELECT id, tenant_id, user_id, purpose, granted, granted_at, revoked_at, created_at
       FROM consents
       WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, userId, purpose]
    );

    return res.rowCount ? mapRowToConsent(res.rows[0]) : null;
  }

  async create(tenantId: string, input: CreateConsentInput): Promise<void> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent storage"
      );
    }

    await pool.query(
      `INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        tenantId,
        input.userId,
        input.purpose,
        input.granted,
        input.grantedAt || null,
      ]
    );
  }

  async findByUser(tenantId: string, userId: string): Promise<Consent[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent queries"
      );
    }

    const res: QueryResult<ConsentRow> = await pool.query(
      `SELECT id, tenant_id, user_id, purpose, granted, granted_at, revoked_at, created_at
       FROM consents
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [tenantId, userId]
    );

    return res.rows.map(mapRowToConsent);
  }

  async revoke(
    tenantId: string,
    userId: string,
    purpose: string
  ): Promise<void> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent revocation"
      );
    }

    // Update latest consent record: set granted=false and revoked_at=NOW()
    await pool.query(
      `UPDATE consents
       SET granted = false, revoked_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
       AND id = (
         SELECT id FROM consents
         WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [tenantId, userId, purpose]
    );
  }
}
