/**
 * Repository port for RGPD requests
 *
 * RGPD compliance:
 * - Tenant-scoped isolation
 * - Deletion request tracking
 * - Purge scheduling
 *
 * LOT 5.2 — Effacement RGPD
 */

import type {
  RgpdRequest,
  RgpdRequestType,
  RgpdRequestStatus,
} from "@/domain/rgpd/DeletionRequest";

export type CreateRgpdRequestInput = {
  userId: string;
  type: RgpdRequestType;
  status: RgpdRequestStatus;
  scheduledPurgeAt?: Date;
};

export interface RgpdRequestRepo {
  /**
   * Create a new RGPD request (tenant-scoped)
   *
   * CRITICAL: tenantId is MANDATORY for isolation
   */
  create(
    tenantId: string,
    input: CreateRgpdRequestInput
  ): Promise<RgpdRequest>;

  /**
   * Find RGPD request by ID (tenant-scoped)
   */
  findById(tenantId: string, requestId: string): Promise<RgpdRequest | null>;

  /**
   * Find pending deletion requests ready for purge
   *
   * Returns requests where:
   * - type = 'DELETE'
   * - status = 'PENDING'
   * - scheduledPurgeAt <= now
   */
  findPendingPurges(): Promise<RgpdRequest[]>;

  /**
   * Update request status (e.g., PENDING → COMPLETED)
   */
  updateStatus(
    requestId: string,
    status: RgpdRequestStatus,
    completedAt?: Date
  ): Promise<void>;

  /**
   * Find existing deletion request for user (to prevent duplicates)
   */
  findDeletionRequest(
    tenantId: string,
    userId: string
  ): Promise<RgpdRequest | null>;
}
