import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { listDisputes } from '@/app/usecases/dispute/listDisputes';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';

/**
 * GET /api/rgpd/contests - List user disputes
 *
 * RGPD compliance:
 * - Art. 15 RGPD (Droit d'accès)
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - Returns all disputes for authenticated user
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 22
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

    const disputeRepo = new PgDisputeRepo();

    const result = await listDisputes(disputeRepo, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
    });

    return new Response(
      JSON.stringify({
        disputes: result.disputes.map(d => ({
          id: d.id,
          aiJobId: d.aiJobId,
          reason: d.reason,
          status: d.status,
          adminResponse: d.adminResponse,
          hasAttachment: !!d.attachmentUrl,
          createdAt: d.createdAt,
          reviewedAt: d.reviewedAt,
          resolvedAt: d.resolvedAt,
        })),
        pendingCount: result.pendingCount,
        underReviewCount: result.underReviewCount,
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
