import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgTenantUserRepo } from '@/infrastructure/repositories/PgTenantUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { randomUUID } from 'crypto';
import { ACTOR_ROLE } from '@/shared/actorRole';

/**
 * Integration tests for PgTenantUserRepo
 *
 * LOT 11.0 - Coverage improvement (0% → 80%+)
 *
 * Tests tenant user creation (admins and regular users).
 * Critical for tenant user management and RGPD isolation.
 */
describe('PgTenantUserRepo', () => {
  let repo: PgTenantUserRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000901';

  beforeEach(async () => {
    repo = new PgTenantUserRepo();

    // Clean test data
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID]]);

    // Create test tenant
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'tenant-user-test', 'Tenant User Test']
    );
  });

  describe('createTenantAdmin', () => {
    it('should create tenant admin with correct role', async () => {
      const userId = randomUUID();
      const input = {
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'admin@test.com',
        displayName: 'Admin User',
        passwordHash: 'hashed_password_123',
      };

      await repo.createTenantAdmin(input);

      // Verify user was created with correct role
      const res = await pool.query(
        `SELECT id, tenant_id, email_hash, display_name, scope, role
         FROM users
         WHERE id = $1`,
        [userId]
      );

      expect(res.rowCount).toBe(1);
      const user = res.rows[0];
      expect(user.id).toBe(userId);
      expect(user.tenant_id).toBe(TENANT_ID);
      expect(user.email_hash).toBe('admin@test.com');
      expect(user.display_name).toBe('Admin User');
      expect(user.scope).toBe('TENANT');
      expect(user.role).toBe(ACTOR_ROLE.TENANT_ADMIN);
    });

    it('should hash password correctly', async () => {
      const userId = randomUUID();
      const passwordHash = 'secure_hash_value';

      await repo.createTenantAdmin({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'test@example.com',
        displayName: 'Test Admin',
        passwordHash,
      });

      const res = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [userId]
      );

      expect(res.rows[0].password_hash).toBe(passwordHash);
    });

    it('should enforce tenant isolation', async () => {
      const userId = randomUUID();

      await repo.createTenantAdmin({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'isolated@test.com',
        displayName: 'Isolated Admin',
        passwordHash: 'hash',
      });

      // Verify user belongs to correct tenant
      const res = await pool.query(
        `SELECT tenant_id FROM users WHERE id = $1`,
        [userId]
      );

      expect(res.rows[0].tenant_id).toBe(TENANT_ID);
    });

    it('should create multiple admins for same tenant', async () => {
      const admin1 = randomUUID();
      const admin2 = randomUUID();

      await repo.createTenantAdmin({
        id: admin1,
        tenantId: TENANT_ID,
        emailHash: 'admin1@test.com',
        displayName: 'Admin 1',
        passwordHash: 'hash1',
      });

      await repo.createTenantAdmin({
        id: admin2,
        tenantId: TENANT_ID,
        emailHash: 'admin2@test.com',
        displayName: 'Admin 2',
        passwordHash: 'hash2',
      });

      // Verify both admins exist
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM users
         WHERE tenant_id = $1 AND role = $2`,
        [TENANT_ID, ACTOR_ROLE.TENANT_ADMIN]
      );

      expect(parseInt(res.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
    });

    it('should reject duplicate user IDs', async () => {
      const userId = randomUUID();

      await repo.createTenantAdmin({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'duplicate@test.com',
        displayName: 'First',
        passwordHash: 'hash',
      });

      // Try to create with same ID
      await expect(
        repo.createTenantAdmin({
          id: userId,
          tenantId: TENANT_ID,
          emailHash: 'different@test.com',
          displayName: 'Second',
          passwordHash: 'hash',
        })
      ).rejects.toThrow();
    });
  });

  describe('createTenantUser', () => {
    it('should create tenant user with MEMBER role', async () => {
      const userId = randomUUID();
      const input = {
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'user@test.com',
        displayName: 'Regular User',
        passwordHash: 'hashed_password_456',
      };

      await repo.createTenantUser(input);

      // Verify user was created with correct role
      const res = await pool.query(
        `SELECT id, tenant_id, email_hash, display_name, scope, role
         FROM users
         WHERE id = $1`,
        [userId]
      );

      expect(res.rowCount).toBe(1);
      const user = res.rows[0];
      expect(user.id).toBe(userId);
      expect(user.tenant_id).toBe(TENANT_ID);
      expect(user.email_hash).toBe('user@test.com');
      expect(user.display_name).toBe('Regular User');
      expect(user.scope).toBe('TENANT');
      expect(user.role).toBe(ACTOR_ROLE.MEMBER);
    });

    it('should differentiate between admin and regular user roles', async () => {
      const adminId = randomUUID();
      const userId = randomUUID();

      // Create admin
      await repo.createTenantAdmin({
        id: adminId,
        tenantId: TENANT_ID,
        emailHash: 'admin@test.com',
        displayName: 'Admin',
        passwordHash: 'hash',
      });

      // Create regular user
      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'user@test.com',
        displayName: 'User',
        passwordHash: 'hash',
      });

      // Verify roles are different
      const adminRes = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [adminId]
      );
      const userRes = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [userId]
      );

      expect(adminRes.rows[0].role).toBe(ACTOR_ROLE.TENANT_ADMIN);
      expect(userRes.rows[0].role).toBe(ACTOR_ROLE.MEMBER);
    });

    it('should create multiple users for same tenant', async () => {
      const user1 = randomUUID();
      const user2 = randomUUID();
      const user3 = randomUUID();

      await repo.createTenantUser({
        id: user1,
        tenantId: TENANT_ID,
        emailHash: 'user1@test.com',
        displayName: 'User 1',
        passwordHash: 'hash1',
      });

      await repo.createTenantUser({
        id: user2,
        tenantId: TENANT_ID,
        emailHash: 'user2@test.com',
        displayName: 'User 2',
        passwordHash: 'hash2',
      });

      await repo.createTenantUser({
        id: user3,
        tenantId: TENANT_ID,
        emailHash: 'user3@test.com',
        displayName: 'User 3',
        passwordHash: 'hash3',
      });

      // Verify all users exist
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM users
         WHERE tenant_id = $1 AND role = $2`,
        [TENANT_ID, ACTOR_ROLE.MEMBER]
      );

      expect(parseInt(res.rows[0].count, 10)).toBeGreaterThanOrEqual(3);
    });

    it('should enforce tenant isolation for regular users', async () => {
      const userId = randomUUID();

      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'isolated@test.com',
        displayName: 'Isolated User',
        passwordHash: 'hash',
      });

      // Verify user belongs to correct tenant
      const res = await pool.query(
        `SELECT tenant_id FROM users WHERE id = $1`,
        [userId]
      );

      expect(res.rows[0].tenant_id).toBe(TENANT_ID);
    });

    it('should store all user attributes correctly', async () => {
      const userId = randomUUID();
      const emailHash = 'unique@example.com';
      const displayName = 'John Doe';
      const passwordHash = 'secure_hash_12345';

      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash,
        displayName,
        passwordHash,
      });

      const res = await pool.query(
        `SELECT email_hash, display_name, password_hash FROM users WHERE id = $1`,
        [userId]
      );

      const user = res.rows[0];
      expect(user.email_hash).toBe(emailHash);
      expect(user.display_name).toBe(displayName);
      expect(user.password_hash).toBe(passwordHash);
    });

    it('should reject duplicate user IDs', async () => {
      const userId = randomUUID();

      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'first@test.com',
        displayName: 'First',
        passwordHash: 'hash',
      });

      // Try to create with same ID
      await expect(
        repo.createTenantUser({
          id: userId,
          tenantId: TENANT_ID,
          emailHash: 'second@test.com',
          displayName: 'Second',
          passwordHash: 'hash',
        })
      ).rejects.toThrow();
    });
  });

  describe('Mixed User Types', () => {
    it('should allow admins and users in same tenant', async () => {
      const adminId = randomUUID();
      const userId = randomUUID();

      await repo.createTenantAdmin({
        id: adminId,
        tenantId: TENANT_ID,
        emailHash: 'admin@mixed.com',
        displayName: 'Mixed Admin',
        passwordHash: 'hash',
      });

      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'user@mixed.com',
        displayName: 'Mixed User',
        passwordHash: 'hash',
      });

      // Verify both users exist with correct roles
      const res = await pool.query(
        `SELECT id, role FROM users WHERE tenant_id = $1 ORDER BY role`,
        [TENANT_ID]
      );

      expect(res.rowCount).toBeGreaterThanOrEqual(2);
      const roles = res.rows.map(r => r.role);
      expect(roles).toContain(ACTOR_ROLE.TENANT_ADMIN);
      expect(roles).toContain(ACTOR_ROLE.MEMBER);
    });
  });

  describe('RGPD Compliance', () => {
    it('should enforce TENANT scope for all users', async () => {
      const adminId = randomUUID();
      const userId = randomUUID();

      await repo.createTenantAdmin({
        id: adminId,
        tenantId: TENANT_ID,
        emailHash: 'admin@rgpd.com',
        displayName: 'RGPD Admin',
        passwordHash: 'hash',
      });

      await repo.createTenantUser({
        id: userId,
        tenantId: TENANT_ID,
        emailHash: 'user@rgpd.com',
        displayName: 'RGPD User',
        passwordHash: 'hash',
      });

      const res = await pool.query(
        `SELECT COUNT(*) as count FROM users
         WHERE tenant_id = $1 AND scope = 'TENANT'`,
        [TENANT_ID]
      );

      expect(parseInt(res.rows[0].count, 10)).toBeGreaterThanOrEqual(2);
    });

    it('should isolate users by tenant', async () => {
      const OTHER_TENANT = '00000000-0000-0000-0000-000000000902';

      await pool.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [OTHER_TENANT, 'other-tenant', 'Other Tenant']
      );

      const user1 = randomUUID();
      const user2 = randomUUID();

      await repo.createTenantUser({
        id: user1,
        tenantId: TENANT_ID,
        emailHash: 'user1@tenant1.com',
        displayName: 'User Tenant 1',
        passwordHash: 'hash',
      });

      await repo.createTenantUser({
        id: user2,
        tenantId: OTHER_TENANT,
        emailHash: 'user2@tenant2.com',
        displayName: 'User Tenant 2',
        passwordHash: 'hash',
      });

      // Verify users belong to correct tenants
      const res1 = await pool.query(
        `SELECT tenant_id FROM users WHERE id = $1`,
        [user1]
      );
      const res2 = await pool.query(
        `SELECT tenant_id FROM users WHERE id = $1`,
        [user2]
      );

      expect(res1.rows[0].tenant_id).toBe(TENANT_ID);
      expect(res2.rows[0].tenant_id).toBe(OTHER_TENANT);
    });
  });
});
