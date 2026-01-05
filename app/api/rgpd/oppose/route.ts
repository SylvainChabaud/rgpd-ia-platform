import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { submitOpposition } from '@/app/usecases/opposition/submitOpposition';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import type { TreatmentType } from '@/domain/legal/UserOpposition';

/**
 * POST /api/rgpd/oppose - Submit user opposition to data processing
 *
 * RGPD compliance:
 * - Art. 21 RGPD (Droit d'opposition)
 * - User can object to specific treatments (analytics, marketing, profiling, ai_inference)
 * - SLA: 30 days for admin response (Art. 12.3)
 * - Email notification sent to user and admin
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 21
 */

type SubmitOppositionBody = {
  treatmentType: TreatmentType;
  reason: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as SubmitOppositionBody;

    // Validation
    if (!body.treatmentType || !body.reason) {
      return new Response(
        JSON.stringify({ error: 'treatmentType and reason are required' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Tenant context required
    if (!actor.tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant context required' }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const oppositionRepo = new PgOppositionRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await submitOpposition(oppositionRepo, auditWriter, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
      treatmentType: body.treatmentType,
      reason: body.reason,
    });

    return new Response(
      JSON.stringify({
        success: true,
        opposition: {
          id: result.opposition.id,
          treatmentType: result.opposition.treatmentType,
          status: result.opposition.status,
          createdAt: result.opposition.createdAt,
        },
      }),
      {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
