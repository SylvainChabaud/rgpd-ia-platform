import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';

/**
 * Integration tests for PgTenantRepo
 *
 * LOT 11.0 - Coverage improvement (29.78% → 80%+)
 *
 * Tests tenant management including:
 * - CRUD operations
 * - Soft delete support (RGPD Art. 17)
 * - Suspension system (LOT 11.1)
 * - Pagination
 */
describe('PgTenantRepo', () => {
  let repo: PgTenantRepo;
  let validAdminId: string;
  let adminTenantId: string;

  beforeEach(async () => {
    repo = new PgTenantRepo();

    // Create a tenant for admin user (to avoid PLATFORM unique constraint)
    adminTenantId = '00000000-0000-0000-0000-000000009999';

    // Clean up test tenants from previous runs (by slug patterns)
    await pool.query(`DELETE FROM tenants WHERE slug LIKE 'test-%'`);
    await pool.query(`DELETE FROM tenants WHERE slug = 'admin-tenant-for-tests'`);

    // Use cleanup function
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[adminTenantId]]);

    // Create admin tenant
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)`,
      [adminTenantId, 'admin-tenant-for-tests', 'Admin Tenant']
    );

    // Create a valid admin user for suspension tests (FK constraint)
    validAdminId = randomUUID();

    // Create admin user in tenant scope (avoids PLATFORM unique constraint)
    await pool.query(
      `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
       VALUES ($1, $2, $3, 'Test Admin', 'hash', 'TENANT', 'TENANT_ADMIN')`,
      [validAdminId, adminTenantId, 'tenant-repo-test-admin@test.com']
    );
  });

  describe('create', () => {
    it('should create new tenant', async () => {
      const tenantId = randomUUID();

      await repo.create({
        id: tenantId,
        slug: 'test-tenant',
        name: 'Test Tenant',
      });

      // Verify tenant was created
      const res = await pool.query(
        `SELECT id, slug, name FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rowCount).toBe(1);
      expect(res.rows[0].slug).toBe('test-tenant');
      expect(res.rows[0].name).toBe('Test Tenant');
    });

    it('should create multiple tenants', async () => {
      const tenant1 = randomUUID();
      const tenant2 = randomUUID();

      await repo.create({
        id: tenant1,
        slug: 'test-tenant-1',
        name: 'Tenant One',
      });

      await repo.create({
        id: tenant2,
        slug: 'test-tenant-2',
        name: 'Tenant Two',
      });

      const res = await pool.query(
        `SELECT COUNT(*) as count FROM tenants WHERE id IN ($1, $2)`,
        [tenant1, tenant2]
      );

      expect(parseInt(res.rows[0].count, 10)).toBe(2);
    });
  });

  describe('findBySlug', () => {
    it('should find tenant by slug', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-slug',
        name: 'Test Slug Tenant',
      });

      const tenant = await repo.findBySlug('test-slug');

      expect(tenant).not.toBeNull();
      expect(tenant?.id).toBe(tenantId);
      expect(tenant?.slug).toBe('test-slug');
      expect(tenant?.name).toBe('Test Slug Tenant');
    });

    it('should return null for non-existent slug', async () => {
      const tenant = await repo.findBySlug('non-existent-slug');

      expect(tenant).toBeNull();
    });

    it('should exclude soft-deleted tenants', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-deleted-slug',
        name: 'Deleted Tenant',
      });

      // Soft delete the tenant
      await repo.softDelete(tenantId);

      // Should not find soft-deleted tenant
      const tenant = await repo.findBySlug('test-deleted-slug');

      expect(tenant).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find tenant by ID', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-findbyid',
        name: 'FindById Tenant',
      });

      const tenant = await repo.findById(tenantId);

      expect(tenant).not.toBeNull();
      expect(tenant?.id).toBe(tenantId);
      expect(tenant?.slug).toBe('test-findbyid');
      expect(tenant?.name).toBe('FindById Tenant');
      expect(tenant?.createdAt).toBeInstanceOf(Date);
      expect(tenant?.deletedAt).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const tenant = await repo.findById(randomUUID());

      expect(tenant).toBeNull();
    });

    it('should exclude soft-deleted tenants', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-deleted-id',
        name: 'Deleted ID Tenant',
      });

      await repo.softDelete(tenantId);

      const tenant = await repo.findById(tenantId);

      expect(tenant).toBeNull();
    });

    it('should return suspension info', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-suspension',
        name: 'Suspension Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'Non-payment',
        suspendedBy: validAdminId,
      });

      const tenant = await repo.findById(tenantId);

      expect(tenant).not.toBeNull();
      expect(tenant?.suspendedAt).toBeInstanceOf(Date);
      expect(tenant?.suspensionReason).toBe('Non-payment');
      expect(tenant?.suspendedBy).toBeDefined();
    });
  });

  describe('getById (alias)', () => {
    it('should work identically to findById', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-getbyid',
        name: 'GetById Tenant',
      });

      const tenant = await repo.getById(tenantId);

      expect(tenant).not.toBeNull();
      expect(tenant?.id).toBe(tenantId);
    });

    it('should return null for non-existent ID', async () => {
      const tenant = await repo.getById(randomUUID());

      expect(tenant).toBeNull();
    });
  });

  describe('listAll', () => {
    beforeEach(async () => {
      // Create multiple test tenants
      for (let i = 0; i < 5; i++) {
        await repo.create({
          id: randomUUID(),
          slug: `test-list-${i}`,
          name: `List Tenant ${i}`,
        });
      }
    });

    it('should list all tenants with default pagination', async () => {
      const tenants = await repo.listAll(20, 0);

      expect(tenants.length).toBeGreaterThanOrEqual(5);
      tenants.forEach(t => {
        expect(t.id).toBeDefined();
        expect(t.slug).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should respect limit parameter', async () => {
      const tenants = await repo.listAll(2, 0);

      expect(tenants.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const page1 = await repo.listAll(2, 0);
      const page2 = await repo.listAll(2, 2);

      // IDs should be different
      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });

    it('should exclude soft-deleted tenants', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-list-deleted',
        name: 'Deleted List Tenant',
      });

      await repo.softDelete(tenantId);

      const tenants = await repo.listAll(100, 0);

      expect(tenants.find(t => t.id === tenantId)).toBeUndefined();
    });

    it('should use default pagination when no params provided', async () => {
      const tenants = await repo.listAll();

      expect(tenants).toBeInstanceOf(Array);
      expect(tenants.length).toBeGreaterThanOrEqual(0);
    });

    it('should order by created_at DESC', async () => {
      const tenant1 = randomUUID();
      const tenant2 = randomUUID();

      await repo.create({
        id: tenant1,
        slug: 'test-order-1',
        name: 'First',
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.create({
        id: tenant2,
        slug: 'test-order-2',
        name: 'Second',
      });

      const tenants = await repo.listAll(100, 0);
      const createdTenants = tenants.filter(t => t.id === tenant1 || t.id === tenant2);

      // Most recent should be first
      expect(createdTenants[0].id).toBe(tenant2);
    });
  });

  describe('update', () => {
    it('should update tenant name', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-update',
        name: 'Original Name',
      });

      await repo.update(tenantId, { name: 'Updated Name' });

      const tenant = await repo.findById(tenantId);

      expect(tenant?.name).toBe('Updated Name');
    });

    it('should not update slug', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-update-slug',
        name: 'Tenant',
      });

      await repo.update(tenantId, { name: 'New Name' });

      const tenant = await repo.findById(tenantId);

      expect(tenant?.slug).toBe('test-update-slug'); // Slug unchanged
    });

    it('should not throw on non-existent tenant', async () => {
      await expect(
        repo.update(randomUUID(), { name: 'Non-existent' })
      ).resolves.not.toThrow();
    });

    it('should not update soft-deleted tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-update-deleted',
        name: 'Original',
      });

      await repo.softDelete(tenantId);

      await repo.update(tenantId, { name: 'Should Not Update' });

      // Manually check DB (not via repo which filters deleted)
      const res = await pool.query(
        `SELECT name FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rows[0].name).toBe('Original');
    });

    it('should handle empty updates', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-empty-update',
        name: 'Name',
      });

      await repo.update(tenantId, {});

      const tenant = await repo.findById(tenantId);

      expect(tenant?.name).toBe('Name'); // Unchanged
    });
  });

  describe('softDelete', () => {
    it('should soft delete tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-soft-delete',
        name: 'Soft Delete Tenant',
      });

      await repo.softDelete(tenantId);

      // Should not be found via repo methods
      const tenant = await repo.findById(tenantId);
      expect(tenant).toBeNull();

      // But should exist in DB with deleted_at set
      const res = await pool.query(
        `SELECT id, deleted_at FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rowCount).toBe(1);
      expect(res.rows[0].deleted_at).not.toBeNull();
    });

    it('should cascade soft delete to users', async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();

      await repo.create({
        id: tenantId,
        slug: 'test-cascade-delete',
        name: 'Cascade Delete Tenant',
      });

      // Create user in tenant
      await pool.query(
        `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
         VALUES ($1, $2, $3, $4, $5, 'TENANT', 'MEMBER')`,
        [userId, tenantId, 'user@test.com', 'User', 'hash']
      );

      await repo.softDelete(tenantId);

      // User should be soft-deleted
      const userRes = await pool.query(
        `SELECT deleted_at FROM users WHERE id = $1`,
        [userId]
      );

      expect(userRes.rows[0].deleted_at).not.toBeNull();
    });

    it('should be idempotent', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-double-delete',
        name: 'Double Delete Tenant',
      });

      await repo.softDelete(tenantId);
      await repo.softDelete(tenantId); // Second call should not error

      const tenant = await repo.findById(tenantId);
      expect(tenant).toBeNull();
    });

    it('should preserve tenant data', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-preserve',
        name: 'Preserve Tenant',
      });

      await repo.softDelete(tenantId);

      // Data still exists in DB
      const res = await pool.query(
        `SELECT slug, name FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rows[0].slug).toBe('test-preserve');
      expect(res.rows[0].name).toBe('Preserve Tenant');
    });
  });

  describe('suspend', () => {
    it('should suspend tenant', async () => {
      const tenantId = randomUUID();

      await repo.create({
        id: tenantId,
        slug: 'test-suspend',
        name: 'Suspend Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'Terms violation',
        suspendedBy: validAdminId, // Use validAdminId from beforeEach (FK constraint)
      });

      const tenant = await repo.findById(tenantId);

      expect(tenant?.suspendedAt).toBeInstanceOf(Date);
      expect(tenant?.suspensionReason).toBe('Terms violation');
      expect(tenant?.suspendedBy).toBe(validAdminId);
    });

    it('should not suspend already suspended tenant', async () => {
      const tenantId = randomUUID();

      await repo.create({
        id: tenantId,
        slug: 'test-double-suspend',
        name: 'Double Suspend Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'First suspension',
        suspendedBy: validAdminId,
      });

      await repo.suspend(tenantId, {
        reason: 'Second suspension',
        suspendedBy: validAdminId,
      });

      const tenant = await repo.findById(tenantId);

      // Should keep first suspension
      expect(tenant?.suspensionReason).toBe('First suspension');
      expect(tenant?.suspendedBy).toBe(validAdminId);
    });

    it('should not suspend soft-deleted tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-suspend-deleted',
        name: 'Suspend Deleted Tenant',
      });

      await repo.softDelete(tenantId);

      await repo.suspend(tenantId, {
        reason: 'Should not work',
        suspendedBy: validAdminId,
      });

      // Manually check DB
      const res = await pool.query(
        `SELECT suspended_at FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rows[0].suspended_at).toBeNull();
    });
  });

  describe('unsuspend', () => {
    it('should unsuspend suspended tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-unsuspend',
        name: 'Unsuspend Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'Temporary',
        suspendedBy: validAdminId,
      });

      await repo.unsuspend(tenantId);

      const tenant = await repo.findById(tenantId);

      expect(tenant?.suspendedAt).toBeNull();
      expect(tenant?.suspensionReason).toBeNull();
      expect(tenant?.suspendedBy).toBeNull();
    });

    it('should be idempotent', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-double-unsuspend',
        name: 'Double Unsuspend Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'Test',
        suspendedBy: validAdminId,
      });

      await repo.unsuspend(tenantId);
      await repo.unsuspend(tenantId); // Should not error

      const tenant = await repo.findById(tenantId);
      expect(tenant?.suspendedAt).toBeNull();
    });

    it('should not unsuspend non-suspended tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-unsuspend-not-suspended',
        name: 'Not Suspended Tenant',
      });

      await expect(repo.unsuspend(tenantId)).resolves.not.toThrow();

      const tenant = await repo.findById(tenantId);
      expect(tenant?.suspendedAt).toBeNull();
    });

    it('should not unsuspend soft-deleted tenant', async () => {
      const tenantId = randomUUID();
      await repo.create({
        id: tenantId,
        slug: 'test-unsuspend-deleted',
        name: 'Unsuspend Deleted Tenant',
      });

      await repo.suspend(tenantId, {
        reason: 'Test',
        suspendedBy: validAdminId,
      });

      await repo.softDelete(tenantId);

      await repo.unsuspend(tenantId);

      // Manually check DB - should still be suspended
      const res = await pool.query(
        `SELECT suspended_at FROM tenants WHERE id = $1`,
        [tenantId]
      );

      expect(res.rows[0].suspended_at).not.toBeNull();
    });
  });

  describe('Complete Lifecycle', () => {
    it('should handle full tenant lifecycle', async () => {
      const tenantId = randomUUID();

      // 1. Create
      await repo.create({
        id: tenantId,
        slug: 'test-lifecycle',
        name: 'Lifecycle Tenant',
      });

      let tenant = await repo.findById(tenantId);
      expect(tenant).not.toBeNull();

      // 2. Update
      await repo.update(tenantId, { name: 'Updated Lifecycle' });
      tenant = await repo.findById(tenantId);
      expect(tenant?.name).toBe('Updated Lifecycle');

      // 3. Suspend
      await repo.suspend(tenantId, {
        reason: 'Temporary suspension',
        suspendedBy: validAdminId, // Use validAdminId from beforeEach (FK constraint)
      });
      tenant = await repo.findById(tenantId);
      expect(tenant?.suspendedAt).not.toBeNull();

      // 4. Unsuspend
      await repo.unsuspend(tenantId);
      tenant = await repo.findById(tenantId);
      expect(tenant?.suspendedAt).toBeNull();

      // 5. Soft delete
      await repo.softDelete(tenantId);
      tenant = await repo.findById(tenantId);
      expect(tenant).toBeNull();
    });
  });
});
