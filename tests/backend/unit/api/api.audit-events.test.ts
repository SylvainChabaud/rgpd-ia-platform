/**
 * Audit Events API Tests - LOT 11.3
 *
 * Tests for GET /api/audit/events
 *
 * RGPD Compliance:
 * - Art. 5: Data minimization (P1 only)
 * - Art. 32: Security (RBAC enforced)
 * - Tenant isolation for TENANT_ADMIN
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockAuditList = jest.fn();

jest.mock('@/infrastructure/audit/PgAuditEventReader', () => ({
  PgAuditEventReader: class {
    list = mockAuditList;
  },
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/audit/events/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPlatformAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'platform-admin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(url: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: 'tenant-123',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createDpoRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleEvents = [
  {
    id: 'evt-001',
    eventType: 'user.login',
    actorId: 'user-123',
    tenantId: 'tenant-abc',
    targetId: 'target-001',
    createdAt: new Date('2026-01-09T10:00:00Z'),
  },
  {
    id: 'evt-002',
    eventType: 'user.logout',
    actorId: 'user-456',
    tenantId: 'tenant-abc',
    targetId: null,
    createdAt: new Date('2026-01-09T11:00:00Z'),
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/audit/events - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleEvents);
  });

  it('[AUD-EVT-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/audit/events');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[AUD-EVT-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/audit/events');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[AUD-EVT-003] should allow PLATFORM SUPERADMIN to list events', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('[AUD-EVT-004] should allow TENANT_ADMIN to list events', async () => {
    const req = createTenantAdminRequest('http://localhost/api/audit/events', 'tenant-abc');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[AUD-EVT-005] should allow DPO to list events', async () => {
    const req = createDpoRequest('http://localhost/api/audit/events');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/audit/events - Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleEvents);
  });

  it('[AUD-EVT-006] TENANT_ADMIN should only see their tenant events', async () => {
    const req = createTenantAdminRequest('http://localhost/api/audit/events', 'tenant-xyz');
    await GET(req);

    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-xyz' })
    );
  });

  it('[AUD-EVT-007] PLATFORM admin should see all events (no tenant filter)', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    await GET(req);

    // Should not have tenantId filter for platform admin
    const callArgs = mockAuditList.mock.calls[0][0];
    expect(callArgs.tenantId).toBeUndefined();
  });
});

describe('GET /api/audit/events - Query Parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleEvents);
  });

  it('[AUD-EVT-008] should apply eventType filter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events?eventType=user.login');
    await GET(req);

    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.login' })
    );
  });

  it('[AUD-EVT-009] should apply limit parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events?limit=25');
    await GET(req);

    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 })
    );
  });

  it('[AUD-EVT-010] should apply offset parameter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events?offset=50');
    await GET(req);

    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 50 })
    );
  });

  it('[AUD-EVT-011] should use default limit of 100', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    await GET(req);

    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it('[AUD-EVT-012] should return 400 for limit > 1000', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events?limit=1500');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[AUD-EVT-013] should return 400 for negative offset', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events?offset=-10');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/audit/events - Response Structure (P1 Only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleEvents);
  });

  it('[AUD-EVT-014] should return P1 fields only', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    const response = await GET(req);
    const body = await response.json();

    expect(body.events[0]).toHaveProperty('id');
    expect(body.events[0]).toHaveProperty('eventType');
    expect(body.events[0]).toHaveProperty('actorId');
    expect(body.events[0]).toHaveProperty('tenantId');
    expect(body.events[0]).toHaveProperty('targetId');
    expect(body.events[0]).toHaveProperty('createdAt');
  });

  it('[AUD-EVT-015] should NOT expose sensitive metadata', async () => {
    // Add sensitive fields to mock data
    mockAuditList.mockResolvedValue([
      { ...sampleEvents[0], metadata: { password: 'secret' }, payload: { email: 'test@test.com' } },
    ]);

    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    const response = await GET(req);
    const body = await response.json();

    // Response should not contain metadata or payload
    expect(body.events[0]).not.toHaveProperty('metadata');
    expect(body.events[0]).not.toHaveProperty('payload');
  });
});

describe('GET /api/audit/events - Error Handling', () => {
  it('[AUD-EVT-016] should return 500 on database error', async () => {
    mockAuditList.mockRejectedValue(new Error('Database connection failed'));

    const req = createPlatformAdminRequest('http://localhost/api/audit/events');
    const response = await GET(req);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain('Database connection');
  });
});
