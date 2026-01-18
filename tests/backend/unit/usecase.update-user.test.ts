/**
 * Use Case Tests: updateUser
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - Tenant isolation enforced
 * - Only allowed fields can be updated (displayName, role)
 * - Audit event emitted
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { updateUser } from '@/app/usecases/users/updateUser';
import { ACTOR_SCOPE } from '@/shared/actorScope';

class MemUserRepo implements UserRepo {
  private users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId && !u.deletedAt) ?? null;
  }

  async updateUser(userId: string, updates: { displayName?: string; role?: string }): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      if (updates.displayName !== undefined) user.displayName = updates.displayName;
      if (updates.role !== undefined) user.role = updates.role;
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
  async softDeleteUser() {}
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

describe('UseCase: updateUser', () => {
  it('updates user displayName successfully', async () => {
    const user = createUser({ displayName: 'Old Name' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.displayName).toBe('New Name');
  });

  it('updates user role successfully', async () => {
    const user = createUser({ role: 'MEMBER' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'ADMIN',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.role).toBe('ADMIN');
  });

  it('updates both displayName and role', async () => {
    const user = createUser({ displayName: 'Old Name', role: 'MEMBER' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
        role: 'ADMIN',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.displayName).toBe('New Name');
    expect(updated?.role).toBe('ADMIN');
  });

  it('throws error when tenantId is missing', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      updateUser(
        {
          tenantId: '',
          userId: 'user-1',
          displayName: 'New Name',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION: tenantId required for user updates');
  });

  it('throws error when user not found', async () => {
    const userRepo = new MemUserRepo([]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await expect(
      updateUser(
        {
          tenantId: 'tenant-1',
          userId: 'nonexistent',
          displayName: 'New Name',
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
      updateUser(
        {
          tenantId: 'tenant-2',
          userId: 'user-1',
          displayName: 'New Name',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow('RGPD VIOLATION: Cross-tenant access denied');
  });

  it('emits audit event on update', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
    expect(auditEventWriter.events[0].eventName).toBe('user.updated');
    expect(auditEventWriter.events[0].actorId).toBe('admin-1');
    expect(auditEventWriter.events[0].tenantId).toBe('tenant-1');
    expect(auditEventWriter.events[0].targetId).toBe('user-1');
  });

  it('audit event is TENANT-scoped', async () => {
    const user = createUser();
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
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
      updateUser(
        {
          tenantId: 'tenant-1',
          userId: 'nonexistent',
          displayName: 'New Name',
          actorId: 'admin-1',
        },
        { userRepo, auditEventWriter }
      )
    ).rejects.toThrow();

    expect(auditEventWriter.events).toHaveLength(0);
  });

  it('handles partial updates (only displayName)', async () => {
    const user = createUser({ displayName: 'Old Name', role: 'MEMBER' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.displayName).toBe('New Name');
    expect(updated?.role).toBe('MEMBER'); // Unchanged
  });

  it('handles partial updates (only role)', async () => {
    const user = createUser({ displayName: 'Test User', role: 'MEMBER' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'ADMIN',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.displayName).toBe('Test User'); // Unchanged
    expect(updated?.role).toBe('ADMIN');
  });

  it('does not modify email or password', async () => {
    const user = createUser({ emailHash: 'original-hash', passwordHash: 'original-pwd' });
    const userRepo = new MemUserRepo([user]);
    const auditEventWriter = new InMemoryAuditEventWriter();

    await updateUser(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        displayName: 'New Name',
        actorId: 'admin-1',
      },
      { userRepo, auditEventWriter }
    );

    const updated = await userRepo.findById('user-1');
    expect(updated?.emailHash).toBe('original-hash');
    expect(updated?.passwordHash).toBe('original-pwd');
  });
});
