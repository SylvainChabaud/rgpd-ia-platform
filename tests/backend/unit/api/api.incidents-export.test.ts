/**
 * Incidents Export API Tests - LOT 11.3
 *
 * Tests for GET /api/incidents/export
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (export for CNIL audit)
 * - P1 data only
 * - UTF-8 with BOM (Excel-compatible)
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindAll = jest.fn();

jest.mock('@/infrastructure/repositories/PgSecurityIncidentRepo', () => ({
  PgSecurityIncidentRepo: class {
    findAll = mockFindAll;
  },
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/incidents/export/route';

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

const sampleIncidents = [
  {
    id: 'inc-001',
    tenantId: 'tenant-abc',
    severity: 'HIGH',
    type: 'DATA_LEAK',
    title: 'Data breach detected',
    dataCategories: ['P2'],
    usersAffected: 50,
    recordsAffected: 200,
    riskLevel: 'HIGH',
    cnilNotified: true,
    cnilNotifiedAt: new Date('2026-01-09T12:00:00Z'),
    usersNotified: false,
    usersNotifiedAt: null,
    resolvedAt: null,
    detectedAt: new Date('2026-01-09T10:00:00Z'),
  },
  {
    id: 'inc-002',
    tenantId: 'tenant-xyz',
    severity: 'MEDIUM',
    type: 'PII_IN_LOGS',
    title: 'PII found in logs',
    dataCategories: ['P1'],
    usersAffected: 10,
    recordsAffected: 50,
    riskLevel: 'MEDIUM',
    cnilNotified: false,
    cnilNotifiedAt: null,
    usersNotified: false,
    usersNotifiedAt: null,
    resolvedAt: new Date('2026-01-10T08:00:00Z'),
    detectedAt: new Date('2026-01-08T14:00:00Z'),
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/incidents/export - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue({ data: sampleIncidents, total: 2, limit: 10000, offset: 0 });
  });

  it('[INC-EXP-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[INC-EXP-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-EXP-003] should return 403 for TENANT_ADMIN (platform endpoint)', async () => {
    const req = createTenantAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[INC-EXP-004] should allow SUPERADMIN to export', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
  });

  it('[INC-EXP-005] should allow DPO to export', async () => {
    const req = createDpoRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/incidents/export - CSV Format (RGPD Art. 33.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue({ data: sampleIncidents, total: 2, limit: 10000, offset: 0 });
  });

  it('[INC-EXP-006] should return CSV with UTF-8 BOM', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check UTF-8 BOM bytes: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('[INC-EXP-007] should use semicolon separator (European standard)', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    const csv = await response.text();
    const lines = csv.split('\n');

    expect(lines[0]).toContain(';');
  });

  it('[INC-EXP-008] should include CNIL-required columns', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    const csv = await response.text();

    // Required columns for CNIL violations registry
    expect(csv).toContain('ID');
    expect(csv).toContain('Detected At');
    expect(csv).toContain('Severity');
    expect(csv).toContain('Type');
    expect(csv).toContain('Title');
    expect(csv).toContain('Risk Level');
    expect(csv).toContain('CNIL Notified');
    expect(csv).toContain('Users Notified');
    expect(csv).toContain('Resolved At');
  });

  it('[INC-EXP-009] should set correct Content-Disposition header', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    const disposition = response.headers.get('content-disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('registre-violations-');
    expect(disposition).toContain('.csv');
  });

  it('[INC-EXP-010] should escape quotes in title', async () => {
    mockFindAll.mockResolvedValue({
      data: [{ ...sampleIncidents[0], title: 'Test "with" quotes' }],
      total: 1,
      limit: 10000,
      offset: 0,
    });

    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    const csv = await response.text();
    // Double quotes should be escaped as ""
    expect(csv).toContain('""with""');
  });
});

describe('GET /api/incidents/export - Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue({ data: sampleIncidents, total: 2, limit: 10000, offset: 0 });
  });

  it('[INC-EXP-011] should apply severity filter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export?severity=HIGH');
    await GET(req);

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'HIGH' }),
      expect.any(Object)
    );
  });

  it('[INC-EXP-012] should apply type filter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export?type=DATA_LEAK');
    await GET(req);

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DATA_LEAK' }),
      expect.any(Object)
    );
  });

  it('[INC-EXP-013] should apply resolved filter', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export?resolved=true');
    await GET(req);

    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ resolved: true }),
      expect.any(Object)
    );
  });

  it('[INC-EXP-014] should return 400 for invalid severity', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export?severity=INVALID');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('[INC-EXP-015] should return 400 for invalid type', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/incidents/export?type=INVALID');
    const response = await GET(req);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/incidents/export - Error Handling', () => {
  it('[INC-EXP-016] should return 500 on database error', async () => {
    mockFindAll.mockRejectedValue(new Error('Database error'));

    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[INC-EXP-017] should handle empty incident list', async () => {
    mockFindAll.mockResolvedValue({ data: [], total: 0, limit: 10000, offset: 0 });

    const req = createPlatformAdminRequest('http://localhost/api/incidents/export');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const csv = await response.text();
    // Should have header but no data rows
    const lines = csv.split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(1); // Header only
  });
});
