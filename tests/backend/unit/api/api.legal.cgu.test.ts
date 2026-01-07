/**
 * API Endpoint Tests: /api/legal/cgu
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const mockFindActiveVersion = jest.fn();
const mockRecordAcceptance = jest.fn();
const mockWrite = jest.fn();

jest.mock('@/infrastructure/repositories/PgCguRepo', () => ({
  PgCguRepo: class {
    findActiveVersion = mockFindActiveVersion;
    recordAcceptance = mockRecordAcceptance;
  },
}));

jest.mock('@/infrastructure/audit/PgAuditEventWriter', () => ({
  PgAuditEventWriter: class {
    write = mockWrite;
  },
}));

import { GET, POST } from '@app/api/legal/cgu/route';

describe('API: /api/legal/cgu', () => {
  beforeEach(() => {
    mockFindActiveVersion.mockReset();
    mockRecordAcceptance.mockReset();
    mockWrite.mockReset();
  });

  it('returns active CGU version', async () => {
    mockFindActiveVersion.mockResolvedValue({
      id: 'cgu-1',
      version: '1.0.0',
      content: 'CGU content',
      effectiveDate: new Date('2025-01-01T00:00:00Z'),
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      summary: 'Summary',
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('cgu-1');
    expect(data.version).toBe('1.0.0');
    expect(data.isActive).toBe(true);
  });

  it('returns 404 when no active CGU exists', async () => {
    mockFindActiveVersion.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(404);
  });

  it('returns 500 when CGU lookup fails', async () => {
    mockFindActiveVersion.mockRejectedValue(new Error('boom'));

    const response = await GET();
    expect(response.status).toBe(500);
  });

  it('rejects acceptance without cguVersionId', async () => {
    const request = new Request('http://localhost/api/legal/cgu', {
      method: 'POST',
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects acceptance when tenant context is missing', async () => {
    const request = new Request('http://localhost/api/legal/cgu', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer stub-platform-super1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cguVersionId: 'cgu-1' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('records CGU acceptance for authenticated user', async () => {
    mockRecordAcceptance.mockResolvedValue({
      id: 'acc-1',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: 'tenant-admin-1',
      cguVersionId: 'cgu-1',
      acceptedAt: new Date('2025-01-02T00:00:00Z'),
      ipAddress: null,
      userAgent: null,
      acceptanceMethod: 'checkbox',
    });

    const request = new Request('http://localhost/api/legal/cgu', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer stub-tenant-admin1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cguVersionId: 'cgu-1', acceptanceMethod: 'checkbox' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.acceptance.userId).toBe('tenant-admin-1');
    expect(data.acceptance.cguVersionId).toBe('cgu-1');
    expect(mockWrite).toHaveBeenCalled();
  });

  it('returns 500 when acceptance recording fails', async () => {
    mockRecordAcceptance.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/legal/cgu', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer stub-tenant-admin1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cguVersionId: 'cgu-1' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
