/**
 * Incident Detail API Tests - LOT 11.3
 *
 * Tests for:
 * - GET /api/incidents/[id] - Get incident details
 * - PATCH /api/incidents/[id] - Update incident
 *
 * RGPD Compliance:
 * - Art. 33: CNIL notification tracking
 * - Art. 33.5: Violations registry (audit trail)
 * - Art. 34: Users notification tracking
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockMarkCnilNotified = jest.fn();
const mockMarkUsersNotified = jest.fn();
const mockMarkResolved = jest.fn();

jest.mock('@/infrastructure/repositories/PgSecurityIncidentRepo', () => ({
  PgSecurityIncidentRepo: class {
    findById = mockFindById;
    update = mockUpdate;
    markCnilNotified = mockMarkCnilNotified;
    markUsersNotified = mockMarkUsersNotified;
    markResolved = mockMarkResolved;
  },
}));

jest.mock('@/shared/logger', () => ({
  logEvent: jest.fn(),
}));

// Import route handlers AFTER mocking
import { GET, PATCH } from '@app/api/incidents/[id]/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPlatformAdminRequest(url: string, options?: Omit<RequestInit, 'signal'>): NextRequest {
  const token = signJwt({
    userId: 'superadmin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    ...options,
    headers: {
      ...((options?.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function createDpoRequest(url: string, options?: Omit<RequestInit, 'signal'>): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(url, {
    ...options,
    headers: {
      ...((options?.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${token}`,
    },
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

const sampleIncident = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: 'tenant-abc',
  severity: 'HIGH',
  type: 'DATA_LEAK',
  title: 'Data breach detected',
  description: 'Unauthorized access to user data',
  dataCategories: ['P2'],
  usersAffected: 50,
  recordsAffected: 200,
  riskLevel: 'HIGH',
  cnilNotified: false,
  cnilNotifiedAt: null,
  cnilReference: null,
  usersNotified: false,
  usersNotifiedAt: null,
  remediationActions: null,
  resolvedAt: null,
  detectedAt: new Date('2026-01-09T10:00:00Z'),
  detectedBy: 'SYSTEM',
  sourceIp: '192.168.1.100',
  createdBy: 'system',
  createdAt: new Date('2026-01-09T10:00:00Z'),
  updatedAt: new Date('2026-01-09T10:00:00Z'),
};

const validIncidentId = '550e8400-e29b-41d4-a716-446655440000';
const routeParams = { params: Promise.resolve({ id: validIncidentId }) };

// =============================================================================
// TESTS - GET /api/incidents/[id]
// =============================================================================

describe('GET /api/incidents/[id] - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
  });

  it('[INC-ID-GET-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(401);
  });

  it('[INC-ID-GET-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(403);
  });

  it('[INC-ID-GET-003] should return 403 for TENANT_ADMIN (platform endpoint)', async () => {
    const req = createTenantAdminRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(403);
  });

  it('[INC-ID-GET-004] should allow SUPERADMIN to get incident', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incident.id).toBe(validIncidentId);
  });

  it('[INC-ID-GET-005] should allow DPO to get incident', async () => {
    const req = createDpoRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/incidents/[id] - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
  });

  it('[INC-ID-GET-006] should return 400 for invalid UUID format', async () => {
    const invalidParams = { params: Promise.resolve({ id: 'invalid-id' }) };
    const req = createPlatformAdminRequest('http://localhost/api/incidents/invalid-id');
    const response = await GET(req, invalidParams);

    expect(response.status).toBe(400);
  });

  it('[INC-ID-GET-007] should return 404 for non-existent incident', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);

    expect(response.status).toBe(404);
  });
});

describe('GET /api/incidents/[id] - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
  });

  it('[INC-ID-GET-008] should return complete incident details', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const response = await GET(req, routeParams);
    const body = await response.json();

    expect(body.incident).toHaveProperty('id');
    expect(body.incident).toHaveProperty('severity');
    expect(body.incident).toHaveProperty('type');
    expect(body.incident).toHaveProperty('title');
    expect(body.incident).toHaveProperty('description');
    expect(body.incident).toHaveProperty('cnilNotified');
    expect(body.incident).toHaveProperty('usersNotified');
    expect(body.incident).toHaveProperty('resolvedAt');
  });
});

// =============================================================================
// TESTS - PATCH /api/incidents/[id]
// =============================================================================

describe('PATCH /api/incidents/[id] - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
    mockUpdate.mockResolvedValue({ ...sampleIncident, title: 'Updated title' });
  });

  it('[INC-ID-PATCH-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(401);
  });

  it('[INC-ID-PATCH-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(`http://localhost/api/incidents/${validIncidentId}`);
    const patchReq = new NextRequest(req.url, {
      method: 'PATCH',
      headers: req.headers,
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(patchReq, routeParams);

    expect(response.status).toBe(403);
  });

  it('[INC-ID-PATCH-003] should allow SUPERADMIN to update incident', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated title' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
  });

  it('[INC-ID-PATCH-004] should allow DPO to update incident', async () => {
    const req = createDpoRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated title' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/incidents/[id] - Actions (Art. 33)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
    mockMarkCnilNotified.mockResolvedValue({ ...sampleIncident, cnilNotified: true, cnilNotifiedAt: new Date() });
    mockMarkUsersNotified.mockResolvedValue({ ...sampleIncident, usersNotified: true, usersNotifiedAt: new Date() });
    mockMarkResolved.mockResolvedValue({ ...sampleIncident, resolvedAt: new Date() });
    mockUpdate.mockResolvedValue(sampleIncident);
  });

  it('[INC-ID-PATCH-005] should mark incident as CNIL notified', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_cnil_notified', cnilReference: 'CNIL-2026-001' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
    expect(mockMarkCnilNotified).toHaveBeenCalledWith(validIncidentId, 'CNIL-2026-001', 'superadmin-001');
  });

  it('[INC-ID-PATCH-006] should mark users as notified (Art. 34)', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_users_notified' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
    expect(mockMarkUsersNotified).toHaveBeenCalledWith(validIncidentId, 'superadmin-001');
  });

  it('[INC-ID-PATCH-007] should mark incident as resolved', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'mark_resolved',
        remediationActions: 'Fixed the vulnerability and patched all systems',
      }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
    expect(mockMarkResolved).toHaveBeenCalled();
  });

  it('[INC-ID-PATCH-008] should return 400 for mark_resolved without remediationActions', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_resolved' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/incidents/[id] - Update Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockResolvedValue(sampleIncident);
    mockUpdate.mockResolvedValue({ ...sampleIncident, severity: 'CRITICAL' });
  });

  it('[INC-ID-PATCH-009] should update severity', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ severity: 'CRITICAL' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      validIncidentId,
      expect.objectContaining({ severity: 'CRITICAL' }),
      'superadmin-001'
    );
  });

  it('[INC-ID-PATCH-010] should update riskLevel', async () => {
    mockUpdate.mockResolvedValue({ ...sampleIncident, riskLevel: 'MEDIUM' });

    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ riskLevel: 'MEDIUM' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(200);
  });

  it('[INC-ID-PATCH-011] should return 400 for invalid severity', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ severity: 'EXTREME' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(400);
  });

  it('[INC-ID-PATCH-012] should return 400 for invalid type', async () => {
    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ type: 'INVALID_TYPE' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/incidents/[id] - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-ID-PATCH-013] should return 404 for non-existent incident', async () => {
    mockFindById.mockResolvedValue(null);

    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(404);
  });

  it('[INC-ID-PATCH-014] should return 500 on database error', async () => {
    mockFindById.mockResolvedValue(sampleIncident);
    mockUpdate.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest(`http://localhost/api/incidents/${validIncidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(req, routeParams);

    expect(response.status).toBe(500);
  });
});
