/**
 * Integration Tests: PgAiJobRepo
 * LOT 11.0 - Coverage improvement (69.23% → 80%+)
 *
 * Tests AI job metadata repository (NO CONTENT storage).
 * CRITICAL: Validates tenant isolation and RGPD compliance (Art. 17).
 *
 * Classification: P1 (technical metadata, no sensitive data)
 * Architecture: AI job tracking system
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';
import type { AiJobStatus } from '@/app/ports/AiJobRepo';

describe('PgAiJobRepo', () => {
  let repo: PgAiJobRepo;
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    repo = new PgAiJobRepo();

    // Setup test tenant and user
    tenantId = randomUUID();
    userId = randomUUID();

    await pool.query(
      `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
      [tenantId, 'Test Tenant', `test-tenant-${Date.now()}`]
    );

    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
      [userId, tenantId, 'test@example.com', 'Test User', 'hash']
    );

    // Cleanup ai_jobs for this tenant
    await pool.query(`DELETE FROM ai_jobs WHERE tenant_id = $1`, [tenantId]);
  });

  afterAll(async () => {
    // Cleanup all test data
    await pool.query(`DELETE FROM ai_jobs WHERE tenant_id::text LIKE 'test-%' OR tenant_id = $1`, [tenantId]);
    await pool.query(`DELETE FROM users WHERE tenant_id::text LIKE 'test-%' OR tenant_id = $1`, [tenantId]);
    await pool.query(`DELETE FROM tenants WHERE slug LIKE 'test-tenant-%' OR id = $1`, [tenantId]);
    await pool.end();
  });

  describe('create', () => {
    it('should create AI job with all required fields', async () => {
      const jobId = await repo.create(tenantId, {
        userId,
        purpose: 'DPIA_GENERATION',
        modelRef: 'gpt-4',
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Verify job was created in DB
      const res = await pool.query(
        `SELECT id, tenant_id, user_id, purpose, model_ref, status, created_at
         FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rowCount).toBe(1);
      const job = res.rows[0];
      expect(job.tenant_id).toBe(tenantId);
      expect(job.user_id).toBe(userId);
      expect(job.purpose).toBe('DPIA_GENERATION');
      expect(job.model_ref).toBe('gpt-4');
      expect(job.status).toBe('PENDING');
      expect(job.created_at).toBeDefined();
    });

    it('should create job without userId (system job)', async () => {
      const jobId = await repo.create(tenantId, {
        purpose: 'REGISTRE_EXPORT',
      });

      const res = await pool.query(
        `SELECT user_id FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].user_id).toBeNull();
    });

    it('should create job without modelRef', async () => {
      const jobId = await repo.create(tenantId, {
        userId,
        purpose: 'CONSENT_ANALYSIS',
      });

      const res = await pool.query(
        `SELECT model_ref FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].model_ref).toBeNull();
    });

    it('should reject creation without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.create('', {
          userId,
          purpose: 'TEST',
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job storage');
    });

    it('should reject creation with empty purpose', async () => {
      await expect(
        repo.create(tenantId, {
          userId,
          purpose: '',
        })
      ).rejects.toThrow('AI job purpose is required');
    });

    it('should reject creation with whitespace-only purpose', async () => {
      await expect(
        repo.create(tenantId, {
          userId,
          purpose: '   ',
        })
      ).rejects.toThrow('AI job purpose is required');
    });

    it('should set status to PENDING by default', async () => {
      const jobId = await repo.create(tenantId, {
        userId,
        purpose: 'DEFAULT_STATUS_TEST',
      });

      const res = await pool.query(
        `SELECT status FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].status).toBe('PENDING');
    });

    it('should set created_at timestamp automatically', async () => {
      const jobId = await repo.create(tenantId, {
        userId,
        purpose: 'TIMESTAMP_TEST',
      });

      const res = await pool.query(
        `SELECT created_at FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      const createdAt = new Date(res.rows[0].created_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

      expect(diffSeconds).toBeLessThan(10);
      expect(createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateStatus', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await repo.create(tenantId, {
        userId,
        purpose: 'STATUS_UPDATE_TEST',
      });
    });

    it('should update job status to RUNNING', async () => {
      await repo.updateStatus(tenantId, jobId, {
        status: 'RUNNING',
        startedAt: new Date(),
      });

      const res = await pool.query(
        `SELECT status, started_at FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].status).toBe('RUNNING');
      expect(res.rows[0].started_at).not.toBeNull();
    });

    it('should update job status to COMPLETED', async () => {
      const completedAt = new Date();
      await repo.updateStatus(tenantId, jobId, {
        status: 'COMPLETED',
        completedAt,
      });

      const res = await pool.query(
        `SELECT status, completed_at FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].status).toBe('COMPLETED');
      expect(res.rows[0].completed_at).not.toBeNull();
    });

    it('should update job status to FAILED', async () => {
      await repo.updateStatus(tenantId, jobId, {
        status: 'FAILED',
        completedAt: new Date(),
      });

      const res = await pool.query(
        `SELECT status FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].status).toBe('FAILED');
    });

    it('should preserve existing timestamps when not provided', async () => {
      // First update: set startedAt
      const startedAt = new Date('2025-01-01T10:00:00Z');
      await repo.updateStatus(tenantId, jobId, {
        status: 'RUNNING',
        startedAt,
      });

      // Second update: only change status (should keep startedAt)
      await repo.updateStatus(tenantId, jobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const res = await pool.query(
        `SELECT started_at FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rows[0].started_at).not.toBeNull();
    });

    it('should reject update without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.updateStatus('', jobId, {
          status: 'RUNNING',
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job updates');
    });

    it('should reject update for non-existent job', async () => {
      const fakeJobId = randomUUID();

      await expect(
        repo.updateStatus(tenantId, fakeJobId, {
          status: 'RUNNING',
        })
      ).rejects.toThrow(`AI job ${fakeJobId} not found or access denied`);
    });

    it('should reject cross-tenant update (isolation)', async () => {
      const otherTenantId = randomUUID();
      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [otherTenantId, 'Other Tenant', `other-tenant-${Date.now()}`]
      );

      await expect(
        repo.updateStatus(otherTenantId, jobId, {
          status: 'RUNNING',
        })
      ).rejects.toThrow(`AI job ${jobId} not found or access denied`);
    });

    it('should support all valid status transitions', async () => {
      const statuses: AiJobStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];

      for (const status of statuses) {
        await repo.updateStatus(tenantId, jobId, { status });

        const res = await pool.query(
          `SELECT status FROM ai_jobs WHERE id = $1`,
          [jobId]
        );

        expect(res.rows[0].status).toBe(status);
      }
    });
  });

  describe('findById', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = await repo.create(tenantId, {
        userId,
        purpose: 'FIND_BY_ID_TEST',
        modelRef: 'claude-3',
      });
    });

    it('should find job by ID within tenant', async () => {
      const job = await repo.findById(tenantId, jobId);

      expect(job).not.toBeNull();
      expect(job!.id).toBe(jobId);
      expect(job!.tenantId).toBe(tenantId);
      expect(job!.userId).toBe(userId);
      expect(job!.purpose).toBe('FIND_BY_ID_TEST');
      expect(job!.modelRef).toBe('claude-3');
      expect(job!.status).toBe('PENDING');
      expect(job!.createdAt).toBeInstanceOf(Date);
      expect(job!.startedAt).toBeNull();
      expect(job!.completedAt).toBeNull();
    });

    it('should return null for non-existent job', async () => {
      const fakeJobId = randomUUID();
      const job = await repo.findById(tenantId, fakeJobId);

      expect(job).toBeNull();
    });

    it('should return null for cross-tenant access (isolation)', async () => {
      const otherTenantId = randomUUID();
      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [otherTenantId, 'Isolated Tenant', `isolated-tenant-${Date.now()}`]
      );

      const job = await repo.findById(otherTenantId, jobId);

      expect(job).toBeNull();
    });

    it('should reject query without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.findById('', jobId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job queries');
    });

    it('should include timestamps when job is running', async () => {
      await repo.updateStatus(tenantId, jobId, {
        status: 'RUNNING',
        startedAt: new Date(),
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.status).toBe('RUNNING');
      expect(job!.startedAt).toBeInstanceOf(Date);
      expect(job!.completedAt).toBeNull();
    });

    it('should include all timestamps when job is completed', async () => {
      await repo.updateStatus(tenantId, jobId, {
        status: 'RUNNING',
        startedAt: new Date(),
      });
      await repo.updateStatus(tenantId, jobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.status).toBe('COMPLETED');
      expect(job!.startedAt).toBeInstanceOf(Date);
      expect(job!.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByUser', () => {
    beforeEach(async () => {
      // Create 5 jobs for the user
      for (let i = 0; i < 5; i++) {
        await repo.create(tenantId, {
          userId,
          purpose: `JOB_${i}`,
        });
      }
    });

    it('should find all jobs for user', async () => {
      const jobs = await repo.findByUser(tenantId, userId);

      expect(jobs.length).toBe(5);
      jobs.forEach((job) => {
        expect(job.tenantId).toBe(tenantId);
        expect(job.userId).toBe(userId);
        expect(job.purpose).toMatch(/^JOB_\d$/);
      });
    });

    it('should return empty array for user with no jobs', async () => {
      const newUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [newUserId, tenantId, 'newuser@example.com', 'New User', 'hash']
      );

      const jobs = await repo.findByUser(tenantId, newUserId);

      expect(jobs).toEqual([]);
    });

    it('should order jobs by created_at DESC (newest first)', async () => {
      const jobs = await repo.findByUser(tenantId, userId);

      for (let i = 0; i < jobs.length - 1; i++) {
        expect(jobs[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          jobs[i + 1].createdAt.getTime()
        );
      }
    });

    it('should respect limit parameter', async () => {
      const jobs = await repo.findByUser(tenantId, userId, 3);

      expect(jobs.length).toBe(3);
    });

    it('should use default limit of 100', async () => {
      // Create 120 jobs
      for (let i = 5; i < 125; i++) {
        await repo.create(tenantId, {
          userId,
          purpose: `BULK_JOB_${i}`,
        });
      }

      const jobs = await repo.findByUser(tenantId, userId);

      expect(jobs.length).toBe(100); // Default limit
    });

    it('should reject query without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.findByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job queries');
    });

    it('should isolate jobs by tenant', async () => {
      const otherTenantId = randomUUID();
      const otherUserId = randomUUID();

      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [otherTenantId, 'Other Tenant', `other-tenant-jobs-${Date.now()}`]
      );
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [otherUserId, otherTenantId, 'other@example.com', 'Other User', 'hash']
      );

      // User in other tenant should see no jobs
      const jobs = await repo.findByUser(otherTenantId, userId);

      expect(jobs).toEqual([]);
    });
  });

  describe('softDeleteByUser', () => {
    beforeEach(async () => {
      // Create 3 jobs for the user
      for (let i = 0; i < 3; i++) {
        await repo.create(tenantId, {
          userId,
          purpose: `SOFT_DELETE_JOB_${i}`,
        });
      }
    });

    it('should soft delete all jobs for user', async () => {
      const deletedCount = await repo.softDeleteByUser(tenantId, userId);

      expect(deletedCount).toBe(3);

      // Verify jobs are marked as deleted
      const res = await pool.query(
        `SELECT deleted_at FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      expect(res.rowCount).toBe(3);
      res.rows.forEach((row) => {
        expect(row.deleted_at).not.toBeNull();
      });
    });

    it('should return 0 for user with no jobs', async () => {
      const newUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [newUserId, tenantId, 'nojobs@example.com', 'No Jobs User', 'hash']
      );

      const deletedCount = await repo.softDeleteByUser(tenantId, newUserId);

      expect(deletedCount).toBe(0);
    });

    it('should reject soft delete without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.softDeleteByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job soft delete');
    });

    it('should not soft delete already soft-deleted jobs', async () => {
      // First soft delete
      await repo.softDeleteByUser(tenantId, userId);

      // Second soft delete (should affect 0 rows)
      const secondDeleteCount = await repo.softDeleteByUser(tenantId, userId);

      expect(secondDeleteCount).toBe(0);
    });

    it('should set deleted_at timestamp to now', async () => {
      await repo.softDeleteByUser(tenantId, userId);

      const res = await pool.query(
        `SELECT deleted_at FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      const deletedAt = new Date(res.rows[0].deleted_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - deletedAt.getTime()) / 1000;

      expect(diffSeconds).toBeLessThan(10);
    });

    it('should isolate soft delete by tenant', async () => {
      const otherTenantId = randomUUID();
      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [otherTenantId, 'Other Tenant', `soft-delete-tenant-${Date.now()}`]
      );

      // Attempt to soft delete from wrong tenant (should delete 0)
      const deletedCount = await repo.softDeleteByUser(otherTenantId, userId);

      expect(deletedCount).toBe(0);

      // Verify original jobs still exist
      const res = await pool.query(
        `SELECT deleted_at FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      expect(res.rowCount).toBe(3);
      res.rows.forEach((row) => {
        expect(row.deleted_at).toBeNull(); // Not deleted
      });
    });
  });

  describe('hardDeleteByUser', () => {
    beforeEach(async () => {
      // Create 3 jobs for the user
      for (let i = 0; i < 3; i++) {
        await repo.create(tenantId, {
          userId,
          purpose: `HARD_DELETE_JOB_${i}`,
        });
      }
    });

    it('should hard delete all jobs for user', async () => {
      const deletedCount = await repo.hardDeleteByUser(tenantId, userId);

      expect(deletedCount).toBe(3);

      // Verify jobs are completely removed
      const res = await pool.query(
        `SELECT * FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      expect(res.rowCount).toBe(0);
    });

    it('should return 0 for user with no jobs', async () => {
      const newUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [newUserId, tenantId, 'empty@example.com', 'Empty User', 'hash']
      );

      const deletedCount = await repo.hardDeleteByUser(tenantId, newUserId);

      expect(deletedCount).toBe(0);
    });

    it('should reject hard delete without tenantId (RGPD blocker)', async () => {
      await expect(
        repo.hardDeleteByUser('', userId)
      ).rejects.toThrow('RGPD VIOLATION: tenantId required for AI job hard delete');
    });

    it('should delete both soft-deleted and non-soft-deleted jobs', async () => {
      // Soft delete 2 jobs first (using subquery since PostgreSQL doesn't support LIMIT in UPDATE)
      await pool.query(
        `UPDATE ai_jobs
         SET deleted_at = NOW()
         WHERE id IN (
           SELECT id FROM ai_jobs
           WHERE tenant_id = $1 AND user_id = $2
           LIMIT 2
         )`,
        [tenantId, userId]
      );

      // Hard delete all (should remove all 3)
      const deletedCount = await repo.hardDeleteByUser(tenantId, userId);

      expect(deletedCount).toBe(3);
    });

    it('should isolate hard delete by tenant', async () => {
      const otherTenantId = randomUUID();
      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [otherTenantId, 'Other Tenant', `hard-delete-tenant-${Date.now()}`]
      );

      // Attempt to hard delete from wrong tenant (should delete 0)
      const deletedCount = await repo.hardDeleteByUser(otherTenantId, userId);

      expect(deletedCount).toBe(0);

      // Verify original jobs still exist
      const res = await pool.query(
        `SELECT * FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      expect(res.rowCount).toBe(3);
    });

    it('should permanently remove jobs (RGPD Art. 17)', async () => {
      await repo.hardDeleteByUser(tenantId, userId);

      // Verify complete removal (even with deleted_at check)
      const res = await pool.query(
        `SELECT * FROM ai_jobs WHERE user_id = $1`,
        [userId]
      );

      expect(res.rowCount).toBe(0);
    });
  });

  describe('Integration - RGPD Deletion Workflow', () => {
    it('should support Art. 17 deletion workflow: soft → hard', async () => {
      // Create jobs
      await repo.create(tenantId, { userId, purpose: 'JOB_1' });
      await repo.create(tenantId, { userId, purpose: 'JOB_2' });

      // Step 1: Soft delete (30-day retention)
      const softDeleted = await repo.softDeleteByUser(tenantId, userId);
      expect(softDeleted).toBe(2);

      // Verify soft-deleted jobs still exist in DB
      const afterSoftDelete = await pool.query(
        `SELECT deleted_at FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      expect(afterSoftDelete.rowCount).toBe(2);
      afterSoftDelete.rows.forEach((row) => {
        expect(row.deleted_at).not.toBeNull();
      });

      // Step 2: Hard delete (after retention period)
      const hardDeleted = await repo.hardDeleteByUser(tenantId, userId);
      expect(hardDeleted).toBe(2);

      // Verify complete removal
      const afterHardDelete = await pool.query(
        `SELECT * FROM ai_jobs WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      expect(afterHardDelete.rowCount).toBe(0);
    });

    it('should handle mixed deletion states', async () => {
      await repo.create(tenantId, { userId, purpose: 'ACTIVE_JOB' });
      await repo.create(tenantId, { userId, purpose: 'TO_DELETE_JOB' });

      // Soft delete only one job manually
      await pool.query(
        `UPDATE ai_jobs
         SET deleted_at = NOW()
         WHERE tenant_id = $1 AND user_id = $2 AND purpose = 'TO_DELETE_JOB'`,
        [tenantId, userId]
      );

      // Hard delete all (should remove both)
      const deletedCount = await repo.hardDeleteByUser(tenantId, userId);
      expect(deletedCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in purpose', async () => {
      const specialPurpose = "O'Brien's DPIA (2025) - Test [URGENT]";

      const jobId = await repo.create(tenantId, {
        userId,
        purpose: specialPurpose,
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.purpose).toBe(specialPurpose);
    });

    it('should handle very long purpose strings', async () => {
      const longPurpose = 'x'.repeat(500);

      const jobId = await repo.create(tenantId, {
        userId,
        purpose: longPurpose,
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.purpose.length).toBe(500);
    });

    it('should handle unicode in purpose', async () => {
      const unicodePurpose = 'DPIA 中文 Français Müller 🚀';

      const jobId = await repo.create(tenantId, {
        userId,
        purpose: unicodePurpose,
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.purpose).toBe(unicodePurpose);
    });

    it('should handle null userId for system jobs', async () => {
      const jobId = await repo.create(tenantId, {
        purpose: 'SYSTEM_JOB',
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.userId).toBeNull();
    });

    it('should handle null modelRef', async () => {
      const jobId = await repo.create(tenantId, {
        userId,
        purpose: 'NO_MODEL_JOB',
      });

      const job = await repo.findById(tenantId, jobId);

      expect(job!.modelRef).toBeNull();
    });
  });

  describe('RGPD Compliance', () => {
    it('should enforce tenant_id NOT NULL constraint', async () => {
      await expect(
        pool.query(
          `INSERT INTO ai_jobs (id, tenant_id, purpose, status)
           VALUES ($1, NULL, $2, 'PENDING')`,
          [randomUUID(), 'TEST']
        )
      ).rejects.toThrow(); // Violates NOT NULL constraint
    });

    it('should cascade delete when tenant is deleted', async () => {
      const tempTenantId = randomUUID();
      const tempUserId = randomUUID();

      await pool.query(
        `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)`,
        [tempTenantId, 'Temp Tenant', `temp-tenant-${Date.now()}`]
      );
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [tempUserId, tempTenantId, 'temp@example.com', 'Temp User', 'hash']
      );

      // Create job
      const jobId = await repo.create(tempTenantId, {
        userId: tempUserId,
        purpose: 'CASCADE_TEST',
      });

      // Delete tenant (should cascade to ai_jobs)
      await pool.query(`DELETE FROM tenants WHERE id = $1`, [tempTenantId]);

      // Verify job was deleted
      const res = await pool.query(
        `SELECT * FROM ai_jobs WHERE id = $1`,
        [jobId]
      );

      expect(res.rowCount).toBe(0);
    });

    it('should enforce status CHECK constraint', async () => {
      await expect(
        pool.query(
          `INSERT INTO ai_jobs (id, tenant_id, user_id, purpose, status)
           VALUES ($1, $2, $3, $4, 'INVALID_STATUS')`,
          [randomUUID(), tenantId, userId, 'TEST']
        )
      ).rejects.toThrow(); // Violates status CHECK constraint
    });
  });
});
