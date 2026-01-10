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
        [userId, TENANT_ID, 'opposition@test.com', 'Opposition User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'find@test.com', 'Find User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'pending@test.com', 'Pending User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'update@test.com', 'Update User', 'hash', 'TENANT', 'MEMBER']
      );
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, TENANT_ID, 'admin@test.com', 'Admin', 'hash', 'TENANT', 'TENANT_ADMIN']
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
        [userId1, TENANT_ID, 'tenant1@test.com', 'User 1', 'hash', 'TENANT', 'MEMBER']
      );
    });

    await withTenantContext(pool, TENANT_ID_2, async (client) => {
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId2, TENANT_ID_2, 'tenant2@test.com', 'User 2', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'metadata@test.com', 'Metadata User', 'hash', 'TENANT', 'MEMBER']
      );
      await client.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, TENANT_ID, 'admin2@test.com', 'Admin 2', 'hash', 'TENANT', 'TENANT_ADMIN']
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

  /**
   * LOT 11.0 — Extended tests to reach 80% coverage (Art. 21)
   */

  describe('Validation Rules', () => {
    it('should reject reason shorter than 10 characters', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'short@test.com', 'Short User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await expect(
        repo.create(TENANT_ID, {
          tenantId: TENANT_ID,
          userId,
          treatmentType: 'marketing',
          reason: 'Short',
        })
      ).rejects.toThrow('Reason must be at least 10 characters');
    });

    it('should reject reason longer than 2000 characters', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'long@test.com', 'Long User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await expect(
        repo.create(TENANT_ID, {
          tenantId: TENANT_ID,
          userId,
          treatmentType: 'analytics',
          reason: 'x'.repeat(2001),
        })
      ).rejects.toThrow('Reason must not exceed 2000 characters');
    });

    it('should require admin response when reviewing', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'noresp@test.com', 'No Response', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const opposition = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        treatmentType: 'marketing',
        reason: 'Opposition without response test',
      });

      await expect(
        repo.review(TENANT_ID, opposition.id, {
          status: 'accepted',
          adminResponse: 'Short',
          reviewedBy: randomUUID(),
        })
      ).rejects.toThrow('Admin response is required and must be detailed');
    });

    it('should prevent updating non-pending oppositions', async () => {
      const userId = randomUUID();
      const adminId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
          [userId, TENANT_ID, 'locked@test.com', 'Locked User', 'hash', 'TENANT', 'MEMBER',
           adminId, TENANT_ID, 'admin3@test.com', 'Admin 3', 'hash', 'TENANT', 'TENANT_ADMIN']
        );
      });

      const opposition = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        treatmentType: 'profiling',
        reason: 'Opposition to lock after review',
      });

      await repo.review(TENANT_ID, opposition.id, {
        status: 'accepted',
        adminResponse: 'First review completed',
        reviewedBy: adminId,
      });

      await expect(
        repo.review(TENANT_ID, opposition.id, {
          status: 'rejected',
          adminResponse: 'Try to change decision',
          reviewedBy: adminId,
        })
      ).rejects.toThrow('Only pending oppositions can be reviewed');
    });

    it('should throw on non-existent opposition review', async () => {
      await expect(
        repo.review(TENANT_ID, randomUUID(), {
          status: 'accepted',
          adminResponse: 'Non-existent opposition',
          reviewedBy: randomUUID(),
        })
      ).rejects.toThrow('Opposition not found');
    });
  });

  describe('findById', () => {
    it('should find opposition by ID', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'findid@test.com', 'Find ID User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const created = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        treatmentType: 'analytics',
        reason: 'Opposition to find by ID test',
      });

      const found = await repo.findById(TENANT_ID, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.userId).toBe(userId);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById(TENANT_ID, randomUUID());
      expect(found).toBeNull();
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findById('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findByTenant', () => {
    it('should find all oppositions for tenant', async () => {
      const user1 = randomUUID();
      const user2 = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
          [user1, TENANT_ID, 'u1@test.com', 'U1', 'hash', 'TENANT', 'MEMBER',
           user2, TENANT_ID, 'u2@test.com', 'U2', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: user1, treatmentType: 'marketing', reason: 'First opposition for tenant test' });
      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: user2, treatmentType: 'analytics', reason: 'Second opposition for tenant test' });

      const oppositions = await repo.findByTenant(TENANT_ID);

      expect(oppositions.length).toBeGreaterThanOrEqual(2);
      oppositions.forEach(o => expect(o.tenantId).toBe(TENANT_ID));
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findByTenant('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findExceedingSla', () => {
    it('should find oppositions exceeding 30 days SLA', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'sla@test.com', 'SLA User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create old opposition (31 days ago)
      const oppositionId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO user_oppositions
           (id, tenant_id, user_id, treatment_type, reason, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '31 days')`,
          [oppositionId, TENANT_ID, userId, 'marketing', 'Old opposition exceeding SLA test', 'pending']
        );
      });

      const exceeding = await repo.findExceedingSla(TENANT_ID);

      expect(exceeding.length).toBeGreaterThanOrEqual(1);
      expect(exceeding.some(o => o.id === oppositionId)).toBe(true);
    });

    it('should only include pending oppositions in SLA check', async () => {
      const exceeding = await repo.findExceedingSla(TENANT_ID);

      exceeding.forEach(o => {
        expect(o.status).toBe('pending');
      });
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findExceedingSla('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('countPending', () => {
    it('should count pending oppositions', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'count@test.com', 'Count User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, treatmentType: 'marketing', reason: 'First pending opposition for count test' });
      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, treatmentType: 'analytics', reason: 'Second pending opposition for count test' });

      const count = await repo.countPending(TENANT_ID);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 when no pending oppositions', async () => {
      const count = await repo.countPending(randomUUID());
      expect(count).toBe(0);
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.countPending('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('RGPD Deletion', () => {
    it('should soft delete oppositions by user', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'soft@test.com', 'Soft Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, treatmentType: 'profiling', reason: 'Opposition to soft delete test' });

      const deleted = await repo.softDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(1);

      // Verify opposition is not returned in normal queries
      const oppositions = await repo.findByUser(TENANT_ID, userId);
      expect(oppositions).toEqual([]);
    });

    it('should hard delete oppositions by user', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hard@test.com', 'Hard Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, treatmentType: 'marketing', reason: 'Opposition to hard delete test' });

      const deleted = await repo.hardDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(1);

      // Verify opposition is permanently deleted
      const oppositions = await repo.findByUser(TENANT_ID, userId);
      expect(oppositions).toEqual([]);
    });

    it('should throw on soft delete without tenantId', async () => {
      await expect(repo.softDeleteByUser('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on hard delete without tenantId', async () => {
      await expect(repo.hardDeleteByUser('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('RGPD Compliance Edge Cases', () => {
    it('should throw on create without tenantId', async () => {
      await expect(
        repo.create('', { tenantId: '', userId: randomUUID(), treatmentType: 'analytics', reason: 'Test opposition' })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on review without tenantId', async () => {
      await expect(
        repo.review('', randomUUID(), { status: 'accepted', adminResponse: 'Test response here', reviewedBy: randomUUID() })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on findByUser without tenantId', async () => {
      await expect(repo.findByUser('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on findPending without tenantId', async () => {
      await expect(repo.findPending('')).rejects.toThrow('RGPD VIOLATION');
    });
  });
});
