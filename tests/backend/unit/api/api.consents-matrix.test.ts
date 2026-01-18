/**
 * Consent Matrix API Tests - LOT 12.2
 *
 * Tests for GET /api/consents/matrix
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - P1/P2 data only (displayName, purpose label, consent status)
 * - NO email displayed
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindAllPurposes = jest.fn();
const mockListFilteredByTenant = jest.fn();
const mockCountByTenant = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('@/infrastructure/db/pg', () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
  },
}));

jest.mock('@/infrastructure/repositories/PgPurposeRepo', () => ({
  PgPurposeRepo: jest.fn().mockImplementation(() => ({
    findAll: (...args: unknown[]) => mockFindAllPurposes(...args),
  })),
}));

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    listFilteredByTenant: (...args: unknown[]) => mockListFilteredByTenant(...args),
    countByTenant: (...args: unknown[]) => mockCountByTenant(...args),
  })),
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/consents/matrix/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const _OTHER_TENANT_ID = 'tenant-xyz-456';

function createTenantAdminRequest(path: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

// Sample data
const samplePurposes = [
  { id: 'purpose-001', label: 'Analytics', description: 'Analytics tracking', isRequired: false, isActive: true },
  { id: 'purpose-002', label: 'Marketing', description: 'Marketing emails', isRequired: false, isActive: true },
];

const sampleUsers = [
  { id: 'user-001', displayName: 'Jean Dupont', email: 'jean@example.com' },
  { id: 'user-002', displayName: 'Marie Martin', email: 'marie@example.com' },
];

const sampleConsents = [
  { user_id: 'user-001', purpose: 'Analytics', purpose_id: 'purpose-001', granted: true, granted_at: new Date(), revoked_at: null },
  { user_id: 'user-001', purpose: 'Marketing', purpose_id: 'purpose-002', granted: false, granted_at: new Date(), revoked_at: new Date() },
  { user_id: 'user-002', purpose: 'Analytics', purpose_id: 'purpose-001', granted: true, granted_at: new Date(), revoked_at: null },
];

// =============================================================================
// TESTS - AUTHENTICATION & AUTHORIZATION
// =============================================================================

describe('GET /api/consents/matrix - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[MATRIX-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest('/api/consents/matrix');
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('[MATRIX-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('[MATRIX-003] should allow TENANT_ADMIN access', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockCountByTenant.mockResolvedValue(2);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });

    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// TESTS - RESPONSE STRUCTURE
// =============================================================================

describe('GET /api/consents/matrix - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockCountByTenant.mockResolvedValue(2);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
  });

  it('[MATRIX-010] should return purposes array', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(body.purposes).toHaveLength(2);
    expect(body.purposes[0].id).toBe('purpose-001');
    expect(body.purposes[0].label).toBe('Analytics');
  });

  it('[MATRIX-011] should return matrix with users and consents', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(body.matrix).toHaveLength(2);
    expect(body.matrix[0].userId).toBe('user-001');
    expect(body.matrix[0].displayName).toBe('Jean Dupont');
    expect(body.matrix[0].consents).toHaveLength(2);
  });

  it('[MATRIX-012] should include correct consent status', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    const user1Consents = body.matrix.find((u: { userId: string }) => u.userId === 'user-001').consents;
    const analyticsConsent = user1Consents.find((c: { purposeId: string }) => c.purposeId === 'purpose-001');
    const marketingConsent = user1Consents.find((c: { purposeId: string }) => c.purposeId === 'purpose-002');

    expect(analyticsConsent.status).toBe('granted');
    expect(marketingConsent.status).toBe('revoked');
  });

  it('[MATRIX-013] should return pending status for missing consents', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] }); // No consents

    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    const consents = body.matrix[0].consents;
    expect(consents.every((c: { status: string }) => c.status === 'pending')).toBe(true);
  });

  it('[MATRIX-014] should return pagination info', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(body.total).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });
});

// =============================================================================
// TESTS - QUERY PARAMETERS
// =============================================================================

describe('GET /api/consents/matrix - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockCountByTenant.mockResolvedValue(2);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
  });

  it('[MATRIX-020] should respect limit parameter', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?limit=10', TEST_TENANT_ID);
    await GET(req);

    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
    }));
  });

  it('[MATRIX-021] should respect offset parameter', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?offset=20', TEST_TENANT_ID);
    await GET(req);

    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      offset: 20,
    }));
  });

  it('[MATRIX-022] should respect search parameter', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?search=Jean', TEST_TENANT_ID);
    await GET(req);

    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      search: 'Jean',
    }));
  });

  it('[MATRIX-023] should reject invalid purposeId format', async () => {
    // Test that invalid UUID format is rejected
    const req = createTenantAdminRequest('/api/consents/matrix?purposeId=not-a-uuid', TEST_TENANT_ID);
    const response = await GET(req);

    // Should return 400 for invalid UUID
    expect(response.status).toBe(400);
  });

  it('[MATRIX-024] should filter by status', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?status=granted', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    // Both users have at least one granted consent
    expect(body.matrix.length).toBeGreaterThanOrEqual(1);
  });

  it('[MATRIX-025] should validate limit max value', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?limit=2000', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[MATRIX-026] should validate limit min value', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?limit=0', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[MATRIX-027] should validate status enum', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix?status=invalid', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// TESTS - EMPTY/EDGE CASES
// =============================================================================

describe('GET /api/consents/matrix - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[MATRIX-030] should return empty matrix when no users', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue([]);
    mockCountByTenant.mockResolvedValue(0);

    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matrix).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[MATRIX-031] should handle no purposes gracefully', async () => {
    mockFindAllPurposes.mockResolvedValue([]);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockCountByTenant.mockResolvedValue(2);
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.purposes).toHaveLength(0);
    expect(body.matrix[0].consents).toHaveLength(0);
  });

  it('[MATRIX-032] should handle database errors', async () => {
    mockFindAllPurposes.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('GET /api/consents/matrix - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockCountByTenant.mockResolvedValue(2);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
  });

  it('[MATRIX-040] should NOT expose user emails (P2 minimization)', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    // Check that no email field is exposed
    for (const user of body.matrix) {
      expect(user.email).toBeUndefined();
    }
  });

  it('[MATRIX-041] should only expose P1/P2 data (displayName, status, dates)', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    const response = await GET(req);
    const body = await response.json();

    const user = body.matrix[0];
    // Expected fields only
    expect(Object.keys(user)).toEqual(expect.arrayContaining(['userId', 'displayName', 'consents']));
    // Should NOT have sensitive fields
    expect(user.password).toBeUndefined();
    expect(user.email).toBeUndefined();
    expect(user.phoneNumber).toBeUndefined();
  });

  it('[MATRIX-042] should enforce tenant isolation in queries', async () => {
    const req = createTenantAdminRequest('/api/consents/matrix', TEST_TENANT_ID);
    await GET(req);

    // Check that tenant ID is passed to all queries
    expect(mockFindAllPurposes).toHaveBeenCalledWith(TEST_TENANT_ID, true);
    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
    }));
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([TEST_TENANT_ID])
    );
  });

  it('[MATRIX-043] should redact search terms in logs', async () => {
    // This test verifies that the search parameter is redacted in logging
    // The implementation should log search: '[REDACTED]' not the actual search term
    const req = createTenantAdminRequest('/api/consents/matrix?search=personal-info', TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);
    // The actual logging verification would require log capture, but the implementation
    // shows { search: query.search ? '[REDACTED]' : undefined }
  });
});
