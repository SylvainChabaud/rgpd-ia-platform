/**
 * Repository Tests: Opposition Repository
 * RGPD: Art. 21 (Droit d'opposition)
 * Tests: 6 tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import { randomUUID } from 'crypto';

describe('Repository: PgOppositionRepo', () => {
  let repo: PgOppositionRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000401';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000402';

  beforeEach(async () => {
    repo = new PgOppositionRepo();
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'opposition-repo-test-1', 'Opposition Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'opposition-repo-test-2', 'Opposition Repo Test 2']
    );
  });

  it('should save user opposition', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'opposition@test.com', 'Opposition User', 'hash', 'TENANT', 'user']
      );
    });

    const opposition = await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      treatmentType: 'analytics',
      reason: 'Je m\u0027oppose au traitement analytics de mes donn\u00e9es personnelles.',
    });

    expect(opposition).toBeDefined();
    expect(opposition.userId).toBe(userId);
    expect(opposition.status).toBe('pending');
    expect(opposition.treatmentType).toBe('analytics');
  });

  it('should retrieve opposition by userId', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'find@test.com', 'Find User', 'hash', 'TENANT', 'user']
      );
    });

    await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      treatmentType: 'marketing',
      reason: 'Opposition marketing test ici pour raison',
    });

    const oppositions = await repo.findByUser(TENANT_ID, userId);
    expect(oppositions).toHaveLength(1);
    expect(oppositions[0].userId).toBe(userId);
    expect(oppositions[0].treatmentType).toBe('marketing');
  });

  it('should list pending oppositions for admin', async () => {
    const userId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'pending@test.com', 'Pending User', 'hash', 'TENANT', 'user']
      );
    });

    await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      treatmentType: 'analytics',
      reason: 'Opposition pending test ici pour raison',
    });

    const pending = await repo.findPending(TENANT_ID);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].status).toBe('pending');
  });

  it('should update opposition status', async () => {
    const userId = randomUUID();
    const adminId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'update@test.com', 'Update User', 'hash', 'TENANT', 'user']
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
      treatmentType: 'analytics',
      reason: 'Opposition \u00e0 traiter test ici pour raison',
    });

    const reviewed = await repo.review(TENANT_ID, created.id, {
      status: 'accepted',
      adminResponse: 'Votre opposition a \u00e9t\u00e9 accept\u00e9e.',
      reviewedBy: adminId,
    });

    expect(reviewed.status).toBe('accepted');
    expect(reviewed.adminResponse).toContain('accept\u00e9e');
    expect(reviewed.reviewedBy).toBe(adminId);
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

    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: userId1, treatmentType: 'analytics', reason: 'Opposition Tenant 1 test ici raison' });
    await repo.create(TENANT_ID_2, { tenantId: TENANT_ID_2, userId: userId2, treatmentType: 'marketing', reason: 'Opposition Tenant 2 test ici raison' });

    const oppositions1 = await repo.findByUser(TENANT_ID, userId1);
    const oppositions2 = await repo.findByUser(TENANT_ID_2, userId2);

    expect(oppositions1).toHaveLength(1);
    expect(oppositions1[0].userId).toBe(userId1);
    expect(oppositions2).toHaveLength(1);
    expect(oppositions2[0].userId).toBe(userId2);
  });

  it('should track admin response metadata', async () => {
    const userId = randomUUID();
    const adminId = randomUUID();
    await withTenantContext(pool, TENANT_ID, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, TENANT_ID, 'metadata@test.com', 'Metadata User', 'hash', 'TENANT', 'user']
      );
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, TENANT_ID, 'admin2@test.com', 'Admin 2', 'hash', 'TENANT', 'admin']
      );
    });

    const created = await repo.create(TENANT_ID, {
      tenantId: TENANT_ID,
      userId,
      treatmentType: 'profiling',
      reason: 'Opposition metadata test ici pour raison minimale',
      metadata: { source: 'email', priority: 'high' },
    });

    expect(created.metadata).toBeDefined();
    expect(created.metadata).toEqual({ source: 'email', priority: 'high' });

    const reviewed = await repo.review(TENANT_ID, created.id, {
      status: 'rejected',
      adminResponse: 'Opposition rejet\u00e9e apr\u00e8s examen.',
      reviewedBy: adminId,
    });

    expect(reviewed.reviewedBy).toBe(adminId);
    expect(reviewed.reviewedAt).toBeDefined();
    expect(reviewed.adminResponse).toContain('rejet\u00e9e');
  });
});
