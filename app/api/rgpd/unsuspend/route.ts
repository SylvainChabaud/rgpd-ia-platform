import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { unsuspendUserData } from '@/app/usecases/suspension/unsuspendUserData';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { tenantContextRequiredError } from '@/lib/errorResponse';

/**
 * POST /api/rgpd/unsuspend - Unsuspend user data processing
 *
 * RGPD compliance:
 * - Art. 18 RGPD (Droit à la limitation du traitement)
 * - Restores AI processing capabilities
 * - Email notification sent to user
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 18
 */

type UnsuspendUserDataBody = {
  userId: string;
  notes?: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as UnsuspendUserDataBody;

    // Validation
    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Tenant context required
    if (!actor.tenantId) {
      return new Response(
        JSON.stringify(tenantContextRequiredError()),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Vérifier que user peut unsuspend ses propres données ou est admin
    const isOwnData = actor.actorId === body.userId;
    const isAdmin = actor.roles[0] === ACTOR_ROLE.TENANT_ADMIN || actor.roles[0] === ACTOR_ROLE.SUPERADMIN;

    if (!isOwnData && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: can only unsuspend own data' }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const userRepo = new PgUserRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await unsuspendUserData(userRepo, auditWriter, {
      tenantId: actor.tenantId,
      userId: body.userId,
      requestedBy: actor.actorId,
      notes: body.notes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        suspension: {
          userId: result.suspension.userId,
          suspended: result.suspension.suspended,
          unsuspendedAt: result.suspension.unsuspendedAt,
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
