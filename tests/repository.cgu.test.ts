/**
 * Repository Tests: CGU Repository
 * RGPD: Art. 7 (Consentement), Art. 13-14 (Information)
 * Tests: 6 tests
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

  it('should create new CGU version', async () => {
    const version = await repo.createVersion({
      version: '1.0.0',
      content: '# CGU Version 1.0.0\n\nCeci est une version de test.',
      effectiveDate: new Date('2026-01-01'),
      summary: 'Première version des CGU',
    });

    expect(version).toBeDefined();
    expect(version.version).toBe('1.0.0');
    expect(version.summary).toBe('Première version des CGU');
    expect(version.isActive).toBe(false); // Par défaut non active
  });

  it('should retrieve active CGU version', async () => {
    // Créer une version
    const created = await repo.createVersion({
      version: '1.1.0',
      content: '# CGU 1.1.0\n\nVersion active.',
      effectiveDate: new Date('2026-01-01'),
    });

    // Activer la version
    await repo.activateVersion(created.id);

    // Récupérer la version active
    const active = await repo.findActiveVersion();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(created.id);
    expect(active?.isActive).toBe(true);
  });

  it('should save CGU acceptance', async () => {
    // Créer une version CGU
    const version = await repo.createVersion({
      version: '2.0.0',
      content: '# CGU 2.0.0',
      effectiveDate: new Date('2026-01-01'),
    });

    // Créer un utilisateur test
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'hash@test.com', 'Test User', 'hash', 'TENANT', 'user']
      );
    });

    // Enregistrer acceptation
    const acceptance = await repo.recordAcceptance(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      cguVersionId: version.id,
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser',
      acceptanceMethod: 'checkbox',
    });

    expect(acceptance).toBeDefined();
    expect(acceptance.userId).toBe(userId);
    expect(acceptance.cguVersionId).toBe(version.id);
    expect(acceptance.ipAddress).toBe('192.168.1.100');
    expect(acceptance.acceptanceMethod).toBe('checkbox');
  });

  it('should retrieve acceptance by userId', async () => {
    // Créer version + user
    const version = await repo.createVersion({
      version: '3.0.0',
      content: '# CGU 3.0.0',
      effectiveDate: new Date('2026-01-01'),
    });
    await repo.activateVersion(version.id);

    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'hash2@test.com', 'Test User 2', 'hash', 'TENANT', 'user']
      );
    });

    // Enregistrer acceptation
    await repo.recordAcceptance(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      cguVersionId: version.id,
      acceptanceMethod: 'button',
    });

    // Récupérer acceptation
    const acceptance = await repo.findUserAcceptanceOfActiveVersion(TENANT_ID, userId);
    expect(acceptance).not.toBeNull();
    expect(acceptance?.userId).toBe(userId);
    expect(acceptance?.acceptanceMethod).toBe('button');
  });

  it('should enforce tenant isolation', async () => {
    // Créer version CGU
    const version = await repo.createVersion({
      version: '4.0.0',
      content: '# CGU 4.0.0',
      effectiveDate: new Date('2026-01-01'),
    });
    await repo.activateVersion(version.id);

    // Créer users dans 2 tenants différents
    const userId1 = randomUUID();
    const userId2 = randomUUID();

    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId1, TENANT_ID, 'user1@test.com', 'User 1', 'hash', 'TENANT', 'user']
      );
    });

    await withTenantContext(pool, TENANT_ID_2, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId2, TENANT_ID_2, 'user2@test.com', 'User 2', 'hash', 'TENANT', 'user']
      );
    });

    // Enregistrer acceptations dans chaque tenant
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

    // Vérifier isolation: TENANT_ID ne voit pas TENANT_ID_2
    const acceptances1 = await repo.findAcceptancesByUser(TENANT_ID, userId1);
    expect(acceptances1).toHaveLength(1);
    expect(acceptances1[0].userId).toBe(userId1);

    // TENANT_ID_2 ne voit pas TENANT_ID
    const acceptances2 = await repo.findAcceptancesByUser(TENANT_ID_2, userId2);
    expect(acceptances2).toHaveLength(1);
    expect(acceptances2[0].userId).toBe(userId2);
  });

  it('should anonymize IP after 7 days (Art. 32)', async () => {
    // Créer version + user
    const version = await repo.createVersion({
      version: '5.0.0',
      content: '# CGU 5.0.0',
      effectiveDate: new Date('2026-01-01'),
    });

    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'hash3@test.com', 'User IP Test', 'hash', 'TENANT', 'user']
      );
    });

    // Enregistrer acceptation avec IP
    const acceptance = await repo.recordAcceptance(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      cguVersionId: version.id,
      ipAddress: '10.0.0.1',
      acceptanceMethod: 'checkbox',
    });

    expect(acceptance.ipAddress).toBe('10.0.0.1');

    // Simuler vieillissement: mettre accepted_at à 8 jours dans le passé
    await withPlatformContext(pool, async (client) => {
      await client.query(
        `UPDATE user_cgu_acceptances
         SET accepted_at = NOW() - INTERVAL '8 days'
         WHERE id = $1`,
        [acceptance.id]
      );
    });

    // Lancer anonymisation
    const anonymizedCount = await repo.anonymizeOldIpAddresses();
    expect(anonymizedCount).toBeGreaterThan(0);

    // Vérifier que IP est NULL
    const acceptances = await repo.findAcceptancesByUser(TENANT_ID, userId);
    expect(acceptances[0].ipAddress).toBeNull();
  });
});
