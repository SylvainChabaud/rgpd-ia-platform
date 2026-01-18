/**
 * Tests for Authentication Middleware
 * LOT 5.3 - API Layer
 *
 * Coverage targets for middleware/auth.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/middleware/auth';
import { signJwt } from '@/lib/jwt';
import { ACTOR_SCOPE } from '@/shared/actorScope';

describe('withAuth middleware', () => {
  const mockHandler = jest.fn(async (_req: NextRequest) => 
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    mockHandler.mockClear();
  });

  test('rejects request without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/test');
    const wrappedHandler = withAuth(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects request with invalid Authorization format', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'InvalidFormat' },
    });
    const wrappedHandler = withAuth(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('rejects request with invalid JWT token', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    const wrappedHandler = withAuth(mockHandler);

    const response = await wrappedHandler(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('accepts request with valid JWT and calls handler', async () => {
    const token = signJwt({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: 'admin',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wrappedHandler = withAuth(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('attaches user context to request', async () => {
    const token = signJwt({
      userId: 'user-1',
      tenantId: 'tenant-1',
      scope: ACTOR_SCOPE.TENANT,
      role: 'admin',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: `Bearer ${token}` },
    });

    let capturedReq: NextRequest | null = null;
    const captureHandler = jest.fn(async (r: NextRequest) => {
      capturedReq = r;
      return NextResponse.json({ success: true });
    });

    const wrappedHandler = withAuth(captureHandler);
    await wrappedHandler(req);

    expect(capturedReq).not.toBeNull();
    const user = (capturedReq! as NextRequest & { user?: unknown }).user as {
      userId: string;
      tenantId: string;
      scope: string;
      role: string;
    };
    expect(user.userId).toBe('user-1');
    expect(user.tenantId).toBe('tenant-1');
    expect(user.scope).toBe('TENANT');
    expect(user.role).toBe('admin');
  });
});

describe('withOptionalAuth middleware', () => {
  const mockHandler = jest.fn(async (_req: NextRequest) => 
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    mockHandler.mockClear();
  });

  test('calls handler without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/test');
    const wrappedHandler = withOptionalAuth(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('calls handler with invalid Authorization format', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'InvalidFormat' },
    });
    const wrappedHandler = withOptionalAuth(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('calls handler with invalid JWT (continues without auth)', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    const wrappedHandler = withOptionalAuth(mockHandler);

    const response = await wrappedHandler(req);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('attaches user context when valid JWT provided', async () => {
    const token = signJwt({
      userId: 'user-1',
      tenantId: null,
      scope: ACTOR_SCOPE.PLATFORM,
      role: 'SUPERADMIN',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: `Bearer ${token}` },
    });

    let capturedReq: NextRequest | null = null;
    const captureHandler = jest.fn(async (r: NextRequest) => {
      capturedReq = r;
      return NextResponse.json({ success: true });
    });

    const wrappedHandler = withOptionalAuth(captureHandler);
    await wrappedHandler(req);

    expect(capturedReq).not.toBeNull();
    const user = (capturedReq! as NextRequest & { user?: unknown }).user as {
      userId: string;
      scope: string;
    };
    expect(user.userId).toBe('user-1');
    expect(user.scope).toBe('PLATFORM');
  });
});
