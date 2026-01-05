/**
 * API Endpoint Tests: /api/tenants/:id/rgpd/*
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { stubAuthProvider } from '@/app/auth/stubAuthProvider';
import { ACTOR_SCOPE } from '@/shared/actorScope';

const mockListSuspendedByTenant = jest.fn();
const mockFindOppositionsByTenant = jest.fn();
const mockFindDisputesByTenant = jest.fn();

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: class {
    listSuspendedByTenant = mockListSuspendedByTenant;
  },
}));

jest.mock('@/infrastructure/repositories/PgOppositionRepo', () => ({
  PgOppositionRepo: class {
    findByTenant = mockFindOppositionsByTenant;
  },
}));

jest.mock('@/infrastructure/repositories/PgDisputeRepo', () => ({
  PgDisputeRepo: class {
    findByTenant = mockFindDisputesByTenant;
  },
}));

import { GET as getSuspensions } from '../app/api/tenants/[id]/rgpd/suspensions/route';
import { GET as getOppositions } from '../app/api/tenants/[id]/rgpd/oppositions/route';
import { GET as getContests } from '../app/api/tenants/[id]/rgpd/contests/route';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('API: /api/tenants/:id/rgpd/*', () => {
  beforeEach(() => {
    mockListSuspendedByTenant.mockReset();
    mockFindOppositionsByTenant.mockReset();
    mockFindDisputesByTenant.mockReset();
  });

  it('returns suspensions for tenant admin', async () => {
    mockListSuspendedByTenant.mockResolvedValue([
      {
        id: 'user-1',
        tenantId,
        emailHash: 'hash-1',
        displayName: 'User One',
        dataSuspendedAt: new Date('2025-01-01T00:00:00Z'),
        dataSuspendedReason: 'user_request',
      },
    ]);

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/suspensions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getSuspensions(request, { params: Promise.resolve({ id: tenantId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suspensions).toHaveLength(1);
    expect(data.suspensions[0].userId).toBe('user-1');
  });

  it('returns 404 when tenant id is missing', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/suspensions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getSuspensions(request, { params: Promise.resolve({ id: '' }) });
    expect(response.status).toBe(404);
  });

  it('rejects unauthenticated access', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/oppositions');
    const response = await getOppositions(request, { params: Promise.resolve({ id: tenantId }) });

    expect(response.status).toBe(401);
  });

  it('rejects tenant mismatch for tenant admin', async () => {
    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/oppositions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getOppositions(request, { params: Promise.resolve({ id: 'tenant-other' }) });
    expect(response.status).toBe(403);
  });

  it('rejects non-admin roles', async () => {
    stubAuthProvider.registerTestToken('stub-tenant-user', {
      actorId: 'user-1',
      actorScope: ACTOR_SCOPE.TENANT,
      tenantId,
      roles: ['USER'],
    });

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/suspensions', {
      headers: { Authorization: 'Bearer stub-tenant-user' },
    });

    const response = await getSuspensions(request, { params: Promise.resolve({ id: tenantId }) });
    expect(response.status).toBe(403);
  });

  it('returns contests for tenant admin', async () => {
    mockFindDisputesByTenant.mockResolvedValue([
      {
        id: 'disp-1',
        tenantId,
        userId: 'user-1',
        aiJobId: 'job-1',
        reason: 'Reason long enough',
        attachmentUrl: null,
        status: 'pending',
        adminResponse: null,
        reviewedBy: null,
        createdAt: new Date(),
        reviewedAt: null,
        resolvedAt: null,
      },
    ]);

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/contests', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getContests(request, { params: Promise.resolve({ id: tenantId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contests).toHaveLength(1);
    expect(data.contests[0].id).toBe('disp-1');
  });

  it('returns oppositions for tenant admin', async () => {
    mockFindOppositionsByTenant.mockResolvedValue([
      {
        id: 'opp-1',
        tenantId,
        userId: 'user-1',
        treatmentType: 'analytics',
        reason: 'Reason long enough',
        status: 'pending',
        adminResponse: null,
        reviewedBy: null,
        createdAt: new Date(),
        reviewedAt: null,
      },
    ]);

    const request = new NextRequest('http://localhost/api/tenants/id/rgpd/oppositions', {
      headers: { Authorization: 'Bearer stub-tenant-admin1' },
    });

    const response = await getOppositions(request, { params: Promise.resolve({ id: tenantId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.oppositions).toHaveLength(1);
    expect(data.oppositions[0].id).toBe('opp-1');
  });
});
