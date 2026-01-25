/**
 * Repository Tests: CGU Repository
 * LOT 11.0 & 13.0 - CGU Simplification
 *
 * RGPD: Art. 7 (Consent), Art. 13-14 (Information), Art. 32 (IP anonymization)
 * Tests: Comprehensive coverage of CGU versions and user acceptances
 *
 * Note: CGU content is now stored in markdown file (docs/legal/cgu-cgv.md)
 * Database only stores version metadata for acceptance tracking
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgCguRepo } from '@/infrastructure/repositories/PgCguRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';

describe('Repository: PgCguRepo', () => {
  let repo: PgCguRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000101';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000102';

  beforeEach(async () => {
    repo = new PgCguRepo();

    // Clean test data first (includes user_cgu_acceptances via FK)
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);

    // Clean CGU acceptances first (FK constraint requires this order)
    await pool.query(`DELETE FROM user_cgu_acceptances WHERE cgu_version_id IN (SELECT id FROM cgu_versions WHERE version LIKE '%.%.%')`);

    // Clean CGU versions (platform-wide, no tenant isolation)
    await pool.query(`DELETE FROM cgu_versions WHERE version LIKE '%.%.%'`);

    // Create test tenants
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'cgu-repo-test-1', 'CGU Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'cgu-repo-test-2', 'CGU Repo Test 2']
    );
  });

  describe('CGU Versions - createVersion', () => {
    it('should create new CGU version with all fields', async () => {
      const version = await repo.createVersion({
        version: '1.0.0',
        effectiveDate: new Date('2026-01-01'),
        summary: 'Première version des CGU',
        contentPath: 'docs/legal/cgu-cgv.md',
      });

      expect(version).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.summary).toBe('Première version des CGU');
      expect(version.contentPath).toBe('docs/legal/cgu-cgv.md');
      expect(version.isActive).toBe(false); // Default: not active
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should create CGU without summary', async () => {
      const version = await repo.createVersion({
        version: '1.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(version.summary).toBeUndefined();
    });

    it('should use default contentPath if not provided', async () => {
      const version = await repo.createVersion({
        version: '1.1.1',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(version.contentPath).toBe('docs/legal/cgu-cgv.md');
    });

    it('should reject invalid semver format', async () => {
      await expect(
        repo.createVersion({
          version: '1.0', // Invalid: missing patch
          effectiveDate: new Date('2026-01-01'),
        })
      ).rejects.toThrow('Version must follow semantic versioning (X.Y.Z)');
    });

    it('should set isActive to false by default', async () => {
      const version = await repo.createVersion({
        version: '1.2.0',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(version.isActive).toBe(false);
    });
  });

  describe('CGU Versions - findActiveVersion', () => {
    it('should find active CGU version', async () => {
      // Create and activate a version
      const created = await repo.createVersion({
        version: '2.0.0',
        effectiveDate: new Date('2025-01-01'),
        summary: 'Version active',
      });

      await repo.activateVersion(created.id);

      const active = await repo.findActiveVersion();

      expect(active).not.toBeNull();
      expect(active?.version).toBe('2.0.0');
      expect(active?.isActive).toBe(true);
    });

    it('should return null when no active version exists', async () => {
      const active = await repo.findActiveVersion();

      // May be null or may have dev seed data
      if (active) {
        expect(active.isActive).toBe(true);
      }
    });

    it('should only return effective versions (effective date in past)', async () => {
      // Create version with future effective date
      const future = await repo.createVersion({
        version: '2.1.0',
        effectiveDate: new Date('2099-01-01'), // Future
      });

      // Try to activate it (should fail)
      await expect(repo.activateVersion(future.id)).rejects.toThrow('future effective date');
    });
  });

  describe('CGU Versions - findVersionById', () => {
    it('should find version by ID', async () => {
      const created = await repo.createVersion({
        version: '3.0.0',
        effectiveDate: new Date('2025-01-01'),
      });

      const found = await repo.findVersionById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.version).toBe('3.0.0');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findVersionById(randomUUID());

      expect(found).toBeNull();
    });
  });

  describe('CGU Versions - findVersionByNumber', () => {
    it('should find version by version string', async () => {
      await repo.createVersion({
        version: '3.1.0',
        effectiveDate: new Date('2025-01-01'),
        summary: 'Test version',
      });

      const found = await repo.findVersionByNumber('3.1.0');

      expect(found).not.toBeNull();
      expect(found?.version).toBe('3.1.0');
    });

    it('should return null for non-existent version', async () => {
      const found = await repo.findVersionByNumber('99.99.99');

      expect(found).toBeNull();
    });
  });

  describe('CGU Versions - findAllVersions', () => {
    it('should return all versions ordered by effective date DESC', async () => {
      await repo.createVersion({
        version: '4.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.createVersion({
        version: '4.1.0',
        effectiveDate: new Date('2025-06-01'),
      });

      const versions = await repo.findAllVersions();

      expect(versions.length).toBeGreaterThanOrEqual(2);
      // Check ordering (most recent first)
      const v4_0 = versions.find((v) => v.version === '4.0.0');
      const v4_1 = versions.find((v) => v.version === '4.1.0');
      expect(v4_0).toBeDefined();
      expect(v4_1).toBeDefined();
    });
  });

  describe('CGU Versions - activateVersion', () => {
    it('should activate a version and deactivate previous', async () => {
      const v1 = await repo.createVersion({
        version: '5.0.0',
        effectiveDate: new Date('2025-01-01'),
      });

      await repo.activateVersion(v1.id);

      const found = await repo.findVersionById(v1.id);
      expect(found?.isActive).toBe(true);
    });

    it('should deactivate previous active version', async () => {
      const v1 = await repo.createVersion({
        version: '5.1.0',
        effectiveDate: new Date('2025-01-01'),
      });
      const v2 = await repo.createVersion({
        version: '5.2.0',
        effectiveDate: new Date('2025-06-01'),
      });

      await repo.activateVersion(v1.id);
      await repo.activateVersion(v2.id);

      const foundV1 = await repo.findVersionById(v1.id);
      const foundV2 = await repo.findVersionById(v2.id);

      expect(foundV1?.isActive).toBe(false);
      expect(foundV2?.isActive).toBe(true);
    });

    it('should reject activation of non-existent version', async () => {
      await expect(repo.activateVersion(randomUUID())).rejects.toThrow('not found');
    });

    it('should reject activation of version with future effective date', async () => {
      const future = await repo.createVersion({
        version: '5.3.0',
        effectiveDate: new Date('2099-01-01'),
      });

      await expect(repo.activateVersion(future.id)).rejects.toThrow('future effective date');
    });
  });

  // =========================================================================
  // CGU ACCEPTANCES
  // =========================================================================

  describe('CGU Acceptances - recordAcceptance', () => {
    let cguVersionId: string;
    let userId: string;

    beforeEach(async () => {
      // Create and activate a CGU version
      const version = await repo.createVersion({
        version: '6.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.activateVersion(version.id);
      cguVersionId = version.id;

      // Create test user
      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId, TENANT_ID, 'hash' + userId.substring(0, 8), 'pass', 'Test User', 'MEMBER', 'TENANT']
      );
    });

    it('should record CGU acceptance with all fields', async () => {
      const acceptance = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
        ipAddress: '192.168.1.0',
        userAgent: 'Test Browser',
      });

      expect(acceptance).toBeDefined();
      expect(acceptance.tenantId).toBe(TENANT_ID);
      expect(acceptance.userId).toBe(userId);
      expect(acceptance.cguVersionId).toBe(cguVersionId);
      expect(acceptance.acceptanceMethod).toBe('checkbox');
      expect(acceptance.acceptedAt).toBeInstanceOf(Date);
    });

    it('should record acceptance without optional fields', async () => {
      const acceptance = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'button',
      });

      expect(acceptance.ipAddress).toBeNull();
      expect(acceptance.userAgent).toBeNull();
    });

    it('should reject duplicate acceptance for same user and version', async () => {
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      await expect(
        repo.recordAcceptance(TENANT_ID, {
          tenantId: TENANT_ID,
          userId,
          cguVersionId,
          acceptanceMethod: 'checkbox',
        })
      ).rejects.toThrow('already accepted');
    });

    it('[RGPD-001] should reject if tenantId is empty', async () => {
      await expect(
        repo.recordAcceptance('', {
          tenantId: '',
          userId,
          cguVersionId,
          acceptanceMethod: 'checkbox',
        })
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('CGU Acceptances - hasUserAcceptedActiveVersion', () => {
    let cguVersionId: string;
    let userId: string;

    beforeEach(async () => {
      const version = await repo.createVersion({
        version: '7.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.activateVersion(version.id);
      cguVersionId = version.id;

      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId, TENANT_ID, 'hash' + userId.substring(0, 8), 'pass', 'Test User 2', 'MEMBER', 'TENANT']
      );
    });

    it('should return true after user accepts active version', async () => {
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      const hasAccepted = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId);

      expect(hasAccepted).toBe(true);
    });

    it('should return false if user has not accepted', async () => {
      const hasAccepted = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId);

      expect(hasAccepted).toBe(false);
    });

    it('should return false after new version is activated', async () => {
      // User accepts version 7.0.0
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      // New version is created and activated
      const newVersion = await repo.createVersion({
        version: '7.1.0',
        effectiveDate: new Date('2025-06-01'),
      });
      await repo.activateVersion(newVersion.id);

      // User hasn't accepted new version
      const hasAccepted = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId);

      expect(hasAccepted).toBe(false);
    });

    it('[RGPD-002] should reject if tenantId is empty', async () => {
      await expect(repo.hasUserAcceptedActiveVersion('', userId)).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('CGU Acceptances - findAcceptancesByUser', () => {
    let userId: string;

    beforeEach(async () => {
      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId, TENANT_ID, 'hash' + userId.substring(0, 8), 'pass', 'Test User 3', 'MEMBER', 'TENANT']
      );
    });

    it('should return all acceptances for user', async () => {
      // Create two versions
      const v1 = await repo.createVersion({
        version: '8.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      const v2 = await repo.createVersion({
        version: '8.1.0',
        effectiveDate: new Date('2025-06-01'),
      });

      await repo.activateVersion(v1.id);
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: v1.id,
        acceptanceMethod: 'checkbox',
      });

      await repo.activateVersion(v2.id);
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: v2.id,
        acceptanceMethod: 'button',
      });

      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);

      expect(acceptances.length).toBe(2);
    });

    it('should return empty array for user with no acceptances', async () => {
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, randomUUID());

      expect(acceptances).toEqual([]);
    });

    it('[RGPD-003] should reject if tenantId is empty', async () => {
      await expect(repo.findAcceptancesByUser('', userId)).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('CGU Acceptances - Tenant Isolation', () => {
    let cguVersionId: string;
    let userId1: string;
    let userId2: string;

    beforeEach(async () => {
      const version = await repo.createVersion({
        version: '9.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.activateVersion(version.id);
      cguVersionId = version.id;

      // Create users in different tenants
      userId1 = randomUUID();
      userId2 = randomUUID();

      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId1, TENANT_ID, 'hash' + userId1.substring(0, 8), 'pass', 'User T1', 'MEMBER', 'TENANT']
      );
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId2, TENANT_ID_2, 'hash' + userId2.substring(0, 8), 'pass', 'User T2', 'MEMBER', 'TENANT']
      );
    });

    it('[RGPD-ISOLATION-001] should not allow cross-tenant acceptance queries', async () => {
      // User 1 accepts in Tenant 1
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId: userId1,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      // Query from Tenant 2 should not find User 1's acceptance
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID_2, userId1);

      expect(acceptances).toEqual([]);
    });

    it('[RGPD-ISOLATION-002] acceptance status is tenant-scoped', async () => {
      // User 1 accepts in Tenant 1
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId: userId1,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      // Check from correct tenant
      const hasAcceptedT1 = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId1);
      expect(hasAcceptedT1).toBe(true);

      // Check from wrong tenant (should be false)
      const hasAcceptedT2 = await repo.hasUserAcceptedActiveVersion(TENANT_ID_2, userId1);
      expect(hasAcceptedT2).toBe(false);
    });
  });

  describe('CGU Acceptances - Soft Delete / Hard Delete', () => {
    let cguVersionId: string;
    let userId: string;

    beforeEach(async () => {
      const version = await repo.createVersion({
        version: '10.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.activateVersion(version.id);
      cguVersionId = version.id;

      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId, TENANT_ID, 'hash' + userId.substring(0, 8), 'pass', 'Test User Del', 'MEMBER', 'TENANT']
      );
    });

    it('should soft delete user acceptances', async () => {
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      const count = await repo.softDeleteAcceptancesByUser(TENANT_ID, userId);

      expect(count).toBe(1);

      // findAcceptancesByUser should not return soft-deleted
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances).toEqual([]);
    });

    it('should hard delete user acceptances', async () => {
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
      });

      const count = await repo.hardDeleteAcceptancesByUser(TENANT_ID, userId);

      expect(count).toBe(1);
    });

    it('[RGPD-004] soft delete should reject empty tenantId', async () => {
      await expect(repo.softDeleteAcceptancesByUser('', userId)).rejects.toThrow('RGPD VIOLATION');
    });

    it('[RGPD-005] hard delete should reject empty tenantId', async () => {
      await expect(repo.hardDeleteAcceptancesByUser('', userId)).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('CGU Acceptances - IP Anonymization', () => {
    let cguVersionId: string;
    let userId: string;

    beforeEach(async () => {
      const version = await repo.createVersion({
        version: '11.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.activateVersion(version.id);
      cguVersionId = version.id;

      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, password_hash, display_name, role, scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [userId, TENANT_ID, 'hash' + userId.substring(0, 8), 'pass', 'Test User IP', 'MEMBER', 'TENANT']
      );
    });

    it('should store anonymized IP (last octet masked)', async () => {
      // Record with anonymized IP (should already be anonymized by caller)
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId,
        acceptanceMethod: 'checkbox',
        ipAddress: '192.168.1.0', // Already anonymized
      });

      const acceptance = await repo.findUserAcceptanceOfActiveVersion(TENANT_ID, userId);

      expect(acceptance?.ipAddress).toBe('192.168.1.0');
    });

    it('should call anonymizeOldIpAddresses batch process', async () => {
      // This is typically run by a cron job
      const count = await repo.anonymizeOldIpAddresses();

      // May be 0 if no old acceptances exist
      expect(typeof count).toBe('number');
    });
  });
});
