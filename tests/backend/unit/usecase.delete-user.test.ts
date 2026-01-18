/**
 * Use Case Tests: deleteUser
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Soft delete (marks deleted_at)
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { deleteUser } from '@/app/usecases/users/deleteUser';
import { ACTOR_SCOPE } from '@/shared/actorScope';

class MemUserRepo implements UserRepo {
  private users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId && !u.deletedAt) ?? null;
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.deletedAt = new Date();
    }
  }

  async findByEmailHash() {
    return null;
  }
  async listByTenant() {
    return [];
  }
  async listSuspendedByTenant() {
    return [];
  }
  async createUser() {}
  async updateUser() {}
  async softDeleteUserByTenant() {
    return 0;
  }
  async hardDeleteUserByTenant() {
    return 0;
  }
  async updateDataSuspension(): Promise<User> {
    throw new Error('Not implemented');
  }
  async createUserWithEmail() {}
  async getDecryptedEmail(): Promise<string | null> {
    return null;
  }
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    emailHash: 'hash-1',
    displayName: 'Test User',
    passwordHash: 'pwd',
    scope: ACTOR_SCOPE.TENANT,
    role: 'MEMBER',
    createdAt: new Date(),
    deletedAt: null,
    dataSuspended: false,
    dataSuspendedAt: null,
    dataSuspendedReason: null,
    ...overrides,
  };
}

describe('UseCase: deleteUser', () => {
  it('soft deletes user successfully', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const deleted = await userRepo.findById('user-1');
    expect(deleted).toBeNull(); // Soft-deleted users are not returned
  });

  it('marks deletedAt timestamp', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    const beforeDelete = new Date();
    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    // Access internal state to verify deletedAt is set
    expect(user.deletedAt).toBeDefined();
    expect(user.deletedAt).toBeInstanceOf(Date);
    expect(user.deletedAt!.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
  });

  it('throws error when tenantId is missing', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      deleteUser(
        {
          tenantId: '',
          userId: 'user-1',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION: tenantId required for user deletion');
  });

  it('throws error when user not found', async () => {
    const userRepo = new MemUserRepo([]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      deleteUser(
        {
          tenantId: 'tenant-1',
          userId: 'nonexistent',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('User not found');
  });

  it('throws error when user belongs to different tenant', async () => {
    const user = createUser({ tenantId: 'tenant-1' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      deleteUser(
        {
          tenantId: 'tenant-2',
          userId: 'user-1',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION: Cross-tenant access denied');
  });

  it('emits audit event on deletion', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
    expect(auditEventWriter.events[0].eventName).toBe('user.deleted');
    expect(auditEventWriter.events[0].actorId).toBe('admin-1');
    expect(auditEventWriter.events[0].tenantId).toBe('tenant-1');
    expect(auditEventWriter.events[0].targetId).toBe('user-1');
  });

  it('audit event is TENANT-scoped', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    expect(auditEventWriter.events[0].actorScope).toBe('TENANT');
  });

  it('does not emit audit event when validation fails', async () => {
    const userRepo = new MemUserRepo([]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      deleteUser(
        {
          tenantId: 'tenant-1',
          userId: 'nonexistent',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow();

    expect(auditEventWriter.events).toHaveLength(0);
  });

  it('does not emit audit event on cross-tenant violation', async () => {
    const user = createUser({ tenantId: 'tenant-1' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      deleteUser(
        {
          tenantId: 'tenant-2',
          userId: 'user-1',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION');

    expect(auditEventWriter.events).toHaveLength(0);
  });

  it('verifies tenant ownership before deletion', async () => {
    const user = createUser({ tenantId: 'tenant-1' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    // Should succeed for correct tenant
    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
  });

  it('includes event ID in audit event', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    expect(auditEventWriter.events[0].id).toBeDefined();
    expect(typeof auditEventWriter.events[0].id).toBe('string');
  });

  it('performs soft delete not hard delete', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await deleteUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    // User data still exists (has deletedAt set)
    expect(user.deletedAt).not.toBeNull();
    expect(user.emailHash).toBe('hash-1'); // Data preserved
    expect(user.displayName).toBe('Test User'); // Data preserved
  });
});
