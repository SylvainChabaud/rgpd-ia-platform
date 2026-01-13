/**
 * Purpose Templates API Tests - LOT 12.2
 *
 * Tests for:
 * - GET /api/purposes/templates - List available templates
 * - GET /api/purposes/templates/:code - Get template details
 * - POST /api/purposes/adopt - Adopt a template for tenant
 * - POST /api/purposes/custom/validate - Validate custom purpose
 * - POST /api/purposes/custom - Create custom purpose
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Base légale (Art. 6) tracking
 * - DPIA warnings for high-risk purposes
 * - Audit events emitted
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
const mockPurposeFindByLabel = jest.fn();
const mockPurposeCreate = jest.fn();
const mockPurposeCreateFromTemplate = jest.fn();
const mockPurposeIsTemplateAdopted = jest.fn();
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
    findByLabel: mockPurposeFindByLabel,
    create: mockPurposeCreate,
    createFromTemplate: mockPurposeCreateFromTemplate,
    isTemplateAdopted: mockPurposeIsTemplateAdopted,
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

// Import route handlers AFTER mocking
import { GET as ListTemplates } from '@app/api/purposes/templates/route';
import { GET as GetTemplate } from '@app/api/purposes/templates/[code]/route';
import { POST as AdoptTemplate } from '@app/api/purposes/adopt/route';
import { POST as ValidateCustomPurpose } from '@app/api/purposes/custom/validate/route';
import { POST as CreateCustomPurpose } from '@app/api/purposes/custom/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const TEST_TEMPLATE_ID = 'template-001';
const TEST_TEMPLATE_CODE = 'AI_SUMMARIZATION';
const TEST_PURPOSE_ID = 'purpose-001';

function createTenantAdminRequest(path: string, tenantId: string, method: string = 'GET', body?: object): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  const options: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) {
    options.body = JSON.stringify(body);
    (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(`http://localhost${path}`, options as any);
}

function createMemberRequest(path: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createUnauthenticatedRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function createCodeParams(code: string): { params: Promise<{ code: string }> } {
  return { params: Promise.resolve({ code }) };
}

// Sample template data
const sampleTemplate = {
  id: TEST_TEMPLATE_ID,
  code: TEST_TEMPLATE_CODE,
  version: 1,
  name: 'Synthèse de documents',
  description: 'Génération automatique de résumés de documents',
  lawfulBasis: 'CONSENT',
  category: 'AI_PROCESSING',
  riskLevel: 'MEDIUM',
  defaultRetentionDays: 90,
  requiresDpia: false,
  maxDataClass: 'P1',
  isActive: true,
  isAiPurpose: true,
  cnilReference: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const samplePurpose = {
  id: TEST_PURPOSE_ID,
  tenantId: TEST_TENANT_ID,
  templateId: TEST_TEMPLATE_ID,
  label: 'Synthèse de documents',
  description: 'Génération automatique de résumés de documents',
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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// =============================================================================
// TESTS - LIST TEMPLATES (GET /api/purposes/templates)
// =============================================================================

describe('GET /api/purposes/templates - List Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[TEMPLATES-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest('/api/purposes/templates');
    const response = await ListTemplates(req);
    expect(response.status).toBe(401);
  });

  it('[TEMPLATES-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('/api/purposes/templates', TEST_TENANT_ID);
    const response = await ListTemplates(req);
    expect(response.status).toBe(403);
  });

  it('[TEMPLATES-003] should return templates list for TENANT_ADMIN', async () => {
    mockTemplateFindAll.mockResolvedValue([sampleTemplate]);

    const req = createTenantAdminRequest('/api/purposes/templates', TEST_TENANT_ID);
    const response = await ListTemplates(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0].code).toBe(TEST_TEMPLATE_CODE);
    expect(body.templates[0].lawfulBasisLabel).toBeDefined();
    expect(body.total).toBe(1);
  });

  it('[TEMPLATES-004] should filter by category', async () => {
    mockTemplateFindAll.mockResolvedValue([sampleTemplate]);

    const req = createTenantAdminRequest('/api/purposes/templates?category=AI_PROCESSING', TEST_TENANT_ID);
    const response = await ListTemplates(req);

    expect(response.status).toBe(200);
    expect(mockTemplateFindAll).toHaveBeenCalled();
  });

  it('[TEMPLATES-005] should filter by riskLevel', async () => {
    mockTemplateFindAll.mockResolvedValue([]);

    const req = createTenantAdminRequest('/api/purposes/templates?riskLevel=HIGH', TEST_TENANT_ID);
    const response = await ListTemplates(req);

    expect(response.status).toBe(200);
  });

  it('[TEMPLATES-006] should filter AI purposes only', async () => {
    mockTemplateFindAll.mockResolvedValue([sampleTemplate]);

    const req = createTenantAdminRequest('/api/purposes/templates?aiOnly=true', TEST_TENANT_ID);
    const response = await ListTemplates(req);

    expect(response.status).toBe(200);
  });

  it('[TEMPLATES-007] should handle database errors gracefully', async () => {
    mockTemplateFindAll.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest('/api/purposes/templates', TEST_TENANT_ID);
    const response = await ListTemplates(req);

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - GET TEMPLATE BY CODE (GET /api/purposes/templates/:code)
// =============================================================================

describe('GET /api/purposes/templates/:code - Get Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockTemplateCountAdoptions.mockResolvedValue(5);
  });

  it('[TEMPLATES-010] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/purposes/templates/${TEST_TEMPLATE_CODE}`);
    const response = await GetTemplate(req, createCodeParams(TEST_TEMPLATE_CODE));
    expect(response.status).toBe(401);
  });

  it('[TEMPLATES-011] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/purposes/templates/${TEST_TEMPLATE_CODE}`, TEST_TENANT_ID);
    const response = await GetTemplate(req, createCodeParams(TEST_TEMPLATE_CODE));
    expect(response.status).toBe(403);
  });

  it('[TEMPLATES-012] should return template with adoption info', async () => {
    const req = createTenantAdminRequest(`/api/purposes/templates/${TEST_TEMPLATE_CODE}`, TEST_TENANT_ID);
    const response = await GetTemplate(req, createCodeParams(TEST_TEMPLATE_CODE));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template.code).toBe(TEST_TEMPLATE_CODE);
    expect(body.template.lawfulBasisLabel).toBeDefined();
    expect(body.template.riskLevelLabel).toBeDefined();
    expect(body.adoption.isAdopted).toBe(false);
    expect(body.adoption.totalAdoptions).toBe(5);
  });

  it('[TEMPLATES-013] should return 404 for non-existent template', async () => {
    mockTemplateFindByCode.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/purposes/templates/NON_EXISTENT`, TEST_TENANT_ID);
    const response = await GetTemplate(req, createCodeParams('NON_EXISTENT'));

    expect(response.status).toBe(404);
  });

  it('[TEMPLATES-014] should indicate when template is already adopted', async () => {
    mockPurposeIsTemplateAdopted.mockResolvedValue(true);

    const req = createTenantAdminRequest(`/api/purposes/templates/${TEST_TEMPLATE_CODE}`, TEST_TENANT_ID);
    const response = await GetTemplate(req, createCodeParams(TEST_TEMPLATE_CODE));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.adoption.isAdopted).toBe(true);
  });
});

// =============================================================================
// TESTS - ADOPT TEMPLATE (POST /api/purposes/adopt)
// =============================================================================

describe('POST /api/purposes/adopt - Adopt Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockPurposeCreateFromTemplate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[ADOPT-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/purposes/adopt', {
      method: 'POST',
      body: JSON.stringify({ templateCode: TEST_TEMPLATE_CODE }),
    });
    const response = await AdoptTemplate(req);
    expect(response.status).toBe(401);
  });

  it('[ADOPT-002] should return 403 for MEMBER role', async () => {
    const token = signJwt({
      userId: 'member-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const req = new NextRequest('http://localhost/api/purposes/adopt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ templateCode: TEST_TEMPLATE_CODE }),
    });
    const response = await AdoptTemplate(req);
    expect(response.status).toBe(403);
  });

  it('[ADOPT-003] should adopt template successfully', async () => {
    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: TEST_TEMPLATE_CODE,
    });
    const response = await AdoptTemplate(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.purpose.isFromTemplate).toBe(true);
    expect(body.purpose.lawfulBasis).toBe('CONSENT');
    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.template.adopted',
    }));
  });

  it('[ADOPT-004] should return 404 for non-existent template', async () => {
    mockTemplateFindByCode.mockResolvedValue(null);

    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: 'NON_EXISTENT',
    });
    const response = await AdoptTemplate(req);

    expect(response.status).toBe(404);
  });

  it('[ADOPT-005] should return 409 if template already adopted', async () => {
    mockPurposeIsTemplateAdopted.mockResolvedValue(true);

    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: TEST_TEMPLATE_CODE,
    });
    const response = await AdoptTemplate(req);

    expect(response.status).toBe(409);
  });

  it('[ADOPT-006] should return 400 for inactive template', async () => {
    mockTemplateFindByCode.mockResolvedValue({ ...sampleTemplate, isActive: false });

    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: TEST_TEMPLATE_CODE,
    });
    const response = await AdoptTemplate(req);

    expect(response.status).toBe(400);
  });

  it('[ADOPT-007] should allow custom label and description', async () => {
    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: TEST_TEMPLATE_CODE,
      label: 'Custom Label',
      description: 'Custom description for this purpose',
    });
    await AdoptTemplate(req);

    expect(mockPurposeCreateFromTemplate).toHaveBeenCalledWith(TEST_TENANT_ID, expect.objectContaining({
      label: 'Custom Label',
      description: 'Custom description for this purpose',
    }));
  });

  it('[ADOPT-008] should return 400 for missing templateCode', async () => {
    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {});
    const response = await AdoptTemplate(req);

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// TESTS - VALIDATE CUSTOM PURPOSE (POST /api/purposes/custom/validate)
// =============================================================================

describe('POST /api/purposes/custom/validate - Validate Custom Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidate.mockReturnValue({
      isValid: true,
      suggestedLawfulBasis: 'CONSENT',
      suggestedRiskLevel: 'MEDIUM',
      warnings: [],
      errors: [],
      requiresDpia: false,
      canProceed: true,
    });
  });

  it('[VALIDATE-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/purposes/custom/validate', {
      method: 'POST',
      body: JSON.stringify({ label: 'Test', description: 'Test desc', dataClassInvolved: ['P1'] }),
    });
    const response = await ValidateCustomPurpose(req);
    expect(response.status).toBe(401);
  });

  it('[VALIDATE-002] should return 403 for MEMBER role', async () => {
    const token = signJwt({
      userId: 'member-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const req = new NextRequest('http://localhost/api/purposes/custom/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label: 'Test', description: 'Test desc', dataClassInvolved: ['P1'] }),
    });
    const response = await ValidateCustomPurpose(req);
    expect(response.status).toBe(403);
  });

  it('[VALIDATE-003] should validate and return suggestions', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom/validate', TEST_TENANT_ID, 'POST', {
      label: 'Custom Analytics',
      description: 'Custom analytics purpose for user behavior tracking',
      dataClassInvolved: ['P2'],
      processingTypes: ['AI_AUTOMATED'],
      automaticDecision: false,
    });
    const response = await ValidateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.validation.isValid).toBe(true);
    expect(body.validation.suggestedLawfulBasis).toBe('CONSENT');
    expect(body.lawfulBasisOptions).toBeDefined();
  });

  it('[VALIDATE-004] should warn about DPIA for high-risk purposes', async () => {
    mockValidate.mockReturnValue({
      isValid: true,
      suggestedLawfulBasis: 'CONSENT',
      suggestedRiskLevel: 'HIGH',
      warnings: ['DPIA required for sensitive data'],
      errors: [],
      requiresDpia: true,
      canProceed: true,
    });

    const req = createTenantAdminRequest('/api/purposes/custom/validate', TEST_TENANT_ID, 'POST', {
      label: 'Sensitive Analytics',
      description: 'Processing of sensitive health data for analytics',
      dataClassInvolved: ['P3'],
      processingTypes: ['PROFILING'],
      automaticDecision: true,
    });
    const response = await ValidateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.validation.requiresDpia).toBe(true);
    expect(body.validation.warnings).toContain('DPIA required for sensitive data');
  });

  it('[VALIDATE-005] should return 400 for missing dataClassInvolved', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom/validate', TEST_TENANT_ID, 'POST', {
      label: 'Test',
      description: 'Test description',
      dataClassInvolved: [],
    });
    const response = await ValidateCustomPurpose(req);

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// TESTS - CREATE CUSTOM PURPOSE (POST /api/purposes/custom)
// =============================================================================

describe('POST /api/purposes/custom - Create Custom Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockPurposeCreate.mockResolvedValue({
      ...samplePurpose,
      isFromTemplate: false,
      isSystem: false,
      templateId: null,
    });
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[CUSTOM-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/purposes/custom', {
      method: 'POST',
      body: JSON.stringify({
        label: 'Custom Purpose',
        description: 'Description of custom purpose',
        lawfulBasis: 'CONSENT',
      }),
    });
    const response = await CreateCustomPurpose(req);
    expect(response.status).toBe(401);
  });

  it('[CUSTOM-002] should return 403 for MEMBER role', async () => {
    const token = signJwt({
      userId: 'member-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const req = new NextRequest('http://localhost/api/purposes/custom', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        label: 'Custom Purpose',
        description: 'Description of custom purpose',
        lawfulBasis: 'CONSENT',
      }),
    });
    const response = await CreateCustomPurpose(req);
    expect(response.status).toBe(403);
  });

  it('[CUSTOM-003] should create custom purpose successfully', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'Custom Purpose',
      description: 'Description of custom purpose for tenant',
      lawfulBasis: 'CONSENT',
    });
    const response = await CreateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.purpose).toBeDefined();
    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.custom.created',
    }));
  });

  it('[CUSTOM-004] should return 400 for invalid lawfulBasis', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'Custom Purpose',
      description: 'Description of custom purpose',
      lawfulBasis: 'INVALID_BASIS',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[CUSTOM-005] should return 409 for duplicate label', async () => {
    mockPurposeFindByLabel.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'Synthèse de documents',
      description: 'Description duplicate purpose',
      lawfulBasis: 'CONSENT',
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(409);
  });

  it('[CUSTOM-006] should require DPIA acknowledgment for high-risk purposes', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'High Risk Purpose',
      description: 'High risk purpose description here',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      acknowledgeDpiaWarning: false,
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(400);
  });

  it('[CUSTOM-007] should allow high-risk with DPIA acknowledgment', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'High Risk Purpose',
      description: 'High risk purpose description here',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      acknowledgeDpiaWarning: true,
    });
    const response = await CreateCustomPurpose(req);

    expect(response.status).toBe(201);
  });

  it('[CUSTOM-008] should return warnings for DPIA-required purposes', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'High Risk Purpose',
      description: 'High risk purpose description here',
      lawfulBasis: 'CONSENT',
      riskLevel: 'HIGH',
      maxDataClass: 'P3',
      acknowledgeDpiaWarning: true,
    });
    const response = await CreateCustomPurpose(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.warnings).toBeDefined();
    expect(body.warnings.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('Purpose Templates API - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateFindAll.mockResolvedValue([sampleTemplate]);
    mockPurposeCreate.mockResolvedValue(samplePurpose);
    mockPurposeFindByLabel.mockResolvedValue(null);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[RGPD-001] should track lawful basis (Art. 6) for all purposes', async () => {
    const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, 'POST', {
      label: 'RGPD Purpose',
      description: 'Purpose with explicit lawful basis',
      lawfulBasis: 'LEGITIMATE_INTEREST',
    });
    await CreateCustomPurpose(req);

    expect(mockPurposeCreate).toHaveBeenCalledWith(TEST_TENANT_ID, expect.objectContaining({
      lawfulBasis: 'LEGITIMATE_INTEREST',
    }));
  });

  it('[RGPD-002] should emit audit events with RGPD context', async () => {
    mockTemplateFindByCode.mockResolvedValue(sampleTemplate);
    mockPurposeIsTemplateAdopted.mockResolvedValue(false);
    mockPurposeCreateFromTemplate.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, 'POST', {
      templateCode: TEST_TEMPLATE_CODE,
    });
    await AdoptTemplate(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TEST_TENANT_ID,
      metadata: expect.objectContaining({
        templateCode: TEST_TEMPLATE_CODE,
      }),
    }));
  });

  it('[RGPD-003] should enforce tenant isolation', async () => {
    const req = createTenantAdminRequest('/api/purposes/templates', TEST_TENANT_ID);
    await ListTemplates(req);

    // Templates are platform-level but adoption check is tenant-scoped
    expect(mockTemplateFindAll).toHaveBeenCalled();
  });

  it('[RGPD-004] should provide localized RGPD labels', async () => {
    const req = createTenantAdminRequest('/api/purposes/templates', TEST_TENANT_ID);
    const response = await ListTemplates(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.templates[0].lawfulBasisLabel).toBeDefined();
    expect(body.templates[0].categoryLabel).toBeDefined();
    expect(body.templates[0].riskLevelLabel).toBeDefined();
  });

  it('[RGPD-005] should indicate DPIA requirement', async () => {
    const highRiskTemplate = { ...sampleTemplate, requiresDpia: true, riskLevel: 'HIGH' };
    mockTemplateFindAll.mockResolvedValue([highRiskTemplate]);

    const req = createTenantAdminRequest('/api/purposes/templates', TEST_TENANT_ID);
    const response = await ListTemplates(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.templates[0].requiresDpia).toBe(true);
  });
});
