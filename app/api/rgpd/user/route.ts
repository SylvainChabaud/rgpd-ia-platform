import { requireAuth } from "@/app/http/requireAuth";
import { toErrorResponse } from "@/app/http/errorResponse";
import { deleteUserData } from "@/app/usecases/rgpd/deleteUserData";
import { PgRgpdRequestRepo } from "@/infrastructure/repositories/PgRgpdRequestRepo";
import { PgUserRepo } from "@/infrastructure/repositories/PgUserRepo";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { PgAiJobRepo } from "@/infrastructure/repositories/PgAiJobRepo";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";

/**
 * DELETE /api/rgpd/user - Request user data deletion (RGPD Art. 17)
 *
 * RGPD compliance:
 * - Right to erasure (Art. 17)
 * - Soft delete (immediate inaccessibility)
 * - Purge scheduling (retention period)
 * - Tenant-scoped isolation
 * - Audit event emitted
 *
 * Workflow:
 * 1. Validate authentication and tenant context
 * 2. Soft delete user and cascade (consents, ai_jobs)
 * 3. Create RGPD deletion request (PENDING)
 * 4. Schedule purge (default: 30 days)
 * 5. Emit audit event
 *
 * LOT 5.2 — Effacement RGPD (delete + purge + crypto-shredding)
 */

type DeleteUserRequestBody = {
  userId: string;
};

export const DELETE = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as DeleteUserRequestBody;

    // Validation
    if (!body.userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // IMPORTANT: Require tenant context
    if (!actor.tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant context required" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const userRepo = new PgUserRepo();
    const consentRepo = new PgConsentRepo();
    const aiJobRepo = new PgAiJobRepo();

    const result = await deleteUserData(
      rgpdRequestRepo,
      auditWriter,
      userRepo,
      consentRepo,
      aiJobRepo,
      {
        tenantId: actor.tenantId,
        userId: body.userId,
      }
    );

    // Return deletion confirmation
    return new Response(
      JSON.stringify({
        success: true,
        requestId: result.requestId,
        deletedAt: result.deletedAt.toISOString(),
        scheduledPurgeAt: result.scheduledPurgeAt.toISOString(),
        message:
          "User data marked for deletion. Data is now inaccessible. Hard deletion will occur after retention period.",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
