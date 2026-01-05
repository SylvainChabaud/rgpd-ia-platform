import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { PgCguRepo } from '@/infrastructure/repositories/PgCguRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { toPublicCguAcceptance } from '@/domain/legal/CguAcceptance';

export const runtime = 'nodejs';

/**
 * GET /api/legal/cgu
 * Public endpoint to fetch active CGU version.
 */
export async function GET() {
  try {
    const repo = new PgCguRepo();
    const version = await repo.findActiveVersion();

    if (!version) {
      return NextResponse.json(
        { error: 'No active CGU version' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: version.id,
        version: version.version,
        content: version.content,
        effectiveDate: version.effectiveDate,
        summary: version.summary ?? null,
        isActive: version.isActive,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

type CguAcceptanceBody = {
  cguVersionId?: string;
  acceptanceMethod?: 'checkbox' | 'button' | 'api';
};

/**
 * POST /api/legal/cgu
 * Record CGU acceptance (authenticated users only).
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
        JSON.stringify({ error: 'Tenant context required' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    const repo = new PgCguRepo();
    const acceptance = await repo.recordAcceptance(actor.tenantId, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
      cguVersionId: body.cguVersionId,
      acceptanceMethod: body.acceptanceMethod ?? 'checkbox',
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
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

    return new Response(
      JSON.stringify({ success: true, acceptance: toPublicCguAcceptance(acceptance) }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
