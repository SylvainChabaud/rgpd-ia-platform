import { randomUUID } from "crypto";
import type { RgpdRequestRepo } from "@/app/ports/RgpdRequestRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { pool } from "@/infrastructure/db/pg";
import { calculatePurgeDate } from "@/domain/rgpd/DeletionRequest";

/**
 * Delete User Data use-case (RGPD Art. 17 - Right to erasure)
 *
 * RGPD compliance:
 * - Soft delete (immediate inaccessibility)
 * - Tenant-scoped isolation
 * - Deletion request tracking
 * - Audit event emitted (P1 only)
 *
 * Workflow:
 * 1. Validate ownership (tenant + user)
 * 2. Soft delete user (UPDATE users SET deleted_at = NOW())
 * 3. Soft delete cascade (consents, ai_jobs)
 * 4. Create RGPD deletion request (PENDING, scheduled purge)
 * 5. Emit audit event
 *
 * LOT 5.2 — Effacement RGPD (delete + purge + crypto-shredding)
 */

export type DeleteUserDataInput = {
  tenantId: string;
  userId: string;
};

export type DeleteUserDataOutput = {
  requestId: string;
  scheduledPurgeAt: Date;
  deletedAt: Date;
};

export async function deleteUserData(
  rgpdRequestRepo: RgpdRequestRepo,
  auditWriter: AuditEventWriter,
  input: DeleteUserDataInput
): Promise<DeleteUserDataOutput> {
  const { tenantId, userId } = input;

  // Validation
  if (!tenantId || !userId) {
    throw new Error("tenantId and userId are required");
  }

  // Check if deletion request already exists
  const existingRequest = await rgpdRequestRepo.findDeletionRequest(
    tenantId,
    userId
  );
  if (existingRequest) {
    if (existingRequest.status === "COMPLETED") {
      throw new Error("User data already deleted");
    }
    if (existingRequest.status === "PENDING") {
      // Idempotent: return existing request
      return {
        requestId: existingRequest.id,
        scheduledPurgeAt: existingRequest.scheduledPurgeAt!,
        deletedAt: existingRequest.createdAt,
      };
    }
  }

  const now = new Date();
  const scheduledPurgeAt = calculatePurgeDate(now);

  // Step 1: Soft delete user (tenant-scoped)
  const userRes = await pool.query(
    `UPDATE users
     SET deleted_at = $1
     WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL
     RETURNING id`,
    [now, tenantId, userId]
  );

  if (userRes.rowCount === 0) {
    throw new Error("User not found or already deleted");
  }

  // Step 2: Soft delete cascade - consents
  await pool.query(
    `UPDATE consents
     SET deleted_at = $1
     WHERE tenant_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
    [now, tenantId, userId]
  );

  // Step 3: Soft delete cascade - ai_jobs
  await pool.query(
    `UPDATE ai_jobs
     SET deleted_at = $1
     WHERE tenant_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
    [now, tenantId, userId]
  );

  // Step 4: Create RGPD deletion request
  const request = await rgpdRequestRepo.create(tenantId, {
    userId,
    type: "DELETE",
    status: "PENDING",
    scheduledPurgeAt,
  });

  // Step 5: Emit audit event (P1 only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.deletion.requested",
    actorScope: "TENANT",
    actorId: userId,
    tenantId,
    metadata: {
      requestId: request.id,
      scheduledPurgeAt: scheduledPurgeAt.toISOString(),
    },
  });

  return {
    requestId: request.id,
    scheduledPurgeAt,
    deletedAt: now,
  };
}
