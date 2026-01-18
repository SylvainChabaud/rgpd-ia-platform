/**
 * Repository Tests: Cookie Consent
 * RGPD: ePrivacy Art. 5.3
 * Tests: 6 tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgCookieConsentRepo } from '@/infrastructure/repositories/PgCookieConsentRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext, withPlatformContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';

describe('Repository: PgCookieConsentRepo', () => {
  let repo: PgCookieConsentRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000201';

  beforeEach(async () => {
    repo = new PgCookieConsentRepo();
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID]]);
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'cookie-repo-test', 'Cookie Repo Test']
    );
  });

  it('should save cookie consent for authenticated user', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'cookie@test.com', 'Cookie User', 'hash', 'TENANT', 'MEMBER']
      );
    });

    const consent = await repo.save({
      tenantId: TENANT_ID,
      userId,
      analytics: true,
      marketing: false,
    });

    expect(consent).toBeDefined();
    expect(consent.userId).toBe(userId);
    expect(consent.necessary).toBe(true);
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(false);
  });

  it('should save cookie consent for anonymous visitor', async () => {
    const anonymousId = randomUUID();

    const consent = await repo.save({
      anonymousId,
      analytics: false,
      marketing: false,
    });

    expect(consent).toBeDefined();
    expect(consent.anonymousId).toBe(anonymousId);
    expect(consent.userId).toBeNull();
    expect(consent.necessary).toBe(true);
  });

  it('should retrieve consent by userId', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'retrieve@test.com', 'Retrieve User', 'hash', 'TENANT', 'MEMBER']
      );
    });

    await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

    const consent = await repo.findByUser(userId);
    expect(consent).not.toBeNull();
    expect(consent?.userId).toBe(userId);
    expect(consent?.analytics).toBe(true);
    expect(consent?.marketing).toBe(true);
  });

  it('should retrieve consent by anonymousId', async () => {
    const anonymousId = randomUUID();
    await repo.save({ anonymousId, analytics: false, marketing: true });

    const consent = await repo.findByAnonymousId(anonymousId);
    expect(consent).not.toBeNull();
    expect(consent?.anonymousId).toBe(anonymousId);
    expect(consent?.marketing).toBe(true);
  });

  it('should enforce TTL (12 months)', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'ttl@test.com', 'TTL User', 'hash', 'TENANT', 'MEMBER']
      );
    });

    const consent = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });

    // Vérifier que TTL est bien 12 mois
    const now = new Date();
    const expiresAt = new Date(consent.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();
    const monthsDiff = diff / (1000 * 60 * 60 * 24 * 30);

    expect(monthsDiff).toBeGreaterThan(11);
    expect(monthsDiff).toBeLessThan(13);

    // Simuler expiration: mettre expires_at dans le passé
    await withPlatformContext(pool, async (client) => {
      await client.query(
        `UPDATE cookie_consents SET expires_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
        [consent.id]
      );
    });

    // Lancer purge
    const deleted = await repo.deleteExpired();
    expect(deleted).toBeGreaterThan(0);

    // Vérifier que le consent a été supprimé
    const found = await repo.findByUser(userId);
    expect(found).toBeNull();
  });

  it('should soft delete user consents (Art. 17)', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'delete@test.com', 'Delete User', 'hash', 'TENANT', 'MEMBER']
      );
    });

    await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

    // Soft delete
    const deletedCount = await repo.softDeleteByUser(userId);
    expect(deletedCount).toBe(1);

    // Vérifier que consent n'est plus trouvé
    const consent = await repo.findByUser(userId);
    expect(consent).toBeNull();
  });

  describe('findById', () => {
    it('should find consent by ID', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'findbyid@test.com', 'FindById User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      const found = await repo.findById(saved.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(saved.id);
      expect(found?.userId).toBe(userId);
      expect(found?.analytics).toBe(true);
      expect(found?.marketing).toBe(false);
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = randomUUID();
      const found = await repo.findById(fakeId);
      expect(found).toBeNull();
    });

    it('should not find soft-deleted consents', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'soft-deleted-id@test.com', 'Soft Deleted User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });
      await repo.softDeleteByUser(userId);

      const found = await repo.findById(saved.id);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update analytics preference', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'update-analytics@test.com', 'Update Analytics User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: false });
      const updated = await repo.update(saved.id, { analytics: true });

      expect(updated.analytics).toBe(true);
      expect(updated.marketing).toBe(false); // Unchanged
      expect(updated.updatedAt.getTime()).toBeGreaterThan(saved.createdAt.getTime());
    });

    it('should update marketing preference', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'update-marketing@test.com', 'Update Marketing User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      const updated = await repo.update(saved.id, { marketing: true });

      expect(updated.marketing).toBe(true);
      expect(updated.analytics).toBe(true); // Unchanged
    });

    it('should update both preferences', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'update-both@test.com', 'Update Both User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: false });
      const updated = await repo.update(saved.id, { analytics: true, marketing: true });

      expect(updated.analytics).toBe(true);
      expect(updated.marketing).toBe(true);
    });

    it('should throw if consent not found', async () => {
      const fakeId = randomUUID();
      await expect(repo.update(fakeId, { analytics: true })).rejects.toThrow('Cookie consent not found');
    });

    it('should not update soft-deleted consent', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'update-deleted@test.com', 'Update Deleted User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: false });
      await repo.softDeleteByUser(userId);

      await expect(repo.update(saved.id, { analytics: true })).rejects.toThrow('Cookie consent not found');
    });
  });

  describe('save - Validation', () => {
    it('should reject save without userId or anonymousId', async () => {
      await expect(
        repo.save({ analytics: true, marketing: false } as unknown as Parameters<typeof repo.save>[0])
      ).rejects.toThrow('Either userId or anonymousId is required');
    });

    it('should reject save with both userId and anonymousId', async () => {
      const userId = randomUUID();
      const anonymousId = randomUUID();

      await expect(
        repo.save({ userId, anonymousId, analytics: true, marketing: false })
      ).rejects.toThrow('Cannot have both userId and anonymousId');
    });

    it('should allow save with tenantId and userId', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'tenant-user@test.com', 'Tenant User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      expect(saved.tenantId).toBe(TENANT_ID);
      expect(saved.userId).toBe(userId);
    });

    it('should allow save with only anonymousId (no tenantId)', async () => {
      const anonymousId = randomUUID();
      const saved = await repo.save({ anonymousId, analytics: false, marketing: false });

      expect(saved.anonymousId).toBe(anonymousId);
      expect(saved.tenantId).toBeNull();
    });

    it('should store ipAddress and userAgent', async () => {
      const anonymousId = randomUUID();
      const saved = await repo.save({
        anonymousId,
        analytics: true,
        marketing: false,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(saved.ipAddress).toBe('192.168.1.1');
      expect(saved.userAgent).toBe('Mozilla/5.0');
    });

    it('should allow null ipAddress and userAgent', async () => {
      const anonymousId = randomUUID();
      const saved = await repo.save({ anonymousId, analytics: true, marketing: false });

      expect(saved.ipAddress).toBeNull();
      expect(saved.userAgent).toBeNull();
    });
  });

  describe('hardDeleteByUser', () => {
    it('should hard delete all consents for user', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'harddelete@test.com', 'Hard Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create 3 consents
      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: true });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

      const deletedCount = await repo.hardDeleteByUser(userId);
      expect(deletedCount).toBe(3);

      // Verify complete removal
      const found = await repo.findAllByUser(userId);
      expect(found).toHaveLength(0);
    });

    it('should return 0 if user has no consents', async () => {
      const userId = randomUUID();
      const deletedCount = await repo.hardDeleteByUser(userId);
      expect(deletedCount).toBe(0);
    });

    it('should hard delete both soft-deleted and non-soft-deleted consents', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hard-soft-delete@test.com', 'Hard+Soft Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: true });

      // Soft delete first (marks 2 as deleted)
      await repo.softDeleteByUser(userId);

      // Hard delete (should remove all, including soft-deleted)
      const deletedCount = await repo.hardDeleteByUser(userId);
      expect(deletedCount).toBe(2);
    });
  });

  describe('findAllByUser', () => {
    it('should find all consents for user', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'findall@test.com', 'FindAll User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create 3 consents
      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: true });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

      const consents = await repo.findAllByUser(userId);
      expect(consents).toHaveLength(3);
      expect(consents.every((c) => c.userId === userId)).toBe(true);
    });

    it('should return empty array if user has no consents', async () => {
      const userId = randomUUID();
      const consents = await repo.findAllByUser(userId);
      expect(consents).toHaveLength(0);
    });

    it('should not include soft-deleted consents', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'findall-soft@test.com', 'FindAll Soft User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: true });

      // Soft delete
      await repo.softDeleteByUser(userId);

      const consents = await repo.findAllByUser(userId);
      expect(consents).toHaveLength(0);
    });

    it('should order by created_at DESC (newest first)', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'findall-order@test.com', 'FindAll Order User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const first = await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: false });
      const second = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });
      const third = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

      const consents = await repo.findAllByUser(userId);

      expect(consents[0].id).toBe(third.id); // Newest first
      expect(consents[1].id).toBe(second.id);
      expect(consents[2].id).toBe(first.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle findByUser with expired consent', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'expired@test.com', 'Expired User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const saved = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: false });

      // Set expires_at to past
      await withPlatformContext(pool, async (client) => {
        await client.query(
          `UPDATE cookie_consents SET expires_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
          [saved.id]
        );
      });

      const found = await repo.findByUser(userId);
      expect(found).toBeNull(); // Should not find expired consent
    });

    it('should handle findByAnonymousId with expired consent', async () => {
      const anonymousId = randomUUID();
      const saved = await repo.save({ anonymousId, analytics: true, marketing: false });

      // Set expires_at to past
      await withPlatformContext(pool, async (client) => {
        await client.query(
          `UPDATE cookie_consents SET expires_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
          [saved.id]
        );
      });

      const found = await repo.findByAnonymousId(anonymousId);
      expect(found).toBeNull();
    });

    it('should handle findByUser with multiple consents (returns newest)', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'multiple@test.com', 'Multiple User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.save({ tenantId: TENANT_ID, userId, analytics: false, marketing: false });
      const newest = await repo.save({ tenantId: TENANT_ID, userId, analytics: true, marketing: true });

      const found = await repo.findByUser(userId);
      expect(found?.id).toBe(newest.id); // Should return newest
    });

    it('should handle softDeleteByUser with 0 consents', async () => {
      const userId = randomUUID();
      const deletedCount = await repo.softDeleteByUser(userId);
      expect(deletedCount).toBe(0);
    });
  });
});
