import { requireAuth } from "@/app/http/requireAuth";
import { toErrorResponse } from "@/app/http/errorResponse";
import { revokeConsent } from "@/app/usecases/consent/revokeConsent";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";

/**
 * POST /api/consents/revoke - Revoke consent
 *
 * RGPD compliance:
 * - Tenant-scoped isolation enforced via requireAuth
 * - Revocation immediate and effective
 * - Audit event emitted
 *
 * LOT 5.0 — Consentement (opt-in / revoke) + enforcement
 */

type RevokeConsentBody = {
  userId: string;
  purpose: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as RevokeConsentBody;

    // Validation
    if (!body.userId || !body.purpose) {
      return new Response(
        JSON.stringify({ error: "userId and purpose are required" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // IMPORTANT: Use actor.tenantId for tenant isolation
    if (!actor.tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant context required" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const consentRepo = new PgConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: actor.tenantId,
      userId: body.userId,
      purpose: body.purpose,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
