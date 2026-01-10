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
        [userId, TENANT_ID, 'dispute@test.com', 'Dispute User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'findById@test.com', 'Find User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'list@test.com', 'List User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'pending@test.com', 'Pending User', 'hash', 'TENANT', 'MEMBER']
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
        [userId, TENANT_ID, 'resolve@test.com', 'Resolve User', 'hash', 'TENANT', 'MEMBER']
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

    await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: userId1, reason: 'Contestation Tenant 1 test ici' });
    await repo.create(TENANT_ID_2, { tenantId: TENANT_ID_2, userId: userId2, reason: 'Contestation Tenant 2 test ici' });

    const disputes1 = await repo.findByUser(TENANT_ID, userId1);
    const disputes2 = await repo.findByUser(TENANT_ID_2, userId2);

    expect(disputes1).toHaveLength(1);
    expect(disputes1[0].userId).toBe(userId1);
    expect(disputes2).toHaveLength(1);
    expect(disputes2[0].userId).toBe(userId2);
  });

  /**
   * LOT 11.0 — Extended tests to reach 80% coverage (Art. 22)
   */

  describe('Validation Rules', () => {
    it('should reject reason shorter than 20 characters', async () => {
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
          reason: 'Too short',
        })
      ).rejects.toThrow('Reason must be at least 20 characters');
    });

    it('should reject reason longer than 5000 characters', async () => {
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
          reason: 'x'.repeat(5001),
        })
      ).rejects.toThrow('Reason must not exceed 5000 characters');
    });

    it('should require admin response when resolving dispute', async () => {
      const userId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'noresp@test.com', 'No Response', 'hash', 'TENANT', 'MEMBER']
        );
      });

      const dispute = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        reason: 'Dispute without admin response test',
      });

      await expect(
        repo.review(TENANT_ID, dispute.id, {
          status: 'resolved',
          reviewedBy: randomUUID(),
        })
      ).rejects.toThrow('Admin response is required when resolving or rejecting a dispute');
    });

    it('should prevent updating resolved disputes', async () => {
      const userId = randomUUID();
      const adminId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'locked@test.com', 'Locked User', 'hash', 'TENANT', 'MEMBER']
        );
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [adminId, TENANT_ID, 'admin2@test.com', 'Admin 2', 'hash', 'TENANT', 'TENANT_ADMIN']
        );
      });

      const dispute = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        reason: 'Dispute to lock after resolution',
      });

      await repo.review(TENANT_ID, dispute.id, {
        status: 'resolved',
        adminResponse: 'First resolution',
        reviewedBy: adminId,
      });

      await expect(
        repo.review(TENANT_ID, dispute.id, {
          status: 'rejected',
          adminResponse: 'Try to change',
          reviewedBy: adminId,
        })
      ).rejects.toThrow('Only pending or under_review disputes can be updated');
    });

    it('should throw on non-existent dispute review', async () => {
      await expect(
        repo.review(TENANT_ID, randomUUID(), {
          status: 'resolved',
          adminResponse: 'Non-existent',
          reviewedBy: randomUUID(),
        })
      ).rejects.toThrow('Dispute not found');
    });
  });

  describe('findByTenant', () => {
    it('should find all disputes for tenant', async () => {
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

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: user1, reason: 'First dispute for tenant test' });
      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId: user2, reason: 'Second dispute for tenant test' });

      const disputes = await repo.findByTenant(TENANT_ID);

      expect(disputes.length).toBeGreaterThanOrEqual(2);
      disputes.forEach(d => expect(d.tenantId).toBe(TENANT_ID));
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findByTenant('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findByAiJob', () => {
    it('should find disputes related to specific AI job', async () => {
      const userId = randomUUID();
      const aiJobId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'job@test.com', 'Job User', 'hash', 'TENANT', 'MEMBER']
        );

        // Create AI job first (FK constraint)
        await client.query(
          `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [aiJobId, TENANT_ID, userId, 'document_classification', 'COMPLETED']
        );
      });

      await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        aiJobId,
        reason: 'Dispute for specific AI job test',
      });

      const disputes = await repo.findByAiJob(TENANT_ID, aiJobId);

      expect(disputes.length).toBe(1);
      expect(disputes[0].aiJobId).toBe(aiJobId);
    });

    it('should return empty array for non-existent job', async () => {
      const disputes = await repo.findByAiJob(TENANT_ID, randomUUID());
      expect(disputes).toEqual([]);
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findByAiJob('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findUnderReview', () => {
    it('should find disputes under review', async () => {
      const userId = randomUUID();
      const adminId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)`,
          [userId, TENANT_ID, 'review@test.com', 'Review User', 'hash', 'TENANT', 'MEMBER',
           adminId, TENANT_ID, 'admin3@test.com', 'Admin 3', 'hash', 'TENANT', 'TENANT_ADMIN']
        );
      });

      const dispute = await repo.create(TENANT_ID, {
        tenantId: TENANT_ID,
        userId,
        reason: 'Dispute to put under review test',
      });

      await repo.review(TENANT_ID, dispute.id, {
        status: 'under_review',
        reviewedBy: adminId,
      });

      const underReview = await repo.findUnderReview(TENANT_ID);

      expect(underReview.length).toBeGreaterThanOrEqual(1);
      expect(underReview.some(d => d.id === dispute.id)).toBe(true);
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findUnderReview('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findExceedingSla', () => {
    it('should find disputes exceeding 30 days SLA', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'sla@test.com', 'SLA User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create old dispute (simulate 31 days ago)
      const disputeId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO user_disputes
           (id, tenant_id, user_id, reason, status, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '31 days')`,
          [disputeId, TENANT_ID, userId, 'Old dispute exceeding SLA test', 'pending']
        );
      });

      const exceeding = await repo.findExceedingSla(TENANT_ID);

      expect(exceeding.length).toBeGreaterThanOrEqual(1);
      expect(exceeding.some(d => d.id === disputeId)).toBe(true);
    });

    it('should not include resolved disputes in SLA check', async () => {
      const exceeding = await repo.findExceedingSla(TENANT_ID);

      exceeding.forEach(d => {
        expect(['pending', 'under_review']).toContain(d.status);
      });
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findExceedingSla('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('countPending', () => {
    it('should count pending disputes', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'count@test.com', 'Count User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'First pending for count test' });
      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Second pending for count test' });

      const count = await repo.countPending(TENANT_ID);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 when no pending disputes', async () => {
      const count = await repo.countPending(randomUUID());
      expect(count).toBe(0);
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.countPending('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('findWithExpiredAttachments', () => {
    it('should find disputes with expired attachments (90 days)', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'attach@test.com', 'Attach User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      // Create old dispute with attachment
      const disputeId = randomUUID();
      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO user_disputes
           (id, tenant_id, user_id, reason, status, attachment_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '91 days')`,
          [disputeId, TENANT_ID, userId, 'Old dispute with attachment test', 'pending', 'https://example.com/proof.pdf']
        );
      });

      const expired = await repo.findWithExpiredAttachments(TENANT_ID);

      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(expired.some(d => d.id === disputeId)).toBe(true);
    });

    it('should not include disputes without attachments', async () => {
      const expired = await repo.findWithExpiredAttachments(TENANT_ID);

      expired.forEach(d => {
        expect(d.attachmentUrl).not.toBeNull();
      });
    });

    it('should throw if tenantId missing', async () => {
      await expect(repo.findWithExpiredAttachments('')).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('RGPD Deletion', () => {
    it('should soft delete disputes by user', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'soft@test.com', 'Soft Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Dispute to soft delete test' });

      const deleted = await repo.softDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(1);

      // Verify dispute is not returned in normal queries
      const disputes = await repo.findByUser(TENANT_ID, userId);
      expect(disputes).toEqual([]);
    });

    it('should hard delete disputes by user', async () => {
      const userId = randomUUID();

      await withTenantContext(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, TENANT_ID, 'hard@test.com', 'Hard Delete User', 'hash', 'TENANT', 'MEMBER']
        );
      });

      await repo.create(TENANT_ID, { tenantId: TENANT_ID, userId, reason: 'Dispute to hard delete test' });

      const deleted = await repo.hardDeleteByUser(TENANT_ID, userId);

      expect(deleted).toBe(1);

      // Verify dispute is permanently deleted
      const disputes = await repo.findByUser(TENANT_ID, userId);
      expect(disputes).toEqual([]);
    });

    it('should throw on soft delete without tenantId', async () => {
      await expect(repo.softDeleteByUser('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on hard delete without tenantId', async () => {
      await expect(repo.hardDeleteByUser('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('RGPD Compliance Edge Cases', () => {
    it('should throw on findById without tenantId', async () => {
      await expect(repo.findById('', randomUUID())).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on create without tenantId', async () => {
      await expect(
        repo.create('', { tenantId: '', userId: randomUUID(), reason: 'Test' })
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should throw on review without tenantId', async () => {
      await expect(
        repo.review('', randomUUID(), { status: 'resolved', adminResponse: 'Test', reviewedBy: randomUUID() })
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
