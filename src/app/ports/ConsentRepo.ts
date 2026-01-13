/**
 * ConsentRepo port
 *
 * Classification: P2 (personal data, RGPD mandatory)
 * Purpose: manage user consent for data processing
 * Retention: account lifetime
 *
 * CRITICAL RGPD:
 * - ALL operations MUST include tenantId (strict isolation)
 * - Consent withdrawal must be immediate and traceable
 * - Export and deletion MUST include consent records
 */

export interface Consent {
  id: string;
  tenantId: string;
  userId: string;
  purpose: string;
  purposeId: string | null; // LOT 12.2: Link to purposes table (UUID)
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateConsentInput {
  userId: string;
  purpose: string;
  purposeId?: string; // LOT 12.2: Optional link to purposes table (UUID)
  granted: boolean;
  grantedAt?: Date;
}

/**
 * Purpose identifier for consent lookup
 * LOT 12.2: Support both legacy string and new UUID-based identification
 */
export type PurposeIdentifier =
  | { type: 'label'; value: string }      // Legacy: match by purpose string/label
  | { type: 'purposeId'; value: string }; // New: match by purposes.id UUID

export interface ConsentRepo {
  /**
   * Find latest consent for user and purpose within tenant
   *
   * LOT 12.2: Enhanced to support both legacy string and new UUID-based lookup
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @param purposeIdentifier - consent purpose (string for legacy, or PurposeIdentifier for new)
   * @returns Latest consent or null
   */
  findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ): Promise<Consent | null>;

  /**
   * Create new consent record
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - consent data
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  create(tenantId: string, input: CreateConsentInput): Promise<void>;

  /**
   * List all consents for a user (RGPD export)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   */
  findByUser(tenantId: string, userId: string): Promise<Consent[]>;

  /**
   * Revoke consent for user and purpose
   *
   * LOT 12.2: Enhanced to support both legacy string and new UUID-based lookup
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @param purposeIdentifier - consent purpose (string for legacy, or PurposeIdentifier for new)
   * @throws Error if tenantId is empty (RGPD blocker)
   */
  revoke(tenantId: string, userId: string, purposeIdentifier: string | PurposeIdentifier): Promise<void>;

  /**
   * Soft delete all consents for user (cascade RGPD deletion)
   * LOT 5.2 - Art. 17 RGPD
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteByUser(tenantId: string, userId: string): Promise<number>;

  /**
   * Hard delete all consents for user (purge after retention period)
   * LOT 5.2 - Art. 17 RGPD
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteByUser(tenantId: string, userId: string): Promise<number>;
}
