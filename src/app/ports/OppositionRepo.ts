/**
 * OppositionRepo port
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: manage user oppositions to data processing
 * Retention: account lifetime + legal retention
 *
 * RGPD Compliance: Art. 21 (Right to object)
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - SLA response: 30 days (Art. 12.3)
 * - User can object to specific treatments (analytics, marketing, profiling, ai_inference)
 * - Opposition must be reviewed by admin
 * - Email notification mandatory
 */

import { UserOpposition, TreatmentType } from '@/domain/legal/UserOpposition';

export interface CreateOppositionInput {
  tenantId: string;
  userId: string;
  treatmentType: TreatmentType;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewOppositionInput {
  status: 'accepted' | 'rejected';
  adminResponse: string;
  reviewedBy: string;
}

export interface OppositionRepo {
  /**
   * Find opposition by ID
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - opposition identifier
   * @returns Opposition or null
   */
  findById(tenantId: string, id: string): Promise<UserOpposition | null>;

  /**
   * Create new opposition
   *
   * Business rules:
   * - Reason must be at least 10 characters
   * - Initial status: pending
   * - SLA: 30 days for response
   * - Email notification sent to user
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - opposition data
   * @throws Error if tenantId is empty (RGPD blocker)
   * @throws Error if reason too short
   */
  create(
    tenantId: string,
    input: CreateOppositionInput
  ): Promise<UserOpposition>;

  /**
   * Update opposition status (admin review)
   *
   * Business rules:
   * - Only pending oppositions can be reviewed
   * - Admin response required
   * - Email notification sent to user
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param id - opposition identifier
   * @param review - review data
   * @throws Error if opposition not pending
   * @throws Error if admin response empty
   */
  review(
    tenantId: string,
    id: string,
    review: ReviewOppositionInput
  ): Promise<UserOpposition>;

  /**
   * List all oppositions for a user
   * Art. 15 RGPD (Right of access)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns All user oppositions
   */
  findByUser(tenantId: string, userId: string): Promise<UserOpposition[]>;

  /**
   * List all oppositions for a tenant (admin view)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns All oppositions for the tenant
   */
  findByTenant(tenantId: string): Promise<UserOpposition[]>;

  /**
   * List pending oppositions for admin review
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Pending oppositions
   */
  findPending(tenantId: string): Promise<UserOpposition[]>;

  /**
   * List oppositions exceeding SLA (> 30 days without response)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Overdue oppositions
   */
  findExceedingSla(tenantId: string): Promise<UserOpposition[]>;

  /**
   * Count pending oppositions by tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @returns Count of pending oppositions
   */
  countPending(tenantId: string): Promise<number>;

  /**
   * Soft delete all oppositions for user (cascade RGPD deletion)
   * Art. 17 RGPD (Right to erasure)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteByUser(tenantId: string, userId: string): Promise<number>;

  /**
   * Hard delete all oppositions for user (purge after retention period)
   * Art. 17 RGPD (Right to erasure)
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteByUser(tenantId: string, userId: string): Promise<number>;
}
