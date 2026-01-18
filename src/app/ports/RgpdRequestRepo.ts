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

/**
 * RGPD Request with user display name for admin listing
 * LOT 12.3 - Tenant Admin RGPD Management
 *
 * RGPD: displayName only (P1 equivalent in admin context) - NO email
 * Consistent with /portal/users which also shows displayName only
 */
export type RgpdRequestWithUser = RgpdRequest & {
  userDisplayName: string;
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

  /**
   * Find all RGPD requests for a tenant (paginated)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Returns userDisplayName (NO email) for admin identification
   *
   * @param tenantId - Tenant ID (MANDATORY for RGPD isolation)
   * @param params - Pagination and filter params
   */
  findByTenant(
    tenantId: string,
    params?: {
      limit?: number;
      offset?: number;
      type?: RgpdRequestType;
      status?: RgpdRequestStatus;
    }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }>;

  /**
   * Find export requests for a tenant (Art. 15, 20)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Returns userDisplayName (NO email) for admin identification
   */
  findExportsByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number; status?: RgpdRequestStatus }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }>;

  /**
   * Find deletion requests for a tenant (Art. 17)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Returns userDisplayName (NO email) for admin identification
   */
  findDeletionsByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number; status?: RgpdRequestStatus }
  ): Promise<{ requests: RgpdRequestWithUser[]; total: number }>;

  /**
   * Count pending requests by type (for KPI widgets)
   * LOT 12.3 - Tenant Admin RGPD Management
   */
  countByTenant(tenantId: string): Promise<{
    exports: { pending: number; completed: number };
    deletions: { pending: number; completed: number };
  }>;

  /**
   * Get export statistics for RGPD compliance monitoring
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Art. 5.1.e (Storage limitation) - monitors retention compliance
   *
   * @param tenantId - Tenant ID (MANDATORY for RGPD isolation)
   * @returns Export statistics including expired count and oldest age
   */
  getExportStats(tenantId: string): Promise<{
    totalCount: number;
    expiredCount: number;
    oldestAgeDays: number | null;
  }>;

  /**
   * Purge expired exports (older than retention period)
   * LOT 12.3 - Tenant Admin RGPD Management
   *
   * RGPD: Art. 5.1.e (Storage limitation) - enforces retention policy
   * CRITICAL: This permanently deletes export data
   *
   * @param tenantId - Tenant ID (MANDATORY for RGPD isolation)
   * @param retentionDays - Retention period in days (default: 7)
   * @returns Number of exports purged
   */
  purgeExpiredExports(tenantId: string, retentionDays?: number): Promise<number>;

  /**
   * Get deletion request statistics for RGPD compliance monitoring
   * LOT 12.3 - Art. 17 (Right to erasure)
   *
   * RGPD: Monitors completed deletion requests retention
   * Purge allowed: COMPLETED requests older than 30 days
   */
  getDeletionStats(tenantId: string): Promise<{
    totalCount: number;
    completedCount: number;
    expiredCount: number;
    oldestCompletedAgeDays: number | null;
  }>;

  /**
   * Purge expired deletion requests (COMPLETED > 30 days)
   * LOT 12.3 - Art. 17 (Right to erasure)
   *
   * RGPD: Only purges COMPLETED requests after retention period
   * PENDING requests are NEVER purged (legal obligation)
   */
  purgeExpiredDeletions(tenantId: string, retentionDays?: number): Promise<number>;

  /**
   * Get opposition statistics for RGPD compliance monitoring
   * LOT 12.3 - Art. 21 (Right to object)
   *
   * RGPD: Monitors processed oppositions retention
   * Purge allowed: ACCEPTED/REJECTED oppositions older than 3 years
   */
  getOppositionStats(tenantId: string): Promise<{
    totalCount: number;
    processedCount: number;
    expiredCount: number;
    oldestProcessedAgeDays: number | null;
  }>;

  /**
   * Purge expired oppositions (ACCEPTED/REJECTED > 3 years)
   * LOT 12.3 - Art. 21 (Right to object)
   *
   * RGPD: Only purges processed oppositions after 3-year retention
   * PENDING oppositions are NEVER purged
   */
  purgeExpiredOppositions(tenantId: string, retentionDays?: number): Promise<number>;

  /**
   * Get suspension statistics for RGPD compliance monitoring
   * LOT 12.3 - Art. 18 (Right to restriction)
   *
   * RGPD: Monitors lifted suspensions retention
   * Purge allowed: LIFTED suspensions older than 3 years
   */
  getSuspensionStats(tenantId: string): Promise<{
    totalCount: number;
    activeCount: number;
    liftedCount: number;
    expiredCount: number;
    oldestLiftedAgeDays: number | null;
  }>;

  /**
   * Purge expired suspensions (LIFTED > 3 years)
   * LOT 12.3 - Art. 18 (Right to restriction)
   *
   * RGPD: Only purges LIFTED suspensions after 3-year retention
   * ACTIVE suspensions are NEVER purged (legal obligation)
   */
  purgeExpiredSuspensions(tenantId: string, retentionDays?: number): Promise<number>;

  /**
   * Get contest statistics for RGPD compliance monitoring
   * LOT 12.3 - Art. 22 (Automated decision-making)
   *
   * RGPD: Monitors resolved contests retention
   * Purge allowed: RESOLVED/REJECTED contests older than 90 days
   */
  getContestStats(tenantId: string): Promise<{
    totalCount: number;
    resolvedCount: number;
    expiredCount: number;
    oldestResolvedAgeDays: number | null;
  }>;

  /**
   * Purge expired contests (RESOLVED/REJECTED > 90 days)
   * LOT 12.3 - Art. 22 (Automated decision-making)
   *
   * RGPD: Only purges resolved contests after 90-day retention
   * PENDING/IN_REVIEW contests are NEVER purged
   */
  purgeExpiredContests(tenantId: string, retentionDays?: number): Promise<number>;
}
