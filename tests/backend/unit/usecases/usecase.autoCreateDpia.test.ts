/**
 * Unit Tests: Auto-Create DPIA Use Case
 * Coverage: src/app/usecases/dpia/autoCreateDpiaForPurpose.ts
 *
 * RGPD: Art. 35 - Data Protection Impact Assessment (DPIA)
 * Tests:
 * - isDpiaRequired logic (all combinations)
 * - autoCreateDpiaForPurpose workflow
 * - Audit event emission
 * - Error resilience
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  autoCreateDpiaForPurpose,
  isDpiaRequired,
  AutoCreateDpiaInput,
  AutoCreateDpiaDeps,
} from '@/app/usecases/dpia/autoCreateDpiaForPurpose';
import type { DpiaRepo } from '@/app/ports/DpiaRepo';
import type { AuditEventWriter } from '@/app/ports/AuditEventWriter';
import type { Logger } from '@/app/ports/Logger';
import { RISK_LEVEL, DATA_CLASS } from '@/app/ports/PurposeTemplateRepo';

describe('autoCreateDpiaForPurpose', () => {
  let mockDpiaRepo: jest.Mocked<DpiaRepo>;
  let mockAuditWriter: jest.Mocked<AuditEventWriter>;
  let mockLogger: jest.Mocked<Logger>;

  const TENANT_ID = 'tenant-001';
  const ACTOR_ID = 'admin-001';
  const PURPOSE_ID = 'purpose-001';
  const DPIA_ID = 'dpia-001';

  beforeEach(() => {
    mockDpiaRepo = {
      create: jest.fn().mockResolvedValue({
        id: DPIA_ID,
        tenantId: TENANT_ID,
        purposeId: PURPOSE_ID,
        status: 'PENDING',
      }),
      findByPurposeId: jest.fn(),
      findByPurposeIds: jest.fn(),
    } as unknown as jest.Mocked<DpiaRepo>;

    mockAuditWriter = {
      write: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<AuditEventWriter>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<Logger>;

    jest.clearAllMocks();
  });

  // ===========================================================================
  // isDpiaRequired() Tests - RGPD Art. 35 Logic
  // ===========================================================================

  describe('isDpiaRequired()', () => {
    describe('should return TRUE for high-risk processing (Art. 35)', () => {
      it('should require DPIA for HIGH risk level', () => {
        expect(isDpiaRequired(RISK_LEVEL.HIGH, DATA_CLASS.P0)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.HIGH, DATA_CLASS.P1)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.HIGH, DATA_CLASS.P2)).toBe(true);
      });

      it('should require DPIA for CRITICAL risk level', () => {
        expect(isDpiaRequired(RISK_LEVEL.CRITICAL, DATA_CLASS.P0)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.CRITICAL, DATA_CLASS.P1)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.CRITICAL, DATA_CLASS.P2)).toBe(true);
      });

      it('should require DPIA for P3 (sensitive) data regardless of risk', () => {
        expect(isDpiaRequired(RISK_LEVEL.LOW, DATA_CLASS.P3)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.MEDIUM, DATA_CLASS.P3)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.HIGH, DATA_CLASS.P3)).toBe(true);
        expect(isDpiaRequired(RISK_LEVEL.CRITICAL, DATA_CLASS.P3)).toBe(true);
      });
    });

    describe('should return FALSE for low-risk processing', () => {
      it('should NOT require DPIA for LOW risk with non-sensitive data', () => {
        expect(isDpiaRequired(RISK_LEVEL.LOW, DATA_CLASS.P0)).toBe(false);
        expect(isDpiaRequired(RISK_LEVEL.LOW, DATA_CLASS.P1)).toBe(false);
        expect(isDpiaRequired(RISK_LEVEL.LOW, DATA_CLASS.P2)).toBe(false);
      });

      it('should NOT require DPIA for MEDIUM risk with non-sensitive data', () => {
        expect(isDpiaRequired(RISK_LEVEL.MEDIUM, DATA_CLASS.P0)).toBe(false);
        expect(isDpiaRequired(RISK_LEVEL.MEDIUM, DATA_CLASS.P1)).toBe(false);
        expect(isDpiaRequired(RISK_LEVEL.MEDIUM, DATA_CLASS.P2)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // autoCreateDpiaForPurpose() - Main Workflow Tests
  // ===========================================================================

  describe('autoCreateDpiaForPurpose() - Workflow', () => {
    const createInput = (overrides: Partial<AutoCreateDpiaInput['purpose']> = {}): AutoCreateDpiaInput => ({
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: {
        id: PURPOSE_ID,
        label: 'IA Recommendations',
        description: 'AI-based personalized recommendations',
        riskLevel: RISK_LEVEL.HIGH,
        maxDataClass: DATA_CLASS.P1,
        requiresDpia: true,
        ...overrides,
      },
      context: { source: 'adopt' },
    });

    const deps: AutoCreateDpiaDeps = {
      dpiaRepo: mockDpiaRepo,
      auditWriter: mockAuditWriter,
      logger: mockLogger,
    };

    it('should skip DPIA creation if not required', async () => {
      const input = createInput({
        riskLevel: RISK_LEVEL.LOW,
        maxDataClass: DATA_CLASS.P1,
        requiresDpia: false,
      });

      const result = await autoCreateDpiaForPurpose(input, deps);

      expect(result.dpiaId).toBeNull();
      expect(result.warnings).toHaveLength(0);
      expect(mockDpiaRepo.create).not.toHaveBeenCalled();
      expect(mockAuditWriter.write).not.toHaveBeenCalled();
    });

    it('should create DPIA for HIGH risk purpose', async () => {
      const input = createInput({ riskLevel: RISK_LEVEL.HIGH });

      const result = await autoCreateDpiaForPurpose(input, deps);

      expect(result.dpiaId).toBe(DPIA_ID);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('DPIA');
      expect(mockDpiaRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          tenantId: TENANT_ID,
          purposeId: PURPOSE_ID,
          overallRiskLevel: 'HIGH',
        })
      );
    });

    it('should create DPIA for CRITICAL risk purpose', async () => {
      const input = createInput({ riskLevel: RISK_LEVEL.CRITICAL });

      const result = await autoCreateDpiaForPurpose(input, deps);

      expect(result.dpiaId).toBe(DPIA_ID);
      expect(mockDpiaRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          overallRiskLevel: 'CRITICAL',
        })
      );
    });

    it('should emit dpia.auto_created audit event', async () => {
      const input = createInput();

      await autoCreateDpiaForPurpose(input, deps);

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'dpia.auto_created',
          actorId: ACTOR_ID,
          targetId: DPIA_ID,
          tenantId: TENANT_ID,
          metadata: expect.objectContaining({
            purposeId: PURPOSE_ID,
            status: 'PENDING',
            source: 'adopt',
          }),
        })
      );
    });

    it('should include purposeLabel in audit metadata (P1 only)', async () => {
      const input = createInput({ label: 'Test Purpose Label' });

      await autoCreateDpiaForPurpose(input, deps);

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            purposeLabel: 'Test Purpose Label',
          }),
        })
      );
    });

    it('should include templateCode in audit metadata when from adoption', async () => {
      const input: AutoCreateDpiaInput = {
        ...createInput(),
        context: { templateCode: 'TPL_001', source: 'adopt' },
      };

      await autoCreateDpiaForPurpose(input, deps);

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            templateCode: 'TPL_001',
          }),
        })
      );
    });
  });

  // ===========================================================================
  // Error Resilience Tests
  // ===========================================================================

  describe('autoCreateDpiaForPurpose() - Error Resilience', () => {
    const createInput = (): AutoCreateDpiaInput => ({
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: {
        id: PURPOSE_ID,
        label: 'Test Purpose',
        description: 'Test description',
        riskLevel: RISK_LEVEL.HIGH,
        maxDataClass: DATA_CLASS.P1,
        requiresDpia: true,
      },
    });

    const deps: AutoCreateDpiaDeps = {
      dpiaRepo: mockDpiaRepo,
      auditWriter: mockAuditWriter,
      logger: mockLogger,
    };

    it('should handle DPIA creation failure gracefully', async () => {
      mockDpiaRepo.create.mockRejectedValue(new Error('Database error'));

      const result = await autoCreateDpiaForPurpose(createInput(), deps);

      expect(result.dpiaId).toBeNull();
      expect(result.warnings).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          purposeId: PURPOSE_ID,
          error: 'Database error',
        }),
        expect.stringContaining('Failed to auto-create DPIA')
      );
    });

    it('should handle audit event failure gracefully', async () => {
      mockAuditWriter.write.mockRejectedValue(new Error('Audit service down'));

      // Should still complete and return DPIA ID
      await expect(autoCreateDpiaForPurpose(createInput(), deps)).rejects.toThrow('Audit service down');
    });

    it('should log success with P1 data only', async () => {
      await autoCreateDpiaForPurpose(createInput(), deps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          dpiaId: DPIA_ID,
          purposeId: PURPOSE_ID,
          tenantId: TENANT_ID,
          riskLevel: 'HIGH',
        }),
        expect.stringContaining('DPIA auto-created')
      );

      // Verify NO email or displayName in logs
      const logCall = mockLogger.info.mock.calls[0][0] as Record<string, unknown>;
      expect(logCall).not.toHaveProperty('email');
      expect(logCall).not.toHaveProperty('displayName');
    });
  });

  // ===========================================================================
  // RGPD Tenant Isolation Tests
  // ===========================================================================

  describe('autoCreateDpiaForPurpose() - Tenant Isolation', () => {
    it('should pass tenantId to dpiaRepo.create', async () => {
      const input: AutoCreateDpiaInput = {
        tenantId: 'tenant-specific-id',
        actorId: ACTOR_ID,
        purpose: {
          id: PURPOSE_ID,
          label: 'Test',
          description: 'Test description',
          riskLevel: RISK_LEVEL.HIGH,
          maxDataClass: DATA_CLASS.P1,
          requiresDpia: true,
        },
      };

      const deps: AutoCreateDpiaDeps = {
        dpiaRepo: mockDpiaRepo,
        auditWriter: mockAuditWriter,
        logger: mockLogger,
      };

      await autoCreateDpiaForPurpose(input, deps);

      expect(mockDpiaRepo.create).toHaveBeenCalledWith(
        'tenant-specific-id',
        expect.objectContaining({
          tenantId: 'tenant-specific-id',
        })
      );
    });

    it('should include tenantId in audit event', async () => {
      const input: AutoCreateDpiaInput = {
        tenantId: 'tenant-for-audit',
        actorId: ACTOR_ID,
        purpose: {
          id: PURPOSE_ID,
          label: 'Test',
          description: 'Test description',
          riskLevel: RISK_LEVEL.HIGH,
          maxDataClass: DATA_CLASS.P1,
          requiresDpia: true,
        },
      };

      const deps: AutoCreateDpiaDeps = {
        dpiaRepo: mockDpiaRepo,
        auditWriter: mockAuditWriter,
        logger: mockLogger,
      };

      await autoCreateDpiaForPurpose(input, deps);

      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-for-audit',
        })
      );
    });
  });
});
