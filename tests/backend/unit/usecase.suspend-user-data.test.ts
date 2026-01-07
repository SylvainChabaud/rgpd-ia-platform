/**
 * Use Case Tests: suspendUserData
 * RGPD: Art. 18 (data limitation)
 */

import { describe, it, expect } from '@jest/globals';
import type { User, UserRepo } from '@/app/ports/UserRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { suspendUserData } from '@/app/usecases/suspension/suspendUserData';
import type { SuspensionReason } from '@/domain/rgpd/DataSuspension';
import { ACTOR_SCOPE } from '@/shared/actorScope';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    emailHash: 'hash-1',
    displayName: 'User One',
    passwordHash: 'pwd',
    scope: ACTOR_SCOPE.TENANT,
    role: 'USER',
    createdAt: new Date(),
    deletedAt: null,
    dataSuspended: false,
    dataSuspendedAt: null,
    dataSuspendedReason: null,
    ...overrides,
  };
}

function createUserRepo(initial: User): UserRepo {
  let current = { ...initial };
  return {
    findById: async (userId: string) => (userId === current.id ? current : null),
    updateDataSuspension: async (_userId: string, suspended: boolean, reason?: string) => {
      current = {
        ...current,
        dataSuspended: suspended,
        dataSuspendedAt: suspended ? new Date() : null,
        dataSuspendedReason: suspended ? reason ?? null : null,
      };
      return current;
    },
  } as UserRepo;
}

describe('UseCase: suspendUserData', () => {
  it('suspends user data processing', async () => {
    const userRepo = createUserRepo(createUser());
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await suspendUserData(userRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      reason: 'user_request',
      requestedBy: 'user-1',
    });

    const updated = await userRepo.findById('user-1');
    expect(result.suspension.suspended).toBe(true);
    expect(updated?.dataSuspended).toBe(true);
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('data.suspension.activated');
  });

  it('requires a reason', async () => {
    const userRepo = createUserRepo(createUser());
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      suspendUserData(userRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: '' as unknown as SuspensionReason,
        requestedBy: 'user-1',
      })
    ).rejects.toThrow('tenantId, userId and reason are required');
  });

  it('rejects when user is already suspended', async () => {
    const userRepo = createUserRepo(createUser({ dataSuspended: true }));
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      suspendUserData(userRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        reason: 'user_request',
        requestedBy: 'user-1',
      })
    ).rejects.toThrow('User data is already suspended');
  });

  it('fails when tenantId is missing', async () => {
    const userRepo = createUserRepo(createUser());
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      suspendUserData(userRepo, auditWriter, {
        tenantId: '',
        userId: 'user-1',
        reason: 'user_request',
        requestedBy: 'user-1',
      })
    ).rejects.toThrow('tenantId, userId and reason are required');
  });
});
