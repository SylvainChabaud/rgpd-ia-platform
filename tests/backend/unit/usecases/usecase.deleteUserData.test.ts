/**
 * Unit Tests: Delete User Data Use Case
 * Coverage: src/app/usecases/rgpd/deleteUserData.ts
 * RGPD: Art. 17 - Right to Erasure (Droit à l'oubli)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { deleteUserData } from '@/app/usecases/rgpd/deleteUserData';
import type { RgpdRequestRepo } from '@/app/ports/RgpdRequestRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { UserRepo } from '@/app/ports/UserRepo';
import type { ConsentRepo } from '@/app/ports/ConsentRepo';
import type { AiJobRepo } from '@/app/ports/AiJobRepo';

describe('deleteUserData', () => {
  let mockRgpdRequestRepo: jest.Mocked<RgpdRequestRepo>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockConsentRepo: jest.Mocked<ConsentRepo>;
  let mockAiJobRepo: jest.Mocked<AiJobRepo>;

  beforeEach(() => {
    mockRgpdRequestRepo = {
      findDeletionRequest: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<RgpdRequestRepo>;

    mockAuditWriter = {
      write: jest.fn(),
    } as jest.Mocked<AuditEventWriter>;

    mockUserRepo = {
      softDeleteUserByTenant: jest.fn(),
    } as unknown as jest.Mocked<UserRepo>;

    mockConsentRepo = {
      softDeleteByUser: jest.fn(),
    } as unknown as jest.Mocked<ConsentRepo>;

    mockAiJobRepo = {
      softDeleteByUser: jest.fn(),
    } as unknown as jest.Mocked<AiJobRepo>;

    jest.clearAllMocks();
  });

  it('should successfully delete user data and create deletion request', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue(null);
    mockUserRepo.softDeleteUserByTenant.mockResolvedValue(1);
    mockConsentRepo.softDeleteByUser.mockResolvedValue(2);
    mockAiJobRepo.softDeleteByUser.mockResolvedValue(3);
    mockRgpdRequestRepo.create.mockResolvedValue({
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE',
      status: 'PENDING',
      scheduledPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const result = await deleteUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    expect(result.requestId).toBe('request-1');
    expect(result.scheduledPurgeAt).toBeDefined();
    expect(result.deletedAt).toBeDefined();

    // Verify all soft deletes were called
    expect(mockUserRepo.softDeleteUserByTenant).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(mockConsentRepo.softDeleteByUser).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(mockAiJobRepo.softDeleteByUser).toHaveBeenCalledWith('tenant-1', 'user-1');

    // Verify RGPD request created
    expect(mockRgpdRequestRepo.create).toHaveBeenCalledWith('tenant-1', {
      userId: 'user-1',
      type: 'DELETE',
      status: 'PENDING',
      scheduledPurgeAt: expect.any(Date),
    });

    // Verify audit event
    expect(mockAuditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'rgpd.deletion.requested',
        tenantId: 'tenant-1',
        actorId: 'user-1',
      })
    );
  });

  it('should throw if tenantId is missing', async () => {
    const input = {
      tenantId: '',
      userId: 'user-1',
    };

    await expect(
      deleteUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('tenantId and userId are required');
  });

  it('should throw if userId is missing', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: '',
    };

    await expect(
      deleteUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('tenantId and userId are required');
  });

  it('should throw if user already deleted (COMPLETED)', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue({
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE',
      status: 'COMPLETED',
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    });

    await expect(
      deleteUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('User data already deleted');
  });

  it('should be idempotent (return existing PENDING request)', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    const existingPurgeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const existingCreatedAt = new Date();

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue({
      id: 'request-existing',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE',
      status: 'PENDING',
      scheduledPurgeAt: existingPurgeDate,
      createdAt: existingCreatedAt,
    });

    const result = await deleteUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    // Should return existing request without creating new one
    expect(result.requestId).toBe('request-existing');
    expect(result.scheduledPurgeAt).toEqual(existingPurgeDate);
    expect(result.deletedAt).toEqual(existingCreatedAt);

    // Should NOT call soft delete methods
    expect(mockUserRepo.softDeleteUserByTenant).not.toHaveBeenCalled();
    expect(mockConsentRepo.softDeleteByUser).not.toHaveBeenCalled();
    expect(mockAiJobRepo.softDeleteByUser).not.toHaveBeenCalled();
  });

  it('should throw if user not found', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'non-existent-user',
    };

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue(null);
    mockUserRepo.softDeleteUserByTenant.mockResolvedValue(0); // User not found

    await expect(
      deleteUserData(
        mockRgpdRequestRepo,
        mockAuditWriter,
        mockUserRepo,
        mockConsentRepo,
        mockAiJobRepo,
        input
      )
    ).rejects.toThrow('User not found or already deleted');

    // Should not proceed with cascade deletes
    expect(mockConsentRepo.softDeleteByUser).not.toHaveBeenCalled();
    expect(mockAiJobRepo.softDeleteByUser).not.toHaveBeenCalled();
  });

  it('should calculate purge date 30 days in future', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue(null);
    mockUserRepo.softDeleteUserByTenant.mockResolvedValue(1);
    mockConsentRepo.softDeleteByUser.mockResolvedValue(0);
    mockAiJobRepo.softDeleteByUser.mockResolvedValue(0);

    let capturedPurgeDate: Date | undefined;
    mockRgpdRequestRepo.create.mockImplementation(async (_tenantId, data) => {
      capturedPurgeDate = data.scheduledPurgeAt;
      return {
        id: 'request-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        type: 'DELETE',
        status: 'PENDING',
        scheduledPurgeAt: data.scheduledPurgeAt!,
        createdAt: new Date(),
      };
    });

    await deleteUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    // Verify purge date is ~30 days from now
    const daysDiff = capturedPurgeDate
      ? (capturedPurgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : 0;

    expect(daysDiff).toBeGreaterThan(29);
    expect(daysDiff).toBeLessThan(31);
  });

  it('should soft delete related data (cascade)', async () => {
    const input = {
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    mockRgpdRequestRepo.findDeletionRequest.mockResolvedValue(null);
    mockUserRepo.softDeleteUserByTenant.mockResolvedValue(1);
    mockConsentRepo.softDeleteByUser.mockResolvedValue(5); // 5 consents deleted
    mockAiJobRepo.softDeleteByUser.mockResolvedValue(10); // 10 jobs deleted
    mockRgpdRequestRepo.create.mockResolvedValue({
      id: 'request-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'DELETE',
      status: 'PENDING',
      scheduledPurgeAt: new Date(),
      createdAt: new Date(),
    });

    await deleteUserData(
      mockRgpdRequestRepo,
      mockAuditWriter,
      mockUserRepo,
      mockConsentRepo,
      mockAiJobRepo,
      input
    );

    // Verify cascade order: user first, then consents, then ai_jobs
    const callOrder = [
      mockUserRepo.softDeleteUserByTenant.mock.invocationCallOrder[0],
      mockConsentRepo.softDeleteByUser.mock.invocationCallOrder[0],
      mockAiJobRepo.softDeleteByUser.mock.invocationCallOrder[0],
    ];

    expect(callOrder[0]).toBeLessThan(callOrder[1]);
    expect(callOrder[1]).toBeLessThan(callOrder[2]);
  });
});
