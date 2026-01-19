import { randomUUID } from "crypto";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { ExportStorage, EncryptedData } from "@/app/ports/ExportStorage";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { EXPORT_MAX_DOWNLOADS } from "@/domain/rgpd/ExportBundle";
import { ACTOR_SCOPE } from "@/shared/actorScope";

/**
 * Download Export use-case
 *
 * RGPD compliance:
 * - Token-based access control
 * - Download count limit (3 max)
 * - TTL expiration check
 * - Audit event emitted
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

export type DownloadExportInput = {
  downloadToken: string;
  requestingUserId: string; // For audit
  requestingTenantId: string; // For audit
};

export type DownloadExportOutput = {
  encryptedData: EncryptedData;
  filename: string;
  remainingDownloads: number;
};

/**
 * Dependencies for downloadExport
 * Injected from API routes - never instantiated in usecase
 */
export interface DownloadExportDeps {
  auditWriter: AuditEventWriter;
  exportStorage: ExportStorage;
}

export async function downloadExport(
  input: DownloadExportInput,
  deps: DownloadExportDeps
): Promise<DownloadExportOutput> {
  const { auditWriter, exportStorage } = deps;
  const { downloadToken, requestingUserId, requestingTenantId } = input;

  // Find export by token
  const metadata = exportStorage.getExportMetadataByToken(downloadToken);

  if (!metadata) {
    throw new Error("Export not found or invalid token");
  }

  // Check ownership (tenant + user)
  if (
    metadata.tenantId !== requestingTenantId ||
    metadata.userId !== requestingUserId
  ) {
    throw new Error("Access denied: you do not own this export");
  }

  // Check TTL expiration
  const now = new Date();
  if (metadata.expiresAt < now) {
    // Clean up expired export
    await exportStorage.deleteExportBundle(metadata.exportId);
    exportStorage.deleteExportMetadata(metadata.exportId);

    throw new Error("Export has expired");
  }

  // Check download limit
  if (metadata.downloadCount >= EXPORT_MAX_DOWNLOADS) {
    throw new Error(
      `Download limit reached (${EXPORT_MAX_DOWNLOADS} max)`
    );
  }

  // Read encrypted bundle
  const encryptedData = await exportStorage.readEncryptedBundle(metadata.exportId);

  // Increment download count
  metadata.downloadCount++;
  exportStorage.storeExportMetadata(metadata);

  // Emit audit event
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.export.downloaded",
    actorScope: ACTOR_SCOPE.TENANT,
    actorId: requestingUserId,
    tenantId: requestingTenantId,
    metadata: {
      exportId: metadata.exportId,
      downloadCount: metadata.downloadCount,
    },
  });

  const remainingDownloads = EXPORT_MAX_DOWNLOADS - metadata.downloadCount;

  return {
    encryptedData,
    filename: `rgpd-export-${metadata.exportId}.json.enc`,
    remainingDownloads,
  };
}
