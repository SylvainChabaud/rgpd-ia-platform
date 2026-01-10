/**
 * Unit Tests: Update User Use Case
 * Coverage: src/app/usecases/users/updateUser.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { updateUser } from '@/app/usecases/users/updateUser';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';

describe('updateUser', () => {
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;

  beforeEach(() => {
    mockUserRepo = {
      updateUser: jest.fn(),
    } as unknown as jest.Mocked<UserRepo>;

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>;

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
        userRepo: mockUserRepo,
        auditEventWriter: mockAuditWriter,
      }
    );

    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user-1', {
      displayName: 'New Name',
    });
    expect(mockAuditWriter.write).toHaveBeenCalledWith(
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
        userRepo: mockUserRepo,
        auditEventWriter: mockAuditWriter,
      }
    );

    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user-1', {
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
          userRepo: mockUserRepo,
          auditEventWriter: mockAuditWriter,
        }
      )
    ).rejects.toThrow('RGPD VIOLATION');
  });
});
