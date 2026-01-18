/**
 * API Endpoint Tests: /api/tenants/:id/rgpd/{exports,deletions,stats,csv}
 * LOT 12.3 - RGPD Management
 *
 * RGPD Compliance Tests:
 * - Tenant isolation (Admin A cannot see Tenant B)
 * - RBAC (MEMBER = 403, TENANT_ADMIN = 200)
 * - P1 data only (no email in response)
 * - Pagination/filters functional
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { stubAuthProvider } from '@/app/auth/stubAuthProvider';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { RGPD_REQUEST_STATUS, RGPD_REQUEST_TYPE } from '@/domain/rgpd/DeletionRequest';

// =============================================================================
// MOCKS
// =============================================================================

const mockFindExportsByTenant = jest.fn();
const mockFindDeletionsByTenant = jest.fn();
const mockFindByTenant = jest.fn();
const mockCountByTenant = jest.fn();
const mockGetExportStats = jest.fn();
const mockPurgeExpiredExports = jest.fn();

jest.mock('@/infrastructure/repositories/PgRgpdRequestRepo', () => ({
  PgRgpdRequestRepo: class {
    findExportsByTenant = mockFindExportsByTenant;
    findDeletionsByTenant = mockFindDeletionsByTenant;
    findByTenant = mockFindByTenant;
    countByTenant = mockCountByTenant;
    getExportStats = mockGetExportStats;
    purgeExpiredExports = mockPurgeExpiredExports;
  },
}));

// Mock ExportStorage module
jest.mock('@/infrastructure/storage/ExportStorage', () => ({
  cleanupExpiredExports: jest.fn(),
  getExportMetadataByUserId: jest.fn(),
  deleteExportBundle: jest.fn(),
  deleteExportMetadata: jest.fn(),
}));

// Import the mocked module to get access to the mock functions
import * as ExportStorage from '@/infrastructure/storage/ExportStorage';
const mockCleanupExpiredExports = ExportStorage.cleanupExpiredExports as jest.Mock;

const mockListSuspendedByTenant = jest.fn();
jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: class {
    listSuspendedByTenant = mockListSuspendedByTenant;
  },
}));

const mockOppositionFindByTenant = jest.fn();
jest.mock('@/infrastructure/repositories/PgOppositionRepo', () => ({
  PgOppositionRepo: class {
    findByTenant = mockOppositionFindByTenant;
  },
}));

const mockDisputeFindByTenant = jest.fn();
jest.mock('@/infrastructure/repositories/PgDisputeRepo', () => ({
  PgDisputeRepo: class {
    findByTenant = mockDisputeFindByTenant;
  },
}));

// Import route handlers AFTER mocking
import { GET as getExports } from '@app/api/tenants/[id]/rgpd/exports/route';
import { GET as getExportStats } from '@app/api/tenants/[id]/rgpd/exports/stats/route';
import { DELETE as purgeExpiredExports } from '@app/api/tenants/[id]/rgpd/exports/expired/route';
import { GET as getDeletions } from '@app/api/tenants/[id]/rgpd/deletions/route';
import { GET as getStats } from '@app/api/tenants/[id]/rgpd/stats/route';
import { GET as getCsv } from '@app/api/tenants/[id]/rgpd/csv/route';

// =============================================================================
// CONSTANTS
// =============================================================================

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';

// Sample data
const sampleExportRequest = {
  id: 'exp-001',
  tenantId: TENANT_ID,
  userId: 'user-001',
  type: RGPD_REQUEST_TYPE.EXPORT,
  status: RGPD_REQUEST_STATUS.PENDING,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  scheduledPurgeAt: null,
  completedAt: null,
};

const sampleDeletionRequest = {
  id: 'del-001',
  tenantId: TENANT_ID,
  userId: 'user-002',
  type: RGPD_REQUEST_TYPE.DELETE,
  status: RGPD_REQUEST_STATUS.PENDING,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  scheduledPurgeAt: new Date('2025-02-10T10:00:00Z'),
  completedAt: null,
};

// =============================================================================
// HELPERS
// =============================================================================

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// =============================================================================
// TESTS - EXPORTS ENDPOINT
// =============================================================================

describe('GET /api/tenants/:id/rgpd/exports - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindExportsByTenant.mockResolvedValue({
      requests: [sampleExportRequest],
      total: 1,
    });
  });

  it('[RGPD-EXP-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports');
    const response = await getExports(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-EXP-002] returns 403 for MEMBER role (RBAC)', async () => {
    stubAuthProvider.registerTestToken('stub-member', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-member' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-EXP-003] returns 403 for cross-tenant access (isolation)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-EXP-004] returns exports list for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exports).toHaveLength(1);
    expect(data.exports[0].id).toBe('exp-001');
    expect(data.total).toBe(1);
  });

  it('[RGPD-EXP-005] returns P1 data only (no email, no content)', async () => {
    mockFindExportsByTenant.mockResolvedValue({
      requests: [{
        ...sampleExportRequest,
        email: 'should-not-appear@example.com',
        content: 'should-not-appear',
      }],
      total: 1,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(data.exports[0].email).toBeUndefined();
    expect(data.exports[0].content).toBeUndefined();
    expect(data.exports[0]).toEqual({
      id: 'exp-001',
      userId: 'user-001',
      status: RGPD_REQUEST_STATUS.PENDING,
      createdAt: '2025-01-10T10:00:00.000Z',
      scheduledPurgeAt: null,
      completedAt: null,
    });
  });

  it('[RGPD-EXP-006] respects pagination parameters', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports?limit=10&offset=20', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    await getExports(request, createParams(TENANT_ID));

    expect(mockFindExportsByTenant).toHaveBeenCalledWith(
      TENANT_ID,
      { limit: 10, offset: 20, status: undefined }
    );
  });

  it('[RGPD-EXP-007] filters by status', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports?status=COMPLETED', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    await getExports(request, createParams(TENANT_ID));

    expect(mockFindExportsByTenant).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ status: 'COMPLETED' })
    );
  });

  it('[RGPD-EXP-008] returns 404 when tenant id is missing', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(''));
    expect(response.status).toBe(404);
  });

  it('[RGPD-EXP-009] handles database errors gracefully', async () => {
    mockFindExportsByTenant.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(500);
  });

  it('[RGPD-EXP-010] handles empty results', async () => {
    mockFindExportsByTenant.mockResolvedValue({ requests: [], total: 0 });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exports).toHaveLength(0);
    expect(data.total).toBe(0);
  });
});

// =============================================================================
// TESTS - DELETIONS ENDPOINT
// =============================================================================

describe('GET /api/tenants/:id/rgpd/deletions - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindDeletionsByTenant.mockResolvedValue({
      requests: [sampleDeletionRequest],
      total: 1,
    });
  });

  it('[RGPD-DEL-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions');
    const response = await getDeletions(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-DEL-002] returns 403 for MEMBER role (RBAC)', async () => {
    stubAuthProvider.registerTestToken('stub-member-del', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions', {
      headers: { Authorization: 'Bearer stub-member-del' },
    });

    const response = await getDeletions(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-DEL-003] returns 403 for cross-tenant access (isolation)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getDeletions(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-DEL-004] returns deletions list for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getDeletions(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deletions).toHaveLength(1);
    expect(data.deletions[0].id).toBe('del-001');
    expect(data.deletions[0].scheduledPurgeAt).toBe('2025-02-10T10:00:00.000Z');
  });

  it('[RGPD-DEL-005] returns P1 data only (no email)', async () => {
    mockFindDeletionsByTenant.mockResolvedValue({
      requests: [{
        ...sampleDeletionRequest,
        email: 'should-not-appear@example.com',
      }],
      total: 1,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getDeletions(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(data.deletions[0].email).toBeUndefined();
    expect(data.deletions[0].userId).toBe('user-002');
  });

  it('[RGPD-DEL-006] respects pagination parameters', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/deletions?limit=25&offset=50', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    await getDeletions(request, createParams(TENANT_ID));

    expect(mockFindDeletionsByTenant).toHaveBeenCalledWith(
      TENANT_ID,
      { limit: 25, offset: 50, status: undefined }
    );
  });
});

// =============================================================================
// TESTS - STATS ENDPOINT
// =============================================================================

describe('GET /api/tenants/:id/rgpd/stats - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountByTenant.mockResolvedValue({
      exports: { pending: 5, completed: 10 },
      deletions: { pending: 2, completed: 8 },
    });
    // PgUserRepo.listSuspendedByTenant returns already suspended users
    mockListSuspendedByTenant.mockResolvedValue([
      { id: 's1', dataSuspended: true },
    ]);
    mockOppositionFindByTenant.mockResolvedValue([
      { id: 'o1', status: 'pending' },
      { id: 'o2', status: 'reviewed' },
    ]);
    mockDisputeFindByTenant.mockResolvedValue([
      { id: 'd1', status: 'pending' },
      { id: 'd2', status: 'resolved' },
    ]);
  });

  it('[RGPD-STAT-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/stats');
    const response = await getStats(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-STAT-002] returns 403 for MEMBER role', async () => {
    stubAuthProvider.registerTestToken('stub-member-stats', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/stats', {
      headers: { Authorization: 'Bearer stub-member-stats' },
    });

    const response = await getStats(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-STAT-003] returns 403 for cross-tenant access', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getStats(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-STAT-004] returns aggregated stats for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getStats(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.exports).toEqual({ pending: 5, completed: 10 });
    expect(data.stats.deletions).toEqual({ pending: 2, completed: 8 });
    expect(data.stats.suspensions.active).toBe(1);
    expect(data.stats.oppositions.pending).toBe(1);
    expect(data.stats.contests.pending).toBe(1);
  });

  it('[RGPD-STAT-005] returns P1 aggregated data only (no PII)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getStats(request, createParams(TENANT_ID));
    const data = await response.json();

    // Should only contain counts, no user details
    expect(data.stats.exports).not.toHaveProperty('users');
    expect(data.stats.deletions).not.toHaveProperty('emails');
    expect(typeof data.stats.exports.pending).toBe('number');
    expect(typeof data.stats.suspensions.active).toBe('number');
  });
});

// =============================================================================
// TESTS - CSV EXPORT ENDPOINT
// =============================================================================

describe('GET /api/tenants/:id/rgpd/csv - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByTenant.mockResolvedValue({
      requests: [
        sampleExportRequest,
        sampleDeletionRequest,
      ],
      total: 2,
    });
  });

  it('[RGPD-CSV-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv');
    const response = await getCsv(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-CSV-002] returns 403 for MEMBER role', async () => {
    stubAuthProvider.registerTestToken('stub-member-csv', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv', {
      headers: { Authorization: 'Bearer stub-member-csv' },
    });

    const response = await getCsv(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-CSV-003] returns 403 for cross-tenant access', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getCsv(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-CSV-004] returns CSV file for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getCsv(request, createParams(TENANT_ID));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('.csv');
  });

  it('[RGPD-CSV-005] CSV contains P1 data only (RGPD-safe)', async () => {
    mockFindByTenant.mockResolvedValue({
      requests: [{
        ...sampleExportRequest,
        email: 'should-not-be-in-csv@example.com',
      }],
      total: 1,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getCsv(request, createParams(TENANT_ID));
    const csvContent = await response.text();

    // CSV should contain header with semicolon separator (European standard)
    expect(csvContent).toContain('ID;Type;User ID;Status;Created At');
    expect(csvContent).toContain('exp-001');
    // Should NOT contain email
    expect(csvContent).not.toContain('should-not-be-in-csv@example.com');
    expect(csvContent).not.toContain('email');
  });

  it('[RGPD-CSV-006] respects type filter parameter', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv?type=exports', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    await getCsv(request, createParams(TENANT_ID));

    expect(mockFindByTenant).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ type: 'EXPORT' })
    );
  });

  it('[RGPD-CSV-007] sets Cache-Control: no-store (security)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/csv', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getCsv(request, createParams(TENANT_ID));

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

// =============================================================================
// TESTS - RGPD COMPLIANCE (Cross-cutting)
// =============================================================================

describe('RGPD Compliance - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[RGPD-COMP-001] All endpoints enforce tenant isolation', async () => {
    // Setup
    mockFindExportsByTenant.mockResolvedValue({ requests: [], total: 0 });
    mockFindDeletionsByTenant.mockResolvedValue({ requests: [], total: 0 });
    mockCountByTenant.mockResolvedValue({ exports: { pending: 0, completed: 0 }, deletions: { pending: 0, completed: 0 } });
    mockListSuspendedByTenant.mockResolvedValue([]);
    mockOppositionFindByTenant.mockResolvedValue([]);
    mockDisputeFindByTenant.mockResolvedValue([]);
    mockFindByTenant.mockResolvedValue({ requests: [], total: 0 });

    // Test all endpoints return 403 for wrong tenant
    const endpoints = [getExports, getDeletions, getStats, getCsv];

    for (const endpoint of endpoints) {
      const request = new NextRequest('http://localhost/api/tenants/id/rgpd/test', {
        headers: { Authorization: 'Bearer stub-tenant-admin1' },
      });
      const response = await endpoint(request, createParams(OTHER_TENANT_ID));
      expect(response.status).toBe(403);
    }
  });

  it('[RGPD-COMP-002] SUPERADMIN can access any tenant', async () => {
    stubAuthProvider.registerTestToken('stub-superadmin', {
      actorId: 'superadmin-1',
      actorScope: ACTOR_SCOPE.PLATFORM,
      tenantId: undefined,
      roles: [ACTOR_ROLE.SUPERADMIN],
    });

    mockFindExportsByTenant.mockResolvedValue({ requests: [], total: 0 });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-superadmin' },
    });

    const response = await getExports(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(200);
  });

  it('[RGPD-COMP-003] DPO role can access RGPD endpoints', async () => {
    stubAuthProvider.registerTestToken('stub-dpo', {
      actorId: 'dpo-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.DPO],
    });

    mockFindExportsByTenant.mockResolvedValue({ requests: [], total: 0 });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports', {
      headers: { Authorization: 'Bearer stub-dpo' },
    });

    const response = await getExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// TESTS - EXPORT STATS ENDPOINT (RGPD Art. 5.1.e Compliance)
// =============================================================================

describe('GET /api/tenants/:id/rgpd/exports/stats - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExportStats.mockResolvedValue({
      totalCount: 10,
      expiredCount: 2,
      oldestAgeDays: 15,
    });
  });

  it('[RGPD-EXPSTAT-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats');
    const response = await getExportStats(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-EXPSTAT-002] returns 403 for MEMBER role (RBAC)', async () => {
    stubAuthProvider.registerTestToken('stub-member-expstat', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-member-expstat' },
    });

    const response = await getExportStats(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-EXPSTAT-003] returns 403 for cross-tenant access (isolation)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExportStats(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-EXPSTAT-004] returns export stats for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExportStats(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalExports).toBe(10);
    expect(data.expiredExports).toBe(2);
    expect(data.oldestExportAge).toBe(15);
    expect(data.retentionDays).toBe(7);
  });

  it('[RGPD-EXPSTAT-005] returns rgpdCompliant=true when no expired exports', async () => {
    mockGetExportStats.mockResolvedValue({
      totalCount: 5,
      expiredCount: 0,
      oldestAgeDays: 3,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExportStats(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(data.rgpdCompliant).toBe(true);
    expect(data.warning).toBeNull();
  });

  it('[RGPD-EXPSTAT-006] returns rgpdCompliant=false with warning when expired exports exist', async () => {
    mockGetExportStats.mockResolvedValue({
      totalCount: 10,
      expiredCount: 3,
      oldestAgeDays: 12,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExportStats(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(data.rgpdCompliant).toBe(false);
    expect(data.warning).toContain('3 export(s)');
    expect(data.warning).toContain('Art. 5.1.e');
  });

  it('[RGPD-EXPSTAT-007] handles empty exports gracefully', async () => {
    mockGetExportStats.mockResolvedValue({
      totalCount: 0,
      expiredCount: 0,
      oldestAgeDays: null,
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/stats', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getExportStats(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalExports).toBe(0);
    expect(data.oldestExportAge).toBeNull();
    expect(data.rgpdCompliant).toBe(true);
  });
});

// =============================================================================
// TESTS - EXPORT PURGE ENDPOINT (RGPD Art. 5.1.e Compliance)
// =============================================================================

describe('DELETE /api/tenants/:id/rgpd/exports/expired - LOT 12.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExportStats.mockResolvedValue({
      totalCount: 10,
      expiredCount: 2,
      oldestAgeDays: 15,
    });
    mockPurgeExpiredExports.mockResolvedValue(2);
    mockCleanupExpiredExports.mockResolvedValue(1);
  });

  it('[RGPD-PURGE-001] returns 401 for unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
    });
    const response = await purgeExpiredExports(request, createParams(TENANT_ID));

    expect(response.status).toBe(401);
  });

  it('[RGPD-PURGE-002] returns 403 for MEMBER role (RBAC)', async () => {
    stubAuthProvider.registerTestToken('stub-member-purge', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.MEMBER],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-member-purge' },
    });

    const response = await purgeExpiredExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-PURGE-003] returns 403 for cross-tenant access (isolation)', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await purgeExpiredExports(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(403);
  });

  it('[RGPD-PURGE-004] purges expired exports for TENANT_ADMIN', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await purgeExpiredExports(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.purgedCount).toBe(2);
    expect(data.filesCleanedUp).toBe(1);
    expect(data.retentionDays).toBe(7);
  });

  it('[RGPD-PURGE-005] calls repository purge method with correct tenant', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    await purgeExpiredExports(request, createParams(TENANT_ID));

    expect(mockPurgeExpiredExports).toHaveBeenCalledWith(TENANT_ID);
  });

  it('[RGPD-PURGE-006] returns appropriate message when nothing to purge', async () => {
    mockPurgeExpiredExports.mockResolvedValue(0);
    mockCleanupExpiredExports.mockResolvedValue(0);

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await purgeExpiredExports(request, createParams(TENANT_ID));
    const data = await response.json();

    expect(data.purgedCount).toBe(0);
    expect(data.message).toContain('Aucun export expiré');
  });

  it('[RGPD-PURGE-007] DPO role can purge exports', async () => {
    stubAuthProvider.registerTestToken('stub-dpo-purge', {
      actorId: 'dpo-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId: TENANT_ID,
      roles: [ACTOR_ROLE.DPO],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-dpo-purge' },
    });

    const response = await purgeExpiredExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(200);
  });

  it('[RGPD-PURGE-008] SUPERADMIN can purge any tenant exports', async () => {
    stubAuthProvider.registerTestToken('stub-superadmin-purge', {
      actorId: 'superadmin-1',
      actorScope: ACTOR_SCOPE.PLATFORM,
      tenantId: undefined,
      roles: [ACTOR_ROLE.SUPERADMIN],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-superadmin-purge' },
    });

    const response = await purgeExpiredExports(request, createParams(OTHER_TENANT_ID));
    expect(response.status).toBe(200);
  });

  it('[RGPD-PURGE-009] handles database errors gracefully', async () => {
    mockPurgeExpiredExports.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/exports/expired', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await purgeExpiredExports(request, createParams(TENANT_ID));
    expect(response.status).toBe(500);
  });
});
