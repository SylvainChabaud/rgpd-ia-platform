/**
 * Incidents Stats API Tests - LOT 11.3
 *
 * Tests for GET /api/incidents/stats
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (reporting)
 * - Dashboard statistics for monitoring
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockCountBySeverity = jest.fn();
const mockCountByType = jest.fn();
const mockFindUnresolved = jest.fn();
const mockFindPendingCnilNotification = jest.fn();

jest.mock('@/infrastructure/repositories/PgSecurityIncidentRepo', () => ({
  PgSecurityIncidentRepo: class {
    countBySeverity = mockCountBySeverity;
    countByType = mockCountByType;
    findUnresolved = mockFindUnresolved;
    findPendingCnilNotification = mockFindPendingCnilNotification;
  },
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/incidents/stats/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPlatformAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'superadmin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
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

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: 'tenant-abc',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: 'tenant-abc',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleBySeverity = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 3,
  CRITICAL: 1,
};

const sampleByType = {
  DATA_LEAK: 5,
  UNAUTHORIZED_ACCESS: 8,
  PII_IN_LOGS: 4,
  OTHER: 2,
};

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/incidents/stats - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountBySeverity.mockResolvedValue(sampleBySeverity);
    mockCountByType.mockResolvedValue(sampleByType);
    mockFindUnresolved.mockResolvedValue({ total: 5 });
    mockFindPendingCnilNotification.mockResolvedValue([{ id: 'inc-1' }, { id: 'inc-2' }]);
  });

  it('[INC-STATS-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[INC-STATS-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-STATS-003] should return 403 for TENANT_ADMIN (platform endpoint)', async () => {
    const req = createTenantAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-STATS-004] should allow SUPERADMIN to view stats', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[INC-STATS-005] should allow DPO to view stats', async () => {
    const req = createDpoRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/incidents/stats - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountBySeverity.mockResolvedValue(sampleBySeverity);
    mockCountByType.mockResolvedValue(sampleByType);
    mockFindUnresolved.mockResolvedValue({ total: 5 });
    mockFindPendingCnilNotification.mockResolvedValue([{ id: 'inc-1' }, { id: 'inc-2' }]);
  });

  it('[INC-STATS-006] should return stats object', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats).toBeDefined();
  });

  it('[INC-STATS-007] should return count by severity', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.bySeverity).toBeDefined();
    expect(body.stats.bySeverity.LOW).toBe(5);
    expect(body.stats.bySeverity.CRITICAL).toBe(1);
  });

  it('[INC-STATS-008] should return count by type', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.byType).toBeDefined();
    expect(body.stats.byType.DATA_LEAK).toBe(5);
  });

  it('[INC-STATS-009] should return unresolved count', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.unresolved).toBe(5);
  });

  it('[INC-STATS-010] should return pending CNIL notification count', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.stats.pendingCnilNotification).toBe(2);
  });

  it('[INC-STATS-011] should return total count', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);
    const body = await response.json();

    // Total should be sum of all severities
    expect(body.stats.total).toBe(19); // 5 + 10 + 3 + 1
  });
});

describe('GET /api/incidents/stats - Tenant Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountBySeverity.mockResolvedValue(sampleBySeverity);
    mockCountByType.mockResolvedValue(sampleByType);
    mockFindUnresolved.mockResolvedValue({ total: 5 });
    mockFindPendingCnilNotification.mockResolvedValue([]);
  });

  it('[INC-STATS-012] should accept tenantId filter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats?tenantId=tenant-xyz');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockCountBySeverity).toHaveBeenCalledWith('tenant-xyz');
    expect(mockCountByType).toHaveBeenCalledWith('tenant-xyz');
  });
});

describe('GET /api/incidents/stats - Error Handling', () => {
  it('[INC-STATS-013] should return 500 on database error', async () => {
    mockCountBySeverity.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[INC-STATS-014] should handle empty stats', async () => {
    mockCountBySeverity.mockResolvedValue({});
    mockCountByType.mockResolvedValue({});
    mockFindUnresolved.mockResolvedValue({ total: 0 });
    mockFindPendingCnilNotification.mockResolvedValue([]);

    const req = createPlatformAdminRequest('http://localhost/api/incidents/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stats.total).toBe(0);
  });
});
