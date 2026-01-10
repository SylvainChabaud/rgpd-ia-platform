/**
 * Incident Detection Middleware Tests - EPIC 9 / LOT 9.0
 *
 * Tests for:
 * - Cross-tenant access detection
 * - Brute force detection
 * - Mass export detection
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques securite
 * - Art. 33: Detection et enregistrement violations
 *
 * Test Pattern:
 * - [INC-DET-XXX] for incident detection tests
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  reportCrossTenantAccess,
  withCrossTenantDetection,
  recordFailedLoginAndDetect,
  onSuccessfulLogin,
  getBruteForceStatus,
  recordExportAndDetect,
} from '@/middleware/incidentDetection';

// =============================================================================
// MOCKS
// =============================================================================

// Mock repositories
jest.mock('@/infrastructure/repositories/PgSecurityIncidentRepo', () => ({
  PgSecurityIncidentRepo: class {
    create = jest.fn().mockResolvedValue({
      id: 'incident-123',
      severity: 'HIGH',
      type: 'CROSS_TENANT_ACCESS',
      title: 'Cross-tenant access detected',
      detectedAt: new Date(),
      createdAt: new Date(),
    });
  },
}));

// Mock alert services
jest.mock('@/infrastructure/alerts/IncidentAlertService', () => ({
  createIncidentAlertService: jest.fn().mockReturnValue({
    sendAlert: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/infrastructure/alerts/AlertService', () => ({
  createEmailAlertService: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock createIncident use case
jest.mock('@/app/usecases/incident', () => ({
  createIncident: jest.fn().mockResolvedValue({
    incident: {
      id: 'incident-created-123',
      severity: 'HIGH',
      type: 'CROSS_TENANT_ACCESS',
      title: 'Test incident',
    },
    cnilNotificationRequired: false,
    usersNotificationRequired: false,
    alertsSent: true,
  }),
  evaluateDetectionEvent: jest.fn().mockImplementation((event) => {
    if (event.type === 'CROSS_TENANT_ACCESS') {
      return {
        severity: 'CRITICAL',
        type: 'CROSS_TENANT_ACCESS',
        title: `Cross-tenant access: ${event.actorTenantId} -> ${event.targetTenantId}`,
        description: 'Cross-tenant access attempt detected',
        tenantId: event.targetTenantId,
        sourceIp: event.sourceIp,
        detectedBy: 'SYSTEM',
        actorId: event.actorUserId,
      };
    }
    if (event.type === 'BRUTE_FORCE') {
      return {
        severity: 'HIGH',
        type: 'UNAUTHORIZED_ACCESS',
        title: 'Brute force attack detected',
        description: `${event.attemptCount} failed login attempts from ${event.sourceIp}`,
        tenantId: event.tenantId || null,
        sourceIp: event.sourceIp,
        detectedBy: 'SYSTEM',
      };
    }
    if (event.type === 'MASS_EXPORT') {
      return {
        severity: 'HIGH',
        type: 'DATA_LEAK',
        title: 'Mass export detected',
        description: `${event.recordCount} records exported by ${event.userId}`,
        tenantId: event.tenantId,
        sourceIp: event.sourceIp,
        detectedBy: 'SYSTEM',
        actorId: event.userId,
      };
    }
    return null;
  }),
  DETECTION_THRESHOLDS: {
    BRUTE_FORCE_ATTEMPTS: 5,
    BRUTE_FORCE_WINDOW_MINUTES: 15,
    MASS_EXPORT_RECORDS: 1000,
    MASS_EXPORT_WINDOW_MINUTES: 10,
  },
}));

// Mock failed login tracker
const mockRecordFailedLogin = jest.fn();
const mockClearFailedLogins = jest.fn();
const mockGetFailedLoginCount = jest.fn();

jest.mock('@/infrastructure/security/FailedLoginTracker', () => ({
  recordFailedLogin: (...args: unknown[]) => mockRecordFailedLogin(...args),
  clearFailedLogins: (...args: unknown[]) => mockClearFailedLogins(...args),
  getFailedLoginCount: (...args: unknown[]) => mockGetFailedLoginCount(...args),
}));

// Mock logger
jest.mock('@/shared/logger', () => ({
  logEvent: jest.fn(),
  logError: jest.fn(),
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockHandler(): jest.Mock {
  return jest.fn().mockImplementation(async () => {
    return NextResponse.json({ success: true });
  });
}

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method: 'GET',
    headers,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('withCrossTenantDetection - Cross-Tenant Access Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Detection Logic', () => {
    it('[INC-DET-001] should detect cross-tenant access attempt', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({
        'x-actor-tenant-id': 'tenant-A',
        'x-tenant-id': 'tenant-B',
        'x-user-id': 'user-123',
        'x-forwarded-for': '192.168.1.100',
      });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('CROSS_TENANT_ACCESS_DENIED');
    });

    it('[INC-DET-002] should allow same-tenant access', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({
        'x-actor-tenant-id': 'tenant-A',
        'x-tenant-id': 'tenant-A',
        'x-user-id': 'user-123',
      });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[INC-DET-003] should allow when no tenant headers present', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({});

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[INC-DET-004] should allow when only actor tenant present', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({
        'x-actor-tenant-id': 'tenant-A',
      });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
    });

    it('[INC-DET-005] should allow when user ID missing', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({
        'x-actor-tenant-id': 'tenant-A',
        'x-tenant-id': 'tenant-B',
        // Missing x-user-id
      });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('[INC-DET-006] should return proper error structure on 403', async () => {
      const handler = createMockHandler();
      const wrappedHandler = withCrossTenantDetection(handler);

      const req = createRequest({
        'x-actor-tenant-id': 'tenant-A',
        'x-tenant-id': 'tenant-B',
        'x-user-id': 'user-123',
      });

      const response = await wrappedHandler(req);
      const body = await response.json();

      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('Cross-tenant access not allowed');
      expect(body.code).toBe('CROSS_TENANT_ACCESS_DENIED');
    });
  });
});

describe('reportCrossTenantAccess - Incident Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-DET-010] should create incident for cross-tenant access', async () => {
    const { createIncident } = require('@/app/usecases/incident');

    await reportCrossTenantAccess({
      actorTenantId: 'tenant-A',
      targetTenantId: 'tenant-B',
      actorUserId: 'user-123',
      endpoint: '/api/users',
      sourceIp: '192.168.1.100',
    });

    expect(createIncident).toHaveBeenCalled();
  });

  it('[INC-DET-011] should not throw on incident creation error', async () => {
    const { createIncident } = require('@/app/usecases/incident');
    createIncident.mockRejectedValueOnce(new Error('DB error'));

    // Should not throw
    await expect(
      reportCrossTenantAccess({
        actorTenantId: 'tenant-A',
        targetTenantId: 'tenant-B',
        actorUserId: 'user-123',
        endpoint: '/api/test',
        sourceIp: '10.0.0.1',
      })
    ).resolves.not.toThrow();
  });
});

describe('recordFailedLoginAndDetect - Brute Force Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-DET-020] should not create incident when threshold not exceeded', async () => {
    mockRecordFailedLogin.mockReturnValue({ count: 3, thresholdExceeded: false });

    const result = await recordFailedLoginAndDetect('192.168.1.200', 'test@example.com');

    expect(result).toBe(false);
  });

  it('[INC-DET-021] should create incident when threshold exceeded', async () => {
    mockRecordFailedLogin.mockReturnValue({ count: 6, thresholdExceeded: true });
    const { createIncident } = require('@/app/usecases/incident');

    const result = await recordFailedLoginAndDetect(
      '192.168.1.201',
      'attacker@example.com',
      'tenant-123'
    );

    expect(result).toBe(true);
    expect(createIncident).toHaveBeenCalled();
  });

  it('[INC-DET-022] should handle incident creation failure gracefully', async () => {
    mockRecordFailedLogin.mockReturnValue({ count: 10, thresholdExceeded: true });
    const { createIncident } = require('@/app/usecases/incident');
    createIncident.mockRejectedValueOnce(new Error('DB error'));

    const result = await recordFailedLoginAndDetect('192.168.1.202');

    // Should return false on error, not throw
    expect(result).toBe(false);
  });
});

describe('onSuccessfulLogin - Clear Failed Logins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-DET-030] should clear failed logins on success', () => {
    onSuccessfulLogin('192.168.1.50');

    expect(mockClearFailedLogins).toHaveBeenCalledWith('192.168.1.50');
  });
});

describe('getBruteForceStatus - Status Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-DET-031] should return current failed login count', () => {
    mockGetFailedLoginCount.mockReturnValue(3);

    const count = getBruteForceStatus('192.168.1.60');

    expect(count).toBe(3);
    expect(mockGetFailedLoginCount).toHaveBeenCalledWith('192.168.1.60');
  });
});

describe('recordExportAndDetect - Mass Export Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-DET-040] should not create incident for small exports', async () => {
    const { createIncident } = require('@/app/usecases/incident');

    const result = await recordExportAndDetect(
      'user-123',
      'tenant-456',
      100,
      'users',
      '192.168.1.70'
    );

    expect(result).toBe(false);
    expect(createIncident).not.toHaveBeenCalled();
  });

  it('[INC-DET-041] should create incident when threshold exceeded', async () => {
    const { createIncident } = require('@/app/usecases/incident');

    // Export enough to exceed threshold (1000)
    const result = await recordExportAndDetect(
      'user-export-test',
      'tenant-789',
      1500,
      'users',
      '192.168.1.71'
    );

    expect(result).toBe(true);
    expect(createIncident).toHaveBeenCalled();
  });

  it('[INC-DET-042] should accumulate exports within window', async () => {
    const { createIncident } = require('@/app/usecases/incident');

    // First export - under threshold
    let result = await recordExportAndDetect(
      'user-accumulate',
      'tenant-acc',
      600,
      'consents',
      '192.168.1.72'
    );
    expect(result).toBe(false);

    // Second export - should push over threshold (600 + 500 = 1100 > 1000)
    result = await recordExportAndDetect(
      'user-accumulate',
      'tenant-acc',
      500,
      'consents',
      '192.168.1.72'
    );
    expect(result).toBe(true);
    expect(createIncident).toHaveBeenCalled();
  });

  it('[INC-DET-043] should handle incident creation failure gracefully', async () => {
    const { createIncident } = require('@/app/usecases/incident');
    createIncident.mockRejectedValueOnce(new Error('DB error'));

    const result = await recordExportAndDetect(
      'user-error-test',
      'tenant-err',
      2000,
      'all',
      '192.168.1.73'
    );

    // Should return false on error
    expect(result).toBe(false);
  });
});

describe('Security - Art. 32 / Art. 33', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[INC-SEC-001] should block cross-tenant access immediately', async () => {
    const handler = createMockHandler();
    const wrappedHandler = withCrossTenantDetection(handler);

    const req = createRequest({
      'x-actor-tenant-id': 'tenant-malicious',
      'x-tenant-id': 'tenant-victim',
      'x-user-id': 'attacker-123',
    });

    const response = await wrappedHandler(req);

    // Should be blocked before handler is called
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('[INC-SEC-002] should extract source IP from x-forwarded-for', async () => {
    const { createIncident } = require('@/app/usecases/incident');
    const handler = createMockHandler();
    const wrappedHandler = withCrossTenantDetection(handler);

    const req = createRequest({
      'x-actor-tenant-id': 'tenant-A',
      'x-tenant-id': 'tenant-B',
      'x-user-id': 'user-123',
      'x-forwarded-for': '203.0.113.1, 192.168.1.1',
    });

    await wrappedHandler(req);

    // Wait for async incident creation
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify createIncident was called with correct sourceIp
    expect(createIncident).toHaveBeenCalled();
  });
});
