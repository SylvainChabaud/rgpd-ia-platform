import { requireAuth } from "@/app/http/requireAuth";
import { toErrorResponse } from "@/app/http/errorResponse";
import { downloadExport } from "@/app/usecases/rgpd/downloadExport";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";

/**
 * POST /api/rgpd/export/download - Download encrypted RGPD export
 *
 * RGPD compliance:
 * - Token-based authentication
 * - Ownership verification (tenant + user)
 * - TTL expiration check
 * - Download count limit (3 max)
 * - Audit event emitted
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

type DownloadRequestBody = {
  downloadToken: string;
};

export const POST = requireAuth(async ({ request, actor }) => {
  try {
    const body = (await request.json()) as DownloadRequestBody;

    // Validation
    if (!body.downloadToken) {
      return new Response(
        JSON.stringify({ error: "downloadToken is required" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
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

    const auditWriter = new InMemoryAuditEventWriter();

    const result = await downloadExport(auditWriter, {
      downloadToken: body.downloadToken,
      requestingUserId: actor.actorId,
      requestingTenantId: actor.tenantId,
    });

    // Return encrypted data + metadata
    return new Response(
      JSON.stringify({
        success: true,
        encryptedData: result.encryptedData,
        filename: result.filename,
        remainingDownloads: result.remainingDownloads,
        message:
          "Use the password provided during export creation to decrypt this file.",
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
