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
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateConsentInput {
  userId: string;
  purpose: string;
  granted: boolean;
  grantedAt?: Date;
}

export interface ConsentRepo {
  /**
   * Find latest consent for user and purpose within tenant
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @param purpose - consent purpose (e.g., 'analytics', 'ai_processing')
   * @returns Latest consent or null
   */
  findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purpose: string
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
}
