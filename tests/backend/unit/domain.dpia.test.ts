/**
 * Domain Entity Tests: DPIA (Data Protection Impact Assessment)
 *
 * RGPD: Art. 35 (Impact assessment required for high-risk processing)
 * LOT 12.4 - DPO Features
 */

import { describe, it, expect } from '@jest/globals';
import type { Dpia, DpiaRisk } from '@/domain/dpia/Dpia';
import {
  createDpia,
  createDpiaRisk,
  isDpiaRequired,
  isDpiaPending,
  isDpiaApproved,
  isDpiaRejected,
  validateDpiaDecision,
  calculateOverallRiskLevel,
  getRiskTemplate,
  toAuditEvent,
  toPublicDpia,
  DPIA_STATUS,
  DPIA_RISK_LEVEL,
  DPIA_LIKELIHOOD,
  DPIA_IMPACT,
  DATA_CLASSIFICATION,
  DEFAULT_SECURITY_MEASURES,
  MIN_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_REJECTION_REASON_LENGTH,
} from '@/domain/dpia/Dpia';

describe('Domain: DPIA', () => {
  // ===========================================================================
  // createDpia tests
  // ===========================================================================

  describe('createDpia', () => {
    it('creates a pending DPIA with default values', () => {
      const result = createDpia({
        tenantId: 'tenant-1',
        purposeId: 'purpose-1',
        title: 'Analyse IA pour recommandations',
        description: 'Cette analyse couvre le traitement IA utilisé pour les recommandations personnalisées.',
      });

      expect(result.tenantId).toBe('tenant-1');
      expect(result.purposeId).toBe('purpose-1');
      expect(result.status).toBe(DPIA_STATUS.PENDING);
      expect(result.overallRiskLevel).toBe(DPIA_RISK_LEVEL.MEDIUM);
      expect(result.dataClassification).toBe(DATA_CLASSIFICATION.P1);
      expect(result.securityMeasures).toEqual(DEFAULT_SECURITY_MEASURES);
      expect(result.dpoComments).toBeNull();
    });

    it('trims title and description whitespace', () => {
      const result = createDpia({
        tenantId: 'tenant-1',
        purposeId: 'purpose-1',
        title: '  Analyse IA  ',
        description: '  Description longue avec espaces autour de 20 caractères minimum requis  ',
      });

      expect(result.title).toBe('Analyse IA');
      expect(result.description).toBe('Description longue avec espaces autour de 20 caractères minimum requis');
    });

    it('accepts custom risk level and data classification', () => {
      const result = createDpia({
        tenantId: 'tenant-1',
        purposeId: 'purpose-1',
        title: 'Traitement haute criticité',
        description: 'Un traitement qui nécessite une attention particulière du DPO.',
        overallRiskLevel: DPIA_RISK_LEVEL.CRITICAL,
        dataClassification: DATA_CLASSIFICATION.P2,
      });

      expect(result.overallRiskLevel).toBe(DPIA_RISK_LEVEL.CRITICAL);
      expect(result.dataClassification).toBe(DATA_CLASSIFICATION.P2);
    });

    it('rejects DPIA without tenantId (RGPD violation)', () => {
      expect(() =>
        createDpia({
          tenantId: '',
          purposeId: 'purpose-1',
          title: 'Valid title here',
          description: 'Valid description with enough characters for the test.',
        })
      ).toThrow('RGPD VIOLATION: tenantId required for DPIA');
    });

    it('rejects DPIA without purposeId', () => {
      expect(() =>
        createDpia({
          tenantId: 'tenant-1',
          purposeId: '',
          title: 'Valid title here',
          description: 'Valid description with enough characters for the test.',
        })
      ).toThrow('purposeId required for DPIA');
    });

    it('rejects title shorter than minimum length', () => {
      expect(() =>
        createDpia({
          tenantId: 'tenant-1',
          purposeId: 'purpose-1',
          title: 'AB',
          description: 'Valid description with enough characters for the test.',
        })
      ).toThrow(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
    });

    it('rejects description shorter than minimum length', () => {
      expect(() =>
        createDpia({
          tenantId: 'tenant-1',
          purposeId: 'purpose-1',
          title: 'Valid title here',
          description: 'Too short',
        })
      ).toThrow(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`);
    });

    it('rejects P3 (sensitive) data classification (RGPD violation)', () => {
      expect(() =>
        createDpia({
          tenantId: 'tenant-1',
          purposeId: 'purpose-1',
          title: 'Tentative de traitement P3',
          description: 'Ce traitement tenterait d\'utiliser des données sensibles interdites.',
          dataClassification: DATA_CLASSIFICATION.P3,
        })
      ).toThrow('RGPD VIOLATION: P3 (sensitive) data processing is forbidden');
    });
  });

  // ===========================================================================
  // createDpiaRisk tests
  // ===========================================================================

  describe('createDpiaRisk', () => {
    it('creates a risk with default values', () => {
      const result = createDpiaRisk({
        dpiaId: 'dpia-1',
        tenantId: 'tenant-1',
        riskName: 'Fuite de données',
        description: 'Risque de fuite de données personnelles vers l\'extérieur.',
        mitigation: 'Chiffrement et audit logging des accès aux données.',
      });

      expect(result.dpiaId).toBe('dpia-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.likelihood).toBe(DPIA_LIKELIHOOD.MEDIUM);
      expect(result.impact).toBe(DPIA_IMPACT.MEDIUM);
      expect(result.sortOrder).toBe(0);
    });

    it('accepts custom likelihood and impact', () => {
      const result = createDpiaRisk({
        dpiaId: 'dpia-1',
        tenantId: 'tenant-1',
        riskName: 'Risque critique',
        description: 'Un risque avec haute probabilité et fort impact.',
        mitigation: 'Mise en place de contrôles stricts et monitoring.',
        likelihood: DPIA_LIKELIHOOD.HIGH,
        impact: DPIA_IMPACT.HIGH,
      });

      expect(result.likelihood).toBe(DPIA_LIKELIHOOD.HIGH);
      expect(result.impact).toBe(DPIA_IMPACT.HIGH);
    });

    it('rejects risk without tenantId (RGPD violation)', () => {
      expect(() =>
        createDpiaRisk({
          dpiaId: 'dpia-1',
          tenantId: '',
          riskName: 'Risk name',
          description: 'Description of the risk for testing.',
          mitigation: 'Mitigation strategy here.',
        })
      ).toThrow('RGPD VIOLATION: tenantId required for DPIA risk');
    });

    it('rejects risk without dpiaId', () => {
      expect(() =>
        createDpiaRisk({
          dpiaId: '',
          tenantId: 'tenant-1',
          riskName: 'Risk name',
          description: 'Description of the risk for testing.',
          mitigation: 'Mitigation strategy here.',
        })
      ).toThrow('dpiaId required for DPIA risk');
    });

    it('rejects risk name shorter than 3 characters', () => {
      expect(() =>
        createDpiaRisk({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          riskName: 'AB',
          description: 'Description of the risk for testing.',
          mitigation: 'Mitigation strategy here.',
        })
      ).toThrow('Risk name must be at least 3 characters');
    });

    it('rejects description shorter than 10 characters', () => {
      expect(() =>
        createDpiaRisk({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          riskName: 'Valid risk',
          description: 'Too short',
          mitigation: 'Mitigation strategy here.',
        })
      ).toThrow('Risk description must be at least 10 characters');
    });

    it('rejects mitigation shorter than 10 characters', () => {
      expect(() =>
        createDpiaRisk({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          riskName: 'Valid risk',
          description: 'Description of the risk for testing.',
          mitigation: 'Short',
        })
      ).toThrow('Mitigation must be at least 10 characters');
    });
  });

  // ===========================================================================
  // Business rules tests
  // ===========================================================================

  describe('isDpiaRequired', () => {
    it('returns true for HIGH risk level', () => {
      expect(isDpiaRequired(DPIA_RISK_LEVEL.HIGH)).toBe(true);
    });

    it('returns true for CRITICAL risk level', () => {
      expect(isDpiaRequired(DPIA_RISK_LEVEL.CRITICAL)).toBe(true);
    });

    it('returns false for MEDIUM risk level', () => {
      expect(isDpiaRequired(DPIA_RISK_LEVEL.MEDIUM)).toBe(false);
    });

    it('returns false for LOW risk level', () => {
      expect(isDpiaRequired(DPIA_RISK_LEVEL.LOW)).toBe(false);
    });
  });

  describe('status checks', () => {
    const baseDpia: Dpia = {
      id: 'dpia-1',
      tenantId: 'tenant-1',
      purposeId: 'purpose-1',
      title: 'Test DPIA',
      description: 'Test description',
      overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      dataProcessed: [],
      dataClassification: DATA_CLASSIFICATION.P1,
      securityMeasures: [],
      status: DPIA_STATUS.PENDING,
      dpoComments: null,
      validatedAt: null,
      validatedBy: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      revisionRequestedAt: null,
      revisionRequestedBy: null,
      revisionComments: null,
    };

    it('isDpiaPending returns true for PENDING status', () => {
      expect(isDpiaPending(baseDpia)).toBe(true);
    });

    it('isDpiaPending returns false for APPROVED status', () => {
      expect(isDpiaPending({ ...baseDpia, status: DPIA_STATUS.APPROVED })).toBe(false);
    });

    it('isDpiaApproved returns true for APPROVED status', () => {
      expect(isDpiaApproved({ ...baseDpia, status: DPIA_STATUS.APPROVED })).toBe(true);
    });

    it('isDpiaRejected returns true for REJECTED status', () => {
      expect(isDpiaRejected({ ...baseDpia, status: DPIA_STATUS.REJECTED })).toBe(true);
    });
  });

  describe('validateDpiaDecision', () => {
    it('accepts valid approval', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          validatedBy: 'dpo-user-1',
          status: 'APPROVED',
        })
      ).not.toThrow();
    });

    it('accepts valid rejection with reason', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          validatedBy: 'dpo-user-1',
          status: 'REJECTED',
          rejectionReason: 'Les mesures de sécurité sont insuffisantes pour ce niveau de risque.',
        })
      ).not.toThrow();
    });

    it('rejects approval without tenantId (RGPD violation)', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: '',
          validatedBy: 'dpo-user-1',
          status: 'APPROVED',
        })
      ).toThrow('RGPD VIOLATION: tenantId required');
    });

    it('rejects approval without dpiaId', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: '',
          tenantId: 'tenant-1',
          validatedBy: 'dpo-user-1',
          status: 'APPROVED',
        })
      ).toThrow('dpiaId required');
    });

    it('rejects approval without validatedBy', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          validatedBy: '',
          status: 'APPROVED',
        })
      ).toThrow('validatedBy (DPO userId) required');
    });

    it('rejects rejection without reason', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          validatedBy: 'dpo-user-1',
          status: 'REJECTED',
        })
      ).toThrow(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters`);
    });

    it('rejects rejection with short reason', () => {
      expect(() =>
        validateDpiaDecision({
          dpiaId: 'dpia-1',
          tenantId: 'tenant-1',
          validatedBy: 'dpo-user-1',
          status: 'REJECTED',
          rejectionReason: 'Too short',
        })
      ).toThrow(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters`);
    });
  });

  // ===========================================================================
  // Risk calculation tests
  // ===========================================================================

  describe('calculateOverallRiskLevel', () => {
    const createRisk = (likelihood: typeof DPIA_LIKELIHOOD[keyof typeof DPIA_LIKELIHOOD], impact: typeof DPIA_IMPACT[keyof typeof DPIA_IMPACT]): DpiaRisk => ({
      id: 'risk-1',
      dpiaId: 'dpia-1',
      tenantId: 'tenant-1',
      riskName: 'Test Risk',
      description: 'Test description',
      likelihood,
      impact,
      mitigation: 'Test mitigation',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('returns LOW for empty risks array', () => {
      expect(calculateOverallRiskLevel([])).toBe(DPIA_RISK_LEVEL.LOW);
    });

    it('returns LOW for low likelihood and low impact', () => {
      expect(calculateOverallRiskLevel([
        createRisk(DPIA_LIKELIHOOD.LOW, DPIA_IMPACT.LOW),
      ])).toBe(DPIA_RISK_LEVEL.LOW);
    });

    it('returns MEDIUM for medium likelihood and medium impact', () => {
      expect(calculateOverallRiskLevel([
        createRisk(DPIA_LIKELIHOOD.MEDIUM, DPIA_IMPACT.MEDIUM),
      ])).toBe(DPIA_RISK_LEVEL.MEDIUM);
    });

    it('returns HIGH for high likelihood and medium impact', () => {
      expect(calculateOverallRiskLevel([
        createRisk(DPIA_LIKELIHOOD.HIGH, DPIA_IMPACT.MEDIUM),
      ])).toBe(DPIA_RISK_LEVEL.HIGH);
    });

    it('returns CRITICAL for high likelihood and high impact', () => {
      expect(calculateOverallRiskLevel([
        createRisk(DPIA_LIKELIHOOD.HIGH, DPIA_IMPACT.HIGH),
      ])).toBe(DPIA_RISK_LEVEL.CRITICAL);
    });

    it('uses maximum score from multiple risks', () => {
      expect(calculateOverallRiskLevel([
        createRisk(DPIA_LIKELIHOOD.LOW, DPIA_IMPACT.LOW),
        createRisk(DPIA_LIKELIHOOD.HIGH, DPIA_IMPACT.HIGH),
        createRisk(DPIA_LIKELIHOOD.MEDIUM, DPIA_IMPACT.MEDIUM),
      ])).toBe(DPIA_RISK_LEVEL.CRITICAL);
    });
  });

  describe('getRiskTemplate', () => {
    it('returns CRITICAL template for CRITICAL risk', () => {
      const template = getRiskTemplate(DPIA_RISK_LEVEL.CRITICAL);
      expect(template.length).toBeGreaterThan(3);
      // Check for "Transfert" (French, capitalized) in risk names
      expect(template.some(r => r.riskName.toLowerCase().includes('transfert'))).toBe(true);
    });

    it('returns HIGH template for HIGH risk', () => {
      const template = getRiskTemplate(DPIA_RISK_LEVEL.HIGH);
      expect(template.length).toBe(3);
      expect(template.some(r => r.riskName.includes('Fuite'))).toBe(true);
    });

    it('returns empty template for MEDIUM risk', () => {
      const template = getRiskTemplate(DPIA_RISK_LEVEL.MEDIUM);
      expect(template).toEqual([]);
    });

    it('returns empty template for LOW risk', () => {
      const template = getRiskTemplate(DPIA_RISK_LEVEL.LOW);
      expect(template).toEqual([]);
    });
  });

  // ===========================================================================
  // Audit and public format tests
  // ===========================================================================

  describe('toAuditEvent', () => {
    const dpia: Dpia = {
      id: 'dpia-1',
      tenantId: 'tenant-1',
      purposeId: 'purpose-1',
      title: 'Test DPIA',
      description: 'Test description for DPIA audit event testing.',
      overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      dataProcessed: ['email', 'name'],
      dataClassification: DATA_CLASSIFICATION.P2,
      securityMeasures: DEFAULT_SECURITY_MEASURES,
      status: DPIA_STATUS.APPROVED,
      dpoComments: 'Approuvé avec recommandations',
      validatedAt: new Date('2025-01-15T10:00:00Z'),
      validatedBy: 'dpo-user-1',
      rejectionReason: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-15T10:00:00Z'),
      deletedAt: null,
      revisionRequestedAt: null,
      revisionRequestedBy: null,
      revisionComments: null,
    };

    it('generates audit event without PII', () => {
      const audit = toAuditEvent(dpia, 'dpia.approved', 'dpo-user-1');

      expect(audit.eventType).toBe('dpia.approved');
      expect(audit.tenantId).toBe('tenant-1');
      expect(audit.actorId).toBe('dpo-user-1');
      expect(audit.metadata.dpiaId).toBe('dpia-1');
      expect(audit.metadata.purposeId).toBe('purpose-1');
      expect(audit.metadata.status).toBe(DPIA_STATUS.APPROVED);
      expect(audit.metadata.riskLevel).toBe(DPIA_RISK_LEVEL.HIGH);
      expect(audit.metadata.dataClassification).toBe(DATA_CLASSIFICATION.P2);
    });

    it('does not include sensitive fields in audit event', () => {
      const audit = toAuditEvent(dpia, 'dpia.created', 'user-1');

      // Ensure no PII fields are in metadata
      expect(Object.keys(audit.metadata)).not.toContain('title');
      expect(Object.keys(audit.metadata)).not.toContain('description');
      expect(Object.keys(audit.metadata)).not.toContain('dpoComments');
      expect(Object.keys(audit.metadata)).not.toContain('dataProcessed');
    });
  });

  describe('toPublicDpia', () => {
    const dpia: Dpia = {
      id: 'dpia-1',
      tenantId: 'tenant-1',
      purposeId: 'purpose-1',
      title: 'Test DPIA',
      description: 'Test description for public format testing.',
      overallRiskLevel: DPIA_RISK_LEVEL.HIGH,
      dataProcessed: ['email', 'name'],
      dataClassification: DATA_CLASSIFICATION.P2,
      securityMeasures: DEFAULT_SECURITY_MEASURES,
      status: DPIA_STATUS.PENDING,
      dpoComments: null,
      validatedAt: null,
      validatedBy: 'dpo-user-1',
      rejectionReason: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      deletedAt: null,
      revisionRequestedAt: null,
      revisionRequestedBy: null,
      revisionComments: null,
    };

    it('excludes tenantId from public format', () => {
      const publicDpia = toPublicDpia(dpia);

      expect(publicDpia.id).toBe('dpia-1');
      expect(publicDpia.title).toBe('Test DPIA');
      expect(Object.keys(publicDpia)).not.toContain('tenantId');
      expect(Object.keys(publicDpia)).not.toContain('validatedBy');
      expect(Object.keys(publicDpia)).not.toContain('deletedAt');
    });

    it('preserves optional joined data when present', () => {
      const dpiaWithJoins: Dpia = {
        ...dpia,
        purposeLabel: 'Marketing Analytics',
        risks: [],
      };

      const publicDpia = toPublicDpia(dpiaWithJoins);

      expect(publicDpia.purposeLabel).toBe('Marketing Analytics');
      expect(publicDpia.risks).toEqual([]);
    });
  });
});
