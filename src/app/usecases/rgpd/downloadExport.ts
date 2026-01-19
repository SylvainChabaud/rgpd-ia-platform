import { randomUUID } from "crypto";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { EncryptedData } from "@/infrastructure/crypto/encryption";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { EXPORT_MAX_DOWNLOADS } from "@/domain/rgpd/ExportBundle";
import { ACTOR_SCOPE } from "@/shared/actorScope";
import {
  getExportMetadataByToken,
  storeExportMetadata,
  readEncryptedBundle,
  deleteExportBundle,
  deleteExportMetadata,
} from "@/infrastructure/storage/ExportStorage";

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

export async function downloadExport(
  auditWriter: AuditEventWriter,
  input: DownloadExportInput
): Promise<DownloadExportOutput> {
  const { downloadToken, requestingUserId, requestingTenantId } = input;

  // Find export by token
  const metadata = getExportMetadataByToken(downloadToken);

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
    await deleteExportBundle(metadata.exportId);
    deleteExportMetadata(metadata.exportId);

    throw new Error("Export has expired");
  }

  // Check download limit
  if (metadata.downloadCount >= EXPORT_MAX_DOWNLOADS) {
    throw new Error(
      `Download limit reached (${EXPORT_MAX_DOWNLOADS} max)`
    );
  }

  // Read encrypted bundle
  const encryptedData = await readEncryptedBundle(metadata.exportId);

  // Increment download count
  metadata.downloadCount++;
  storeExportMetadata(metadata);

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
