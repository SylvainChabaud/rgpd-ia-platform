/**
 * User Jobs & Consents API Tests - LOT 12.1
 *
 * Tests for GET /api/users/:id/jobs and GET /api/users/:id/consents
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 metadata (no prompt/output content)
 * - No P3 data exposed
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('@/infrastructure/db/pg', () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
  },
}));

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockFindById(...args),
  })),
}));

// Import route handlers AFTER mocking
import { GET as GetUserJobs } from '@app/api/users/[id]/jobs/route';
import { GET as GetUserConsents } from '@app/api/users/[id]/consents/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';
const OTHER_TENANT_ID = 'tenant-xyz-456';
const TEST_USER_ID = 'user-001';

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

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const sampleUser = {
  id: TEST_USER_ID,
  displayName: 'Jean Dupont',
  tenantId: TEST_TENANT_ID,
};

// =============================================================================
// TESTS - USER JOBS (GET /api/users/:id/jobs)
// =============================================================================

describe('GET /api/users/:id/jobs - User AI Jobs', () => {
  const sampleJobs = [
    {
      id: 'job-001',
      purpose: 'summarization',
      model_ref: 'llama-3',
      status: 'COMPLETED',
      created_at: new Date('2024-01-15T10:00:00Z'),
      started_at: new Date('2024-01-15T10:00:01Z'),
      completed_at: new Date('2024-01-15T10:00:05Z'),
      latency_ms: 4000,
    },
    {
      id: 'job-002',
      purpose: 'classification',
      model_ref: 'mistral-7b',
      status: 'FAILED',
      created_at: new Date('2024-01-16T11:00:00Z'),
      started_at: new Date('2024-01-16T11:00:01Z'),
      completed_at: null,
      latency_ms: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: sampleJobs })
      .mockResolvedValueOnce({ rows: [{ total: '2' }] });
  });

  it('[JOBS-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/users/${TEST_USER_ID}/jobs`);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(401);
  });

  it('[JOBS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(403);
  });

  it('[JOBS-003] should return jobs for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('[JOBS-004] should return correct job structure', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const job = body.jobs[0];
    expect(job.id).toBeDefined();
    expect(job.purpose).toBeDefined();
    expect(job.model).toBeDefined();
    expect(job.status).toBeDefined();
    expect(job.createdAt).toBeDefined();
  });

  it('[JOBS-005] should NOT expose prompt/output content (P3 data)', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    for (const job of body.jobs) {
      expect(job.prompt).toBeUndefined();
      expect(job.output).toBeUndefined();
      expect(job.input).toBeUndefined();
      expect(job.content).toBeUndefined();
    }
  });

  it('[JOBS-006] should respect limit parameter', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs?limit=10`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.limit).toBe(10);
  });

  it('[JOBS-007] should cap limit at 100', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs?limit=200`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.limit).toBe(100);
  });

  it('[JOBS-008] should return 404 for non-existent user', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/users/non-existent/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[JOBS-009] should return 403 for cross-tenant access', async () => {
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(403);
  });

  it('[JOBS-010] should handle empty jobs list', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[JOBS-011] should handle database errors', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    const response = await GetUserJobs(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(500);
  });
});

// =============================================================================
// TESTS - USER CONSENTS (GET /api/users/:id/consents)
// =============================================================================

describe('GET /api/users/:id/consents - User Consents', () => {
  const sampleConsents = [
    {
      id: 'consent-001',
      purpose: 'analytics',
      granted: true,
      granted_at: new Date('2024-01-10T09:00:00Z'),
      revoked_at: null,
      created_at: new Date('2024-01-10T09:00:00Z'),
    },
    {
      id: 'consent-002',
      purpose: 'marketing',
      granted: false,
      granted_at: new Date('2024-01-11T10:00:00Z'),
      revoked_at: new Date('2024-02-15T12:00:00Z'),
      created_at: new Date('2024-01-11T10:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
  });

  it('[CONSENTS-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest(`/api/users/${TEST_USER_ID}/consents`);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(401);
  });

  it('[CONSENTS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    expect(response.status).toBe(403);
  });

  it('[CONSENTS-003] should return consents for TENANT_ADMIN', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.consents).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('[CONSENTS-004] should return correct consent structure', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const consent = body.consents[0];
    expect(consent.id).toBeDefined();
    expect(consent.purposeId).toBeDefined();
    expect(consent.purposeLabel).toBeDefined();
    expect(consent.granted).toBeDefined();
    expect(consent.status).toBeDefined();
  });

  it('[CONSENTS-005] should map purpose labels correctly', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const analyticsConsent = body.consents.find((c: { purposeId: string }) => c.purposeId === 'analytics');
    expect(analyticsConsent.purposeLabel).toBe('Analytiques');
  });

  it('[CONSENTS-006] should include correct status', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    const grantedConsent = body.consents.find((c: { purposeId: string }) => c.purposeId === 'analytics');
    const revokedConsent = body.consents.find((c: { purposeId: string }) => c.purposeId === 'marketing');

    expect(grantedConsent.status).toBe('granted');
    expect(revokedConsent.status).toBe('revoked');
  });

  it('[CONSENTS-007] should return 404 for non-existent user', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createTenantAdminRequest(`/api/users/non-existent/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams('non-existent'));

    expect(response.status).toBe(404);
  });

  it('[CONSENTS-008] should return 403 for cross-tenant access', async () => {
    mockFindById.mockResolvedValue({
      ...sampleUser,
      tenantId: OTHER_TENANT_ID,
    });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(403);
  });

  it('[CONSENTS-009] should handle empty consents list', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.consents).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('[CONSENTS-010] should handle database errors', async () => {
    mockPoolQuery.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));

    expect(response.status).toBe(500);
  });

  it('[CONSENTS-011] should handle unknown purpose with fallback label', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [{
        id: 'consent-003',
        purpose: 'custom_purpose',
        granted: true,
        granted_at: new Date(),
        revoked_at: null,
        created_at: new Date(),
      }],
    });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    const response = await GetUserConsents(req, createParams(TEST_USER_ID));
    const body = await response.json();

    expect(body.consents[0].purposeLabel).toBe('custom_purpose');
    expect(body.consents[0].purposeDescription).toContain('custom_purpose');
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE
// =============================================================================

describe('User Jobs & Consents - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleUser);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });
  });

  it('[RGPD-JOBS-001] should enforce tenant isolation in jobs queries', async () => {
    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/jobs`, TEST_TENANT_ID);
    await GetUserJobs(req, createParams(TEST_USER_ID));

    for (const call of mockPoolQuery.mock.calls) {
      const params = call[1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });

  it('[RGPD-CONSENTS-001] should enforce tenant isolation in consents queries', async () => {
    mockPoolQuery.mockReset();
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest(`/api/users/${TEST_USER_ID}/consents`, TEST_TENANT_ID);
    await GetUserConsents(req, createParams(TEST_USER_ID));

    for (const call of mockPoolQuery.mock.calls) {
      const params = call[1];
      expect(params).toContain(TEST_TENANT_ID);
    }
  });
});
