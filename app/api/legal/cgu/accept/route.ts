import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { PgCguRepo } from '@/infrastructure/repositories/PgCguRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { toPublicCguAcceptance } from '@/domain/legal/CguAcceptance';
import { tenantContextRequiredError } from '@/lib/errorResponse';
import { anonymizeIp } from '@/lib/anonymizeIp';
import { signJwt, TOKEN_EXPIRATION } from '@/lib/jwt';
import { AUTH_COOKIES } from '@/shared/auth/constants';
import type { UserScope } from '@/shared/actorScope';

export const runtime = 'nodejs';

type CguAcceptanceBody = {
  cguVersionId?: string;
  acceptanceMethod?: 'checkbox' | 'button' | 'api';
};

/**
 * POST /api/legal/cgu/accept
 * Record CGU acceptance (authenticated users only).
 *
 * RGPD: Art. 7 (Conditions for consent)
 * - Records explicit user consent with timestamp
 * - IP address anonymized (last octet masked)
 * - Audit trail for compliance proof
 *
 * LOT 13.0 - CGU Acceptance from /cgu page
 */
export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as CguAcceptanceBody;

    if (!body.cguVersionId) {
      return new Response(
        JSON.stringify({ error: 'cguVersionId is required' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    if (!actor.tenantId) {
      return new Response(
        JSON.stringify(tenantContextRequiredError()),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    // Get raw IP and anonymize it
    const rawIp = request.headers.get('x-forwarded-for') ?? undefined;
    const anonymizedIp = anonymizeIp(rawIp ?? null);

    const repo = new PgCguRepo();
    const acceptance = await repo.recordAcceptance(actor.tenantId, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
      cguVersionId: body.cguVersionId,
      acceptanceMethod: body.acceptanceMethod ?? 'checkbox',
      ipAddress: anonymizedIp,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    const auditWriter = new PgAuditEventWriter();
    await emitAuditEvent(auditWriter, {
      id: randomUUID(),
      eventName: 'cgu.acceptance.recorded',
      actorScope: ACTOR_SCOPE.TENANT,
      actorId: actor.actorId,
      tenantId: actor.tenantId,
      metadata: {
        cguVersionId: acceptance.cguVersionId,
        acceptanceMethod: acceptance.acceptanceMethod,
        hasIpAddress: acceptance.ipAddress !== null,
      },
    });

    // Re-issue JWT with cguAccepted: true
    // This allows the middleware to verify CGU acceptance
    const newToken = signJwt({
      userId: actor.actorId,
      tenantId: actor.tenantId ?? null,
      scope: actor.actorScope as UserScope,
      role: actor.roles[0] ?? 'MEMBER',
      cguAccepted: true,
    });

    // Create response with new token
    const response = NextResponse.json(
      { success: true, acceptance: toPublicCguAcceptance(acceptance) },
      { status: 201 }
    );

    // Update the access token cookie with cguAccepted: true
    response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS,
    });

    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
});
