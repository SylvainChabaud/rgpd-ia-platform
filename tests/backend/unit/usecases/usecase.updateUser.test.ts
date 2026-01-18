/**
 * Unit Tests: Update User Use Case
 * Coverage: src/app/usecases/users/updateUser.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { updateUser } from '@/app/usecases/users/updateUser';
import type { UserRepo, User } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import { ACTOR_SCOPE } from '@/shared/actorScope';

const mockUser: User = {
  id: 'user-1',
  tenantId: 'tenant-1',
  emailHash: 'hash',
  displayName: 'Old Name',
  passwordHash: 'hash',
  scope: ACTOR_SCOPE.TENANT,
  role: 'MEMBER',
  createdAt: new Date(),
  deletedAt: null,
};

describe('updateUser', () => {
  let mockUserRepo: Partial<UserRepo>;
  let mockAuditWriter: Partial<AuditEventWriter>;
  let mockFindById: jest.Mock;
  let mockUpdateUser: jest.Mock;
  let mockWrite: jest.Mock;

  beforeEach(() => {
    mockFindById = jest.fn().mockResolvedValue(mockUser);
    mockUpdateUser = jest.fn();
    mockWrite = jest.fn();

    mockUserRepo = {
      findById: mockFindById,
      updateUser: mockUpdateUser,
    };

    mockAuditWriter = {
      write: mockWrite,
    };

    jest.clearAllMocks();
  });

  it('should update user displayName', async () => {
    await updateUser(
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        displayName: 'New Name',
        actorId: 'admin-1',
      },
      {
        userRepo: mockUserRepo as UserRepo,
        auditEventWriter: mockAuditWriter as AuditEventWriter,
      }
    );

    expect(mockUpdateUser).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
    });
    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'user.updated',
        targetId: 'user-1',
      })
    );
  });

  it('should update user role', async () => {
    await updateUser(
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'TENANT_ADMIN',
        actorId: 'admin-1',
      },
      {
        userRepo: mockUserRepo as UserRepo,
        auditEventWriter: mockAuditWriter as AuditEventWriter,
      }
    );

    expect(mockUpdateUser).toHaveBeenCalledWith('user-1', {
      role: 'TENANT_ADMIN',
    });
  });

  it('should throw if tenantId is missing', async () => {
    await expect(
      updateUser(
        {
          userId: 'user-1',
          tenantId: '',
          displayName: 'New Name',
          actorId: 'admin-1',
        },
        {
          userRepo: mockUserRepo as UserRepo,
          auditEventWriter: mockAuditWriter as AuditEventWriter,
        }
      )
    ).rejects.toThrow('RGPD VIOLATION');
  });
});
