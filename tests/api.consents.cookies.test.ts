/**
 * API Endpoint Tests: /api/consents/cookies
 *
 * RGPD: ePrivacy Directive Art. 5.3
 * Classification: P1
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/infrastructure/repositories/PgCookieConsentRepo', () => {
  const mockFindByUser = jest.fn();
  const mockFindByAnonymousId = jest.fn();
  const mockSave = jest.fn();
  return {
    PgCookieConsentRepo: class {
      findByUser = mockFindByUser;
      findByAnonymousId = mockFindByAnonymousId;
      save = mockSave;
    },
    __mocks: {
      mockFindByUser,
      mockFindByAnonymousId,
      mockSave,
    },
  };
});

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => {
  const mockWrite = jest.fn();
  return {
    PgAuditEventWriter: class {
      write = mockWrite;
    },
    __mocks: {
      mockWrite,
    },
  };
});

const { __mocks: consentRepoMocks } = jest.requireMock(
  '@/infrastructure/repositories/PgCookieConsentRepo'
) as {
  __mocks: {
    mockFindByUser: jest.Mock;
    mockFindByAnonymousId: jest.Mock;
    mockSave: jest.Mock;
  };
};

const { __mocks: auditWriterMocks } = jest.requireMock(
  '@/infrastructure/audit/PgAuditEventWriter'
) as {
  __mocks: {
    mockWrite: jest.Mock;
  };
};

const { mockFindByUser, mockFindByAnonymousId, mockSave } = consentRepoMocks;
const { mockWrite } = auditWriterMocks;

import { GET, POST } from '../app/api/consents/cookies/route';

function buildConsent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'consent-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    anonymousId: null,
    necessary: true,
    analytics: false,
    marketing: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000),
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

describe('API: /api/consents/cookies', () => {
  beforeEach(() => {
    mockFindByUser.mockReset();
    mockFindByAnonymousId.mockReset();
    mockSave.mockReset();
    mockWrite.mockReset();
  });

  describe('GET /api/consents/cookies', () => {
    it('returns cookie consent for authenticated user', async () => {
      mockFindByUser.mockResolvedValue(buildConsent({ analytics: true }));

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.necessary).toBe(true);
      expect(data.analytics).toBe(true);
      expect(data.marketing).toBe(false);
    });

    it('returns cookie consent for anonymous visitor', async () => {
      mockFindByAnonymousId.mockResolvedValue(
        buildConsent({ userId: null, anonymousId: 'anon-123', analytics: false })
      );

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        headers: {
          cookie: 'cookie_consent_id=anon-123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.anonymousId).toBe('anon-123');
    });

    it('returns 404 when no consent exists', async () => {
      mockFindByUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it('returns 404 when no identifiers are provided', async () => {
      const request = new NextRequest('http://localhost/api/consents/cookies');

      const response = await GET(request);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/consents/cookies', () => {
    it('saves consent for authenticated user', async () => {
      mockSave.mockResolvedValue(
        buildConsent({ analytics: true, marketing: false, anonymousId: null })
      );

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ analytics: true, marketing: false }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.necessary).toBe(true);
      expect(data.analytics).toBe(true);
      expect(data.marketing).toBe(false);
    });

    it('saves consent for anonymous visitor', async () => {
      mockSave.mockResolvedValue(
        buildConsent({
          tenantId: null,
          userId: null,
          anonymousId: 'anon-456',
          analytics: false,
          marketing: false,
        })
      );

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'cookie_consent_id=anon-456',
        },
        body: JSON.stringify({ analytics: false, marketing: false }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.anonymousId).toBe('anon-456');
      expect(data.necessary).toBe(true);
      expect(data.analytics).toBe(false);
    });

    it('generates anonymous id when none is provided', async () => {
      mockSave.mockResolvedValue(
        buildConsent({
          tenantId: null,
          userId: null,
          anonymousId: 'anon-generated',
          analytics: false,
          marketing: false,
        })
      );

      const request = new NextRequest('http://localhost/api/consents/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analytics: false, marketing: false }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.anonymousId).toBeTruthy();
    });
  });
});
