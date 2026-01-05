/**
 * DisputeRepo port
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: manage user disputes on automated AI decisions
 * Retention: account lifetime + legal retention
 *
 * RGPD Compliance: Art. 22 (Automated individual decision-making)
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - SLA response: 30 days (Art. 12.3)
 * - User can contest AI decisions and request human review
 * - Attachment support (encrypted, TTL 90 days)
 * - Email notification mandatory
 */

import { UserDispute } from '@/domain/legal/UserDispute';

export interface CreateDisputeInput {
  tenantId: string;
  userId: string;
  aiJobId?: string;
  reason: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewDisputeInput {
  status: 'under_review' | 'resolved' | 'rejected';
  adminResponse?: string;
  reviewedBy: string;
}

export interface DisputeRepo {
  /**
   * Find dispute by ID
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - dispute identifier
   * @returns Dispute or null
   */
  findById(tenantId: string, id: string): Promise<UserDispute | null>;

  /**
   * Create new dispute
   *
   * Business rules:
   * - Reason must be at least 20 characters
   * - Initial status: pending
   * - SLA: 30 days for response
   * - Attachment optional (encrypted, TTL 90 days)
   * - Email notification sent to user
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - dispute data
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if reason too short
   */
  create(tenantId: string, input: CreateDisputeInput): Promise<UserDispute>;

  /**
   * Update dispute status (admin review)
   *
   * Business rules:
   * - Only pending/under_review disputes can be updated
   * - Admin response required for resolved/rejected
   * - Email notification sent to user
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - dispute identifier
   * @param review - review data
   * @throws Error if dispute already resolved
   * @throws Error if admin response missing
   */
  review(
    tenantId: string,
    id: string,
    review: ReviewDisputeInput
  ): Promise<UserDispute>;

  /**
   * List all disputes for a user
   * Art. 15 RGPD (Right of access)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns All user disputes
   */
  findByUser(tenantId: string, userId: string): Promise<UserDispute[]>;

  /**
   * List all disputes for a tenant (admin view)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns All disputes for the tenant
   */
  findByTenant(tenantId: string): Promise<UserDispute[]>;

  /**
   * List disputes for specific AI job
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param aiJobId - AI job identifier
   * @returns Disputes for this AI job
   */
  findByAiJob(tenantId: string, aiJobId: string): Promise<UserDispute[]>;

  /**
   * List pending disputes for admin review
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Pending disputes
   */
  findPending(tenantId: string): Promise<UserDispute[]>;

  /**
   * List disputes under review
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Disputes under review
   */
  findUnderReview(tenantId: string): Promise<UserDispute[]>;

  /**
   * List disputes exceeding SLA (> 30 days without resolution)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Overdue disputes
   */
  findExceedingSla(tenantId: string): Promise<UserDispute[]>;

  /**
   * Count pending disputes by tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Count of pending disputes
   */
  countPending(tenantId: string): Promise<number>;

  /**
   * Find disputes with expired attachments (> 90 days)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Disputes with expired attachments
   */
  findWithExpiredAttachments(tenantId: string): Promise<UserDispute[]>;

  /**
   * Soft delete all disputes for user (cascade RGPD deletion)
   * Art. 17 RGPD (Right to erasure)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteByUser(tenantId: string, userId: string): Promise<number>;

  /**
   * Hard delete all disputes for user (purge after retention period)
   * Art. 17 RGPD (Right to erasure)
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteByUser(tenantId: string, userId: string): Promise<number>;
}
