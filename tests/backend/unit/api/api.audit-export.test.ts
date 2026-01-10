/**
 * Audit Export API Tests - LOT 11.3
 * Tests CSV export RGPD compliance
 *
 * RGPD Critical:
 * - P1 data only (no sensitive metadata)
 * - UTF-8 with BOM (Excel-compatible)
 * - Semicolon separator (European standard)
 * - Tenant isolation enforced
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS - Must be before imports that use them
// =============================================================================

const mockAuditList = jest.fn();

jest.mock('@/infrastructure/audit/PgAuditEventReader', () => ({
  PgAuditEventReader: class {
    list = mockAuditList;
  },
}));

// Import route handler AFTER mocking
import { GET as exportAuditEvents } from '@app/api/audit/export/route';

function createPlatformAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'test-super-admin',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createTenantAdminRequest(url: string, tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'test-tenant-admin',
    tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'test-member',
    tenantId: 'tenant-123',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

const sampleAuditEvents = [
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

describe('GET /api/audit/export - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleAuditEvents);
  });

  it('should return CSV with UTF-8 BOM', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');

    // Get raw bytes to check BOM (text() may decode it)
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check UTF-8 BOM bytes: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('should use semicolon separator (European standard)', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    const csv = await response.text();
    const lines = csv.split('\n');

    if (lines.length > 0) {
      // Header should contain semicolons
      expect(lines[0]).toContain(';');
    }
  });

  it('should export P1 data only (no sensitive metadata)', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    const csv = await response.text();

    // Check header contains only P1 fields
    expect(csv).toContain('ID;Event Type;Actor ID;Tenant ID;Target ID;Created At');

    // Check NO sensitive fields
    expect(csv).not.toContain('metadata');
    expect(csv).not.toContain('payload');
    expect(csv).not.toContain('password');
    expect(csv).not.toContain('email');
  });

  it('should set correct Content-Disposition header', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    const disposition = response.headers.get('content-disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('audit-trail-');
    expect(disposition).toContain('.csv');
  });

  it('should deny access to regular users (MEMBER)', async () => {
    const req = createMemberRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(403);
  });

  it('should deny access to unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(401);
  });

  it('should support eventType filter', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export?eventType=user.login');
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(200);
  });

  it('should support date range filters', async () => {
    const startDate = '2026-01-01T00:00:00Z';
    const endDate = '2026-01-09T23:59:59Z';
    const url = `http://localhost:3000/api/audit/export?startDate=${startDate}&endDate=${endDate}`;

    const req = createPlatformAdminRequest(url);
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/audit/export - Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditList.mockResolvedValue(sampleAuditEvents);
  });

  it('should allow TENANT admin to export only their tenant events', async () => {
    const tenantId = 'tenant-abc';
    const req = createTenantAdminRequest('http://localhost:3000/api/audit/export', tenantId);
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(200);
    // Verify tenant filter was applied
    expect(mockAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-abc' })
    );
  });

  it('should allow PLATFORM admin to export all tenant events', async () => {
    const req = createPlatformAdminRequest('http://localhost:3000/api/audit/export');
    const response = await exportAuditEvents(req);

    expect(response.status).toBe(200);
    // Platform admin should not have tenant filter
    expect(mockAuditList).toHaveBeenCalledWith(
      expect.not.objectContaining({ tenantId: expect.anything() })
    );
  });
});
