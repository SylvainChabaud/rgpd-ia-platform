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
        [userId, TENANT_ID, 'cookie@test.com', 'Cookie User', 'hash', 'TENANT', 'user']
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
        [userId, TENANT_ID, 'retrieve@test.com', 'Retrieve User', 'hash', 'TENANT', 'user']
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
        [userId, TENANT_ID, 'ttl@test.com', 'TTL User', 'hash', 'TENANT', 'user']
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
        [userId, TENANT_ID, 'delete@test.com', 'Delete User', 'hash', 'TENANT', 'user']
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
});
