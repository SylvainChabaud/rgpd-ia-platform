/**
 * Purposes API Tests - LOT 12.2
 *
 * Tests for GET/POST /api/purposes and GET/PATCH/DELETE /api/purposes/:id
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - P1 data only (labels, descriptions)
 * - Audit events emitted
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindByLabel = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSoftDelete = jest.fn();
const mockCountConsents = jest.fn();
const mockAuditWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgPurposeRepo', () => ({
  PgPurposeRepo: jest.fn().mockImplementation(() => ({
    findAll: mockFindAll,
    findById: mockFindById,
    findByLabel: mockFindByLabel,
    create: mockCreate,
    update: mockUpdate,
    softDelete: mockSoftDelete,
    countConsents: mockCountConsents,
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: mockAuditWrite,
  })),
}));

// Import route handlers AFTER mocking
import { GET as ListPurposes, POST as CreatePurpose } from '@app/api/purposes/route';
import { GET as GetPurpose, PATCH as UpdatePurpose, DELETE as DeletePurpose } from '@app/api/purposes/[id]/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
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

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// Sample purpose data
const samplePurpose = {
  id: TEST_PURPOSE_ID,
  label: 'Analytics',
  description: 'Collection of analytics data for improving user experience',
  isRequired: false,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// =============================================================================
// TESTS - LIST PURPOSES (GET /api/purposes)
// =============================================================================

describe('GET /api/purposes - List Purposes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PURPOSES-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest('/api/purposes');
    const response = await ListPurposes(req);
    expect(response.status).toBe(401);
  });

  it('[PURPOSES-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('/api/purposes', TEST_TENANT_ID);
    const response = await ListPurposes(req);
    expect(response.status).toBe(403);
  });

  it('[PURPOSES-003] should return purposes list for TENANT_ADMIN', async () => {
    mockFindAll.mockResolvedValue([samplePurpose]);

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID);
    const response = await ListPurposes(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purposes).toHaveLength(1);
    expect(body.purposes[0].id).toBe(TEST_PURPOSE_ID);
    expect(body.purposes[0].label).toBe('Analytics');
    expect(body.total).toBe(1);
  });

  it('[PURPOSES-004] should filter by includeInactive param', async () => {
    mockFindAll.mockResolvedValue([]);

    const req = createTenantAdminRequest('/api/purposes?includeInactive=true', TEST_TENANT_ID);
    await ListPurposes(req);

    expect(mockFindAll).toHaveBeenCalledWith(TEST_TENANT_ID, true);
  });

  it('[PURPOSES-005] should return empty list when no purposes exist', async () => {
    mockFindAll.mockResolvedValue([]);

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID);
    const response = await ListPurposes(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purposes).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[PURPOSES-006] should handle database errors gracefully', async () => {
    mockFindAll.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID);
    const response = await ListPurposes(req);

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - CREATE PURPOSE (POST /api/purposes)
// =============================================================================

describe('POST /api/purposes - Create Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByLabel.mockResolvedValue(null);
    mockCreate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[PURPOSES-010] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/purposes', {
      method: 'POST',
      body: JSON.stringify({ label: 'Test', description: 'Test description here' }),
    });
    const response = await CreatePurpose(req);
    expect(response.status).toBe(401);
  });

  it('[PURPOSES-011] should return 403 for MEMBER role', async () => {
    const token = signJwt({
      userId: 'member-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.MEMBER,
    });
    const req = new NextRequest('http://localhost/api/purposes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label: 'Test', description: 'Test description here' }),
    });
    const response = await CreatePurpose(req);
    expect(response.status).toBe(403);
  });

  it('[PURPOSES-012] should create purpose successfully', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Analytics',
      description: 'Collection of analytics data for improving user experience',
    });
    const response = await CreatePurpose(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.purpose.id).toBe(TEST_PURPOSE_ID);
    expect(body.purpose.label).toBe('Analytics');
    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.created',
      targetId: TEST_PURPOSE_ID,
    }));
  });

  it('[PURPOSES-013] should return 400 for invalid label (too short)', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'A',
      description: 'Valid description here for the purpose',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(400);
  });

  it('[PURPOSES-014] should return 400 for invalid description (too short)', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Valid Label',
      description: 'Short',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(400);
  });

  it('[PURPOSES-015] should return 409 for duplicate label', async () => {
    mockFindByLabel.mockResolvedValue(samplePurpose);

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Analytics',
      description: 'Duplicate purpose description here',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(409);
  });

  it('[PURPOSES-016] should return 400 for missing required fields', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Valid Label',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(400);
  });

  it('[PURPOSES-017] should handle optional isRequired and isActive fields', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Required Purpose',
      description: 'This is a required purpose for the tenant',
      isRequired: true,
      isActive: false,
    });
    await CreatePurpose(req);

    expect(mockCreate).toHaveBeenCalledWith(TEST_TENANT_ID, expect.objectContaining({
      isRequired: true,
      isActive: false,
    }));
  });

  it('[PURPOSES-018] should return 400 for invalid JSON body', async () => {
    const token = signJwt({
      userId: 'tenant-admin-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const req = new NextRequest('http://localhost/api/purposes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: 'invalid-json{',
    });
    const response = await CreatePurpose(req);
    expect(response.status).toBe(400);
  });

  it('[PURPOSES-019] should return 409 for unique constraint violation in database', async () => {
    mockFindByLabel.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error('unique constraint violation'));

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Analytics',
      description: 'Collection of analytics data for improving user experience',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(409);
  });

  it('[PURPOSES-018b] should return 500 for generic database errors', async () => {
    mockFindByLabel.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error('Connection timeout'));

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'Analytics',
      description: 'Collection of analytics data for improving user experience',
    });
    const response = await CreatePurpose(req);

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - GET PURPOSE BY ID (GET /api/purposes/:id)
// =============================================================================

describe('GET /api/purposes/:id - Get Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(samplePurpose);
    mockCountConsents.mockResolvedValue(10);
  });

  it('[PURPOSES-020] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/purposes/${TEST_PURPOSE_ID}`);
    const response = await GetPurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(401);
  });

  it('[PURPOSES-021] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID);
    const response = await GetPurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(403);
  });

  it('[PURPOSES-022] should return purpose with consent count', async () => {
    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID);
    const response = await GetPurpose(req, createParams(TEST_PURPOSE_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purpose.id).toBe(TEST_PURPOSE_ID);
    expect(body.purpose.consentCount).toBe(10);
  });

  it('[PURPOSES-023] should return 404 for non-existent purpose', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/purposes/non-existent`, TEST_TENANT_ID);
    const response = await GetPurpose(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[PURPOSES-024] should return 500 on database error during GET', async () => {
    mockFindById.mockRejectedValue(new Error('Database connection lost'));

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID);
    const response = await GetPurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - UPDATE PURPOSE (PATCH /api/purposes/:id)
// =============================================================================

describe('PATCH /api/purposes/:id - Update Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(samplePurpose);
    mockFindByLabel.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ ...samplePurpose, label: 'Updated Analytics' });
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[PURPOSES-030] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/purposes/${TEST_PURPOSE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ label: 'Updated' }),
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(401);
  });

  it('[PURPOSES-031] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID);
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(403);
  });

  it('[PURPOSES-032] should update purpose successfully', async () => {
    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'Updated Analytics',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purpose.label).toBe('Updated Analytics');
    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.updated',
    }));
  });

  it('[PURPOSES-033] should return 404 for non-existent purpose', async () => {
    mockUpdate.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'Updated',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(404);
  });

  it('[PURPOSES-034] should return 409 when updating to existing label', async () => {
    mockFindByLabel.mockResolvedValue({ ...samplePurpose, id: 'other-purpose' });

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'Existing Label',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(409);
  });

  it('[PURPOSES-035] should allow updating to same label (no conflict)', async () => {
    mockFindByLabel.mockResolvedValue(samplePurpose); // Same purpose

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'Analytics',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(200);
  });

  it('[PURPOSES-036] should validate label length on update', async () => {
    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'A',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(400);
  });

  it('[PURPOSES-037] should allow partial updates', async () => {
    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      isActive: false,
    });
    await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(mockUpdate).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_PURPOSE_ID, expect.objectContaining({
      isActive: false,
    }));
  });

  it('[PURPOSES-038] should return 400 for invalid JSON body on PATCH', async () => {
    const token = signJwt({
      userId: 'tenant-admin-001',
      tenantId: TEST_TENANT_ID,
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const req = new NextRequest(`http://localhost/api/purposes/${TEST_PURPOSE_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: 'invalid-json{',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(400);
  });

  it('[PURPOSES-039] should return 409 for duplicate constraint violation on update', async () => {
    mockFindByLabel.mockResolvedValue(null);
    mockUpdate.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'Duplicate Label',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(409);
  });

  it('[PURPOSES-039b] should return 500 for generic database errors on update', async () => {
    mockFindByLabel.mockResolvedValue(null);
    mockUpdate.mockRejectedValue(new Error('Connection refused'));

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'PATCH', {
      label: 'New Label',
    });
    const response = await UpdatePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - DELETE PURPOSE (DELETE /api/purposes/:id)
// =============================================================================

describe('DELETE /api/purposes/:id - Delete Purpose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(samplePurpose);
    mockCountConsents.mockResolvedValue(5);
    mockSoftDelete.mockResolvedValue(true);
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[PURPOSES-040] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/purposes/${TEST_PURPOSE_ID}`, {
      method: 'DELETE',
    });
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(401);
  });

  it('[PURPOSES-041] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID);
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));
    expect(response.status).toBe(403);
  });

  it('[PURPOSES-042] should soft delete purpose successfully', async () => {
    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'DELETE');
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purposeId).toBe(TEST_PURPOSE_ID);
    expect(body.consentCount).toBe(5);
    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.deleted',
    }));
  });

  it('[PURPOSES-043] should return 404 for non-existent purpose', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'DELETE');
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(404);
  });

  it('[PURPOSES-044] should return 404 when soft delete fails', async () => {
    mockSoftDelete.mockResolvedValue(false);

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'DELETE');
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(404);
  });

  it('[PURPOSES-045] should return 500 on database error during DELETE', async () => {
    mockFindById.mockResolvedValue(samplePurpose);
    mockCountConsents.mockResolvedValue(5);
    mockSoftDelete.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/purposes/${TEST_PURPOSE_ID}`, TEST_TENANT_ID, 'DELETE');
    const response = await DeletePurpose(req, createParams(TEST_PURPOSE_ID));

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('Purposes API - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([samplePurpose]);
    mockFindById.mockResolvedValue(samplePurpose);
    mockCountConsents.mockResolvedValue(10);
  });

  it('[PURPOSES-050] should return only P1 data (no user-specific info)', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID);
    const response = await ListPurposes(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    // Should contain only metadata
    expect(body.purposes[0].id).toBeDefined();
    expect(body.purposes[0].label).toBeDefined();
    expect(body.purposes[0].description).toBeDefined();
    // Should NOT contain user data
    expect(body.purposes[0].users).toBeUndefined();
    expect(body.purposes[0].emails).toBeUndefined();
  });

  it('[PURPOSES-051] should enforce tenant isolation via repository calls', async () => {
    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID);
    await ListPurposes(req);

    expect(mockFindAll).toHaveBeenCalledWith(TEST_TENANT_ID, expect.any(Boolean));
  });

  it('[PURPOSES-052] should emit audit events for mutations', async () => {
    mockFindByLabel.mockResolvedValue(null);
    mockCreate.mockResolvedValue(samplePurpose);
    mockAuditWrite.mockResolvedValue(undefined);

    const req = createTenantAdminRequest('/api/purposes', TEST_TENANT_ID, 'POST', {
      label: 'New Purpose',
      description: 'Description for new purpose here',
    });
    await CreatePurpose(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'purpose.created',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TEST_TENANT_ID,
    }));
  });
});
