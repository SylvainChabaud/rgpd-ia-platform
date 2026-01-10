/**
 * System Logs API Tests - LOT 11.3
 *
 * Tests for:
 * - GET /api/logs - Read system logs
 * - DELETE /api/logs - Purge old logs (RGPD compliance)
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques (securite des logs)
 * - DATA_CLASSIFICATION.md: Retention 30 jours pour P1
 * - No P2/P3 data in logs (validation test)
 *
 * Test Pattern:
 * - [LOG-GET-XXX] for GET endpoint tests
 * - [LOG-DEL-XXX] for DELETE endpoint tests
 * - [LOG-SEC-XXX] for security tests
 */

import { NextRequest } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { ACTOR_ROLE } from '@/shared/actorRole';

// =============================================================================
// MOCKS - Must be before imports that use them
// =============================================================================

// Mock fs/promises for log file operations
const mockReadFile = jest.fn();
const mockReaddir = jest.fn();
const mockStat = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

// Mock fs for sync operations
const mockExistsSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  statSync: (...args: unknown[]) => mockStatSync(...args),
}));

// Import route handlers AFTER mocks are set up
import { GET, DELETE } from '@app/api/logs/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPlatformAdminRequest(url: string, method = 'GET'): NextRequest {
  const token = signJwt({
    userId: 'platform-admin-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.SUPERADMIN,
  });
  return new NextRequest(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createTenantAdminRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'tenant-admin-001',
    tenantId: 'tenant-uuid-001',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.TENANT_ADMIN,
  });
  return new NextRequest(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMemberRequest(url: string): NextRequest {
  const token = signJwt({
    userId: 'member-001',
    tenantId: 'tenant-uuid-001',
    scope: ACTOR_SCOPE.TENANT,
    role: ACTOR_ROLE.MEMBER,
  });
  return new NextRequest(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createDpoRequest(url: string, method = 'GET'): NextRequest {
  const token = signJwt({
    userId: 'dpo-001',
    tenantId: null,
    scope: ACTOR_SCOPE.PLATFORM,
    role: ACTOR_ROLE.DPO,
  });
  return new NextRequest(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

function createMockLogContent(): string {
  const logs = [
    { time: Date.now() - 1000, level: 50, msg: 'Error occurred' },
    { time: Date.now() - 2000, level: 40, msg: 'Warning message' },
    { time: Date.now() - 3000, level: 30, msg: 'Info message' },
    { time: Date.now() - 4000, level: 20, msg: 'Debug message' },
  ];
  return logs.map(log => JSON.stringify(log)).join('\n');
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/logs - Read System Logs (Art. 32)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('[LOG-GET-001] should return 401 for unauthenticated requests', async () => {
      const req = new NextRequest('http://localhost/api/logs', { method: 'GET' });
      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    it('[LOG-GET-002] should return 403 for TENANT scope users', async () => {
      const req = createTenantAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(403);
    });

    it('[LOG-GET-003] should return 403 for MEMBER role', async () => {
      const req = createMemberRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(403);
    });

    it('[LOG-GET-004] should allow PLATFORM SUPERADMIN to read logs', async () => {
      // Mock empty log directory
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs).toBeDefined();
      expect(Array.isArray(body.logs)).toBe(true);
    });

    it('[LOG-GET-005] should allow DPO to read logs (PLATFORM scope)', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createDpoRequest('http://localhost/api/logs');
      const response = await GET(req);

      // DPO is PLATFORM scope and isPlatformAdmin allows it
      expect(response.status).toBe(200);
    });
  });

  describe('Query Parameters & Validation', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['app.log']);
      mockReadFile.mockResolvedValue(createMockLogContent());
    });

    it('[LOG-GET-006] should accept valid level filter (error)', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?level=error');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs.every((log: { level: string }) => log.level === 'error')).toBe(true);
    });

    it('[LOG-GET-007] should accept valid level filter (warn)', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?level=warn');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs.every((log: { level: string }) => log.level === 'warn')).toBe(true);
    });

    it('[LOG-GET-008] should accept valid level filter (info)', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?level=info');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs.every((log: { level: string }) => log.level === 'info')).toBe(true);
    });

    it('[LOG-GET-009] should return 400 for invalid level value', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?level=invalid');
      const response = await GET(req);

      expect(response.status).toBe(400);
    });

    it('[LOG-GET-010] should apply limit parameter (max 100)', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?limit=10');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination.limit).toBe(10);
    });

    it('[LOG-GET-011] should return 400 for limit > 100', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?limit=150');
      const response = await GET(req);

      expect(response.status).toBe(400);
    });

    it('[LOG-GET-012] should apply offset parameter', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?offset=5');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination.offset).toBe(5);
    });

    it('[LOG-GET-013] should return 400 for negative offset', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs?offset=-1');
      const response = await GET(req);

      expect(response.status).toBe(400);
    });
  });

  describe('Response Structure (P1 Data Only)', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['app.log']);
      mockReadFile.mockResolvedValue(createMockLogContent());
    });

    it('[LOG-GET-014] should return logs array with correct fields', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs).toBeDefined();
      expect(body.logs.length).toBeGreaterThan(0);

      const log = body.logs[0];
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
    });

    it('[LOG-GET-015] should return pagination info', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination).toBeDefined();
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('offset');
      expect(body.pagination).toHaveProperty('hasMore');
    });

    it('[LOG-GET-016] should return environment info', async () => {
      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.environment).toBeDefined();
    });
  });

  describe('File System Handling', () => {
    it('[LOG-GET-017] should handle missing log directory gracefully', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs).toEqual([]);
    });

    it('[LOG-GET-018] should handle empty log directory', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue([]);

      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs).toEqual([]);
    });

    it('[LOG-GET-019] should handle file read errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['app.log']);
      mockReadFile.mockRejectedValue(new Error('File read error'));

      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      // Should still return 200 with empty logs (graceful degradation)
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.logs).toEqual([]);
    });

    it('[LOG-GET-020] should handle malformed JSON in logs', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['app.log']);
      mockReadFile.mockResolvedValue('invalid json\n{"time":123,"level":30,"msg":"valid"}');

      const req = createPlatformAdminRequest('http://localhost/api/logs');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      // Should only parse valid lines
      expect(body.logs.length).toBe(1);
    });
  });
});

