import type {
  ConsentRepo,
  Consent,
  CreateConsentInput,
  PurposeIdentifier,
} from "@/app/ports/ConsentRepo";
import { pool } from "@/infrastructure/db/pg";
import { withTenantContext } from "@/infrastructure/db/tenantContext";
import type { QueryResult } from "pg";

/**
 * PostgreSQL implementation of ConsentRepo
 *
 * Classification: P2 (personal data)
 * CRITICAL RGPD: ALL queries MUST include tenant_id for isolation
 *
 * LOT 4.0 — Stockage IA & données utilisateur RGPD
 * LOT 12.2 — Enhanced with purposeId support for strong purpose-consent link
 */

interface ConsentRow {
  id: string;
  tenant_id: string;
  user_id: string;
  purpose: string;
  purpose_id: string | null;
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
    purposeId: row.purpose_id,
    granted: row.granted,
    grantedAt: row.granted_at ? new Date(row.granted_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Helper to normalize purpose identifier for queries
 * Supports both legacy string and new PurposeIdentifier object
 */
function normalizePurposeIdentifier(
  purposeIdentifier: string | PurposeIdentifier
): PurposeIdentifier {
  if (typeof purposeIdentifier === 'string') {
    // Legacy: treat as label
    return { type: 'label', value: purposeIdentifier };
  }
  return purposeIdentifier;
}

export class PgConsentRepo implements ConsentRepo {
  async findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ): Promise<Consent | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent queries"
      );
    }

    const identifier = normalizePurposeIdentifier(purposeIdentifier);

    return await withTenantContext(pool, tenantId, async (client) => {
      let res: QueryResult<ConsentRow>;

      if (identifier.type === 'purposeId') {
        // LOT 12.2: Query by purpose_id UUID (strong link)
        res = await client.query(
          `SELECT id, tenant_id, user_id, purpose, purpose_id, granted, granted_at, revoked_at, created_at
           FROM consents
           WHERE tenant_id = $1 AND user_id = $2 AND purpose_id = $3
           ORDER BY created_at DESC
           LIMIT 1`,
          [tenantId, userId, identifier.value]
        );
      } else {
        // Legacy: Query by purpose label string
        // Also check purpose_id by looking up the purpose in purposes table
        res = await client.query(
          `SELECT c.id, c.tenant_id, c.user_id, c.purpose, c.purpose_id, c.granted, c.granted_at, c.revoked_at, c.created_at
           FROM consents c
           WHERE c.tenant_id = $1 AND c.user_id = $2
             AND (c.purpose = $3 OR c.purpose_id IN (
               SELECT p.id FROM purposes p
               WHERE p.tenant_id = $1 AND p.label = $3 AND p.deleted_at IS NULL
             ))
           ORDER BY c.created_at DESC
           LIMIT 1`,
          [tenantId, userId, identifier.value]
        );
      }

      return res.rowCount ? mapRowToConsent(res.rows[0]) : null;
    });
  }

  async create(tenantId: string, input: CreateConsentInput): Promise<void> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent storage"
      );
    }

    await withTenantContext(pool, tenantId, async (client) => {
      // LOT 12.2: Support purposeId for strong link
      await client.query(
        `INSERT INTO consents (tenant_id, user_id, purpose, purpose_id, granted, granted_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          input.userId,
          input.purpose,
          input.purposeId || null,
          input.granted,
          input.grantedAt || null,
        ]
      );
    });
  }

  async findByUser(tenantId: string, userId: string): Promise<Consent[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent queries"
      );
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<ConsentRow> = await client.query(
        `SELECT id, tenant_id, user_id, purpose, purpose_id, granted, granted_at, revoked_at, created_at
         FROM consents
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId, userId]
      );

      return res.rows.map(mapRowToConsent);
    });
  }

  async revoke(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ): Promise<void> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error(
        "RGPD VIOLATION: tenantId required for consent revocation"
      );
    }

    const identifier = normalizePurposeIdentifier(purposeIdentifier);

    await withTenantContext(pool, tenantId, async (client) => {
      if (identifier.type === 'purposeId') {
        // LOT 12.2: Revoke by purpose_id UUID (strong link)
        await client.query(
          `UPDATE consents
           SET granted = false, revoked_at = NOW()
           WHERE tenant_id = $1 AND user_id = $2 AND purpose_id = $3
           AND id = (
             SELECT id FROM consents
             WHERE tenant_id = $1 AND user_id = $2 AND purpose_id = $3
             ORDER BY created_at DESC
             LIMIT 1
           )`,
          [tenantId, userId, identifier.value]
        );
      } else {
        // Legacy: Revoke by purpose label string
        await client.query(
          `UPDATE consents
           SET granted = false, revoked_at = NOW()
           WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
           AND id = (
             SELECT id FROM consents
             WHERE tenant_id = $1 AND user_id = $2 AND purpose = $3
             ORDER BY created_at DESC
             LIMIT 1
           )`,
          [tenantId, userId, identifier.value]
        );
      }
    });
  }

  async softDeleteByUser(tenantId: string, userId: string): Promise<number> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for consent soft delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE consents
         SET deleted_at = NOW()
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async hardDeleteByUser(tenantId: string, userId: string): Promise<number> {
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for consent hard delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `DELETE FROM consents
         WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }
}
