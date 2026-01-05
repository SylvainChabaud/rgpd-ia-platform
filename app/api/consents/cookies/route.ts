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
import { saveCookieConsent } from '@/app/usecases/cookies/saveCookieConsent';
import { getCookieConsent } from '@/app/usecases/cookies/getCookieConsent';
import { PgCookieConsentRepo } from '@/infrastructure/repositories/PgCookieConsentRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';

// Initialize repositories
const pgCookieConsentRepo = new PgCookieConsentRepo();
const pgAuditEventWriter = new PgAuditEventWriter();

/**
 * GET /api/consents/cookies
 * Retrieve cookie consent for authenticated user or anonymous visitor
 */
export async function GET(request: NextRequest) {
  try {
    // Extract user ID from auth token (if authenticated)
    const authHeader = request.headers.get('Authorization');
    let userId: string | undefined;

    if (authHeader) {
      // In production, validate JWT and extract userId
      // For now, use stub
      userId = 'user-123'; // TODO: Extract from JWT
    }

    // Extract anonymous ID from cookie (if not authenticated)
    const cookieHeader = request.headers.get('cookie');
    let anonymousId: string | undefined;

    if (!userId && cookieHeader) {
      const match = cookieHeader.match(/cookie_consent_id=([^;]+)/);
      if (match) {
        anonymousId = match[1];
      }
    }

    if (!userId && !anonymousId) {
      return NextResponse.json({ error: 'No consent found' }, { status: 404 });
    }

    const result = await getCookieConsent(pgCookieConsentRepo, {
      userId,
      anonymousId,
    });

    if (!result.consent) {
      return NextResponse.json({ error: 'No consent found' }, { status: 404 });
    }

    return NextResponse.json(result.consent, { status: 200 });
  } catch (error) {
    console.error('Error fetching cookie consent:', error);
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
    const authHeader = request.headers.get('Authorization');
    let userId: string | undefined;
    let tenantId: string | undefined;

    if (authHeader) {
      // In production, validate JWT and extract userId
      userId = 'user-123'; // TODO: Extract from JWT
      tenantId = 'tenant-abc'; // TODO: Extract from JWT
    }

    // Extract anonymous ID from cookie (if not authenticated)
    const cookieHeader = request.headers.get('cookie');
    let anonymousId: string | undefined;

    if (!userId && cookieHeader) {
      const match = cookieHeader.match(/cookie_consent_id=([^;]+)/);
      if (match) {
        anonymousId = match[1];
      }
    }

    // Generate anonymous ID if not present
    if (!userId && !anonymousId) {
      anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    const result = await saveCookieConsent(
      pgCookieConsentRepo,
      pgAuditEventWriter,
      {
        tenantId,
        userId,
        anonymousId,
        analytics: body.analytics ?? false,
        marketing: body.marketing ?? false,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );

    return NextResponse.json(result.consent, { status: 201 });
  } catch (error) {
    console.error('Error saving cookie consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
