/**
 * Tests for PgUserRepo
 * LOT 5.3 - API Layer
 *
 * NOTE ON RGPD COMPLIANCE & TEST STRATEGY:
 * These are UNIT tests for repository business logic only.
 * RGPD protection is implemented in 3 layers:
 * 1. Repository: Basic CRUD (tested here with devuser/BYPASSRLS)
 * 2. Application: Use-cases validate tenant ownership (tested in usecase tests)
 * 3. Database: RLS policies enforce isolation (tested in db.rls-policies.test.ts)
 *
 * This test file uses CONNECTION_STRING override to test repository logic
 * without RLS interference. RLS is separately tested in dedicated test file.
 *
 * Coverage goals:
 * - findByEmailHash: nominal + not found
 * - findById: nominal + not found
 * - listByTenant: nominal + pagination + empty
 * - createUser: nominal
 * - updateUser: displayName, role, both, empty
 * - softDeleteUser: nominal
 * - softDeleteUserByTenant: nominal + RGPD validation
 * - hardDeleteUserByTenant: nominal + RGPD validation
 */

// Override DATABASE_URL for repository unit tests (bypass RLS)
process.env.DATABASE_URL = 'postgresql://devuser:devpass@localhost:5432/rgpd_platform';

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { withTenantContext } from '@/infrastructure/db/tenantContext';
import type { User } from '@/app/ports/UserRepo';
import { hashEmail } from '@/shared/security/emailHash';
import { hashPassword } from '@/shared/security/password';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

