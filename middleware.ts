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
import { COOKIE_NAMES } from '@/lib/constants/cookies';
import { AUTH_ROUTES, ADMIN_ROUTES, PORTAL_ROUTES } from '@/lib/constants/routes';

/**
 * Base64URL encode (Edge Runtime compatible, matches Node.js digest('base64url'))
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL decode (Edge Runtime compatible)
 */
function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with = if necessary
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * JWT verification using Web Crypto API (Edge Runtime compatible)
 */
async function verifyJwtMiddleware(token: string): Promise<{ scope: string; tenantId: string | null; cguAccepted?: boolean } | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureData = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    // Convert to base64url (matches Node.js digest('base64url'))
    const expectedSignature = base64UrlEncode(signatureData);

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return { scope: payload.scope, tenantId: payload.tenantId, cguAccepted: payload.cguAccepted };
  } catch {
    return null;
  }
}

/**
 * Scope redirect mapping
 * Defines where each scope should be redirected when accessing wrong routes
 */
const SCOPE_REDIRECTS: Record<string, string> = {
  PLATFORM: ADMIN_ROUTES.BASE,
  TENANT: PORTAL_ROUTES.BASE,
  MEMBER: '/app',
};

/**
 * Protect a route based on required scope
 *
 * @param request - Next.js request object
 * @param requiredScope - The scope required to access this route
 * @returns NextResponse (redirect or next) or null if should continue to next check
 */
async function protectRoute(
  request: NextRequest,
  requiredScope: 'PLATFORM' | 'TENANT' | 'MEMBER'
): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE_NAMES.AUTH_TOKEN)?.value;

  // No token - redirect to login
  if (!token) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
  }

  const payload = await verifyJwtMiddleware(token);

  // Invalid/expired token - clear cookie and redirect to login
  if (!payload) {
    const response = NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
    response.cookies.delete(COOKIE_NAMES.AUTH_TOKEN);
    return response;
  }

  // Check if user has the required scope
  if (payload.scope !== requiredScope) {
    // Redirect to appropriate interface based on user's actual scope
    const redirectUrl = SCOPE_REDIRECTS[payload.scope];
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    // Unknown scope - redirect to login
    return NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
  }

  // Authorized - continue
  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // PAGE ROUTE PROTECTION
  // Uses protectRoute helper for DRY code
  // ============================================

  // /admin/* requires PLATFORM scope
  if (pathname.startsWith('/admin')) {
    return await protectRoute(request, 'PLATFORM');
  }

  // /portal/* requires TENANT scope
  if (pathname.startsWith('/portal')) {
    return await protectRoute(request, 'TENANT');
  }

  // /app/* requires MEMBER scope + CGU accepted (LOT 13.0, Art. 7 RGPD)
  if (pathname.startsWith('/app')) {
    const token = request.cookies.get(COOKIE_NAMES.AUTH_TOKEN)?.value;

    // No token - redirect to login
    if (!token) {
      return NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
    }

    const payload = await verifyJwtMiddleware(token);

    // Invalid/expired token - clear cookie and redirect to login
    if (!payload) {
      const response = NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
      response.cookies.delete(COOKIE_NAMES.AUTH_TOKEN);
      return response;
    }

    // Check scope (must be MEMBER)
    if (payload.scope !== 'MEMBER') {
      const redirectUrl = SCOPE_REDIRECTS[payload.scope];
      if (redirectUrl) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
      return NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
    }

    // Check CGU acceptance (Art. 7 RGPD)
    if (!payload.cguAccepted) {
      // Redirect to CGU page with return URL
      const cguUrl = new URL('/cgu', request.url);
      cguUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(cguUrl);
    }

    // Authorized - continue
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
  matcher: ['/api/:path*', '/admin', '/admin/:path*', '/portal', '/portal/:path*', '/app', '/app/:path*'],
};