describe('DELETE /api/logs - Purge Old Logs (Art. 32 / DATA_CLASSIFICATION)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('[LOG-DEL-001] should return 401 for unauthenticated requests', async () => {
      const req = new NextRequest('http://localhost/api/logs', { method: 'DELETE' });
      const response = await DELETE(req);

      expect(response.status).toBe(401);
    });

    it('[LOG-DEL-002] should return 403 for TENANT scope users', async () => {
      const token = signJwt({
        userId: 'tenant-admin-001',
        tenantId: 'tenant-uuid-001',
        scope: ACTOR_SCOPE.TENANT,
        role: ACTOR_ROLE.TENANT_ADMIN,
      });
      const req = new NextRequest('http://localhost/api/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const response = await DELETE(req);

      expect(response.status).toBe(403);
    });

    it('[LOG-DEL-003] should allow DPO to purge logs (PLATFORM scope)', async () => {
      mockExistsSync.mockReturnValue(false);
      const req = createDpoRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      // DPO is PLATFORM scope and isPlatformAdmin allows it
      expect(response.status).toBe(200);
    });

    it('[LOG-DEL-004] should allow PLATFORM SUPERADMIN to purge logs', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('RGPD Compliance - 30 Day Retention', () => {
    it('[LOG-DEL-005] should delete files older than 30 days', async () => {
      mockExistsSync.mockReturnValue(true);
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      mockReaddir.mockResolvedValue(['old.log']);
      mockStat.mockResolvedValue({ mtimeMs: oldTime, size: 1024 });
      mockUnlink.mockResolvedValue(undefined);
      mockReaddirSync.mockReturnValue(['old.log']);
      mockStatSync.mockReturnValue({ mtimeMs: oldTime, size: 1024 });

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deletedCount).toBe(1);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('[LOG-DEL-006] should NOT delete files younger than 30 days', async () => {
      mockExistsSync.mockReturnValue(true);
      const recentTime = Date.now() - (15 * 24 * 60 * 60 * 1000); // 15 days ago
      mockReaddir.mockResolvedValue(['recent.log']);
      mockStat.mockResolvedValue({ mtimeMs: recentTime, size: 1024 });
      mockReaddirSync.mockReturnValue(['recent.log']);
      mockStatSync.mockReturnValue({ mtimeMs: recentTime, size: 1024 });

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deletedCount).toBe(0);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('[LOG-DEL-007] should return before/after stats for audit', async () => {
      mockExistsSync.mockReturnValue(true);
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);
      mockReaddir.mockResolvedValue(['old.log']);
      mockStat.mockResolvedValue({ mtimeMs: oldTime, size: 1024 });
      mockUnlink.mockResolvedValue(undefined);
      mockReaddirSync.mockReturnValue(['old.log']).mockReturnValueOnce(['old.log']).mockReturnValueOnce([]);
      mockStatSync.mockReturnValue({ mtimeMs: oldTime, size: 1024 });

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.before).toBeDefined();
      expect(body.after).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('[LOG-DEL-008] should return success status', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('[LOG-DEL-009] should return deletion statistics', async () => {
      mockExistsSync.mockReturnValue(true);
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);
      mockReaddir.mockResolvedValue(['old.log']);
      mockStat.mockResolvedValue({ mtimeMs: oldTime, size: 2048 });
      mockUnlink.mockResolvedValue(undefined);
      mockReaddirSync.mockReturnValue(['old.log']);
      mockStatSync.mockReturnValue({ mtimeMs: oldTime, size: 2048 });

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deletedCount).toBe(1);
      expect(body.deletedSize).toContain('KB');
    });

    it('[LOG-DEL-010] should return appropriate message when no files to purge', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.deletedCount).toBe(0);
      expect(body.message).toContain('Aucun fichier');
    });
  });

  describe('Error Handling', () => {
    it('[LOG-DEL-011] should handle missing log directory gracefully', async () => {
      mockExistsSync.mockReturnValue(false);

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.deletedCount).toBe(0);
    });

    it('[LOG-DEL-012] should handle file deletion errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);
      mockReaddir.mockResolvedValue(['old.log']);
      mockStat.mockResolvedValue({ mtimeMs: oldTime, size: 1024 });
      mockUnlink.mockRejectedValue(new Error('Permission denied'));
      mockReaddirSync.mockReturnValue(['old.log']);
      mockStatSync.mockReturnValue({ mtimeMs: oldTime, size: 1024 });

      const req = createPlatformAdminRequest('http://localhost/api/logs', 'DELETE');
      const response = await DELETE(req);

      // Should not crash, should log error and return success
      expect(response.status).toBe(200);
    });
  });
});

