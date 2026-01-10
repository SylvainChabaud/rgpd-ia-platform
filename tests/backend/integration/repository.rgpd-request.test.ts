/**
 * Integration Tests: PgRgpdRequestRepo
 * Coverage: src/infrastructure/repositories/PgRgpdRequestRepo.ts
 * RGPD: Art. 17 - Deletion Request Tracking
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';

describe('PgRgpdRequestRepo', () => {
  let repo: PgRgpdRequestRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000401';
  const USER_ID = randomUUID();

  beforeEach(async () => {
    repo = new PgRgpdRequestRepo();

    // Clean test data
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID]]);

    // Create test tenant
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'rgpd-test', 'RGPD Test']
    );
  });

  describe('create', () => {
    it('should create RGPD deletion request', async () => {
      const scheduledPurgeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt,
      });

      expect(request.id).toBeDefined();
      expect(request.tenantId).toBe(TENANT_ID);
      expect(request.userId).toBe(USER_ID);
      expect(request.type).toBe('DELETE');
      expect(request.status).toBe('PENDING');
      expect(request.scheduledPurgeAt).toEqual(scheduledPurgeAt);
    });

    it('should throw if tenantId is missing', async () => {
      await expect(
        repo.create('', {
          userId: USER_ID,
          type: 'DELETE',
          status: 'PENDING',
        })
      ).rejects.toThrow('RGPD VIOLATION: tenantId required');
    });

    it('should create request without scheduled purge date', async () => {
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'EXPORT',
        status: 'PENDING',
      });

      expect(request.scheduledPurgeAt).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should retrieve request by ID', async () => {
      const created = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: new Date(),
      });

      const found = await repo.findById(TENANT_ID, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.userId).toBe(USER_ID);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById(TENANT_ID, randomUUID());

      expect(found).toBeNull();
    });

    it('should throw if tenantId missing', async () => {
      await expect(
        repo.findById('', randomUUID())
      ).rejects.toThrow('RGPD VIOLATION');
    });

    it('should enforce tenant isolation', async () => {
      const OTHER_TENANT = '00000000-0000-0000-0000-000000000402';

      await pool.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [OTHER_TENANT, 'other-tenant', 'Other Tenant']
      );

      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
      });

      // Try to access from different tenant
      const found = await repo.findById(OTHER_TENANT, request.id);

      expect(found).toBeNull(); // Should not find cross-tenant request
    });
  });

  describe('findDeletionRequest', () => {
    it('should find deletion request by tenant and user', async () => {
      await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
      });

      const found = await repo.findDeletionRequest(TENANT_ID, USER_ID);

      expect(found).not.toBeNull();
      expect(found?.userId).toBe(USER_ID);
      expect(found?.type).toBe('DELETE');
    });

    it('should return null if no deletion request exists', async () => {
      const found = await repo.findDeletionRequest(TENANT_ID, randomUUID());

      expect(found).toBeNull();
    });

    it('should throw if tenantId missing', async () => {
      await expect(
        repo.findDeletionRequest('', USER_ID)
      ).rejects.toThrow('RGPD VIOLATION');
    });
  });

  describe('updateStatus', () => {
    it('should update request status', async () => {
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: new Date(),
      });

      const completedAt = new Date();
      await repo.updateStatus(request.id, 'COMPLETED', completedAt);

      const updated = await repo.findById(TENANT_ID, request.id);

      expect(updated?.status).toBe('COMPLETED');
      expect(updated?.completedAt).not.toBeNull();
    });

    it('should update status without completedAt', async () => {
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: new Date(),
      });

      await repo.updateStatus(request.id, 'PROCESSING');

      const updated = await repo.findById(TENANT_ID, request.id);

      expect(updated?.status).toBe('PROCESSING');
      expect(updated?.completedAt).toBeUndefined();
    });
  });

  describe('findPendingPurges', () => {
    it('should list requests ready for purge', async () => {
      const pastDate = new Date(Date.now() - 1000);

      await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: pastDate,
      });

      const pending = await repo.findPendingPurges();

      expect(pending.length).toBeGreaterThanOrEqual(1);
      pending.forEach((req) => {
        expect(req.status).toBe('PENDING');
        expect(req.scheduledPurgeAt).toBeDefined();
        if (req.scheduledPurgeAt) {
          expect(req.scheduledPurgeAt.getTime()).toBeLessThanOrEqual(Date.now());
        }
      });
    });

    it('should not include future purges', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await repo.create(TENANT_ID, {
        userId: randomUUID(),
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: futureDate,
      });

      const pending = await repo.findPendingPurges();

      // Should not include the future request
      const futureRequest = pending.find(
        (r) => r.scheduledPurgeAt && r.scheduledPurgeAt.getTime() > Date.now()
      );

      expect(futureRequest).toBeUndefined();
    });
  });

  describe('RGPD Compliance', () => {
    it('should enforce tenant isolation on all operations', async () => {
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
      });

      // All operations must include tenantId (where applicable)
      await expect(repo.findById('', request.id)).rejects.toThrow('RGPD VIOLATION');
      await expect(repo.findDeletionRequest('', USER_ID)).rejects.toThrow('RGPD VIOLATION');
    });

    it('should track deletion workflow lifecycle', async () => {
      // 1. Create PENDING request
      const request = await repo.create(TENANT_ID, {
        userId: USER_ID,
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(request.status).toBe('PENDING');

      // 2. Update to COMPLETED after purge
      await repo.updateStatus(request.id, 'COMPLETED', new Date());

      const completed = await repo.findById(TENANT_ID, request.id);
      expect(completed?.status).toBe('COMPLETED');
    });
  });
});
