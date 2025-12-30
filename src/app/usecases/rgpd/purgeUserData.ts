import { randomUUID } from "crypto";
import type { RgpdRequestRepo } from "@/app/ports/RgpdRequestRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { UserRepo } from "@/app/ports/UserRepo";
import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AiJobRepo } from "@/app/ports/AiJobRepo";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { logger } from "@/infrastructure/logging/logger";
import {
  getExportMetadataByUserId,
  deleteExportBundle,
  deleteExportMetadata,
} from "@/infrastructure/storage/ExportStorage";
import { ACTOR_SCOPE } from "@/shared/actorScope";

/**
 * Purge User Data use-case (RGPD Art. 17 - Right to erasure)
 *
 * RGPD compliance:
 * - Hard delete (irreversible data removal)
 * - Crypto-shredding (export bundles)
 * - Cascade deletion (consents, jobs, exports)
 * - Tenant-scoped isolation
 * - Audit event emitted (P1 only)
 *
 * Workflow:
 * 1. Validate RGPD request exists and is PENDING
 * 2. Validate retention period passed (deleted_at + 30 days)
 * 3. Hard delete consents (DELETE FROM consents)
 * 4. Hard delete ai_jobs (DELETE FROM ai_jobs)
 * 5. Crypto-shredding exports (DELETE files + metadata)
 * 6. Hard delete user (DELETE FROM users)
 * 7. Update RGPD request status to COMPLETED
 * 8. Emit audit event
 *
 * LOT 5.2 — Effacement RGPD (delete + purge + crypto-shredding)
 */

export type PurgeUserDataInput = {
  requestId: string;
};

export type PurgeUserDataOutput = {
  requestId: string;
  purgedAt: Date;
  deletedRecords: {
    consents: number;
    aiJobs: number;
    exports: number;
    users: number;
  };
};

export async function purgeUserData(
  rgpdRequestRepo: RgpdRequestRepo,
  auditWriter: AuditEventWriter,
  userRepo: UserRepo,
  consentRepo: ConsentRepo,
  aiJobRepo: AiJobRepo,
  input: PurgeUserDataInput
): Promise<PurgeUserDataOutput> {
  const { requestId } = input;

  // Validation
  if (!requestId) {
    throw new Error("requestId is required");
  }

  // Step 1: Find pending purge requests
  const pendingPurges = await rgpdRequestRepo.findPendingPurges();
  const request = pendingPurges.find((r) => r.id === requestId);

  if (!request) {
    throw new Error(
      "Purge request not found or not ready for purge (check scheduledPurgeAt)"
    );
  }

  const { tenantId, userId } = request;
  const now = new Date();

  // Step 2: Hard delete consents (tenant-scoped via repository)
  const consentsDeleted = await consentRepo.hardDeleteByUser(tenantId, userId);

  // Step 3: Hard delete ai_jobs (tenant-scoped via repository)
  const aiJobsDeleted = await aiJobRepo.hardDeleteByUser(tenantId, userId);

  // Step 4: Crypto-shredding - delete export bundles
  // Find all exports for this user
  const exportMetadataList = getExportMetadataByUserId(tenantId, userId);
  let deletedExports = 0;

  for (const metadata of exportMetadataList) {
    try {
      // Delete encrypted file (crypto-shredding: key becomes inaccessible)
      await deleteExportBundle(metadata.exportId);
      // Delete metadata
      deleteExportMetadata(metadata.exportId);
      deletedExports++;
    } catch (error) {
      // Log error but continue purge (best effort)
      logger.error({
        event: 'export_cleanup_failed',
        exportId: metadata.exportId,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to delete export during purge');
    }
  }

  // Step 5: Hard delete user (tenant-scoped via repository)
  const userDeleted = await userRepo.hardDeleteUserByTenant(tenantId, userId);

  const deletedRecords = {
    consents: consentsDeleted,
    aiJobs: aiJobsDeleted,
    exports: deletedExports,
    users: userDeleted,
  };

  // Step 7: Update RGPD request status
  await rgpdRequestRepo.updateStatus(requestId, "COMPLETED", now);

  // Step 8: Emit audit event (P1 only)
  // Note: metadata must be flat (no nested objects) for RGPD compliance
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.deletion.completed",
    actorScope: ACTOR_SCOPE.PLATFORM, // PLATFORM scope for automated purge
    actorId: "system",
    tenantId,
    metadata: {
      requestId,
      userId,
      deletedConsents: deletedRecords.consents,
      deletedAiJobs: deletedRecords.aiJobs,
      deletedExports: deletedRecords.exports,
      deletedUsers: deletedRecords.users,
    },
  });

  return {
    requestId,
    purgedAt: now,
    deletedRecords,
  };
}
