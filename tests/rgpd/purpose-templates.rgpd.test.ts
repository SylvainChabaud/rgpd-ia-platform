/**
 * Purpose Templates RGPD Compliance Tests - LOT 12.2
 *
 * These tests verify RGPD compliance for the Purpose Templates system:
 * - Art. 6: Lawful basis tracking
 * - Art. 5.1.b: Purpose limitation principle
 * - Art. 35: DPIA requirements for high-risk processing
 * - Tenant isolation (data separation)
 * - Immutability of RGPD fields for system purposes
 * - Audit trail requirements
 *
 * Classification: P1 (technical metadata tests)
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockTemplateFindAll = jest.fn();
const mockTemplateFindByCode = jest.fn();
const mockTemplateCountAdoptions = jest.fn();
const mockPurposeFindAll = jest.fn();
const mockPurposeFindById = jest.fn();
const mockPurposeFindByLabel = jest.fn();
const mockPurposeCreate = jest.fn();
const mockPurposeUpdate = jest.fn();
const mockPurposeCreateFromTemplate = jest.fn();
const mockPurposeIsTemplateAdopted = jest.fn();
const mockPurposeSoftDelete = jest.fn();
const mockAuditWrite = jest.fn();
const mockValidate = jest.fn();

jest.mock('@/infrastructure/repositories/PgPurposeTemplateRepo', () => ({
  PgPurposeTemplateRepo: jest.fn().mockImplementation(() => ({
    findAll: mockTemplateFindAll,
    findByCode: mockTemplateFindByCode,
    countAdoptions: mockTemplateCountAdoptions,
  })),
}));

jest.mock('@/infrastructure/repositories/PgPurposeRepo', () => ({
  PgPurposeRepo: jest.fn().mockImplementation(() => ({
    findAll: mockPurposeFindAll,
    findById: mockPurposeFindById,
    findByLabel: mockPurposeFindByLabel,
    create: mockPurposeCreate,
    update: mockPurposeUpdate,
    createFromTemplate: mockPurposeCreateFromTemplate,
    isTemplateAdopted: mockPurposeIsTemplateAdopted,
    softDelete: mockPurposeSoftDelete,
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: mockAuditWrite,
  })),
}));

jest.mock('@/app/services/CustomPurposeValidator', () => ({
  getCustomPurposeValidator: jest.fn(() => ({
    validate: mockValidate,
  })),
}));

jest.mock('@/infrastructure/db/pool', () => ({
  getPool: jest.fn(() => ({})),
}));

// Import handlers after mocks
import { POST as CreateCustomPurpose } from '@app/api/purposes/custom/route';
import { POST as AdoptTemplate } from '@app/api/purposes/adopt/route';

// =============================================================================
// HELPERS
// =============================================================================

const TENANT_A = 'tenant-a-001';
const TENANT_B = 'tenant-b-002';

function createTenantAdminRequest(tenantId: string, path: string, body: object): NextRequest {
  const token = signJwt({
    userId: `admin-${tenantId}`,
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const sampleTemplate = {
  id: 'template-001',
  code: 'AI_SUMMARIZATION',
  name: 'Synthèse de documents',
  description: 'Génération automatique de résumés',
  lawfulBasis: 'CONSENT',
  category: 'AI_PROCESSING',
  riskLevel: 'MEDIUM',
  defaultRetentionDays: 90,
  requiresDpia: false,
  maxDataClass: 'P1',
  isActive: true,
  isAiPurpose: true,
};

const samplePurpose = {
  id: 'purpose-001',
  tenantId: TENANT_A,
  templateId: 'template-001',
  label: 'Synthèse de documents',
  description: 'Génération automatique de résumés',
  lawfulBasis: 'CONSENT',
  category: 'AI_PROCESSING',
  riskLevel: 'MEDIUM',
  maxDataClass: 'P1',
  requiresDpia: false,
  isRequired: false,
  isActive: true,
  isFromTemplate: true,
  isSystem: true,
  validationStatus: 'VALIDATED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// RGPD ART. 6 - LAWFUL BASIS TESTS
// =============================================================================

describe('RGPD Art. 6 - Lawful Basis Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockPurposeCreate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[RGPD-ART6-001] should require lawful basis for custom purposes', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Custom Purpose',
      description: 'Purpose without lawful basis',
      // lawfulBasis intentionally omitted
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[RGPD-ART6-002] should validate lawful basis values against Art. 6.1', async () => {
    const validBases = [
      'CONSENT',
      'CONTRACT',
      'LEGAL_OBLIGATION',
      'VITAL_INTEREST',
      'PUBLIC_INTEREST',
      'LEGITIMATE_INTEREST',
    ];

    for (const basis of validBases) {
      mockPurposeFindByLabel.mockResolvedValue(null);
      mockPurposeCreate.mockResolvedValue({ ...samplePurpose, lawfulBasis: basis });

      const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
        label: `Purpose with ${basis}`,
        description: 'Valid purpose with lawful basis',
        lawfulBasis: basis,
      });
      const response = await CreateCustomPurpose(req);

      expect(response.status).toBe(201);
    }
  });

  it('[RGPD-ART6-003] should reject invalid lawful basis values', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Invalid Basis Purpose',
      description: 'Purpose with invalid lawful basis',
      lawfulBasis: 'INVALID_BASIS',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[RGPD-ART6-004] should inherit lawful basis from template on adoption', async () => {
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockPurposeCreateFromTemplate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/adopt', {
      templateCode: 'AI_SUMMARIZATION',
    });
    const response = await AdoptTemplate(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.purpose.lawfulBasis).toBe('CONSENT');
  });

  it('[RGPD-ART6-005] should audit lawful basis in creation events', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Audited Purpose',
      description: 'Purpose with audit trail',
      lawfulBasis: 'LEGITIMATE_INTEREST',
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({
        lawfulBasis: 'LEGITIMATE_INTEREST',
      }),
    }));
  });
});

// =============================================================================
// RGPD ART. 35 - DPIA REQUIREMENTS
// =============================================================================

describe('RGPD Art. 35 - DPIA Requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[RGPD-ART35-001] should require DPIA acknowledgment for HIGH risk purposes', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'High Risk Purpose',
      description: 'Purpose with high risk level',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      acknowledgeDpiaWarning: false,
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[RGPD-ART35-002] should require DPIA acknowledgment for CRITICAL risk purposes', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Critical Risk Purpose',
      description: 'Purpose with critical risk level',
      lawfulBasis: 'CONSENT',
      riskLevel: 'CRITICAL',
      acknowledgeDpiaWarning: false,
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[RGPD-ART35-003] should allow HIGH risk with explicit acknowledgment', async () => {
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      riskLevel: 'HIGH',
      requiresDpia: true,
    });

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Acknowledged High Risk',
      description: 'High risk with acknowledgment',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      acknowledgeDpiaWarning: true,
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(201);
  });

  it('[RGPD-ART35-004] should set requiresDpia flag for P3 data class', async () => {
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      maxDataClass: 'P3',
      requiresDpia: true,
    });

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Sensitive Data Purpose',
      description: 'Purpose processing sensitive data',
      lawfulBasis: 'CONSENT',
      maxDataClass: 'P3',
      acknowledgeDpiaWarning: true,
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeCreate).toHaveBeenCalledWith(TENANT_A, expect.objectContaining({
      requiresDpia: true,
    }));
  });

  it('[RGPD-ART35-005] should return DPIA warnings in response', async () => {
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      riskLevel: 'HIGH',
      requiresDpia: true,
    });

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'High Risk Purpose',
      description: 'Purpose requiring DPIA warning',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      acknowledgeDpiaWarning: true,
    });
    const response = await CreateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.warnings).toBeDefined();
    expect(body.warnings.length).toBeGreaterThan(0);
  });

  it('[RGPD-ART35-006] should not require DPIA for LOW risk purposes', async () => {
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      riskLevel: 'LOW',
      requiresDpia: false,
    });

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Low Risk Purpose',
      description: 'Purpose with low risk level',
      lawfulBasis: 'CONSENT',
      riskLevel: 'LOW',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(201);
  });
});

// =============================================================================
// TENANT ISOLATION TESTS
// =============================================================================

describe('RGPD - Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockPurposeCreate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[ISOLATION-001] should create purpose with correct tenant ID', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Tenant A Purpose',
      description: 'Purpose for tenant A only',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeCreate).toHaveBeenCalledWith(TENANT_A, expect.any(Object));
  });

  it('[ISOLATION-002] should check label uniqueness within tenant scope', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Unique Purpose',
      description: 'Should check uniqueness for tenant',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeFindByLabel).toHaveBeenCalledWith(TENANT_A, 'Unique Purpose');
  });

  it('[ISOLATION-003] should check template adoption within tenant scope', async () => {
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockPurposeCreateFromTemplate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/adopt', {
      templateCode: 'AI_SUMMARIZATION',
    });
    await AdoptTemplate(req);

    expect(mockPurposeIsTemplateAdopted).toHaveBeenCalledWith(TENANT_A, sampleTemplate.id);
  });

  it('[ISOLATION-004] should emit audit events with tenant context', async () => {
    const req = createTenantAdminRequest(TENANT_B, '/api/purposes/custom', {
      label: 'Tenant B Purpose',
      description: 'Purpose created by tenant B',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TENANT_B,
    }));
  });

  it('[ISOLATION-005] should allow same label in different tenants', async () => {
    // First tenant creates purpose
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockPurposeCreate.mockResolvedValue({ ...samplePurpose, tenantId: TENANT_A });

    const reqA = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Shared Label',
      description: 'Same label in tenant A',
      lawfulBasis: 'CONSENT',
    });
    const responseA = await CreateCustomPurpose(reqA);
    expect(responseA.status).toBe(201);

    // Second tenant creates purpose with same label
    mockPurposeFindByLabel.mockResolvedValue(null); // Different tenant, so null
    mockPurposeCreate.mockResolvedValue({ ...samplePurpose, tenantId: TENANT_B });

    const reqB = createTenantAdminRequest(TENANT_B, '/api/purposes/custom', {
      label: 'Shared Label',
      description: 'Same label in tenant B',
      lawfulBasis: 'CONSENT',
    });
    const responseB = await CreateCustomPurpose(reqB);
    expect(responseB.status).toBe(201);
  });
});

// =============================================================================
// AUDIT TRAIL TESTS
// =============================================================================

describe('RGPD - Audit Trail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockPurposeCreate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[AUDIT-001] should emit audit event on custom purpose creation', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Audited Purpose',
      description: 'Purpose with audit event',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.custom.created',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_A,
    }));
  });

  it('[AUDIT-002] should emit audit event on template adoption', async () => {
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockPurposeCreateFromTemplate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/adopt', {
      templateCode: 'AI_SUMMARIZATION',
    });
    await AdoptTemplate(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.template.adopted',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_A,
      details: expect.objectContaining({
        templateCode: 'AI_SUMMARIZATION',
      }),
    }));
  });

  it('[AUDIT-003] should include RGPD-relevant details in audit', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Detailed Audit Purpose',
      description: 'Purpose with detailed audit',
      lawfulBasis: 'LEGITIMATE_INTEREST',
      riskLevel: 'HIGH',
      maxDataClass: 'P2',
      acknowledgeDpiaWarning: true,
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({
        lawfulBasis: 'LEGITIMATE_INTEREST',
        riskLevel: 'HIGH',
        maxDataClass: 'P2',
        requiresDpia: true,
        acknowledgeDpiaWarning: true,
      }),
    }));
  });

  it('[AUDIT-004] should include actor ID in audit events', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Actor Tracked Purpose',
      description: 'Purpose with actor tracking',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      actorId: `admin-${TENANT_A}`,
    }));
  });

  it('[AUDIT-005] should include target ID (purpose ID) in audit', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Target Tracked Purpose',
      description: 'Purpose with target tracking',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      targetId: samplePurpose.id,
    }));
  });
});

// =============================================================================
// DATA CLASSIFICATION TESTS
// =============================================================================

describe('RGPD - Data Classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[DATACLASS-001] should accept valid data classes (P0, P1, P2, P3)', async () => {
    const validClasses = ['P0', 'P1', 'P2', 'P3'];

    for (const dataClass of validClasses) {
      mockPurposeCreate.mockResolvedValue({
        ...samplePurpose,
        maxDataClass: dataClass,
        requiresDpia: dataClass === 'P3',
      });

      const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
        label: `Purpose with ${dataClass}`,
        description: 'Purpose with data class',
        lawfulBasis: 'CONSENT',
        maxDataClass: dataClass,
        acknowledgeDpiaWarning: dataClass === 'P3',
      });
      const response = await CreateCustomPurpose(req);

      expect(response.status).toBe(201);
    }
  });

  it('[DATACLASS-002] should reject invalid data classes', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Invalid Data Class',
      description: 'Purpose with invalid data class',
      lawfulBasis: 'CONSENT',
      maxDataClass: 'P5',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[DATACLASS-003] should flag P3 data as requiring special handling', async () => {
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      maxDataClass: 'P3',
      requiresDpia: true,
    });

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Sensitive Data Purpose',
      description: 'Purpose handling sensitive data',
      lawfulBasis: 'CONSENT',
      maxDataClass: 'P3',
      acknowledgeDpiaWarning: true,
    });
    const response = await CreateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.purpose.requiresDpia).toBe(true);
  });

  it('[DATACLASS-004] should default to P1 if not specified', async () => {
    mockPurposeCreate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Default Data Class',
      description: 'Purpose without data class',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeCreate).toHaveBeenCalledWith(TENANT_A, expect.objectContaining({
      maxDataClass: 'P1',
    }));
  });
});

// =============================================================================
// RISK LEVEL TESTS
// =============================================================================

describe('RGPD - Risk Level', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[RISK-001] should accept valid risk levels', async () => {
    const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (const level of validLevels) {
      mockPurposeCreate.mockResolvedValue({
        ...samplePurpose,
        riskLevel: level,
        requiresDpia: ['HIGH', 'CRITICAL'].includes(level),
      });

      const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
        label: `Purpose with ${level} risk`,
        description: 'Purpose with risk level',
        lawfulBasis: 'CONSENT',
        riskLevel: level,
        acknowledgeDpiaWarning: ['HIGH', 'CRITICAL'].includes(level),
      });
      const response = await CreateCustomPurpose(req);

      expect(response.status).toBe(201);
    }
  });

  it('[RISK-002] should reject invalid risk levels', async () => {
    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Invalid Risk Purpose',
      description: 'Purpose with invalid risk level',
      lawfulBasis: 'CONSENT',
      riskLevel: 'EXTREME',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[RISK-003] should default to MEDIUM if not specified', async () => {
    mockPurposeCreate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest(TENANT_A, '/api/purposes/custom', {
      label: 'Default Risk Purpose',
      description: 'Purpose without risk level',
      lawfulBasis: 'CONSENT',
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeCreate).toHaveBeenCalledWith(TENANT_A, expect.objectContaining({
      riskLevel: 'MEDIUM',
    }));
  });
});
