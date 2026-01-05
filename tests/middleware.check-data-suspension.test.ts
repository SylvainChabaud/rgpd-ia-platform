/**
 * Middleware Tests: checkDataSuspension
 * RGPD: Art. 18 (data limitation)
 */

import { describe, it, expect } from '@jest/globals';
import type { UserRepo } from '../src/app/ports/UserRepo';
import { checkDataSuspension, DataSuspensionError } from '../src/ai/gateway/enforcement/checkDataSuspension';

describe('Middleware: checkDataSuspension', () => {
  it('allows processing for non-suspended user', async () => {
    const userRepo = {
      findById: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        emailHash: 'hash',
        displayName: 'User',
        passwordHash: 'pwd',
        scope: 'TENANT',
        role: 'USER',
        createdAt: new Date(),
        deletedAt: null,
        dataSuspended: false,
        dataSuspendedAt: null,
        dataSuspendedReason: null,
      }),
    } as unknown as UserRepo;

    await expect(
      checkDataSuspension(userRepo, 'tenant-1', 'user-1')
    ).resolves.toBeUndefined();
  });

  it('blocks processing for suspended user', async () => {
    const userRepo = {
      findById: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        emailHash: 'hash',
        displayName: 'User',
        passwordHash: 'pwd',
        scope: 'TENANT',
        role: 'USER',
        createdAt: new Date(),
        deletedAt: null,
        dataSuspended: true,
        dataSuspendedAt: new Date('2025-01-01T00:00:00Z'),
        dataSuspendedReason: 'user_request',
      }),
    } as unknown as UserRepo;

    await expect(
      checkDataSuspension(userRepo, 'tenant-1', 'user-1')
    ).rejects.toThrow(DataSuspensionError);
  });

  it('requires tenantId and userId', async () => {
    const userRepo = {
      findById: async () => null,
    } as unknown as UserRepo;

    await expect(
      checkDataSuspension(userRepo, '', '')
    ).rejects.toThrow('tenantId and userId are required');
  });

  it('throws when user is not found', async () => {
    const userRepo = {
      findById: async () => null,
    } as unknown as UserRepo;

    await expect(
      checkDataSuspension(userRepo, 'tenant-1', 'missing-user')
    ).rejects.toThrow('user not found');
  });
});
