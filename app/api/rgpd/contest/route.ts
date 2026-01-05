import { requireAuth } from '@/app/http/requireAuth';
import { toErrorResponse } from '@/app/http/errorResponse';
import { submitDispute } from '@/app/usecases/dispute/submitDispute';
import { PgDisputeRepo } from '@/infrastructure/repositories/PgDisputeRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';

/**
 * POST /api/rgpd/contest - Submit dispute on automated AI decision
 *
 * RGPD compliance:
 * - Art. 22 RGPD (Décision individuelle automatisée)
 * - User can contest AI decisions and request human review
 * - SLA: 30 days for admin review (Art. 12.3)
 * - Attachment support (encrypted, TTL 90 days)
 * - Email notification sent to user and admin
 * - Tenant-scoped isolation enforced via requireAuth
 *
 * LOT 10.6 — Droits complémentaires Art. 22
 */

type SubmitDisputeBody = {
  aiJobId?: string;
  reason: string;
  attachmentUrl?: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as SubmitDisputeBody;

    // Validation
    if (!body.reason) {
      return new Response(
        JSON.stringify({ error: 'reason is required' }),
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

    const disputeRepo = new PgDisputeRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await submitDispute(disputeRepo, auditWriter, {
      tenantId: actor.tenantId,
      userId: actor.actorId,
      aiJobId: body.aiJobId,
      reason: body.reason,
      attachmentUrl: body.attachmentUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        dispute: {
          id: result.dispute.id,
          aiJobId: result.dispute.aiJobId,
          status: result.dispute.status,
          hasAttachment: !!result.dispute.attachmentUrl,
          createdAt: result.dispute.createdAt,
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
