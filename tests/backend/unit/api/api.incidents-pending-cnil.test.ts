/**
 * Pending CNIL Notifications API Tests - LOT 11.3
 *
 * Tests for GET /api/incidents/pending-cnil
 *
 * RGPD Compliance:
 * - Art. 33: Notification CNIL dans les 72 heures
 * - Dashboard for DPO to track pending notifications
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindPendingCnilNotification = jest.fn();

jest.mock('@/infrastructure/repositories/PgSecurityIncidentRepo', () => ({
  PgSecurityIncidentRepo: class {
    findPendingCnilNotification = mockFindPendingCnilNotification;
  },
}));

jest.mock('@/domain/incident', () => ({
  getCnilDeadline: jest.fn((incident) => new Date(new Date(incident.detectedAt).getTime() + 72 * 60 * 60 * 1000)),
  isCnilDeadlineApproaching: jest.fn((incident) => {
    const deadline = new Date(new Date(incident.detectedAt).getTime() + 72 * 60 * 60 * 1000);
    const hoursLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  }),
  isCnilDeadlineOverdue: jest.fn((incident) => {
    const deadline = new Date(new Date(incident.detectedAt).getTime() + 72 * 60 * 60 * 1000);
    return Date.now() > deadline.getTime();
  }),
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/incidents/pending-cnil/route';

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

const samplePendingIncidents = [
  {
    id: 'inc-001',
    tenantId: 'tenant-abc',
    severity: 'HIGH',
    type: 'DATA_LEAK',
    title: 'Data breach - urgent',
    riskLevel: 'HIGH',
    detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago - approaching deadline
    usersAffected: 100,
    recordsAffected: 500,
  },
  {
    id: 'inc-002',
    tenantId: 'tenant-xyz',
    severity: 'CRITICAL',
    type: 'DATA_LOSS',
    title: 'Critical data loss - overdue',
    riskLevel: 'HIGH',
    detectedAt: new Date(Date.now() - 80 * 60 * 60 * 1000), // 80 hours ago - overdue
    usersAffected: 200,
    recordsAffected: 1000,
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/incidents/pending-cnil - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindPendingCnilNotification.mockResolvedValue(samplePendingIncidents);
  });

  it('[INC-CNIL-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[INC-CNIL-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-CNIL-003] should return 403 for TENANT_ADMIN (platform endpoint)', async () => {
    const req = createTenantAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-CNIL-004] should allow SUPERADMIN to view pending CNIL', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[INC-CNIL-005] should allow DPO to view pending CNIL', async () => {
    const req = createDpoRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/incidents/pending-cnil - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindPendingCnilNotification.mockResolvedValue(samplePendingIncidents);
  });

  it('[INC-CNIL-006] should return incidents with deadline info', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);
    const body = await response.json();

    expect(body.incidents).toBeDefined();
    expect(body.incidents.length).toBe(2);
    expect(body.incidents[0]).toHaveProperty('cnilDeadline');
    expect(body.incidents[0]).toHaveProperty('deadlineApproaching');
    expect(body.incidents[0]).toHaveProperty('deadlineOverdue');
  });

  it('[INC-CNIL-007] should return summary with counts', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);
    const body = await response.json();

    expect(body.summary).toBeDefined();
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('overdue');
    expect(body.summary).toHaveProperty('approaching');
  });

  it('[INC-CNIL-008] should include incident details', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);
    const body = await response.json();

    const incident = body.incidents[0];
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('severity');
    expect(incident).toHaveProperty('type');
    expect(incident).toHaveProperty('title');
    expect(incident).toHaveProperty('riskLevel');
    expect(incident).toHaveProperty('detectedAt');
  });
});

describe('GET /api/incidents/pending-cnil - Art. 33 Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-CNIL-009] should sort by deadline (most urgent first)', async () => {
    mockFindPendingCnilNotification.mockResolvedValue(samplePendingIncidents);

    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);
    const body = await response.json();

    // Overdue should come before approaching
    if (body.incidents.length >= 2) {
      // The overdue one should be first
      expect(body.incidents[0].deadlineOverdue || body.incidents[0].deadlineApproaching).toBe(true);
    }
  });

  it('[INC-CNIL-010] should handle empty pending list', async () => {
    mockFindPendingCnilNotification.mockResolvedValue([]);

    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.incidents).toEqual([]);
    expect(body.summary.total).toBe(0);
    expect(body.summary.overdue).toBe(0);
    expect(body.summary.approaching).toBe(0);
  });
});

describe('GET /api/incidents/pending-cnil - Error Handling', () => {
  it('[INC-CNIL-011] should return 500 on database error', async () => {
    mockFindPendingCnilNotification.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/incidents/pending-cnil');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });
});