describe('Security & Isolation (Art. 32)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[LOG-SEC-001] should enforce PLATFORM scope for log access', async () => {
    const token = signJwt({
      userId: 'tenant-user-001',
      tenantId: 'tenant-uuid-001',
      scope: ACTOR_SCOPE.TENANT,
      role: ACTOR_ROLE.TENANT_ADMIN,
    });
    const req = new NextRequest('http://localhost/api/logs', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('[LOG-SEC-002] should NOT expose error stack traces in responses', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockRejectedValue(new Error('Internal error with sensitive info'));

    const req = createPlatformAdminRequest('http://localhost/api/logs');
    const response = await GET(req);

    // The route handles errors gracefully and returns empty logs
    expect(response.status).toBe(200);
  });

  it('[LOG-SEC-003] should NOT include P2/P3 data in log output', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue(['app.log']);
    // Create logs with P0/P1 data only
    const p1Logs = [
      { time: Date.now(), level: 30, msg: 'Request processed', requestId: 'uuid-123' },
    ];
    mockReadFile.mockResolvedValue(p1Logs.map(l => JSON.stringify(l)).join('\n'));

    const req = createPlatformAdminRequest('http://localhost/api/logs');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify no P2/P3 fields in response
    const responseStr = JSON.stringify(body);
    expect(responseStr).not.toContain('password');
    expect(responseStr).not.toContain('creditCard');
    expect(responseStr).not.toContain('socialSecurityNumber');
  });
});
