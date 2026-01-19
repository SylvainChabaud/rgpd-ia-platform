/**
 * Purposes Adopt API Tests - LOT 12.2
 *
 * Tests for POST /api/purposes/adopt
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Base légale inherited from template (immutable)
 * - Audit events emitted
 * - DPIA auto-created for HIGH/CRITICAL risk
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { RISK_LEVEL } from '@/app/ports/PurposeTemplateRepo';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindByCode = jest.fn();
const mockIsTemplateAdopted = jest.fn();
const mockCreateFromTemplate = jest.fn();
const mockDpiaCreate = jest.fn();
const mockAuditWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgPurposeTemplateRepo', () => ({
  PgPurposeTemplateRepo: jest.fn().mockImplementation(() => ({
    findByCode: mockFindByCode,
  })),
}));

jest.mock('@/infrastructure/repositories/PgPurposeRepo', () => ({
  PgPurposeRepo: jest.fn().mockImplementation(() => ({
    isTemplateAdopted: mockIsTemplateAdopted,
    createFromTemplate: mockCreateFromTemplate,
  })),
}));

jest.mock('@/infrastructure/repositories/PgDpiaRepo', () => ({
  PgDpiaRepo: jest.fn().mockImplementation(() => ({
    create: mockDpiaCreate,
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: mockAuditWrite,
  })),
}));

jest.mock('@/infrastructure/db/pool', () => ({
  getPool: jest.fn().mockReturnValue({}),
}));

// Import route handler AFTER mocking
import { POST as AdoptTemplate } from '@app/api/purposes/adopt/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const TEST_TEMPLATE_ID = 'template-001';
const TEST_PURPOSE_ID = 'purpose-001';
const TEST_DPIA_ID = 'dpia-001';

function createTenantAdminRequest(path: string, tenantId: string, body?: object): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  const options: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(`http://localhost${path}`, options as any);
}

function createMemberRequest(path: string, tenantId: string, body?: object): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  const options: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(`http://localhost${path}`, options as any);
}

function createUnauthenticatedRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: 'POST' });
}

// Sample template data
const mockTemplate = {
  id: TEST_TEMPLATE_ID,
  code: 'TPL_AI_ANALYTICS',
  label: 'AI Analytics',
  description: 'Template for AI analytics processing',
  lawfulBasis: 'CONSENT',
  category: 'AI_PROCESSING',
  riskLevel: 'MEDIUM',
  maxDataClass: 'P1',
  requiresDpia: false,
  isActive: true,
};

const mockHighRiskTemplate = {
  ...mockTemplate,
  id: 'template-high-risk',
  code: 'TPL_AI_HIGH_RISK',
  label: 'High Risk AI',
  riskLevel: RISK_LEVEL.HIGH,
  requiresDpia: true,
};

const mockPurpose = {
  id: TEST_PURPOSE_ID,
  tenantId: TEST_TENANT_ID,
  templateId: TEST_TEMPLATE_ID,
  label: 'AI Analytics',
  description: 'Template for AI analytics processing',
  lawfulBasis: 'CONSENT',
  category: 'AI_PROCESSING',
  riskLevel: 'MEDIUM',
  maxDataClass: 'P1',
  requiresDpia: false,
  isRequired: false,
  isActive: true,
  isFromTemplate: true,
  isSystem: false,
  validationStatus: 'VALIDATED',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockHighRiskPurpose = {
  ...mockPurpose,
  id: 'purpose-high-risk',
  templateId: 'template-high-risk',
  riskLevel: RISK_LEVEL.HIGH,
  requiresDpia: true,
};

const mockDpia = {
  id: TEST_DPIA_ID,
  tenantId: TEST_TENANT_ID,
  purposeId: 'purpose-high-risk',
  title: 'DPIA: High Risk AI',
  status: 'PENDING',
};

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/purposes/adopt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock responses
    mockFindByCode.mockResolvedValue(mockTemplate);
    mockIsTemplateAdopted.mockResolvedValue(false);
    mockCreateFromTemplate.mockResolvedValue(mockPurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Authentication & Authorization
  // ===========================================================================

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const req = createUnauthenticatedRequest('/api/purposes/adopt');
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(401);
    });

    it('should return 403 for member (non-admin) requests', async () => {
      const req = createMemberRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(403);
    });

    it('should allow tenant admin to adopt templates', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(201);
    });
  });

  // ===========================================================================
  // Tenant Isolation (RGPD CRITICAL)
  // ===========================================================================

  describe('Tenant Isolation (RGPD)', () => {
    it('should create purpose with correct tenantId', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      await AdoptTemplate(req);

      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          templateId: TEST_TEMPLATE_ID,
        })
      );
    });

    it('should check template adoption for correct tenant', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      await AdoptTemplate(req);

      expect(mockIsTemplateAdopted).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_TEMPLATE_ID);
    });

    it('should include tenantId in audit event', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      await AdoptTemplate(req);

      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'purpose.template.adopted',
          tenantId: TEST_TENANT_ID,
        })
      );
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should return 400 if templateCode is missing', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {});
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });

    it('should return 404 if template does not exist', async () => {
      mockFindByCode.mockResolvedValue(null);

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'NONEXISTENT_TEMPLATE',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(404);
    });

    it('should return 400 if template is inactive', async () => {
      mockFindByCode.mockResolvedValue({ ...mockTemplate, isActive: false });

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details[0].message).toContain('not active');
    });

    it('should return 409 if template already adopted', async () => {
      mockIsTemplateAdopted.mockResolvedValue(true);

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(409);
    });
  });

  // ===========================================================================
  // Template Adoption
  // ===========================================================================

  describe('Template Adoption', () => {
    it('should create purpose from template with inherited RGPD fields', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(201);
      const body = await res.json();

      // Verify RGPD fields are inherited from template
      expect(body.purpose.lawfulBasis).toBe(mockTemplate.lawfulBasis);
      expect(body.purpose.category).toBe(mockTemplate.category);
      expect(body.purpose.riskLevel).toBe(mockTemplate.riskLevel);
      expect(body.purpose.maxDataClass).toBe(mockTemplate.maxDataClass);
      expect(body.purpose.isFromTemplate).toBe(true);
    });

    it('should allow custom label override', async () => {
      mockCreateFromTemplate.mockResolvedValue({
        ...mockPurpose,
        label: 'My Custom Analytics',
      });

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
        label: 'My Custom Analytics',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(201);
      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          label: 'My Custom Analytics',
        })
      );
    });

    it('should allow custom description override', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
        description: 'My custom description for analytics',
      });
      await AdoptTemplate(req);

      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          description: 'My custom description for analytics',
        })
      );
    });

    it('should allow setting isRequired flag', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
        isRequired: true,
      });
      await AdoptTemplate(req);

      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          isRequired: true,
        })
      );
    });
  });

  // ===========================================================================
  // DPIA Auto-Creation (RGPD Art. 35)
  // ===========================================================================

  describe('DPIA Auto-Creation (RGPD Art. 35)', () => {
    it('should auto-create DPIA for HIGH risk template', async () => {
      mockFindByCode.mockResolvedValue(mockHighRiskTemplate);
      mockCreateFromTemplate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_HIGH_RISK',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(mockDpiaCreate).toHaveBeenCalled();
      expect(body.dpiaId).toBe(TEST_DPIA_ID);
      expect(body.warnings).toContainEqual(expect.stringContaining('DPIA'));
    });

    it('should emit audit event for auto-created DPIA', async () => {
      mockFindByCode.mockResolvedValue(mockHighRiskTemplate);
      mockCreateFromTemplate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_HIGH_RISK',
      });
      await AdoptTemplate(req);

      // Should emit both purpose.template.adopted and dpia.auto_created events
      expect(mockAuditWrite).toHaveBeenCalledTimes(2);
      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'dpia.auto_created',
          tenantId: TEST_TENANT_ID,
        })
      );
    });

    it('should NOT create DPIA for LOW/MEDIUM risk templates', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(mockDpiaCreate).not.toHaveBeenCalled();
      expect(body.dpiaId).toBeNull();
      expect(body.warnings).toHaveLength(0);
    });

    it('should not fail purpose creation if DPIA creation fails', async () => {
      mockFindByCode.mockResolvedValue(mockHighRiskTemplate);
      mockCreateFromTemplate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockRejectedValue(new Error('DPIA creation failed'));

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_HIGH_RISK',
      });
      const res = await AdoptTemplate(req);

      // Purpose should still be created
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.purpose.id).toBeDefined();
      expect(body.dpiaId).toBeNull();
    });
  });

  // ===========================================================================
  // Audit Trail (RGPD)
  // ===========================================================================

  describe('Audit Trail (RGPD)', () => {
    it('should emit purpose.template.adopted audit event', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      await AdoptTemplate(req);

      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'purpose.template.adopted',
          actorScope: ACTOR_SCOPE.TENANT,
          actorId: 'tenant-admin-001',
          targetId: TEST_PURPOSE_ID,
          tenantId: TEST_TENANT_ID,
          metadata: expect.objectContaining({
            templateCode: 'TPL_AI_ANALYTICS',
            templateId: TEST_TEMPLATE_ID,
          }),
        })
      );
    });

    it('should NOT include PII in audit event metadata', async () => {
      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
        label: 'Custom Label',
      });
      await AdoptTemplate(req);

      const auditCall = mockAuditWrite.mock.calls[0][0];
      expect(auditCall.metadata).not.toHaveProperty('email');
      expect(auditCall.metadata).not.toHaveProperty('password');
      // Boolean flags OK, not actual label text
      expect(auditCall.metadata.customLabel).toBe(true);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return 409 for duplicate label', async () => {
      mockCreateFromTemplate.mockRejectedValue(new Error('unique constraint violation'));

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(409);
    });

    it('should return 500 for RGPD violations', async () => {
      mockCreateFromTemplate.mockRejectedValue(new Error('RGPD VIOLATION: tenantId required'));

      const req = createTenantAdminRequest('/api/purposes/adopt', TEST_TENANT_ID, {
        templateCode: 'TPL_AI_ANALYTICS',
      });
      const res = await AdoptTemplate(req);

      expect(res.status).toBe(500);
    });
  });
});
