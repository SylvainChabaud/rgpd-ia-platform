/**
 * Use Case Tests: unsuspendUserData
 * RGPD: Art. 18 (data limitation)
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '../src/app/ports/UserRepo';
import { InMemoryAuditEventWriter } from '../src/app/audit/InMemoryAuditEventWriter';
import { unsuspendUserData } from '../src/app/usecases/suspension/unsuspendUserData';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    emailHash: 'hash-1',
    displayName: 'User One',
    passwordHash: 'pwd',
    scope: 'TENANT',
    role: 'USER',
    createdAt: new Date(),
    deletedAt: null,
    dataSuspended: true,
    dataSuspendedAt: new Date('2025-01-01T00:00:00Z'),
    dataSuspendedReason: 'user_request',
    ...overrides,
  };
}

function createUserRepo(initial: User): UserRepo {
  let current = { ...initial };
  return {
    findById: async (userId: string) => (userId === current.id ? current : null),
    updateDataSuspension: async (_userId: string, suspended: boolean) => {
      current = {
        ...current,
        dataSuspended: suspended,
        dataSuspendedAt: suspended ? new Date() : null,
        dataSuspendedReason: suspended ? current.dataSuspendedReason : null,
      };
      return current;
    },
  } as UserRepo;
}

describe('UseCase: unsuspendUserData', () => {
  it('unsuspends user data processing', async () => {
    const userRepo = createUserRepo(createUser());
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await unsuspendUserData(userRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      requestedBy: 'user-1',
    });

    const updated = await userRepo.findById('user-1');
    expect(result.suspension.suspended).toBe(false);
    expect(updated?.dataSuspended).toBe(false);
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('data.suspension.deactivated');
  });

  it('rejects when user is not suspended', async () => {
    const userRepo = createUserRepo(createUser({ dataSuspended: false }));
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      unsuspendUserData(userRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestedBy: 'user-1',
      })
    ).rejects.toThrow('User data is not currently suspended');
  });

  it('requires requestedBy', async () => {
    const userRepo = createUserRepo(createUser());
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      unsuspendUserData(userRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestedBy: '',
      })
    ).rejects.toThrow('tenantId, userId and requestedBy are required');
  });

  it('fails when user does not exist', async () => {
    const userRepo = createUserRepo(createUser({ id: 'other-user' }));
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      unsuspendUserData(userRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestedBy: 'user-1',
      })
    ).rejects.toThrow('User not found');
  });
});
