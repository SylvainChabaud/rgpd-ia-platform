import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { listOppositions } from '@/app/usecases/opposition/listOppositions';
import { PgOppositionRepo } from '@/infrastructure/repositories/PgOppositionRepo';

/**
 * GET /api/rgpd/oppositions - List user oppositions
 *
 * RGPD compliance:
 * - Art. 15 RGPD (Droit d'accès)
 * - Art. 21 RGPD (Droit d'opposition)
 * - Returns all oppositions for authenticated user
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 21
 */

export const GET = requireAuth(async ({ actor }) => {
  try {
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

    const result = await listOppositions(oppositionRepo, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
    });

    return new Response(
      JSON.stringify({
        oppositions: result.oppositions.map(o => ({
          id: o.id,
          treatmentType: o.treatmentType,
          reason: o.reason,
          status: o.status,
          adminResponse: o.adminResponse,
          createdAt: o.createdAt,
          reviewedAt: o.reviewedAt,
        })),
        pendingCount: result.pendingCount,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (_error) {
    return toErrorResponse(_error);
  }
});
