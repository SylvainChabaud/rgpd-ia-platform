/**
 * Repository Tests: CGU Repository
 * LOT 11.0 - Coverage improvement (31.94% → 80%+)
 *
 * RGPD: Art. 7 (Consent), Art. 13-14 (Information), Art. 32 (IP anonymization)
 * Tests: Comprehensive coverage of CGU versions and user acceptances
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgCguRepo } from '@/infrastructure/repositories/PgCguRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext, withPlatformContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';

describe('Repository: PgCguRepo', () => {
  let repo: PgCguRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000101';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000102';

  beforeEach(async () => {
    repo = new PgCguRepo();

    // Clean test data first (includes user_cgu_acceptances via FK)
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);

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
        content: '# CGU Version 1.0.0\n\nCeci est une version de test.',
        effectiveDate: new Date('2026-01-01'),
        summary: 'Première version des CGU',
      });

      expect(version).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.content).toContain('CGU Version 1.0.0');
      expect(version.summary).toBe('Première version des CGU');
      expect(version.isActive).toBe(false); // Default: not active
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should create CGU without summary', async () => {
      const version = await repo.createVersion({
        version: '1.1.0',
        content: '# CGU 1.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(version.summary).toBeUndefined();
    });

    it('should reject invalid semver format', async () => {
      await expect(
        repo.createVersion({
          version: '1.0', // Invalid: missing patch
          content: '# CGU',
          effectiveDate: new Date('2026-01-01'),
        })
      ).rejects.toThrow('Version must follow semantic versioning (X.Y.Z)');
    });

    it('should reject empty content', async () => {
      await expect(
        repo.createVersion({
          version: '1.0.0',
          content: '',
          effectiveDate: new Date('2026-01-01'),
        })
      ).rejects.toThrow('CGU content cannot be empty');
    });

    it('should reject whitespace-only content', async () => {
      await expect(
        repo.createVersion({
          version: '1.0.0',
          content: '   \n  ',
          effectiveDate: new Date('2026-01-01'),
        })
      ).rejects.toThrow('CGU content cannot be empty');
    });

    it('should set isActive to false by default', async () => {
      const version = await repo.createVersion({
        version: '1.2.0',
        content: '# CGU 1.2.0',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(version.isActive).toBe(false);
    });
  });

  describe('CGU Versions - findActiveVersion', () => {
    it('should retrieve active CGU version', async () => {
      const created = await repo.createVersion({
        version: '2.0.0',
        content: '# CGU 2.0.0\n\nVersion active.',
        effectiveDate: new Date('2026-01-01'),
      });

      await repo.activateVersion(created.id);

      const active = await repo.findActiveVersion();
      expect(active).not.toBeNull();
      expect(active?.id).toBe(created.id);
      expect(active?.isActive).toBe(true);
      expect(active?.version).toBe('2.0.0');
    });

    it('should return null if no active version', async () => {
      await repo.createVersion({
        version: '2.1.0',
        content: '# CGU 2.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const active = await repo.findActiveVersion();
      expect(active).toBeNull();
    });

    it('should return latest active version when multiple exist', async () => {
      const old = await repo.createVersion({
        version: '2.2.0',
        content: '# Old',
        effectiveDate: new Date('2025-01-01'),
      });
      const newer = await repo.createVersion({
        version: '2.3.0',
        content: '# Newer',
        effectiveDate: new Date('2026-01-01'),
      });

      await repo.activateVersion(old.id);
      await repo.activateVersion(newer.id);

      const active = await repo.findActiveVersion();
      expect(active?.id).toBe(newer.id);
    });

    it('should not return future versions', async () => {
      const future = await repo.createVersion({
        version: '2.4.0',
        content: '# Future',
        effectiveDate: new Date('2030-01-01'),
      });

      // Manually activate it
      await withPlatformContext(pool, async (client) => {
        await client.query(
          `UPDATE cgu_versions SET is_active = true WHERE id = $1`,
          [future.id]
        );
      });

      const active = await repo.findActiveVersion();
      expect(active).toBeNull(); // Should not find future version
    });
  });

  describe('CGU Versions - findVersionById', () => {
    it('should find version by ID', async () => {
      const created = await repo.createVersion({
        version: '3.0.0',
        content: '# CGU 3.0.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const found = await repo.findVersionById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.version).toBe('3.0.0');
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = randomUUID();
      const found = await repo.findVersionById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe('CGU Versions - findVersionByNumber', () => {
    it('should find version by version number', async () => {
      await repo.createVersion({
        version: '3.1.0',
        content: '# CGU 3.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const found = await repo.findVersionByNumber('3.1.0');
      expect(found).not.toBeNull();
      expect(found?.version).toBe('3.1.0');
    });

    it('should return null for non-existent version number', async () => {
      const found = await repo.findVersionByNumber('99.99.99');
      expect(found).toBeNull();
    });
  });

  describe('CGU Versions - findAllVersions', () => {
    it('should list all versions', async () => {
      await repo.createVersion({
        version: '4.0.0',
        content: '# CGU 4.0.0',
        effectiveDate: new Date('2025-01-01'),
      });
      await repo.createVersion({
        version: '4.1.0',
        content: '# CGU 4.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const all = await repo.findAllVersions();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should order versions by effectiveDate DESC', async () => {
      const old = await repo.createVersion({
        version: '4.2.0',
        content: '# Old',
        effectiveDate: new Date('2025-01-01'),
      });
      const newer = await repo.createVersion({
        version: '4.3.0',
        content: '# Newer',
        effectiveDate: new Date('2026-01-01'),
      });

      const all = await repo.findAllVersions();
      const indexes = {
        old: all.findIndex((v) => v.id === old.id),
        newer: all.findIndex((v) => v.id === newer.id),
      };

      expect(indexes.newer).toBeLessThan(indexes.old); // Newer first
    });

    it('should return empty array if no versions', async () => {
      const all = await repo.findAllVersions();
      expect(all).toEqual([]);
    });
  });

  describe('CGU Versions - activateVersion', () => {
    it('should activate a version', async () => {
      const version = await repo.createVersion({
        version: '5.0.0',
        content: '# CGU 5.0.0',
        effectiveDate: new Date('2026-01-01'),
      });

      await repo.activateVersion(version.id);

      const found = await repo.findVersionById(version.id);
      expect(found?.isActive).toBe(true);
    });

    it('should deactivate all other versions when activating', async () => {
      const v1 = await repo.createVersion({
        version: '5.1.0',
        content: '# v1',
        effectiveDate: new Date('2026-01-01'),
      });
      const v2 = await repo.createVersion({
        version: '5.2.0',
        content: '# v2',
        effectiveDate: new Date('2026-01-01'),
      });

      await repo.activateVersion(v1.id);
      await repo.activateVersion(v2.id);

      const found1 = await repo.findVersionById(v1.id);
      const found2 = await repo.findVersionById(v2.id);

      expect(found1?.isActive).toBe(false);
      expect(found2?.isActive).toBe(true);
    });

    it('should throw if version not found', async () => {
      const fakeId = randomUUID();
      await expect(repo.activateVersion(fakeId)).rejects.toThrow('CGU version not found');
    });

    it('should reject activation of future version', async () => {
      const future = await repo.createVersion({
        version: '5.3.0',
        content: '# Future',
        effectiveDate: new Date('2030-01-01'),
      });

      await expect(repo.activateVersion(future.id)).rejects.toThrow(
        'Cannot activate a version with future effective date'
      );
    });
  });

  describe('CGU Acceptances - recordAcceptance', () => {
    let versionId: string;
    let userId: string;

    beforeEach(async () => {
      const version = await repo.createVersion({
        version: '6.0.0',
        content: '# CGU 6.0.0',
        effectiveDate: new Date('2026-01-01'),
      });
      versionId = version.id;

      userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'acceptance@test.com', 'Acceptance User', 'hash', 'TENANT', 'MEMBER']
        );
      });
    });

    it('should record CGU acceptance with all fields', async () => {
      const acceptance = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: versionId,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        acceptanceMethod: 'checkbox',
      });

      expect(acceptance).toBeDefined();
      expect(acceptance.userId).toBe(userId);
      expect(acceptance.cguVersionId).toBe(versionId);
      expect(acceptance.ipAddress).toBe('192.168.1.100');
      expect(acceptance.userAgent).toBe('Mozilla/5.0');
      expect(acceptance.acceptanceMethod).toBe('checkbox');
      expect(acceptance.acceptedAt).toBeInstanceOf(Date);
    });

    it('should record acceptance without IP and userAgent', async () => {
      const acceptance = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: versionId,
        acceptanceMethod: 'button',
      });

      expect(acceptance.ipAddress).toBeNull();
      expect(acceptance.userAgent).toBeNull();
    });

    it('should support all acceptance methods', async () => {
      const methods: Array<'checkbox' | 'button' | 'api'> = ['checkbox', 'button', 'api'];

      for (const method of methods) {
        const newUserId = randomUUID();
        await withTenantContext(pool, TENANT_ID, async (client) => {
          await client.query(
            `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [newUserId, TENANT_ID, `${method}@test.com`, method, 'hash', 'TENANT', 'MEMBER']
          );
        });

        const acceptance = await repo.recordAcceptance(TENANT_ID, {
          tenantId: TENANT_ID,
          userId: newUserId,
          cguVersionId: versionId,
          acceptanceMethod: method,
        });

        expect(acceptance.acceptanceMethod).toBe(method);
      }
    });

    it('should reject acceptance without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.recordAcceptance('', {
          tenantId: '',
          userId,
          cguVersionId: versionId,
          acceptanceMethod: 'checkbox',
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for CGU acceptance');
    });

    it('should reject duplicate acceptance for same version', async () => {
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: versionId,
        acceptanceMethod: 'checkbox',
      });

      await expect(
        repo.recordAcceptance(TENANT_ID, {
          tenantId: TENANT_ID,
          userId,
          cguVersionId: versionId,
          acceptanceMethod: 'checkbox',
        })
      ).rejects.toThrow('User has already accepted this CGU version');
    });
  });

  describe('CGU Acceptances - findUserAcceptanceOfActiveVersion', () => {
    it('should retrieve acceptance of active version', async () => {
      const version = await repo.createVersion({
        version: '7.0.0',
        content: '# CGU 7.0.0',
        effectiveDate: new Date('2026-01-01'),
      });
      await repo.activateVersion(version.id);

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'activeacceptance@test.com', 'Active Acceptance User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        acceptanceMethod: 'button',
      });

      const acceptance = await repo.findUserAcceptanceOfActiveVersion(TENANT_ID, userId);
      expect(acceptance).not.toBeNull();
      expect(acceptance?.userId).toBe(userId);
      expect(acceptance?.acceptanceMethod).toBe('button');
    });

    it('should return null if user has not accepted active version', async () => {
      const userId = randomUUID();
      const acceptance = await repo.findUserAcceptanceOfActiveVersion(TENANT_ID, userId);
      expect(acceptance).toBeNull();
    });

    it('should reject query without tenantId (RGPD blocker)', async () => {
      const userId = randomUUID();
      await expect(
        repo.findUserAcceptanceOfActiveVersion('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for CGU acceptance query');
    });
  });

  describe('CGU Acceptances - hasUserAcceptedActiveVersion', () => {
    it('should return true if user accepted active version', async () => {
      const version = await repo.createVersion({
        version: '7.1.0',
        content: '# CGU 7.1.0',
        effectiveDate: new Date('2026-01-01'),
      });
      await repo.activateVersion(version.id);

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hasaccepted@test.com', 'Has Accepted User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      const hasAccepted = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId);
      expect(hasAccepted).toBe(true);
    });

    it('should return false if user has not accepted', async () => {
      const userId = randomUUID();
      const hasAccepted = await repo.hasUserAcceptedActiveVersion(TENANT_ID, userId);
      expect(hasAccepted).toBe(false);
    });
  });

  describe('CGU Acceptances - findAcceptancesByUser', () => {
    it('should find all acceptances for user', async () => {
      const v1 = await repo.createVersion({
        version: '8.0.0',
        content: '# v1',
        effectiveDate: new Date('2026-01-01'),
      });
      const v2 = await repo.createVersion({
        version: '8.1.0',
        content: '# v2',
        effectiveDate: new Date('2026-01-02'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'multiaccept@test.com', 'Multi Accept User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: v1.id,
        acceptanceMethod: 'checkbox',
      });
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: v2.id,
        acceptanceMethod: 'button',
      });

      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances).toHaveLength(2);
    });

    it('should order acceptances by acceptedAt DESC', async () => {
      const version = await repo.createVersion({
        version: '8.2.0',
        content: '# CGU 8.2.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const user1 = randomUUID();
      const user2 = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
          [user1, TENANT_ID, 'order1@test.com', 'Order1', 'hash', 'TENANT', 'MEMBER',
           user2, TENANT_ID, 'order2@test.com', 'Order2', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const first = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId: user1,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId: user2,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      const acceptances1 = await repo.findAcceptancesByUser(TENANT_ID, user1);
      expect(acceptances1[0].id).toBe(first.id);
    });

    it('should return empty array if user has no acceptances', async () => {
      const userId = randomUUID();
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances).toEqual([]);
    });

    it('should reject query without tenantId (RGPD blocker)', async () => {
      const userId = randomUUID();
      await expect(
        repo.findAcceptancesByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for CGU acceptance query');
    });
  });

  describe('CGU Acceptances - anonymizeOldIpAddresses', () => {
    it('should anonymize IP after 7 days (Art. 32)', async () => {
      const version = await repo.createVersion({
        version: '9.0.0',
        content: '# CGU 9.0.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'ipanon@test.com', 'IP Anon User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const acceptance = await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        ipAddress: '10.0.0.1',
        acceptanceMethod: 'checkbox',
      });

      expect(acceptance.ipAddress).toBe('10.0.0.1');

      // Simulate aging: set accepted_at to 8 days ago
      await withPlatformContext(pool, async (client) => {
        await client.query(
          `UPDATE user_cgu_acceptances
           SET accepted_at = NOW() - INTERVAL '8 days'
           WHERE id = $1`,
          [acceptance.id]
        );
      });

      // Run anonymization
      const anonymizedCount = await repo.anonymizeOldIpAddresses();
      expect(anonymizedCount).toBeGreaterThan(0);

      // Verify IP is NULL
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances[0].ipAddress).toBeNull();
    });

    it('should not anonymize IP within 7 days', async () => {
      const version = await repo.createVersion({
        version: '9.1.0',
        content: '# CGU 9.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'recent-ip@test.com', 'Recent IP User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        ipAddress: '10.0.0.2',
        acceptanceMethod: 'checkbox',
      });

      // Run anonymization (should not affect recent IP)
      await repo.anonymizeOldIpAddresses();

      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances[0].ipAddress).toBe('10.0.0.2'); // Still present
    });

    it('should return 0 if no old IPs to anonymize', async () => {
      const count = await repo.anonymizeOldIpAddresses();
      expect(count).toBe(0);
    });
  });

  describe('CGU Acceptances - softDeleteAcceptancesByUser', () => {
    it('should soft delete all acceptances for user', async () => {
      const version = await repo.createVersion({
        version: '10.0.0',
        content: '# CGU 10.0.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'softdelete@test.com', 'Soft Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      const deletedCount = await repo.softDeleteAcceptancesByUser(TENANT_ID, userId);
      expect(deletedCount).toBe(1);

      // Verify acceptance is no longer found
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances).toHaveLength(0);
    });

    it('should reject soft delete without tenantId (RGPD blocker)', async () => {
      const userId = randomUUID();
      await expect(
        repo.softDeleteAcceptancesByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for CGU acceptance soft delete');
    });

    it('should return 0 if user has no acceptances', async () => {
      const userId = randomUUID();
      const deletedCount = await repo.softDeleteAcceptancesByUser(TENANT_ID, userId);
      expect(deletedCount).toBe(0);
    });
  });

  describe('CGU Acceptances - hardDeleteAcceptancesByUser', () => {
    it('should hard delete all acceptances for user', async () => {
      const version = await repo.createVersion({
        version: '10.1.0',
        content: '# CGU 10.1.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'harddelete-cgu@test.com', 'Hard Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      const deletedCount = await repo.hardDeleteAcceptancesByUser(TENANT_ID, userId);
      expect(deletedCount).toBe(1);

      // Verify complete removal
      const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
      expect(acceptances).toHaveLength(0);
    });

    it('should reject hard delete without tenantId (RGPD blocker)', async () => {
      const userId = randomUUID();
      await expect(
        repo.hardDeleteAcceptancesByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for CGU acceptance hard delete');
    });

    it('should hard delete both soft-deleted and non-soft-deleted acceptances', async () => {
      const version = await repo.createVersion({
        version: '10.2.0',
        content: '# CGU 10.2.0',
        effectiveDate: new Date('2026-01-01'),
      });

      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hard-soft-cgu@test.com', 'Hard+Soft User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      await repo.softDeleteAcceptancesByUser(TENANT_ID, userId);

      const deletedCount = await repo.hardDeleteAcceptancesByUser(TENANT_ID, userId);
      expect(deletedCount).toBe(1);
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant isolation on acceptances', async () => {
      const version = await repo.createVersion({
        version: '11.0.0',
        content: '# CGU 11.0.0',
        effectiveDate: new Date('2026-01-01'),
      });
      await repo.activateVersion(version.id);

      // Create users in 2 tenants
      const userId1 = randomUUID();
      const userId2 = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId1, TENANT_ID, 'tenant1-iso@test.com', 'Tenant 1 User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await withTenantContext(pool, TENANT_ID_2, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId2, TENANT_ID_2, 'tenant2-iso@test.com', 'Tenant 2 User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Record acceptances in each tenant
      await repo.recordAcceptance(TENANT_ID, {
        tenantId: TENANT_ID,
        userId: userId1,
        cguVersionId: version.id,
        acceptanceMethod: 'checkbox',
      });

      await repo.recordAcceptance(TENANT_ID_2, {
        tenantId: TENANT_ID_2,
        userId: userId2,
        cguVersionId: version.id,
        acceptanceMethod: 'api',
      });

      // Verify isolation
      const acceptances1 = await repo.findAcceptancesByUser(TENANT_ID, userId1);
      expect(acceptances1).toHaveLength(1);
      expect(acceptances1[0].userId).toBe(userId1);

      const acceptances2 = await repo.findAcceptancesByUser(TENANT_ID_2, userId2);
      expect(acceptances2).toHaveLength(1);
      expect(acceptances2[0].userId).toBe(userId2);
    });
  });
});
