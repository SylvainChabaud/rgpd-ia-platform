/**
 * Repository Tests: Dispute Repository
 * RGPD: Art. 22 (Révision humaine)
 * Tests: 6 tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';

describe('Repository: PgDisputeRepo', () => {
  let repo: PgDisputeRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000301';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000302';

  beforeEach(async () => {
    repo = new PgDisputeRepo();
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'dispute-repo-test-1', 'Dispute Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'dispute-repo-test-2', 'Dispute Repo Test 2']
    );
  });

  it('should save user dispute', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'dispute@test.com', 'Dispute User', 'hash', 'TENANT', 'user']
      );
    });

    const dispute = await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      reason: 'Je conteste la décision automatisée car elle est incorrecte.',
      metadata: { jobType: 'classification', result: 'negative' },
    });

    expect(dispute).toBeDefined();
    expect(dispute.userId).toBe(userId);
    expect(dispute.status).toBe('pending');
    expect(dispute.reason).toContain('conteste');
  });

  it('should retrieve dispute by id', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'findById@test.com', 'Find User', 'hash', 'TENANT', 'user']
      );
    });

    const created = await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      reason: 'Contestation pour retrouver par ID.',
    });

    const found = await repo.findById(TENANT_ID, created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.status).toBe('pending');
  });

  it('should list disputes by userId', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'list@test.com', 'List User', 'hash', 'TENANT', 'user']
      );
    });

    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Première contestation test ici' });
    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Deuxième contestation test ici' });

    const disputes = await repo.findByUser(TENANT_ID, userId);
    expect(disputes).toHaveLength(2);
    expect(disputes[0].userId).toBe(userId);
  });

  it('should list pending disputes for admin', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'pending@test.com', 'Pending User', 'hash', 'TENANT', 'user']
      );
    });

    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Contestation en attente test ici' });

    const pending = await repo.findPending(TENANT_ID);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].status).toBe('pending');
  });

  it('should update dispute resolution', async () => {
    const userId = randomUUID();
    const adminId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'resolve@test.com', 'Resolve User', 'hash', 'TENANT', 'user']
      );
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, TENANT_ID, 'admin@test.com', 'Admin', 'hash', 'TENANT', 'admin']
      );
    });

    const created = await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      reason: 'Contestation à résoudre test ici',
    });

    const resolved = await repo.review(TENANT_ID, created.id, {
      status: 'resolved',
      adminResponse: 'Votre contestation a été examinée et approuvée.',
      reviewedBy: adminId,
    });

    expect(resolved.status).toBe('resolved');
    expect(resolved.adminResponse).toContain('approuvée');
    expect(resolved.reviewedBy).toBe(adminId);
  });

  it('should enforce tenant isolation', async () => {
    const userId1 = randomUUID();
    const userId2 = randomUUID();

    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId1, TENANT_ID, 'tenant1@test.com', 'User 1', 'hash', 'TENANT', 'user']
      );
    });

    await withTenantContext(pool, TENANT_ID_2, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId2, TENANT_ID_2, 'tenant2@test.com', 'User 2', 'hash', 'TENANT', 'user']
      );
    });

    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: userId1, reason: 'Contestation Tenant 1 test ici' });
    await repo.create(TENANT_ID_2, { tenantId: TENANT_ID_2, userId: userId2, reason: 'Contestation Tenant 2 test ici' });

    const disputes1 = await repo.findByUser(TENANT_ID, userId1);
    const disputes2 = await repo.findByUser(TENANT_ID_2, userId2);

    expect(disputes1).toHaveLength(1);
    expect(disputes1[0].userId).toBe(userId1);
    expect(disputes2).toHaveLength(1);
    expect(disputes2[0].userId).toBe(userId2);
  });
});
