/**
 * Purposes Custom API Tests - LOT 12.2
 *
 * Tests for POST /api/purposes/custom
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Explicit lawful basis required (Art. 6)
 * - DPIA acknowledgment required for HIGH/CRITICAL risk
 * - Audit events emitted
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { LAWFUL_BASIS, PURPOSE_CATEGORY, RISK_LEVEL, DATA_CLASS } from '@/app/ports/PurposeTemplateRepo';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindByLabel = jest.fn();
const mockCreate = jest.fn();
const mockDpiaCreate = jest.fn();
const mockAuditWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgPurposeRepo', () => ({
  PgPurposeRepo: jest.fn().mockImplementation(() => ({
    findByLabel: mockFindByLabel,
    create: mockCreate,
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

// Import route handler AFTER mocking
import { POST as CreateCustomPurpose } from '@app/api/purposes/custom/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
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

// Valid custom purpose body
const validCustomPurposeBody = {
  label: 'Custom Analytics Purpose',
  description: 'A custom purpose for analytics with sufficient description length',
  lawfulBasis: LAWFUL_BASIS.CONSENT,
  category: PURPOSE_CATEGORY.ANALYTICS,
  riskLevel: RISK_LEVEL.MEDIUM,
  maxDataClass: DATA_CLASS.P1,
  isRequired: false,
};

const highRiskCustomPurposeBody = {
  ...validCustomPurposeBody,
  label: 'High Risk Custom Purpose',
  riskLevel: RISK_LEVEL.HIGH,
  acknowledgeDpiaWarning: true,
};

const mockPurpose = {
  id: TEST_PURPOSE_ID,
  tenantId: TEST_TENANT_ID,
  templateId: null,
  label: 'Custom Analytics Purpose',
  description: 'A custom purpose for analytics with sufficient description length',
  lawfulBasis: LAWFUL_BASIS.CONSENT,
  category: PURPOSE_CATEGORY.ANALYTICS,
  riskLevel: RISK_LEVEL.MEDIUM,
  maxDataClass: DATA_CLASS.P1,
  requiresDpia: false,
  isRequired: false,
  isActive: true,
  isFromTemplate: false,
  isSystem: false,
  validationStatus: 'VALIDATED',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockHighRiskPurpose = {
  ...mockPurpose,
  id: 'purpose-high-risk',
  label: 'High Risk Custom Purpose',
  riskLevel: RISK_LEVEL.HIGH,
  requiresDpia: true,
};

const mockDpia = {
  id: TEST_DPIA_ID,
  tenantId: TEST_TENANT_ID,
  purposeId: 'purpose-high-risk',
  title: 'DPIA: High Risk Custom Purpose',
  status: 'PENDING',
};

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/purposes/custom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock responses
    mockFindByLabel.mockResolvedValue(null); // No duplicate
    mockCreate.mockResolvedValue(mockPurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Authentication & Authorization
  // ===========================================================================

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const req = createUnauthenticatedRequest('/api/purposes/custom');
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(401);
    });

    it('should return 403 for member (non-admin) requests', async () => {
      const req = createMemberRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(403);
    });

    it('should allow tenant admin to create custom purpose', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
    });
  });

  // ===========================================================================
  // Tenant Isolation (RGPD CRITICAL)
  // ===========================================================================

  describe('Tenant Isolation (RGPD)', () => {
    it('should create purpose with correct tenantId', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      expect(mockCreate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          label: validCustomPurposeBody.label,
        })
      );
    });

    it('should check duplicate label for correct tenant', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      expect(mockFindByLabel).toHaveBeenCalledWith(TEST_TENANT_ID, validCustomPurposeBody.label);
    });

    it('should include tenantId in audit event', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'purpose.custom.created',
          tenantId: TEST_TENANT_ID,
        })
      );
    });
  });

  // ===========================================================================
  // Validation - Lawful Basis (RGPD Art. 6)
  // ===========================================================================

  describe('Validation - Lawful Basis (RGPD Art. 6)', () => {
    it('should return 400 if lawfulBasis is missing', async () => {
      const { lawfulBasis: _, ...bodyWithoutLawfulBasis } = validCustomPurposeBody;
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, bodyWithoutLawfulBasis);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid lawfulBasis', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        lawfulBasis: 'INVALID_BASIS',
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should accept all valid lawful bases', async () => {
      const validBases = [
        LAWFUL_BASIS.CONSENT,
        LAWFUL_BASIS.CONTRACT,
        LAWFUL_BASIS.LEGAL_OBLIGATION,
        LAWFUL_BASIS.VITAL_INTEREST,
        LAWFUL_BASIS.PUBLIC_INTEREST,
        LAWFUL_BASIS.LEGITIMATE_INTEREST,
      ];

      for (const basis of validBases) {
        jest.clearAllMocks();
        mockFindByLabel.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ ...mockPurpose, lawfulBasis: basis });

        const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
          ...validCustomPurposeBody,
          label: `Purpose with ${basis}`,
          lawfulBasis: basis,
        });
        const res = await CreateCustomPurpose(req);

        expect(res.status).toBe(201);
      }
    });
  });

  // ===========================================================================
  // Validation - General
  // ===========================================================================

  describe('Validation - General', () => {
    it('should return 400 if label is too short', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        label: 'A', // Min 2 chars
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 if description is too short', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        description: 'Too short', // Min 10 chars
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 409 if label already exists', async () => {
      mockFindByLabel.mockResolvedValue(mockPurpose); // Existing purpose

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid category', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        category: 'INVALID_CATEGORY',
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid riskLevel', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        riskLevel: 'INVALID_RISK',
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid maxDataClass', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        maxDataClass: 'P99',
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // DPIA Acknowledgment (RGPD Art. 35)
  // ===========================================================================

  describe('DPIA Acknowledgment (RGPD Art. 35)', () => {
    it('should return 400 if HIGH risk and acknowledgeDpiaWarning is false', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        riskLevel: RISK_LEVEL.HIGH,
        acknowledgeDpiaWarning: false,
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details[0].path).toContain('acknowledgeDpiaWarning');
    });

    it('should return 400 if HIGH risk and acknowledgeDpiaWarning is missing', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        riskLevel: RISK_LEVEL.HIGH,
        // No acknowledgeDpiaWarning
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 if CRITICAL risk and acknowledgeDpiaWarning is false', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        riskLevel: RISK_LEVEL.CRITICAL,
        acknowledgeDpiaWarning: false,
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(400);
    });

    it('should allow HIGH risk with acknowledgeDpiaWarning true', async () => {
      mockCreate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, highRiskCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
    });

    it('should NOT require acknowledgment for LOW/MEDIUM risk', async () => {
      const lowRiskBody = {
        ...validCustomPurposeBody,
        riskLevel: RISK_LEVEL.LOW,
        // No acknowledgeDpiaWarning needed
      };
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, lowRiskBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
    });
  });

  // ===========================================================================
  // DPIA Auto-Creation (RGPD Art. 35)
  // ===========================================================================

  describe('DPIA Auto-Creation (RGPD Art. 35)', () => {
    it('should auto-create DPIA for HIGH risk purpose', async () => {
      mockCreate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, highRiskCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(mockDpiaCreate).toHaveBeenCalled();
      expect(body.dpiaId).toBe(TEST_DPIA_ID);
      expect(body.warnings).toContainEqual(expect.stringContaining('DPIA'));
    });

    it('should auto-create DPIA for P3 data class (regardless of risk level)', async () => {
      const p3Purpose = {
        ...mockPurpose,
        maxDataClass: DATA_CLASS.P3,
        requiresDpia: true,
      };
      mockCreate.mockResolvedValue(p3Purpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, {
        ...validCustomPurposeBody,
        maxDataClass: DATA_CLASS.P3,
        riskLevel: RISK_LEVEL.LOW,
      });
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
      expect(mockDpiaCreate).toHaveBeenCalled();
    });

    it('should emit audit event for auto-created DPIA', async () => {
      mockCreate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockResolvedValue(mockDpia);

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, highRiskCustomPurposeBody);
      await CreateCustomPurpose(req);

      // Should emit both purpose.custom.created and dpia.auto_created events
      expect(mockAuditWrite).toHaveBeenCalledTimes(2);
      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'dpia.auto_created',
          tenantId: TEST_TENANT_ID,
        })
      );
    });

    it('should NOT create DPIA for LOW/MEDIUM risk with P0/P1 data', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(mockDpiaCreate).not.toHaveBeenCalled();
      expect(body.dpiaId).toBeNull();
      expect(body.warnings).toHaveLength(0);
    });

    it('should not fail purpose creation if DPIA creation fails', async () => {
      mockCreate.mockResolvedValue(mockHighRiskPurpose);
      mockDpiaCreate.mockRejectedValue(new Error('DPIA creation failed'));

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, highRiskCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      // Purpose should still be created
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.purpose.id).toBeDefined();
      expect(body.dpiaId).toBeNull();
    });
  });

  // ===========================================================================
  // Custom Purpose Creation
  // ===========================================================================

  describe('Custom Purpose Creation', () => {
    it('should create purpose with all provided fields', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      expect(mockCreate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          label: validCustomPurposeBody.label,
          description: validCustomPurposeBody.description,
          lawfulBasis: validCustomPurposeBody.lawfulBasis,
          category: validCustomPurposeBody.category,
          riskLevel: validCustomPurposeBody.riskLevel,
          maxDataClass: validCustomPurposeBody.maxDataClass,
          isRequired: validCustomPurposeBody.isRequired,
          isActive: true,
        })
      );
    });

    it('should set isFromTemplate to false', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.purpose.isFromTemplate).toBe(false);
    });

    it('should use default values for optional fields', async () => {
      const minimalBody = {
        label: 'Minimal Purpose',
        description: 'A minimal purpose with just required fields',
        lawfulBasis: LAWFUL_BASIS.CONSENT,
      };

      mockCreate.mockResolvedValue({
        ...mockPurpose,
        label: 'Minimal Purpose',
      });

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, minimalBody);
      await CreateCustomPurpose(req);

      expect(mockCreate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          category: PURPOSE_CATEGORY.AI_PROCESSING, // default
          riskLevel: RISK_LEVEL.MEDIUM, // default
          maxDataClass: DATA_CLASS.P1, // default
          isRequired: false, // default
        })
      );
    });
  });

  // ===========================================================================
  // Audit Trail (RGPD)
  // ===========================================================================

  describe('Audit Trail (RGPD)', () => {
    it('should emit purpose.custom.created audit event', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      expect(mockAuditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'purpose.custom.created',
          actorScope: ACTOR_SCOPE.TENANT,
          actorId: 'tenant-admin-001',
          targetId: TEST_PURPOSE_ID,
          tenantId: TEST_TENANT_ID,
          metadata: expect.objectContaining({
            lawfulBasis: validCustomPurposeBody.lawfulBasis,
            riskLevel: validCustomPurposeBody.riskLevel,
            maxDataClass: validCustomPurposeBody.maxDataClass,
          }),
        })
      );
    });

    it('should NOT include PII in audit event metadata', async () => {
      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      await CreateCustomPurpose(req);

      const auditCall = mockAuditWrite.mock.calls[0][0];
      expect(auditCall.metadata).not.toHaveProperty('email');
      expect(auditCall.metadata).not.toHaveProperty('password');
      expect(auditCall.metadata).not.toHaveProperty('label'); // Don't log label, it could contain PII
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return 409 for duplicate label (DB constraint)', async () => {
      mockCreate.mockRejectedValue(new Error('unique constraint violation'));

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(409);
    });

    it('should return 500 for RGPD violations', async () => {
      mockCreate.mockRejectedValue(new Error('RGPD VIOLATION: tenantId required'));

      const req = createTenantAdminRequest('/api/purposes/custom', TEST_TENANT_ID, validCustomPurposeBody);
      const res = await CreateCustomPurpose(req);

      expect(res.status).toBe(500);
    });

    it('should return 400 for invalid JSON body', async () => {
      const token = signJwt({
        userId: 'tenant-admin-001',
        tenantId: TEST_TENANT_ID,
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.TENANT_ADMIN,
      });

      const req = new NextRequest('http://localhost/api/purposes/custom', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await CreateCustomPurpose(req);
      expect(res.status).toBe(400);
    });
  });
});
