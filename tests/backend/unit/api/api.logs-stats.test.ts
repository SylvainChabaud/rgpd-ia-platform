/**
 * Logs Stats API Tests - LOT 11.3
 *
 * Tests for GET /api/logs/stats
 *
 * RGPD Compliance:
 * - DATA_CLASSIFICATION.md: 30 days retention for P1 logs
 * - Dashboard for RGPD compliance monitoring
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS
// =============================================================================

const mockExistsSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  statSync: (...args: unknown[]) => mockStatSync(...args),
}));

// Import route handler AFTER mocking
import { GET } from '@app/api/logs/stats/route';

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

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/logs/stats - Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it('[LOG-STATS-001] should return 401 for unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/logs/stats');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('[LOG-STATS-002] should return 403 for TENANT scope users', async () => {
    const req = createTenantAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[LOG-STATS-003] should return 403 for MEMBER role', async () => {
    const req = createMemberRequest('http://localhost/api/logs/stats');
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[LOG-STATS-004] should allow PLATFORM SUPERADMIN', async () => {
    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('[LOG-STATS-005] should allow DPO (PLATFORM scope)', async () => {
    const req = createDpoRequest('http://localhost/api/logs/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});

describe('GET /api/logs/stats - Response Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[LOG-STATS-006] should return stats when log directory exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log', 'app.1.log']);
    const recentTime = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    mockStatSync.mockReturnValue({ size: 1024, mtimeMs: recentTime });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('totalFiles');
    expect(body).toHaveProperty('totalSize');
    expect(body).toHaveProperty('totalSizeFormatted');
    expect(body).toHaveProperty('oldestFileAge');
    expect(body).toHaveProperty('rgpdCompliant');
  });

  it('[LOG-STATS-007] should return empty stats when directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalFiles).toBe(0);
    expect(body.totalSize).toBe(0);
    expect(body.rgpdCompliant).toBe(true);
  });

  it('[LOG-STATS-008] should return formatted size in KB', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log']);
    mockStatSync.mockReturnValue({ size: 2048, mtimeMs: Date.now() });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.totalSizeFormatted).toContain('KB');
  });
});

describe('GET /api/logs/stats - RGPD Compliance (30 days)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[LOG-STATS-009] should be RGPD compliant when logs < 30 days', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log']);
    const recentTime = Date.now() - 15 * 24 * 60 * 60 * 1000; // 15 days ago
    mockStatSync.mockReturnValue({ size: 1024, mtimeMs: recentTime });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.rgpdCompliant).toBe(true);
    expect(body.warning).toBeNull();
  });

  it('[LOG-STATS-010] should NOT be compliant when logs > 30 days', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['old.log']);
    const oldTime = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
    mockStatSync.mockReturnValue({ size: 1024, mtimeMs: oldTime });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.rgpdCompliant).toBe(false);
    expect(body.warning).toBeTruthy();
    expect(body.warning).toContain('30 jours');
  });

  it('[LOG-STATS-011] should return correct oldest file age', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log']);
    const daysAgo = 20;
    const oldTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    mockStatSync.mockReturnValue({ size: 1024, mtimeMs: oldTime });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.oldestFileAge).toBe(daysAgo);
  });
});

describe('GET /api/logs/stats - File Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[LOG-STATS-012] should only count .log files', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log', 'app.1.log', 'readme.txt', 'config.json']);
    mockStatSync.mockReturnValue({ size: 1024, mtimeMs: Date.now() });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.totalFiles).toBe(2); // Only .log files
  });

  it('[LOG-STATS-013] should handle empty log directory', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    expect(body.totalFiles).toBe(0);
    expect(body.rgpdCompliant).toBe(true);
  });

  it('[LOG-STATS-014] should handle file stat errors gracefully', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['app.log', 'locked.log']);
    mockStatSync
      .mockReturnValueOnce({ size: 1024, mtimeMs: Date.now() })
      .mockImplementationOnce(() => {
        throw new Error('EPERM: permission denied');
      });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    // Should still return stats for the accessible file
    expect(response.status).toBe(200);
    expect(body.totalFiles).toBe(1);
  });
});

describe('GET /api/logs/stats - Error Handling', () => {
  it('[LOG-STATS-015] should handle directory read errors', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation(() => {
      throw new Error('Directory read error');
    });

    const req = createPlatformAdminRequest('http://localhost/api/logs/stats');
    const response = await GET(req);
    const body = await response.json();

    // Should gracefully return empty stats
    expect(response.status).toBe(200);
    expect(body.totalFiles).toBe(0);
  });
});
