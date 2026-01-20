/**
 * Unit Tests: Export User Data Use Case
 * Coverage: src/app/usecases/rgpd/exportUserData.ts
 * RGPD: Art. 15 - Right to Access, Art. 20 - Right to Data Portability
 *
 * Tests:
 * - Bundle generation with all user data
 * - Tenant isolation
 * - TTL 7 days enforcement
 * - Audit event emission (no PII)
 *
 * Note: This test does not mock encryption/storage modules since
 * they are used internally by the use case. Tests verify observable behavior.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { exportUserData } from '@/app/usecases/rgpd/exportUserData';
import type { ConsentRepo, Consent } from '@/app/ports/ConsentRepo';
import type { AiJobRepo, AiJob } from '@/app/ports/AiJobRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { AuditEventReader, AuditEventRecord } from '@/app/ports/AuditEventReader';
import type { EncryptionService, EncryptedData } from '@/app/ports/EncryptionService';
import type { ExportStorageService } from '@/app/ports/ExportStorageService';
import { RGPD_EXPORT_RETENTION_DAYS } from '@/domain/retention/RetentionPolicy';

// =============================================================================
// TEST DATA
// =============================================================================

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

const sampleConsents: Consent[] = [
  {
    id: 'consent-001',
    tenantId: TENANT_ID,
    userId: USER_ID,
    purpose: 'analytics',
    purposeId: null,
    granted: true,
    grantedAt: new Date('2024-01-01T10:00:00Z'),
    revokedAt: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'consent-002',
    tenantId: TENANT_ID,
    userId: USER_ID,
    purpose: 'marketing',
    purposeId: null,
    granted: false,
    grantedAt: null,
    revokedAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
];

const sampleAiJobs: AiJob[] = [
  {
    id: 'job-001',
    tenantId: TENANT_ID,
    userId: USER_ID,
    purpose: 'text-generation',
    modelRef: 'claude-3',
    status: 'COMPLETED',
    createdAt: new Date('2024-01-10T10:00:00Z'),
    startedAt: new Date('2024-01-10T10:00:01Z'),
    completedAt: new Date('2024-01-10T10:00:05Z'),
  },
];

const sampleAuditEvents: AuditEventRecord[] = [
  {
    id: 'audit-001',
    eventType: 'user.created',
    actorId: USER_ID,
    actorDisplayName: 'Test User',
    tenantId: TENANT_ID,
    tenantName: 'Test Tenant',
    targetId: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'audit-002',
    eventType: 'consent.granted',
    actorId: USER_ID,
    actorDisplayName: 'Test User',
    tenantId: TENANT_ID,
    tenantName: 'Test Tenant',
    targetId: 'consent-001',
    createdAt: new Date('2024-01-01T10:00:01Z'),
  },
];

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

function createMockConsentRepo(consents: Consent[] = sampleConsents) {
  return {
    findByUser: jest.fn<() => Promise<Consent[]>>().mockResolvedValue(consents),
    findByUserAndPurpose: jest.fn(),
    create: jest.fn(),
    revoke: jest.fn(),
    softDeleteByUser: jest.fn(),
    hardDeleteByUser: jest.fn(),
  } as unknown as jest.Mocked<ConsentRepo>;
}

function createMockAiJobRepo(jobs: AiJob[] = sampleAiJobs) {
  return {
    findByUser: jest.fn<() => Promise<AiJob[]>>().mockResolvedValue(jobs),
    create: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
    softDeleteByUser: jest.fn(),
    hardDeleteByUser: jest.fn(),
  } as unknown as jest.Mocked<AiJobRepo>;
}

function createMockAuditWriter() {
  return {
    write: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as jest.Mocked<AuditEventWriter>;
}

function createMockAuditReader(events: AuditEventRecord[] = sampleAuditEvents) {
  return {
    findByUser: jest.fn<() => Promise<AuditEventRecord[]>>().mockResolvedValue(events),
    list: jest.fn(),
  } as unknown as jest.Mocked<AuditEventReader>;
}

function createMockEncryptionService(): jest.Mocked<EncryptionService> {
  const mockEncryptedData: EncryptedData = {
    ciphertext: 'mock-ciphertext-base64',
    iv: 'mock-iv-base64',
    authTag: 'mock-authtag-base64',
    salt: 'mock-salt-base64',
  };
  return {
    encrypt: jest.fn<() => EncryptedData>().mockReturnValue(mockEncryptedData),
    decrypt: jest.fn<() => string>().mockReturnValue('{}'),
    generateExportPassword: jest.fn<() => string>().mockReturnValue('mock-password-base64'),
  };
}

function createMockExportStorageService(): jest.Mocked<ExportStorageService> {
  return {
    storeEncryptedBundle: jest.fn<() => Promise<string>>().mockResolvedValue('/mock/path/export.enc'),
    readEncryptedBundle: jest.fn<() => Promise<EncryptedData>>().mockResolvedValue({
      ciphertext: 'mock-ciphertext-base64',
      iv: 'mock-iv-base64',
      authTag: 'mock-authtag-base64',
      salt: 'mock-salt-base64',
    }),
    deleteExportBundle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    storeExportMetadata: jest.fn<() => void>(),
    getExportMetadata: jest.fn<() => null>().mockReturnValue(null),
    getExportMetadataByToken: jest.fn<() => null>().mockReturnValue(null),
    getExportMetadataByUserId: jest.fn<() => []>().mockReturnValue([]),
    deleteExportMetadata: jest.fn<() => void>(),
    cleanupExpiredExports: jest.fn<() => Promise<number>>().mockResolvedValue(0),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('exportUserData', () => {
  let mockConsentRepo: jest.Mocked<ConsentRepo>;
  let mockAiJobRepo: jest.Mocked<AiJobRepo>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;
  let mockAuditReader: jest.Mocked<AuditEventReader>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockExportStorageService: jest.Mocked<ExportStorageService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConsentRepo = createMockConsentRepo();
    mockAiJobRepo = createMockAiJobRepo();
    mockAuditWriter = createMockAuditWriter();
    mockAuditReader = createMockAuditReader();
    mockEncryptionService = createMockEncryptionService();
    mockExportStorageService = createMockExportStorageService();
  });

  describe('Successful export generation', () => {
    it('should generate export bundle with all user data', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result.exportId).toBeDefined();
      expect(typeof result.exportId).toBe('string');
      expect(result.downloadToken).toBeDefined();
      expect(typeof result.downloadToken).toBe('string');
      expect(result.password).toBeDefined();
      expect(typeof result.password).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should collect consents from ConsentRepo', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockConsentRepo.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID);
    });

    it('should collect AI jobs from AiJobRepo', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAiJobRepo.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID);
    });

    it('should collect audit events from AuditEventReader', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAuditReader.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID, 1000);
    });

    it('should return unique exportId on each call', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result1 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const result2 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result1.exportId).not.toBe(result2.exportId);
    });

    it('should return unique downloadToken on each call', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result1 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const result2 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result1.downloadToken).not.toBe(result2.downloadToken);
    });

    it('should return unique password on each call', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result1 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const result2 = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result1.password).not.toBe(result2.password);
    });
  });

  describe('TTL enforcement (RGPD Art. 5.1.e)', () => {
    it('should set expiresAt to exactly 7 days in future', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };
      const beforeCall = new Date();

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const afterCall = new Date();

      // Calculate expected range (7 days from now, +/- 1 second tolerance)
      const minExpected = new Date(beforeCall.getTime() + RGPD_EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000 - 1000);
      const maxExpected = new Date(afterCall.getTime() + RGPD_EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000 + 1000);

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(minExpected.getTime());
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(maxExpected.getTime());
    });

    it('should use RGPD_EXPORT_RETENTION_DAYS constant (7 days)', () => {
      expect(RGPD_EXPORT_RETENTION_DAYS).toBe(7);
    });
  });

  describe('Validation', () => {
    it('should throw error when tenantId is missing', async () => {
      const input = { tenantId: '', userId: USER_ID };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('tenantId and userId are required');
    });

    it('should throw error when userId is missing', async () => {
      const input = { tenantId: TENANT_ID, userId: '' };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('tenantId and userId are required');
    });

    it('should throw error when both tenantId and userId are missing', async () => {
      const input = { tenantId: '', userId: '' };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('tenantId and userId are required');
    });
  });

  describe('Audit event emission', () => {
    it('should emit rgpd.export.created audit event', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'rgpd.export.created',
          tenantId: TENANT_ID,
          actorId: USER_ID,
        })
      );
    });

    it('should include exportId in audit metadata', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            exportId: result.exportId,
          }),
        })
      );
    });

    it('should NOT include PII in audit event (RGPD compliance)', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const auditCall = mockAuditWriter.write.mock.calls[0][0];
      const auditEventStr = JSON.stringify(auditCall);

      // Should NOT contain email or other PII
      expect(auditEventStr).not.toContain('@example.com');
      expect(auditEventStr).not.toContain('email');
      expect(auditEventStr).not.toContain('password');
    });

    it('should NOT include download password in audit event', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      const auditCall = mockAuditWriter.write.mock.calls[0][0];
      const auditEventStr = JSON.stringify(auditCall);

      // Should NOT contain the generated password
      expect(auditEventStr).not.toContain(result.password);
    });
  });

  describe('Tenant isolation (CRITICAL RGPD)', () => {
    it('should pass tenantId to ConsentRepo', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockConsentRepo.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID);
    });

    it('should pass tenantId to AiJobRepo', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAiJobRepo.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID);
    });

    it('should pass tenantId to AuditEventReader', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAuditReader.findByUser).toHaveBeenCalledWith(TENANT_ID, USER_ID, 1000);
    });

    it('should include tenantId in audit event', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
        })
      );
    });
  });

  describe('Empty data handling', () => {
    it('should handle user with no consents', async () => {
      mockConsentRepo = createMockConsentRepo([]);
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result.exportId).toBeDefined();
      expect(result.password).toBeDefined();
    });

    it('should handle user with no AI jobs', async () => {
      mockAiJobRepo = createMockAiJobRepo([]);
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result.exportId).toBeDefined();
      expect(result.password).toBeDefined();
    });

    it('should handle user with no audit events', async () => {
      mockAuditReader = createMockAuditReader([]);
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result.exportId).toBeDefined();
      expect(result.password).toBeDefined();
    });

    it('should handle user with no data at all', async () => {
      mockConsentRepo = createMockConsentRepo([]);
      mockAiJobRepo = createMockAiJobRepo([]);
      mockAuditReader = createMockAuditReader([]);
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      expect(result.exportId).toBeDefined();
      expect(result.password).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Error handling', () => {
    it('should propagate ConsentRepo errors', async () => {
      mockConsentRepo.findByUser.mockRejectedValue(new Error('Database connection failed'));
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate AiJobRepo errors', async () => {
      mockAiJobRepo.findByUser.mockRejectedValue(new Error('AI job query failed'));
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('AI job query failed');
    });

    it('should propagate AuditEventReader errors', async () => {
      mockAuditReader.findByUser.mockRejectedValue(new Error('Audit query failed'));
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      await expect(
        exportUserData(
          mockConsentRepo,
          mockAiJobRepo,
          mockAuditWriter,
          mockAuditReader,
          mockEncryptionService,
          mockExportStorageService,
          input
        )
      ).rejects.toThrow('Audit query failed');
    });
  });

  describe('Password generation', () => {
    it('should generate base64-encoded password', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      // Base64 pattern: only allows A-Z, a-z, 0-9, +, /, and = for padding
      expect(result.password).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should generate password with sufficient length', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      // 32 bytes in base64 = 44 characters
      expect(result.password.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('UUID format', () => {
    it('should generate valid UUID for exportId', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      // UUID v4 pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.exportId).toMatch(uuidPattern);
    });

    it('should generate valid UUID for downloadToken', async () => {
      const input = { tenantId: TENANT_ID, userId: USER_ID };

      const result = await exportUserData(
        mockConsentRepo,
        mockAiJobRepo,
        mockAuditWriter,
        mockAuditReader,
        mockEncryptionService,
        mockExportStorageService,
        input
      );

      // UUID v4 pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.downloadToken).toMatch(uuidPattern);
    });
  });
});
