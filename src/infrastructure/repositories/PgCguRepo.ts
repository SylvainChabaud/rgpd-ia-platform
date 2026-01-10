import type {
  CguRepo,
  CreateCguVersionInput,
  CreateCguAcceptanceInput,
} from '@/app/ports/CguRepo';
import type { CguVersion } from '@/domain/legal/CguVersion';
import type { CguAcceptance } from '@/domain/legal/CguAcceptance';
import { pool } from '@/infrastructure/db/pg';
import { withPlatformContext, withTenantContext } from '@/infrastructure/db/tenantContext';
import type { QueryResult } from 'pg';
import { randomUUID } from 'crypto';

/**
 * PostgreSQL implementation of CguRepo
 *
 * Classification:
 * - CGU versions: P0 (public content)
 * - CGU acceptances: P1 (metadata, tenant-scoped)
 *
 * Purpose: Manage CGU versions and user acceptances
 *
 * CRITICAL RGPD:
 * - CGU versions use withPlatformContext (public, no tenant isolation)
 * - CGU acceptances use withTenantContext (strict tenant isolation)
 * - IP addresses anonymized after 7 days (EPIC 8)
 * - Versioning ensures users accept current version
 *
 * LOT 10.1 — CGU / CGV (Art. 13-14 RGPD)
 */

interface CguVersionRow {
  id: string;
  version: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  summary: string | null;
}

interface CguAcceptanceRow {
  id: string;
  tenant_id: string;
  user_id: string;
  cgu_version_id: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  acceptance_method: 'checkbox' | 'button' | 'api';
}

function mapRowToCguVersion(row: CguVersionRow): CguVersion {
  return {
    id: row.id,
    version: row.version,
    content: row.content,
    effectiveDate: new Date(row.effective_date),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    summary: row.summary ?? undefined,
  };
}

function mapRowToCguAcceptance(row: CguAcceptanceRow): CguAcceptance {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    cguVersionId: row.cgu_version_id,
    acceptedAt: new Date(row.accepted_at),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    acceptanceMethod: row.acceptance_method,
  };
}

export class PgCguRepo implements CguRepo {
  // ===== CGU VERSIONS (Public, P0) =====

  async findActiveVersion(): Promise<CguVersion | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CguVersionRow> = await client.query(
        `SELECT id, version, content, effective_date, is_active, created_at, summary
         FROM cgu_versions
         WHERE is_active = true AND effective_date <= NOW()
         ORDER BY effective_date DESC
         LIMIT 1`
      );

