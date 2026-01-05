import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { suspendUserData } from '@/app/usecases/suspension/suspendUserData';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import type { SuspensionReason } from '@/domain/rgpd/DataSuspension';

/**
 * POST /api/rgpd/suspend - Suspend user data processing
 *
 * RGPD compliance:
 * - Art. 18 RGPD (Droit à la limitation du traitement)
 * - Blocks all AI processing (Gateway LLM returns HTTP 403)
 * - Data remains accessible in read-only mode
 * - Email notification sent to user
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 18
 */

type SuspendUserDataBody = {
  userId: string;
  reason: SuspensionReason;
  notes?: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as SuspendUserDataBody;

    // Validation
    if (!body.userId || !body.reason) {
      return new Response(
        JSON.stringify({ error: 'userId and reason are required' }),
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

    // Vérifier que user peut suspendre ses propres données ou est admin
    const isOwnData = actor.actorId === body.userId;
    const isAdmin = actor.roles[0] === 'TENANT_ADMIN' || actor.roles[0] === 'SUPER_ADMIN';

    if (!isOwnData && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: can only suspend own data' }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const userRepo = new PgUserRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await suspendUserData(userRepo, auditWriter, {
      tenantId: actor.tenantId,
      userId: body.userId,
      reason: body.reason,
      requestedBy: actor.actorId,
      notes: body.notes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        suspension: {
          userId: result.suspension.userId,
          suspended: result.suspension.suspended,
          suspendedAt: result.suspension.suspendedAt,
          reason: result.suspension.suspendedReason,
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
