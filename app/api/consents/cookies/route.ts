/**
 * API Endpoint: /api/consents/cookies
 *
 * RGPD: ePrivacy Directive 2002/58/CE Art. 5.3
 * Classification: P1 (métadonnées consentement)
 * Access: Public (authenticated + anonymous)
 *
 * LOT 10.3 — Cookie Consent Banner
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { saveCookieConsent } from '@/app/usecases/cookies/saveCookieConsent';
import { getCookieConsent } from '@/app/usecases/cookies/getCookieConsent';
import { createConsentDependencies } from '@/app/dependencies';
import { logError } from '@/shared/logger';
import { authenticateRequest } from '@/app/middleware/auth';
import { getCookieValue } from '@/shared/cookies/parser';

/**
 * Validate consent ID format
 * Expected: anon-{timestamp}-{hex}
 */
const VALID_CONSENT_ID_REGEX = /^anon-\d{13}-[a-f0-9]{16}$/;
function isValidConsentId(id: string): boolean {
  return VALID_CONSENT_ID_REGEX.test(id);
}

/**
 * Anonymize IP address for RGPD compliance (Art. 32)
 * Masks the last octet for IPv4 (e.g., 192.168.1.42 → 192.168.1.0)
 * Masks the last 64 bits for IPv6
 */
function anonymizeIp(ip: string | null): string | undefined {
  if (!ip) return undefined;

  // Handle comma-separated IPs (x-forwarded-for can have multiple)
  const firstIp = ip.split(',')[0].trim();

  // IPv4: mask last octet
  const ipv4Parts = firstIp.split('.');
  if (ipv4Parts.length === 4) {
    ipv4Parts[3] = '0';
    return ipv4Parts.join('.');
  }

  // IPv6: mask last 64 bits (simplified - return first 4 segments)
  const ipv6Parts = firstIp.split(':');
  if (ipv6Parts.length >= 4) {
    return ipv6Parts.slice(0, 4).join(':') + '::0';
  }

  return undefined; // Unknown format, don't store
}

// Dependencies via factory (BOUNDARIES.md section 11)
// Note: Lazy initialization in handlers to avoid cold start overhead

/**
 * GET /api/consents/cookies
 * Retrieve cookie consent for authenticated user or anonymous visitor
 */
export async function GET(request: NextRequest) {
  try {
    // Extract user ID from auth token (if authenticated)
    const authResult = await authenticateRequest(request);
    let userId: string | undefined;

    if (authResult.authenticated && authResult.user) {
      userId = authResult.user.id;
    }

    // Extract anonymous ID from cookie (if not authenticated)
    const cookieHeader = request.headers.get('cookie');
    let anonymousId: string | undefined;

    if (!userId && cookieHeader) {
      const extractedId = getCookieValue(cookieHeader, 'cookie_consent_id');
      // Validate format to prevent injection
      if (extractedId && isValidConsentId(extractedId)) {
        anonymousId = extractedId;
      }
    }

    if (!userId && !anonymousId) {
      return NextResponse.json({ error: 'No consent found' }, { status: 404 });
    }

    const deps = createConsentDependencies();
    const result = await getCookieConsent(deps.cookieConsentRepo, {
      userId,
      anonymousId,
    });

    if (!result.consent) {
      return NextResponse.json({ error: 'No consent found' }, { status: 404 });
    }

    return NextResponse.json(result.consent, { status: 200 });
  } catch (error) {
    logError('consents.cookies.fetch_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consents/cookies
 * Save cookie consent for authenticated user or anonymous visitor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract user ID from auth token (if authenticated)
    const authResult = await authenticateRequest(request);
    let userId: string | undefined;
    let tenantId: string | undefined;

    if (authResult.authenticated && authResult.user) {
      userId = authResult.user.id;
      tenantId = authResult.user.tenantId ?? undefined;
    }

    // Extract anonymous ID from cookie (if not authenticated)
    const cookieHeader = request.headers.get('cookie');
    let anonymousId: string | undefined;

    if (!userId && cookieHeader) {
      const extractedId = getCookieValue(cookieHeader, 'cookie_consent_id');
      // Validate format to prevent injection
      if (extractedId && isValidConsentId(extractedId)) {
        anonymousId = extractedId;
      }
    }

    // Generate cryptographically secure anonymous ID if not present
    if (!userId && !anonymousId) {
      anonymousId = `anon-${Date.now()}-${randomBytes(8).toString('hex')}`;
    }

    const deps = createConsentDependencies();
    const result = await saveCookieConsent(
      deps.cookieConsentRepo,
      deps.auditEventWriter,
      {
        tenantId,
        userId,
        anonymousId,
        analytics: body.analytics ?? false,
        marketing: body.marketing ?? false,
        ipAddress: anonymizeIp(request.headers.get('x-forwarded-for')),
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );

    return NextResponse.json(result.consent, { status: 201 });
  } catch (error) {
    logError('consents.cookies.save_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