      return res.rowCount ? mapRowToCguVersion(res.rows[0]) : null;
    });
  }

  async findVersionById(id: string): Promise<CguVersion | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CguVersionRow> = await client.query(
        `SELECT id, version, content, effective_date, is_active, created_at, summary
         FROM cgu_versions
         WHERE id = $1`,
        [id]
      );

      return res.rowCount ? mapRowToCguVersion(res.rows[0]) : null;
    });
  }

  async findVersionByNumber(version: string): Promise<CguVersion | null> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CguVersionRow> = await client.query(
        `SELECT id, version, content, effective_date, is_active, created_at, summary
         FROM cgu_versions
         WHERE version = $1`,
        [version]
      );

      return res.rowCount ? mapRowToCguVersion(res.rows[0]) : null;
    });
  }

  async findAllVersions(): Promise<CguVersion[]> {
    return await withPlatformContext(pool, async (client) => {
      const res: QueryResult<CguVersionRow> = await client.query(
        `SELECT id, version, content, effective_date, is_active, created_at, summary
         FROM cgu_versions
         ORDER BY effective_date DESC`
      );

      return res.rows.map(mapRowToCguVersion);
    });
  }

  async createVersion(input: CreateCguVersionInput): Promise<CguVersion> {
    // Validation: format version semver
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(input.version)) {
      throw new Error('Version must follow semantic versioning (X.Y.Z)');
    }

    // Validation: contenu non vide
    if (!input.content || input.content.trim().length === 0) {
      throw new Error('CGU content cannot be empty');
    }

    return await withPlatformContext(pool, async (client) => {
      const id = randomUUID();
      const now = new Date();

      const res: QueryResult<CguVersionRow> = await client.query(
        `INSERT INTO cgu_versions
         (id, version, content, effective_date, is_active, created_at, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          id,
          input.version,
          input.content,
          input.effectiveDate,
          false,  // Par défaut, non active (activation manuelle)
          now,
          input.summary ?? null,
        ]
      );

      return mapRowToCguVersion(res.rows[0]);
    });
  }

  async activateVersion(versionId: string): Promise<void> {
    return await withPlatformContext(pool, async (client) => {
      // Vérifier que la version existe et est effective
      const checkRes: QueryResult<CguVersionRow> = await client.query(
        `SELECT id, version, content, effective_date, is_active, created_at, summary
         FROM cgu_versions
         WHERE id = $1`,
        [versionId]
      );

      if (checkRes.rowCount === 0) {
        throw new Error('CGU version not found');
      }

      const version = mapRowToCguVersion(checkRes.rows[0]);
      if (version.effectiveDate > new Date()) {
        throw new Error('Cannot activate a version with future effective date');
      }

      // Désactiver toutes les versions actives
      await client.query(
        `UPDATE cgu_versions SET is_active = false WHERE is_active = true`
      );

      // Activer la version cible
      await client.query(
        `UPDATE cgu_versions SET is_active = true WHERE id = $1`,
        [versionId]
      );
    });
  }

  // ===== CGU ACCEPTANCES (Tenant-scoped, P1) =====

  async recordAcceptance(
    tenantId: string,
    input: CreateCguAcceptanceInput
  ): Promise<CguAcceptance> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for CGU acceptance');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      // Vérifier si user a déjà accepté cette version
      const existingRes = await client.query(
        `SELECT id FROM user_cgu_acceptances
         WHERE tenant_id = $1 AND user_id = $2 AND cgu_version_id = $3`,
        [tenantId, input.userId, input.cguVersionId]
      );

      if (existingRes.rowCount && existingRes.rowCount > 0) {
        throw new Error('User has already accepted this CGU version');
      }

      const id = randomUUID();
      const now = new Date();

      const res: QueryResult<CguAcceptanceRow> = await client.query(
        `INSERT INTO user_cgu_acceptances
         (id, tenant_id, user_id, cgu_version_id, accepted_at, ip_address, user_agent, acceptance_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          tenantId,
          input.userId,
          input.cguVersionId,
          now,
          input.ipAddress ?? null,
          input.userAgent ?? null,
          input.acceptanceMethod,
        ]
      );

      return mapRowToCguAcceptance(res.rows[0]);
    });
  }

  async findUserAcceptanceOfActiveVersion(
    tenantId: string,
    userId: string
  ): Promise<CguAcceptance | null> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for CGU acceptance query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<CguAcceptanceRow> = await client.query(
        `SELECT a.id, a.tenant_id, a.user_id, a.cgu_version_id, a.accepted_at,
                a.ip_address, a.user_agent, a.acceptance_method
         FROM user_cgu_acceptances a
         INNER JOIN cgu_versions v ON v.id = a.cgu_version_id
         WHERE a.tenant_id = $1 AND a.user_id = $2 AND v.is_active = true
         LIMIT 1`,
        [tenantId, userId]
      );

      return res.rowCount ? mapRowToCguAcceptance(res.rows[0]) : null;
    });
  }

  async hasUserAcceptedActiveVersion(
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    const acceptance = await this.findUserAcceptanceOfActiveVersion(tenantId, userId);
    return acceptance !== null;
  }

  async findAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<CguAcceptance[]> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for CGU acceptance query');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const res: QueryResult<CguAcceptanceRow> = await client.query(
        `SELECT id, tenant_id, user_id, cgu_version_id, accepted_at,
                ip_address, user_agent, acceptance_method
         FROM user_cgu_acceptances
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
         ORDER BY accepted_at DESC`,
        [tenantId, userId]
      );

      return res.rows.map(mapRowToCguAcceptance);
    });
  }

  async anonymizeOldIpAddresses(): Promise<number> {
    return await withPlatformContext(pool, async (client) => {
      // Anonymiser les IP > 7 jours (EPIC 8)
      const result = await client.query(
        `UPDATE user_cgu_acceptances
         SET ip_address = NULL
         WHERE ip_address IS NOT NULL
           AND accepted_at < NOW() - INTERVAL '7 days'`
      );
      return result.rowCount ?? 0;
    });
  }

  async softDeleteAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for CGU acceptance soft delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE user_cgu_acceptances
         SET deleted_at = NOW()
         WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async hardDeleteAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<number> {
    // BLOCKER: validate tenantId is provided (RGPD isolation)
    if (!tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required for CGU acceptance hard delete');
    }

    return await withTenantContext(pool, tenantId, async (client) => {
      const result = await client.query(
        `DELETE FROM user_cgu_acceptances
         WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      return result.rowCount ?? 0;
    });
  }
}