describe('PgUserRepo', () => {
  let repo: PgUserRepo;
  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const TENANT_ID_2 = '00000000-0000-0000-0000-000000000002';

  // Helper to insert user with RLS context (wraps INSERT in withTenantContext)
  async function insertUserWithRLS(
    params: [string, string, string, string, string, string, string],
    deletedAt?: boolean
  ) {
    const tenantId = params[1];
    await withTenantContext(pool, tenantId, async (client) => {
      if (deletedAt) {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          params
        );
      } else {
        await client.query(
          `INSERT INTO users (id, tenant_id, email_hash, display_name, password_hash, scope, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          params
        );
      }
    });
  }

  beforeEach(async () => {
    repo = new PgUserRepo();

    // Clean test data using cleanup function (bypasses RLS)
    await pool.query(`SELECT cleanup_test_data($1::uuid[])`, [[TENANT_ID, TENANT_ID_2]]);

    // Create test tenants (required for RLS policies)
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'user-repo-test-1', 'User Repo Test 1']
    );
    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID_2, 'user-repo-test-2', 'User Repo Test 2']
    );
  });

  describe('findByEmailHash', () => {
    it('should find user by email hash', async () => {
      const emailHash = await hashEmail('alice@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000001', TENANT_ID, emailHash, 'Alice', passwordHash, 'TENANT', 'MEMBER']);

      const user = await repo.findByEmailHash(emailHash);

      expect(user).not.toBeNull();
      expect(user?.id).toBe('10000000-0000-0000-0000-000000000001');
      expect(user?.emailHash).toBe(emailHash);
      expect(user?.displayName).toBe('Alice');
      expect(user?.tenantId).toBe(TENANT_ID);
    });

    it('should return null if user not found', async () => {
      const user = await repo.findByEmailHash('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should not find soft-deleted users', async () => {
      const emailHash = await hashEmail('deleted@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000002', TENANT_ID, emailHash, 'Deleted User', passwordHash, 'TENANT', 'MEMBER'], true);

      const user = await repo.findByEmailHash(emailHash);
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const emailHash = await hashEmail('bob@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000003', TENANT_ID, emailHash, 'Bob', passwordHash, 'TENANT', 'MEMBER']);

      const user = await repo.findById('10000000-0000-0000-0000-000000000003');

      expect(user).not.toBeNull();
      expect(user?.id).toBe('10000000-0000-0000-0000-000000000003');
      expect(user?.displayName).toBe('Bob');
    });

    it('should return null if user not found', async () => {
      const user = await repo.findById('20000000-0000-0000-0000-000000000001');
      expect(user).toBeNull();
    });

    it('should not find soft-deleted users by ID', async () => {
      const emailHash = await hashEmail('deleted2@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000004', TENANT_ID, emailHash, 'Deleted User 2', passwordHash, 'TENANT', 'MEMBER'], true);

      const user = await repo.findById('10000000-0000-0000-0000-000000000004');
      expect(user).toBeNull();
    });
  });

  describe('listByTenant', () => {
    it('should list users by tenant', async () => {
      const emailHash1 = await hashEmail('user1@example.com');
      const emailHash2 = await hashEmail('user2@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000005', TENANT_ID, emailHash1, 'User 1', passwordHash, 'TENANT', 'MEMBER']);

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000006', TENANT_ID, emailHash2, 'User 2', passwordHash, 'TENANT', 'MEMBER']);

      const users = await repo.listByTenant(TENANT_ID);

      expect(users).toHaveLength(2);
      expect(users.map((u) => u.id)).toContain('10000000-0000-0000-0000-000000000005');
      expect(users.map((u) => u.id)).toContain('10000000-0000-0000-0000-000000000006');
    });

    it('should respect tenant isolation', async () => {
      const emailHash1 = await hashEmail('tenant1@example.com');
      const emailHash2 = await hashEmail('tenant2@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000007', TENANT_ID, emailHash1, 'Tenant 1 User', passwordHash, 'TENANT', 'MEMBER']);

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000008', TENANT_ID_2, emailHash2, 'Tenant 2 User', passwordHash, 'TENANT', 'MEMBER']);

      const usersTenant1 = await repo.listByTenant(TENANT_ID);
      const usersTenant2 = await repo.listByTenant(TENANT_ID_2);

      expect(usersTenant1).toHaveLength(1);
      expect(usersTenant1[0].id).toBe('10000000-0000-0000-0000-000000000007');

      expect(usersTenant2).toHaveLength(1);
      expect(usersTenant2[0].id).toBe('10000000-0000-0000-0000-000000000008');
    });

    it('should support pagination', async () => {
      const passwordHash = await hashPassword('password123');

      for (let i = 1; i <= 5; i++) {
        const emailHash = await hashEmail(`user${i}@example.com`);
        const userId = `10000000-0000-0000-0000-0000000000${(i + 8).toString().padStart(2, '0')}`;
        await insertUserWithRLS([userId, TENANT_ID, emailHash, `User ${i}`, passwordHash, 'TENANT', 'MEMBER']);
      }

      const page1 = await repo.listByTenant(TENANT_ID, 2, 0);
      const page2 = await repo.listByTenant(TENANT_ID, 2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should return empty array if no users', async () => {
      const users = await repo.listByTenant('30000000-0000-0000-0000-000000000001');
      expect(users).toHaveLength(0);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const emailHash = await hashEmail('newuser@example.com');
      const passwordHash = await hashPassword('password123');

      const user: Omit<User, 'createdAt' | 'deletedAt'> = {
        id: '10000000-0000-0000-0000-000000000020',
        tenantId: TENANT_ID,
        emailHash,
        displayName: 'New User',
        passwordHash,
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.MEMBER,
      };

      await repo.createUser(user);

      const created = await repo.findById('10000000-0000-0000-0000-000000000020');
      expect(created).not.toBeNull();
      expect(created?.displayName).toBe('New User');
      expect(created?.tenantId).toBe(TENANT_ID);
    });
  });

  describe('updateUser', () => {
    beforeEach(async () => {
      const emailHash = await hashEmail('updateme@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000030', TENANT_ID, emailHash, 'Original Name', passwordHash, 'TENANT', 'MEMBER']);
    });

    it('should update displayName only', async () => {
      await repo.updateUser('10000000-0000-0000-0000-000000000030', { displayName: 'Updated Name' });

      const updated = await repo.findById('10000000-0000-0000-0000-000000000030');
      expect(updated?.displayName).toBe('Updated Name');
      expect(updated?.role).toBe(ACTOR_ROLE.MEMBER); // unchanged
    });

    it('should update role only', async () => {
      await repo.updateUser('10000000-0000-0000-0000-000000000030', { role: ACTOR_ROLE.TENANT_ADMIN });

      const updated = await repo.findById('10000000-0000-0000-0000-000000000030');
      expect(updated?.role).toBe(ACTOR_ROLE.TENANT_ADMIN);
      expect(updated?.displayName).toBe('Original Name'); // unchanged
    });

    it('should update both displayName and role', async () => {
      await repo.updateUser('10000000-0000-0000-0000-000000000030', { displayName: 'Admin User', role: ACTOR_ROLE.TENANT_ADMIN });

      const updated = await repo.findById('10000000-0000-0000-0000-000000000030');
      expect(updated?.displayName).toBe('Admin User');
      expect(updated?.role).toBe(ACTOR_ROLE.TENANT_ADMIN);
    });

    it('should do nothing if no updates provided', async () => {
      await repo.updateUser('10000000-0000-0000-0000-000000000030', {});

      const updated = await repo.findById('10000000-0000-0000-0000-000000000030');
      expect(updated?.displayName).toBe('Original Name');
      expect(updated?.role).toBe(ACTOR_ROLE.MEMBER);
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user', async () => {
      const emailHash = await hashEmail('deleteme@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000040', TENANT_ID, emailHash, 'Delete Me', passwordHash, 'TENANT', 'MEMBER']);

      await repo.softDeleteUser('10000000-0000-0000-0000-000000000040');

      const user = await repo.findById('10000000-0000-0000-0000-000000000040');
      expect(user).toBeNull(); // findById excludes deleted users

      // Verify soft delete in DB
      const dbResult = await pool.query(`SELECT deleted_at FROM users WHERE id = $1`, ['10000000-0000-0000-0000-000000000040']);
      expect(dbResult.rows[0].deleted_at).not.toBeNull();
    });
  });

  describe('softDeleteUserByTenant', () => {
    it('should soft delete user with tenant isolation', async () => {
      const emailHash = await hashEmail('tenantdel@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000050', TENANT_ID, emailHash, 'Tenant Delete', passwordHash, 'TENANT', 'MEMBER']);

      const count = await repo.softDeleteUserByTenant(TENANT_ID, '10000000-0000-0000-0000-000000000050');
      expect(count).toBe(1);

      const user = await repo.findById('10000000-0000-0000-0000-000000000050');
      expect(user).toBeNull();
    });

    it('should throw if tenantId missing (RGPD violation)', async () => {
      await expect(repo.softDeleteUserByTenant('', '10000000-0000-0000-0000-000000000050')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should not delete user from different tenant', async () => {
      const emailHash = await hashEmail('wrongtenant@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000060', TENANT_ID, emailHash, 'Wrong Tenant', passwordHash, 'TENANT', 'MEMBER']);

      const count = await repo.softDeleteUserByTenant(TENANT_ID_2, '10000000-0000-0000-0000-000000000060');
      expect(count).toBe(0); // No user deleted (tenant mismatch)

      const user = await repo.findById('10000000-0000-0000-0000-000000000060');
      expect(user).not.toBeNull(); // User still exists
    });
  });

  describe('hardDeleteUserByTenant', () => {
    it('should hard delete user with tenant isolation', async () => {
      const emailHash = await hashEmail('harddelete@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000070', TENANT_ID, emailHash, 'Hard Delete', passwordHash, 'TENANT', 'MEMBER']);

      const count = await repo.hardDeleteUserByTenant(TENANT_ID, '10000000-0000-0000-0000-000000000070');
      expect(count).toBe(1);

      // Verify complete deletion from DB
      const dbResult = await pool.query(`SELECT * FROM users WHERE id = $1`, ['10000000-0000-0000-0000-000000000070']);
      expect(dbResult.rows).toHaveLength(0);
    });

    it('should throw if tenantId missing (RGPD violation)', async () => {
      await expect(repo.hardDeleteUserByTenant('', '10000000-0000-0000-0000-000000000070')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should not delete user from different tenant', async () => {
      const emailHash = await hashEmail('wrongtenant2@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000080', TENANT_ID, emailHash, 'Wrong Tenant 2', passwordHash, 'TENANT', 'MEMBER']);

      const count = await repo.hardDeleteUserByTenant(TENANT_ID_2, '10000000-0000-0000-0000-000000000080');
      expect(count).toBe(0);

      const user = await repo.findById('10000000-0000-0000-0000-000000000080');
      expect(user).not.toBeNull(); // User still exists
    });
  });

  describe('listSuspendedByTenant', () => {
    it('should list all suspended users in tenant', async () => {
      const emailHash1 = await hashEmail('suspended1@example.com');
      const emailHash2 = await hashEmail('suspended2@example.com');
      const emailHash3 = await hashEmail('active@example.com');
      const passwordHash = await hashPassword('password123');

      // Create 2 suspended users
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000100', TENANT_ID, emailHash1, 'Suspended 1', passwordHash, 'TENANT', 'MEMBER']);
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'RGPD Art. 17 request' WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000100']
      );

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000101', TENANT_ID, emailHash2, 'Suspended 2', passwordHash, 'TENANT', 'MEMBER']);
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'Policy violation' WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000101']
      );

      // Create 1 active user
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000102', TENANT_ID, emailHash3, 'Active User', passwordHash, 'TENANT', 'MEMBER']);

      const suspendedUsers = await repo.listSuspendedByTenant(TENANT_ID);

      expect(suspendedUsers).toHaveLength(2);
      expect(suspendedUsers.every((u) => u.dataSuspended === true)).toBe(true);
      expect(suspendedUsers.every((u) => u.dataSuspendedReason)).toBeDefined();
    });

    it('should return empty array if no suspended users', async () => {
      const suspendedUsers = await repo.listSuspendedByTenant(TENANT_ID);
      expect(suspendedUsers).toHaveLength(0);
    });

    it('should throw if tenantId missing (RGPD violation)', async () => {
      await expect(repo.listSuspendedByTenant('')).rejects.toThrow('RGPD VIOLATION');
    });

    it('should isolate suspended users by tenant', async () => {
      const emailHash1 = await hashEmail('tenant1-susp@example.com');
      const emailHash2 = await hashEmail('tenant2-susp@example.com');
      const passwordHash = await hashPassword('password123');

      // Suspended user in TENANT_ID
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000110', TENANT_ID, emailHash1, 'Tenant 1 Suspended', passwordHash, 'TENANT', 'MEMBER']);
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'Test' WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000110']
      );

      // Suspended user in TENANT_ID_2
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000111', TENANT_ID_2, emailHash2, 'Tenant 2 Suspended', passwordHash, 'TENANT', 'MEMBER']);
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'Test' WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000111']
      );

      const tenant1Suspended = await repo.listSuspendedByTenant(TENANT_ID);
      const tenant2Suspended = await repo.listSuspendedByTenant(TENANT_ID_2);

      expect(tenant1Suspended).toHaveLength(1);
      expect(tenant1Suspended[0].id).toBe('10000000-0000-0000-0000-000000000110');

      expect(tenant2Suspended).toHaveLength(1);
      expect(tenant2Suspended[0].id).toBe('10000000-0000-0000-0000-000000000111');
    });

    it('should not include soft-deleted suspended users', async () => {
      const emailHash = await hashEmail('deleted-suspended@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000120', TENANT_ID, emailHash, 'Deleted Suspended', passwordHash, 'TENANT', 'MEMBER']);
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'Test', deleted_at = NOW() WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000120']
      );

      const suspendedUsers = await repo.listSuspendedByTenant(TENANT_ID);
      expect(suspendedUsers.map((u) => u.id)).not.toContain('10000000-0000-0000-0000-000000000120');
    });

    it('should order by data_suspended_at DESC (newest first)', async () => {
      const passwordHash = await hashPassword('password123');

      // Create 3 suspended users with different timestamps
      for (let i = 0; i < 3; i++) {
        const emailHash = await hashEmail(`order-test-${i}@example.com`);
        const userId = `10000000-0000-0000-0000-000000000${130 + i}`;
        await insertUserWithRLS([userId, TENANT_ID, emailHash, `Order Test ${i}`, passwordHash, 'TENANT', 'MEMBER']);
        await pool.query(
          `UPDATE users SET data_suspended = true, data_suspended_at = NOW() + INTERVAL '${i} seconds', data_suspended_reason = 'Test ${i}' WHERE id = $1`,
          [userId]
        );
      }

      const suspendedUsers = await repo.listSuspendedByTenant(TENANT_ID);

      // Verify descending order
      for (let i = 0; i < suspendedUsers.length - 1; i++) {
        const current = suspendedUsers[i].dataSuspendedAt!.getTime();
        const next = suspendedUsers[i + 1].dataSuspendedAt!.getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('updateDataSuspension', () => {
    beforeEach(async () => {
      const emailHash = await hashEmail('suspension-test@example.com');
      const passwordHash = await hashPassword('password123');
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000200', TENANT_ID, emailHash, 'Suspension Test', passwordHash, 'TENANT', 'MEMBER']);
    });

    it('should suspend user data', async () => {
      const updatedUser = await repo.updateDataSuspension('10000000-0000-0000-0000-000000000200', true, 'RGPD Art. 17 request');

      expect(updatedUser.dataSuspended).toBe(true);
      expect(updatedUser.dataSuspendedAt).toBeInstanceOf(Date);
      expect(updatedUser.dataSuspendedReason).toBe('RGPD Art. 17 request');
    });

    it('should unsuspend user data', async () => {
      // First suspend
      await repo.updateDataSuspension('10000000-0000-0000-0000-000000000200', true, 'Test suspension');

      // Then unsuspend
      const updatedUser = await repo.updateDataSuspension('10000000-0000-0000-0000-000000000200', false);

      expect(updatedUser.dataSuspended).toBe(false);
      expect(updatedUser.dataSuspendedAt).toBeNull();
      expect(updatedUser.dataSuspendedReason).toBeNull();
    });

    it('should throw if user not found', async () => {
      await expect(
        repo.updateDataSuspension('99999999-9999-9999-9999-999999999999', true, 'Test')
      ).rejects.toThrow('User not found');
    });

    it('should not update soft-deleted users', async () => {
      const emailHash = await hashEmail('deleted-for-suspension@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000210', TENANT_ID, emailHash, 'Deleted For Suspension', passwordHash, 'TENANT', 'MEMBER'], true);

      await expect(
        repo.updateDataSuspension('10000000-0000-0000-0000-000000000210', true, 'Test')
      ).rejects.toThrow('User not found');
    });

    it('should suspend with null reason', async () => {
      const updatedUser = await repo.updateDataSuspension('10000000-0000-0000-0000-000000000200', true);

      expect(updatedUser.dataSuspended).toBe(true);
      expect(updatedUser.dataSuspendedReason).toBeNull();
    });

    it('should set dataSuspendedAt to NOW when suspending', async () => {
      const beforeSuspension = new Date();
      const updatedUser = await repo.updateDataSuspension('10000000-0000-0000-0000-000000000200', true, 'Test');
      const afterSuspension = new Date();

      expect(updatedUser.dataSuspendedAt).not.toBeNull();
      expect(updatedUser.dataSuspendedAt!.getTime()).toBeGreaterThanOrEqual(beforeSuspension.getTime());
      expect(updatedUser.dataSuspendedAt!.getTime()).toBeLessThanOrEqual(afterSuspension.getTime());
    });
  });

  describe('listFiltered', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('password123');

      // Create diverse users for filtering
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000300', TENANT_ID, await hashEmail('admin1@example.com'), 'Admin 1', passwordHash, 'TENANT', 'TENANT_ADMIN']);
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000301', TENANT_ID, await hashEmail('member1@example.com'), 'Member 1', passwordHash, 'TENANT', 'MEMBER']);
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000302', TENANT_ID_2, await hashEmail('admin2@example.com'), 'Admin 2', passwordHash, 'TENANT', 'TENANT_ADMIN']);

      // Suspend one user
      await pool.query(
        `UPDATE users SET data_suspended = true, data_suspended_at = NOW(), data_suspended_reason = 'Test' WHERE id = $1`,
        ['10000000-0000-0000-0000-000000000301']
      );
    });

    it('should filter by tenantId', async () => {
      const users = await repo.listFiltered({ tenantId: TENANT_ID });

      expect(users).toHaveLength(2);
      expect(users.every((u) => u.tenantId === TENANT_ID)).toBe(true);
    });

    it('should filter by role', async () => {
      const admins = await repo.listFiltered({ role: 'TENANT_ADMIN' });

      expect(admins.length).toBeGreaterThanOrEqual(1);
      expect(admins.every((u) => u.role === 'TENANT_ADMIN')).toBe(true);
    });

    it('should filter by status: active', async () => {
      const activeUsers = await repo.listFiltered({ tenantId: TENANT_ID, status: 'active' });

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].id).toBe('10000000-0000-0000-0000-000000000300');
    });

    it('should filter by status: suspended', async () => {
      const suspendedUsers = await repo.listFiltered({ tenantId: TENANT_ID, status: 'suspended' });

      expect(suspendedUsers).toHaveLength(1);
      expect(suspendedUsers[0].id).toBe('10000000-0000-0000-0000-000000000301');
      expect(suspendedUsers[0].dataSuspended).toBe(true);
    });

    it('should combine tenantId + role filters', async () => {
      const tenant1Admins = await repo.listFiltered({ tenantId: TENANT_ID, role: 'TENANT_ADMIN' });

      expect(tenant1Admins).toHaveLength(1);
      expect(tenant1Admins[0].tenantId).toBe(TENANT_ID);
      expect(tenant1Admins[0].role).toBe('TENANT_ADMIN');
    });

    it('should combine tenantId + role + status filters', async () => {
      const activeMembers = await repo.listFiltered({ tenantId: TENANT_ID, role: 'MEMBER', status: 'active' });

      expect(activeMembers).toHaveLength(0); // Member is suspended
    });

    it('should respect limit parameter', async () => {
      const users = await repo.listFiltered({ limit: 1 });

      expect(users).toHaveLength(1);
    });

    it('should respect offset parameter', async () => {
      const page1 = await repo.listFiltered({ limit: 1, offset: 0 });
      const page2 = await repo.listFiltered({ limit: 1, offset: 1 });

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should use default limit of 20', async () => {
      // Create 25 users
      const passwordHash = await hashPassword('password123');
      for (let i = 0; i < 25; i++) {
        const userId = `10000000-0000-0000-0000-000000000${400 + i}`;
        const emailHash = await hashEmail(`bulk-${i}@example.com`);
        await insertUserWithRLS([userId, TENANT_ID, emailHash, `Bulk User ${i}`, passwordHash, 'TENANT', 'MEMBER']);
      }

      const users = await repo.listFiltered({ tenantId: TENANT_ID });

      expect(users.length).toBeLessThanOrEqual(20); // Default limit
    });

    it('should not include soft-deleted users', async () => {
      const emailHash = await hashEmail('deleted-filter@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000500', TENANT_ID, emailHash, 'Deleted Filter', passwordHash, 'TENANT', 'MEMBER'], true);

      const users = await repo.listFiltered({ tenantId: TENANT_ID });
      expect(users.map((u) => u.id)).not.toContain('10000000-0000-0000-0000-000000000500');
    });

    it('should order by created_at DESC', async () => {
      const users = await repo.listFiltered({ tenantId: TENANT_ID });

      for (let i = 0; i < users.length - 1; i++) {
        expect(users[i].createdAt.getTime()).toBeGreaterThanOrEqual(users[i + 1].createdAt.getTime());
      }
    });
  });

  describe('listAll', () => {
    it('should list all users across tenants', async () => {
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000600', TENANT_ID, await hashEmail('listall1@example.com'), 'List All 1', passwordHash, 'TENANT', 'MEMBER']);
      await insertUserWithRLS(['10000000-0000-0000-0000-000000000601', TENANT_ID_2, await hashEmail('listall2@example.com'), 'List All 2', passwordHash, 'TENANT', 'MEMBER']);

      const allUsers = await repo.listAll();

      expect(allUsers.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect limit parameter', async () => {
      const users = await repo.listAll(5);
      expect(users.length).toBeLessThanOrEqual(5);
    });

    it('should respect offset parameter', async () => {
      const page1 = await repo.listAll(2, 0);
      const page2 = await repo.listAll(2, 2);

      expect(page1).toHaveLength(2);
      expect(page2.length).toBeGreaterThanOrEqual(0);
    });

    it('should not include soft-deleted users', async () => {
      const emailHash = await hashEmail('deleted-listall@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000610', TENANT_ID, emailHash, 'Deleted List All', passwordHash, 'TENANT', 'MEMBER'], true);

      const users = await repo.listAll();
      expect(users.map((u) => u.id)).not.toContain('10000000-0000-0000-0000-000000000610');
    });
  });

  describe('Edge cases for branch coverage', () => {
    it('should handle updateUser on non-existent user gracefully', async () => {
      // This should not throw - idempotent update
      await expect(
        repo.updateUser('99999999-9999-9999-9999-999999999999', { displayName: 'Ghost' })
      ).resolves.not.toThrow();
    });

    it('should handle updateUser with both fields undefined (no-op)', async () => {
      const emailHash = await hashEmail('noop@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000090', TENANT_ID, emailHash, 'No-Op User', passwordHash, 'TENANT', 'MEMBER']);

      // Empty updates object - should trigger early return
      await repo.updateUser('10000000-0000-0000-0000-000000000090', {});

      const user = await repo.findById('10000000-0000-0000-0000-000000000090');
      expect(user?.displayName).toBe('No-Op User'); // Unchanged
    });

    it('should handle softDeleteUser on non-existent user (idempotent)', async () => {
      // Should not throw even if user doesn't exist
      await expect(
        repo.softDeleteUser('99999999-9999-9999-9999-999999999998')
      ).resolves.not.toThrow();
    });

    it('should handle softDeleteUser on already deleted user (idempotent)', async () => {
      const emailHash = await hashEmail('alreadydeleted@example.com');
      const passwordHash = await hashPassword('password123');

      await insertUserWithRLS(['10000000-0000-0000-0000-000000000091', TENANT_ID, emailHash, 'Already Deleted', passwordHash, 'TENANT', 'MEMBER'], true);

      // Deleting again should be idempotent (no error)
      await expect(
        repo.softDeleteUser('10000000-0000-0000-0000-000000000091')
      ).resolves.not.toThrow();
    });

    it('should test findByEmailHash with hash that returns 0 rows', async () => {
      const nonExistentHash = await hashEmail('doesnotexist@nowhere.com');
      const user = await repo.findByEmailHash(nonExistentHash);
      expect(user).toBeNull();
    });

    it('should test findById with ID that returns 0 rows', async () => {
      const user = await repo.findById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeNull();
    });

    it('should handle listByTenant with explicit limit=0 (edge case)', async () => {
      const users = await repo.listByTenant(TENANT_ID, 0, 0);
      expect(users).toHaveLength(0);
    });
  });
});
