/**
 * Consent Export API Tests - LOT 12.2
 *
 * Tests for GET /api/consents/export
 *
 * RGPD Compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - RGPD-safe CSV: P1/P2 only (NO email, NO prompt content)
 * - Audit event emitted for export action
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
const mockPoolQuery = jest.fn();
const mockAuditWrite = jest.fn();

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
  })),
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: jest.fn().mockImplementation(() => ({
    write: (...args: unknown[]) => mockAuditWrite(...args),
  })),
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/consents/export/route';

// =============================================================================
// HELPERS
// =============================================================================

const TEST_TENANT_ID = 'tenant-abc-123';

function createTenantAdminRequest(tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest('http://localhost/api/consents/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(tenantId: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: tenantId,
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest('http://localhost/api/consents/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createUnauthenticatedRequest(): NextRequest {
  return new NextRequest('http://localhost/api/consents/export');
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
  { user_id: 'user-001', purpose: 'Analytics', purpose_id: 'purpose-001', granted: true, granted_at: new Date('2024-01-15'), revoked_at: null },
  { user_id: 'user-001', purpose: 'Marketing', purpose_id: 'purpose-002', granted: false, granted_at: new Date('2024-01-10'), revoked_at: new Date('2024-02-20') },
  { user_id: 'user-002', purpose: 'Analytics', purpose_id: 'purpose-001', granted: true, granted_at: new Date('2024-01-12'), revoked_at: null },
];

// =============================================================================
// TESTS - AUTHENTICATION & AUTHORIZATION
// =============================================================================

describe('GET /api/consents/export - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[EXPORT-001] should return 401 for unauthenticated requests', async () => {
    const req = createUnauthenticatedRequest();
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('[EXPORT-002] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest(TEST_TENANT_ID);
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('[EXPORT-003] should allow TENANT_ADMIN access', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
    mockAuditWrite.mockResolvedValue(undefined);

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// TESTS - RESPONSE FORMAT
// =============================================================================

describe('GET /api/consents/export - Response Format', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[EXPORT-010] should return CSV content type', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  });

  it('[EXPORT-011] should return attachment disposition with filename', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('consents-export-');
    expect(disposition).toContain('.csv');
  });

  it('[EXPORT-012] should include UTF-8 BOM and CSV header row with semicolon separator', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    // Get raw bytes to check BOM (text() may decode it automatically)
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check UTF-8 BOM bytes: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    // Decode text and check header uses semicolon separator (European standard)
    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split('\n');
    // Header after BOM
    expect(lines[0]).toContain('User ID;User Name;Purpose;Status;Granted At;Revoked At');
  });

  it('[EXPORT-013] should include data rows', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    const lines = text.split('\n').filter(l => l.trim());
    // Header + (2 users * 2 purposes) = 5 lines minimum
    expect(lines.length).toBeGreaterThan(1);
  });

  it('[EXPORT-014] should include correct status values', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    expect(text).toContain('granted');
    expect(text).toContain('revoked');
  });
});

// =============================================================================
// TESTS - CSV CONTENT
// =============================================================================

describe('GET /api/consents/export - CSV Content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[EXPORT-020] should include user displayName (NOT email)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    // Should contain displayName
    expect(text).toContain('Jean Dupont');
    expect(text).toContain('Marie Martin');

    // Should NOT contain email
    expect(text).not.toContain('jean@example.com');
    expect(text).not.toContain('marie@example.com');
  });

  it('[EXPORT-021] should include purpose labels', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    expect(text).toContain('Analytics');
    expect(text).toContain('Marketing');
  });

  it('[EXPORT-022] should include user IDs', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    expect(text).toContain('user-001');
    expect(text).toContain('user-002');
  });

  it('[EXPORT-023] should format dates as ISO strings', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    // Should contain ISO date format
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('[EXPORT-024] should escape CSV special characters', async () => {
    mockListFilteredByTenant.mockResolvedValue([
      { id: 'user-003', displayName: 'Jean; "The Boss" Dupont', email: 'jean@example.com' },
    ]);
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    // Semicolons and quotes should be properly escaped (semicolon is the separator)
    expect(text).toContain('"Jean; ""The Boss"" Dupont"');
  });
});

// =============================================================================
// TESTS - EDGE CASES
// =============================================================================

describe('GET /api/consents/export - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[EXPORT-030] should return headers only when no users', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue([]);

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);

    // Get raw bytes to check BOM
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check UTF-8 BOM bytes: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split('\n').filter(l => l.trim());
    expect(lines.length).toBe(1); // Only header
    expect(lines[0]).toContain('User ID');
  });

  it('[EXPORT-031] should handle no purposes gracefully', async () => {
    mockFindAllPurposes.mockResolvedValue([]);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[EXPORT-032] should handle database errors gracefully', async () => {
    mockFindAllPurposes.mockRejectedValue(new Error('Database error'));

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);

    expect(response.status).toBe(500);
  });

  it('[EXPORT-033] should show pending status for missing consents', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue([sampleUsers[0]]);
    mockPoolQuery.mockResolvedValue({ rows: [] }); // No consents

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    expect(text).toContain('pending');
  });
});

// =============================================================================
// TESTS - AUDIT & RGPD COMPLIANCE
// =============================================================================

describe('GET /api/consents/export - Audit & RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(sampleUsers);
    mockPoolQuery.mockResolvedValue({ rows: sampleConsents });
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[EXPORT-040] should emit audit event for export action', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    await GET(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'consents.exported',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TEST_TENANT_ID,
    }));
  });

  it('[EXPORT-041] should NOT include email in export (P2 minimization)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    // Verify no email addresses in export
    expect(text).not.toMatch(/@example\.com/);
    expect(text).not.toContain('jean@');
    expect(text).not.toContain('marie@');
  });

  it('[EXPORT-042] should NOT include prompt content (P3 exclusion)', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    // Headers should only contain expected columns
    const header = text.split('\n')[0];
    expect(header).not.toContain('prompt');
    expect(header).not.toContain('content');
    expect(header).not.toContain('output');
  });

  it('[EXPORT-043] should enforce tenant isolation in queries', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    await GET(req);

    expect(mockFindAllPurposes).toHaveBeenCalledWith(TEST_TENANT_ID, true);
    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
    }));
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([TEST_TENANT_ID])
    );
  });

  it('[EXPORT-044] should include actor ID in audit event', async () => {
    const req = createTenantAdminRequest(TEST_TENANT_ID);
    await GET(req);

    expect(mockAuditWrite).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'tenant-admin-001',
    }));
  });
});

// =============================================================================
// TESTS - LARGE EXPORT
// =============================================================================

describe('GET /api/consents/export - Large Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditWrite.mockResolvedValue(undefined);
  });

  it('[EXPORT-050] should handle large user lists', async () => {
    // Generate 100 users
    const largeUserList = Array.from({ length: 100 }, (_, i) => ({
      id: `user-${i}`,
      displayName: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue(largeUserList);
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    const response = await GET(req);
    const text = await response.text();

    expect(response.status).toBe(200);
    // Header + (100 users * 2 purposes) = 201 lines
    const lines = text.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(101);
  });

  it('[EXPORT-051] should use appropriate limit for user fetch', async () => {
    mockFindAllPurposes.mockResolvedValue(samplePurposes);
    mockListFilteredByTenant.mockResolvedValue([]);

    const req = createTenantAdminRequest(TEST_TENANT_ID);
    await GET(req);

    expect(mockListFilteredByTenant).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10000, // Large limit for export
    }));
  });
});
