/**
 * Next.js Middleware
 * LOT 5.3 - API Layer
 *
 * CORS Configuration + Page Route Protection
 *
 * SECURITY:
 * - CORS: Only allow configured origins for API routes
 * - AUTH: Server-side JWT verification for protected page routes
 * - SCOPE: Enforce PLATFORM scope for /admin/*, TENANT scope for /portal/*
 *
 * RGPD Compliance:
 * - JWT cookie is HTTP-only (not accessible via JavaScript)
 * - Cookie cleared on logout
 * - No sensitive data logged
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// JWT verification inline (can't import from src/lib/jwt.ts in edge runtime)
function verifyJwtMiddleware(token: string): { scope: string; tenantId: string | null } | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return { scope: payload.scope, tenantId: payload.tenantId };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // PAGE ROUTE PROTECTION (/admin/*, /portal/*)
  // ============================================

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // No token - redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyJwtMiddleware(token);

    if (!payload) {
      // Invalid/expired token - redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }

    // Check PLATFORM scope for /admin/* routes
    if (payload.scope !== 'PLATFORM') {
      // Wrong scope - redirect to appropriate interface
      if (payload.scope === 'TENANT') {
        return NextResponse.redirect(new URL('/portal', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Authorized - continue
    return NextResponse.next();
  }

  if (pathname.startsWith('/portal')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyJwtMiddleware(token);

    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }

    // Check TENANT scope for /portal/* routes
    if (payload.scope !== 'TENANT') {
      if (payload.scope === 'PLATFORM') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  // ============================================
  // API CORS HANDLING (/api/*)
  // ============================================

  if (pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

    const response = NextResponse.next();

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ['/api/:path*', '/admin', '/admin/:path*', '/portal', '/portal/:path*'],
};
