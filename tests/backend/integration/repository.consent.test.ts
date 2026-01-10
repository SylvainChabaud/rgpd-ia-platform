import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgConsentRepo } from '@/infrastructure/repositories/PgConsentRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';

/**
 * Integration tests for PgConsentRepo
 *
 * LOT 11.0 - Coverage improvement (0% → 80%+)
 *
 * Tests consent management (RGPD Art. 6-7):
 * - Grant and revoke consent
 * - Purpose-based consent tracking
 * - Tenant isolation
 * - Soft/hard delete for RGPD compliance
 */
describe('PgConsentRepo', () => {
  let repo: PgConsentRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000701';

  beforeEach(async () => {
    repo = new PgConsentRepo();

    // Clean test data
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID]]);

    // Create test tenant
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'consent-test', 'Consent Test']
    );
  });

  describe('create', () => {
    it('should create consent with granted=true', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'consent@test.com', 'Consent User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');

      expect(consent).not.toBeNull();
      expect(consent?.userId).toBe(userId);
      expect(consent?.purpose).toBe('analytics');
      expect(consent?.granted).toBe(true);
      expect(consent?.grantedAt).toBeInstanceOf(Date);
    });

    it('should create consent without grantedAt', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'nogrant@test.com', 'No Grant User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'marketing',
        granted: false,
      });

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'marketing');

      expect(consent).not.toBeNull();
      expect(consent?.granted).toBe(false);
      expect(consent?.grantedAt).toBeNull();
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.create('', {
          userId: randomUUID(),
          purpose: 'test',
          granted: true,
        })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should create multiple consents for different purposes', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'multi@test.com', 'Multi User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'marketing',
        granted: true,
        grantedAt: new Date(),
      });

      const consents = await repo.findByUser(TENANT_ID, userId);

      expect(consents.length).toBe(2);
      expect(consents.map(c => c.purpose)).toContain('analytics');
      expect(consents.map(c => c.purpose)).toContain('marketing');
    });
  });

  describe('findByUserAndPurpose', () => {
    it('should find consent by user and purpose', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'find@test.com', 'Find User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');

      expect(consent).not.toBeNull();
      expect(consent?.userId).toBe(userId);
      expect(consent?.purpose).toBe('analytics');
    });

    it('should return null when consent not found', async () => {
      const consent = await repo.findByUserAndPurpose(TENANT_ID, randomUUID(), 'non-existent');

      expect(consent).toBeNull();
    });

    it('should return latest consent when multiple exist', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'latest@test.com', 'Latest User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create first consent
      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: false,
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second consent (should be returned)
      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');

      expect(consent?.granted).toBe(true);
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.findByUserAndPurpose('', randomUUID(), 'test')
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should isolate consents by tenant', async () => {
      const OTHER_TENANT = '00000000-0000-0000-0000-000000000702';
      const userId = randomUUID();

      await pool.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [OTHER_TENANT, 'other-consent-test', 'Other Consent Test']
      );

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'isolate@test.com', 'Isolate User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      // Should not find consent from another tenant
      const consent = await repo.findByUserAndPurpose(OTHER_TENANT, userId, 'analytics');

      expect(consent).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should find all consents for a user', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'all@test.com', 'All User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'marketing',
        granted: false,
      });

      const consents = await repo.findByUser(TENANT_ID, userId);

      expect(consents.length).toBe(2);
      expect(consents.every(c => c.userId === userId)).toBe(true);
    });

    it('should return empty array when no consents exist', async () => {
      const consents = await repo.findByUser(TENANT_ID, randomUUID());

      expect(consents).toEqual([]);
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.findByUser('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should order consents by created_at DESC', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'order@test.com', 'Order User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'marketing',
        granted: true,
        grantedAt: new Date(),
      });

      const consents = await repo.findByUser(TENANT_ID, userId);

      // Most recent should be first
      expect(consents[0].purpose).toBe('marketing');
    });
  });

  describe('revoke', () => {
    it('should revoke granted consent', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'revoke@test.com', 'Revoke User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.revoke(TENANT_ID, userId, 'analytics');

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');

      expect(consent?.granted).toBe(false);
      expect(consent?.revokedAt).toBeInstanceOf(Date);
    });

    it('should revoke only latest consent', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'revokelatest@test.com', 'Revoke Latest', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create multiple consents
      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.revoke(TENANT_ID, userId, 'analytics');

      // Latest should be revoked
      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');
      expect(consent?.granted).toBe(false);
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.revoke('', randomUUID(), 'test')
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should be idempotent', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'idempotent@test.com', 'Idempotent User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.revoke(TENANT_ID, userId, 'analytics');
      await repo.revoke(TENANT_ID, userId, 'analytics'); // Should not error

      const consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');
      expect(consent?.granted).toBe(false);
    });
  });

  describe('softDeleteByUser', () => {
    it('should soft delete all consents for user', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'soft@test.com', 'Soft User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'marketing',
        granted: true,
        grantedAt: new Date(),
      });

      const deleted = await repo.softDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(2);

      // Should not return soft-deleted consents
      const consents = await repo.findByUser(TENANT_ID, userId);
      expect(consents).toEqual([]);
    });

    it('should return 0 when no consents exist', async () => {
      const deleted = await repo.softDeleteByUser(TENANT_ID, randomUUID());

      expect(deleted).toBe(0);
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.softDeleteByUser('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('hardDeleteByUser', () => {
    it('should permanently delete all consents for user', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hard@test.com', 'Hard User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      const deleted = await repo.hardDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(1);

      // Verify permanent deletion
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM consents WHERE tenant_id = $1 AND user_id = $2`,
        [TENANT_ID, userId]
      );

      expect(parseInt(res.rows[0].count, 10)).toBe(0);
    });

    it('should return 0 when no consents exist', async () => {
      const deleted = await repo.hardDeleteByUser(TENANT_ID, randomUUID());

      expect(deleted).toBe(0);
    });

    it('should throw without tenantId', async () => {
      await expect(
        repo.hardDeleteByUser('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('RGPD Compliance Workflow', () => {
    it('should track complete consent lifecycle', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'lifecycle@test.com', 'Lifecycle User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // 1. Grant consent
      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      let consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');
      expect(consent?.granted).toBe(true);
      expect(consent?.revokedAt).toBeNull();

      // 2. Revoke consent
      await repo.revoke(TENANT_ID, userId, 'analytics');

      consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');
      expect(consent?.granted).toBe(false);
      expect(consent?.revokedAt).toBeInstanceOf(Date);

      // 3. Grant again (new record)
      await repo.create(TENANT_ID, {
        userId,
        purpose: 'analytics',
        granted: true,
        grantedAt: new Date(),
      });

      consent = await repo.findByUserAndPurpose(TENANT_ID, userId, 'analytics');
      expect(consent?.granted).toBe(true);

      // 4. Delete (RGPD Art. 17)
      await repo.softDeleteByUser(TENANT_ID, userId);

      const consents = await repo.findByUser(TENANT_ID, userId);
      expect(consents).toEqual([]);
    });
  });
});
