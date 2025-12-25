import { randomUUID } from "crypto";
import type { RgpdRequestRepo } from "@/app/ports/RgpdRequestRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { pool } from "@/infrastructure/db/pg";
import {
  getExportMetadataByUserId,
  deleteExportBundle,
  deleteExportMetadata,
} from "@/infrastructure/storage/ExportStorage";

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

  // Step 2: Verify user is soft-deleted
  const userRes = await pool.query(
    `SELECT deleted_at FROM users
     WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NOT NULL`,
    [tenantId, userId]
  );

  if (userRes.rowCount === 0) {
    throw new Error("User not found or not soft-deleted");
  }

  // Retention validation is already done by findPendingPurges()
  // (which checks scheduledPurgeAt <= NOW())

  // Step 3: Hard delete consents (tenant-scoped)
  const consentsRes = await pool.query(
    `DELETE FROM consents
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );

  // Step 4: Hard delete ai_jobs (tenant-scoped)
  const jobsRes = await pool.query(
    `DELETE FROM ai_jobs
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );

  // Step 5: Crypto-shredding - delete export bundles
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
      console.error(`Failed to delete export ${metadata.exportId}:`, error);
    }
  }

  // Step 6: Hard delete user (tenant-scoped)
  const userDeleteRes = await pool.query(
    `DELETE FROM users
     WHERE tenant_id = $1 AND id = $2`,
    [tenantId, userId]
  );

  // Step 7: Update RGPD request status
  await rgpdRequestRepo.updateStatus(requestId, "COMPLETED", now);

  // Step 8: Emit audit event (P1 only)
  // Note: metadata must be flat (no nested objects) for RGPD compliance
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.deletion.completed",
    actorScope: "PLATFORM", // PLATFORM scope for automated purge
    actorId: "system",
    tenantId,
    metadata: {
      requestId,
      userId,
      deletedConsents: consentsRes.rowCount || 0,
      deletedAiJobs: jobsRes.rowCount || 0,
      deletedExports: deletedExports,
      deletedUsers: userDeleteRes.rowCount || 0,
    },
  });

  return {
    requestId,
    purgedAt: now,
    deletedRecords: {
      consents: consentsRes.rowCount || 0,
      aiJobs: jobsRes.rowCount || 0,
      exports: deletedExports,
      users: userDeleteRes.rowCount || 0,
    },
  };
}
