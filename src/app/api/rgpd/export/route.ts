import { requireAuth } from "@/app/http/requireAuth";
import { toErrorResponse } from "@/app/http/errorResponse";
import { exportUserData } from "@/app/usecases/rgpd/exportUserData";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { PgAiJobRepo } from "@/infrastructure/repositories/PgAiJobRepo";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";

/**
 * POST /api/rgpd/export - Request RGPD data export
 *
 * RGPD compliance:
 * - Art. 15 (Right to access)
 * - Art. 20 (Right to data portability)
 * - Tenant-scoped isolation
 * - Encrypted bundle with password
 * - TTL 7 days
 * - Audit event emitted
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

type ExportRequestBody = {
  userId: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as ExportRequestBody;

    // Validation
    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
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

    // IMPORTANT: User can only export their own data
    if (actor.actorId !== body.userId) {
      return new Response(
        JSON.stringify({
          error: "You can only export your own data",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const consentRepo = new PgConsentRepo();
    const aiJobRepo = new PgAiJobRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      {
        tenantId: actor.tenantId,
        userId: body.userId,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        exportId: result.exportId,
        downloadToken: result.downloadToken,
        password: result.password,
        expiresAt: result.expiresAt.toISOString(),
        message:
          "IMPORTANT: Save the password securely. You will need it to decrypt the export.",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
});
