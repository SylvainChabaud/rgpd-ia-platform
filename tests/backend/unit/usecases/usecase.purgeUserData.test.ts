/**
 * Unit Tests: Purge User Data Use Case
 * Coverage: src/app/usecases/rgpd/purgeUserData.ts
 * RGPD: Art. 17 - Hard Deletion & Crypto-Shredding
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { purgeUserData } from '@/app/usecases/rgpd/purgeUserData';
import type { RgpdRequestRepo } from '@/app/ports/RgpdRequestRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { ConsentRepo } from '@/app/ports/ConsentRepo';
import type { AiJobRepo } from '@/app/ports/AiJobRepo';

// Mock storage functions
jest.mock('@/infrastructure/storage/ExportStorage', () => ({
  getExportMetadataByUserId: jest.fn(() => []),
  deleteExportBundle: jest.fn(),
  deleteExportMetadata: jest.fn(),
}));

describe('purgeUserData', () => {
  let mockRgpdRequestRepo: jest.Mocked<RgpdRequestRepo>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockConsentRepo: jest.Mocked<ConsentRepo>;
  let mockAiJobRepo: jest.Mocked<AiJobRepo>;

  beforeEach(() => {
    mockRgpdRequestRepo = {
      findPendingPurges: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<RgpdRequestRepo>;

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>;

    mockUserRepo = {
      hardDeleteUserByTenant: jest.fn(),
    } as unknown as jest.Mocked<UserRepo>;

    mockConsentRepo = {
      hardDeleteByUser: jest.fn(),
    } as unknown as jest.Mocked<ConsentRepo>;

    mockAiJobRepo = {
      hardDeleteByUser: jest.fn(),
    } as unknown as jest.Mocked<AiJobRepo>;

    jest.clearAllMocks();
  });

  it('should successfully purge user data', async () => {
    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(3);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(5);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(1);

    const result = await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(result.requestId).toBe('request-1');
    expect(result.purgedAt).toBeDefined();
    expect(result.deletedRecords).toEqual({
      consents: 3,
      aiJobs: 5,
      exports: 0,
      users: 1,
    });

    // Verify hard deletes were called
    expect(mockConsentRepo.hardDeleteByUser).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(mockAiJobRepo.hardDeleteByUser).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(mockUserRepo.hardDeleteUserByTenant).toHaveBeenCalledWith('tenant-1', 'user-1');

    // Verify status updated
    expect(mockRgpdRequestRepo.updateStatus).toHaveBeenCalledWith(
      'request-1',
      'COMPLETED',
      expect.any(Date)
    );

    // Verify audit event
    expect(mockAuditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'rgpd.deletion.completed',
        tenantId: 'tenant-1',
        actorScope: ACTOR_SCOPE.PLATFORM,
        actorId: 'system',
      })
    );
  });

  it('should throw if requestId is missing', async () => {
    const input = {
      requestId: '',
    };

    await expect(
      purgeUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('requestId is required');
  });

  it('should throw if purge request not found', async () => {
    const input = {
      requestId: 'non-existent',
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([]);

    await expect(
      purgeUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('Purge request not found or not ready for purge');
  });

  it('should throw if request not in pending purges list', async () => {
    const input = {
      requestId: 'request-1',
    };

    const otherRequest = {
      id: 'request-2',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([otherRequest]);

    await expect(
      purgeUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('Purge request not found');
  });

  it('should perform cascade deletion in correct order', async () => {
    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(0);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(0);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(1);

    await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    // Verify cascade order: consents → ai_jobs → user
    const callOrder = [
      mockConsentRepo.hardDeleteByUser.mock.invocationCallOrder[0],
      mockAiJobRepo.hardDeleteByUser.mock.invocationCallOrder[0],
      mockUserRepo.hardDeleteUserByTenant.mock.invocationCallOrder[0],
    ];

    expect(callOrder[0]).toBeLessThan(callOrder[1]);
    expect(callOrder[1]).toBeLessThan(callOrder[2]);
  });

  it('should handle zero deleted records', async () => {
    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(0);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(0);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(0);

    const result = await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(result.deletedRecords).toEqual({
      consents: 0,
      aiJobs: 0,
      exports: 0,
      users: 0,
    });
  });

  it('should delete export bundles (crypto-shredding)', async () => {
    const { getExportMetadataByUserId, deleteExportBundle, deleteExportMetadata } =
      require('@/infrastructure/storage/ExportStorage');

    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    const mockExports = [
      { exportId: 'export-1', userId: 'user-1', tenantId: 'tenant-1' },
      { exportId: 'export-2', userId: 'user-1', tenantId: 'tenant-1' },
    ];

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    getExportMetadataByUserId.mockReturnValue(mockExports);
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(0);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(0);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(1);

    const result = await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(result.deletedRecords.exports).toBe(2);
    expect(deleteExportBundle).toHaveBeenCalledTimes(2);
    expect(deleteExportMetadata).toHaveBeenCalledTimes(2);
  });

  it('should continue purge even if export deletion fails', async () => {
    const { getExportMetadataByUserId, deleteExportBundle } =
      require('@/infrastructure/storage/ExportStorage');

    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    const mockExports = [
      { exportId: 'export-1', userId: 'user-1', tenantId: 'tenant-1' },
    ];

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    getExportMetadataByUserId.mockReturnValue(mockExports);
    deleteExportBundle.mockRejectedValue(new Error('File not found'));
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(0);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(0);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(1);

    // Should not throw
    const result = await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(result.deletedRecords.exports).toBe(0);
    expect(result.deletedRecords.users).toBe(1); // User still deleted
  });

  it('should emit audit event with correct metadata', async () => {
    const input = {
      requestId: 'request-1',
    };

    const mockRequest = {
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE' as const,
      status: 'PENDING' as const,
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    };

    mockRgpdRequestRepo.findPendingPurges.mockResolvedValue([mockRequest]);
    mockConsentRepo.hardDeleteByUser.mockResolvedValue(10);
    mockAiJobRepo.hardDeleteByUser.mockResolvedValue(20);
    mockUserRepo.hardDeleteUserByTenant.mockResolvedValue(1);

    await purgeUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(mockAuditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'rgpd.deletion.completed',
        actorScope: ACTOR_SCOPE.PLATFORM,
        actorId: 'system',
        tenantId: 'tenant-1',
        metadata: expect.objectContaining({
          requestId: 'request-1',
          userId: 'user-1',
          deletedConsents: 10,
          deletedAiJobs: 20,
          deletedUsers: 1,
        }),
      })
    );
  });
});
