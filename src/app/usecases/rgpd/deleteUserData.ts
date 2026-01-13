import { randomUUID } from "crypto";
import type { RgpdRequestRepo } from "@/app/ports/RgpdRequestRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { UserRepo } from "@/app/ports/UserRepo";
import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AiJobRepo } from "@/app/ports/AiJobRepo";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { calculatePurgeDate, RGPD_REQUEST_TYPE, RGPD_REQUEST_STATUS } from "@/domain/rgpd/DeletionRequest";
import { ACTOR_SCOPE } from "@/shared/actorScope";

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
  userRepo: UserRepo,
  consentRepo: ConsentRepo,
  aiJobRepo: AiJobRepo,
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
    if (existingRequest.status === RGPD_REQUEST_STATUS.COMPLETED) {
      throw new Error("User data already deleted");
    }
    if (existingRequest.status === RGPD_REQUEST_STATUS.PENDING) {
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

  // Step 1: Soft delete user (tenant-scoped via repository)
  const userDeleted = await userRepo.softDeleteUserByTenant(tenantId, userId);
  if (userDeleted === 0) {
    throw new Error("User not found or already deleted");
  }

  // Step 2: Soft delete cascade - consents
  await consentRepo.softDeleteByUser(tenantId, userId);

  // Step 3: Soft delete cascade - ai_jobs
  await aiJobRepo.softDeleteByUser(tenantId, userId);

  // Step 4: Create RGPD deletion request
  const request = await rgpdRequestRepo.create(tenantId, {
    userId,
    type: RGPD_REQUEST_TYPE.DELETE,
    status: RGPD_REQUEST_STATUS.PENDING,
    scheduledPurgeAt,
  });

  // Step 5: Emit audit event (P1 only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.deletion.requested",
    actorScope: ACTOR_SCOPE.TENANT,
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
