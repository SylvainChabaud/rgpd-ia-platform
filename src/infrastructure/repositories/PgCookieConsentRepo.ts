import type { CookieConsentRepo, CreateCookieConsentInput, UpdateCookieConsentInput } from '@/app/ports/CookieConsentRepo';
import type { CookieConsent } from '@/domain/legal/CookieConsent';
import { pool } from '@/infrastructure/db/pg';
import { withPlatformContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';
import { randomUUID } from 'crypto';

/**
 * PostgreSQL implementation of CookieConsentRepo
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: Store and manage cookie consent preferences
 *
 * CRITICAL RGPD:
 * - Supports both authenticated users (userId) and anonymous visitors (anonymousId)
 * - TTL 12 months (CNIL standard)
 * - Uses withPlatformContext (no tenant isolation for cookie consents)
 * - Necessary cookies always TRUE (non-modifiable)
 *
 * LOT 10.3 — Cookie Consent Banner (ePrivacy Directive Art. 5.3)
 */

interface CookieConsentRow {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  anonymous_id: string | null;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

function mapRowToCookieConsent(row: CookieConsentRow): CookieConsent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    anonymousId: row.anonymous_id,
    necessary: row.necessary,
    analytics: row.analytics,
    marketing: row.marketing,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: new Date(row.expires_at),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  };
}

export class PgCookieConsentRepo implements CookieConsentRepo {
  async findByUser(userId: string): Promise<CookieConsent | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CookieConsentRow> = await client.query(
        `SELECT id, tenant_id, user_id, anonymous_id, necessary, analytics, marketing,
                created_at, updated_at, expires_at, ip_address, user_agent
         FROM cookie_consents
         WHERE user_id = $1 AND expires_at > NOW() AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      return res.rowCount ? mapRowToCookieConsent(res.rows[0]) : null;
    });
  }

  async findByAnonymousId(anonymousId: string): Promise<CookieConsent | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CookieConsentRow> = await client.query(
        `SELECT id, tenant_id, user_id, anonymous_id, necessary, analytics, marketing,
                created_at, updated_at, expires_at, ip_address, user_agent
         FROM cookie_consents
         WHERE anonymous_id = $1 AND expires_at > NOW() AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [anonymousId]
      );

      return res.rowCount ? mapRowToCookieConsent(res.rows[0]) : null;
    });
  }

  async findById(id: string): Promise<CookieConsent | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CookieConsentRow> = await client.query(
        `SELECT id, tenant_id, user_id, anonymous_id, necessary, analytics, marketing,
                created_at, updated_at, expires_at, ip_address, user_agent
         FROM cookie_consents
         WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      return res.rowCount ? mapRowToCookieConsent(res.rows[0]) : null;
    });
  }

  async save(input: CreateCookieConsentInput): Promise<CookieConsent> {
    // Validation: soit userId, soit anonymousId (pas les deux)
    if (!input.userId && !input.anonymousId) {
      throw new Error('Either userId or anonymousId is required');
    }
    if (input.userId && input.anonymousId) {
      throw new Error('Cannot have both userId and anonymousId');
    }

    return await withPlatformContext(pool, async (client) => {
      const id = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 12);  // TTL 12 mois

      const res: QueryResult<CookieConsentRow> = await client.query(
        `INSERT INTO cookie_consents
         (id, tenant_id, user_id, anonymous_id, necessary, analytics, marketing,
          created_at, updated_at, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          id,
          input.tenantId ?? null,
          input.userId ?? null,
          input.anonymousId ?? null,
          true,  // Necessary toujours true
          input.analytics,
          input.marketing,
          now,
          now,
          expiresAt,
          input.ipAddress ?? null,
          input.userAgent ?? null,
        ]
      );

      return mapRowToCookieConsent(res.rows[0]);
    });
  }

  async update(id: string, updates: UpdateCookieConsentInput): Promise<CookieConsent> {
    return await withPlatformContext(pool, async (client) => {
      const now = new Date();

      const res: QueryResult<CookieConsentRow> = await client.query(
        `UPDATE cookie_consents
         SET analytics = COALESCE($1, analytics),
             marketing = COALESCE($2, marketing),
             updated_at = $3
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [
          updates.analytics ?? null,
          updates.marketing ?? null,
          now,
          id,
        ]
      );

      if (res.rowCount === 0) {
        throw new Error('Cookie consent not found');
      }

      return mapRowToCookieConsent(res.rows[0]);
    });
  }

  async deleteExpired(): Promise<number> {
    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `DELETE FROM cookie_consents
         WHERE expires_at < NOW()`
      );
      return result.rowCount ?? 0;
    });
  }

  async softDeleteByUser(userId: string): Promise<number> {
    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `UPDATE cookie_consents
         SET deleted_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async hardDeleteByUser(userId: string): Promise<number> {
    return await withPlatformContext(pool, async (client) => {
      const result = await client.query(
        `DELETE FROM cookie_consents
         WHERE user_id = $1`,
        [userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async findAllByUser(userId: string): Promise<CookieConsent[]> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CookieConsentRow> = await client.query(
        `SELECT id, tenant_id, user_id, anonymous_id, necessary, analytics, marketing,
                created_at, updated_at, expires_at, ip_address, user_agent
         FROM cookie_consents
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [userId]
      );

      return res.rows.map(mapRowToCookieConsent);
    });
  }
}
