/**
 * CookieConsentRepo port
 *
 * Classification: P1 (metadata only, RGPD compliant)
 * Purpose: manage user cookie consent preferences
 * Retention: 12 months (CNIL standard)
 *
 * RGPD Compliance: ePrivacy Directive 2002/58/CE Art. 5.3
 *
 * CRITICAL RGPD:
 * - Supports both authenticated users (userId) and anonymous visitors (anonymousId)
 * - TTL 12 months, automatic expiration
 * - Necessary cookies always TRUE (non-modifiable)
 * - Analytics/Marketing cookies require explicit opt-in
 */

import { CookieConsent } from '@/domain/legal/CookieConsent';

export interface CreateCookieConsentInput {
  tenantId?: string;
  userId?: string;
  anonymousId?: string;
  analytics: boolean;
  marketing: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateCookieConsentInput {
  analytics?: boolean;
  marketing?: boolean;
}

export interface CookieConsentRepo {
  /**
   * Find latest valid consent for authenticated user
   *
   * @param userId - user identifier
   * @returns Latest non-expired consent or null
   */
  findByUser(userId: string): Promise<CookieConsent | null>;

  /**
   * Find latest valid consent for anonymous visitor
   *
   * @param anonymousId - anonymous visitor UUID
   * @returns Latest non-expired consent or null
   */
  findByAnonymousId(anonymousId: string): Promise<CookieConsent | null>;

  /**
   * Find consent by ID
   *
   * @param id - consent identifier
   * @returns Consent or null
   */
  findById(id: string): Promise<CookieConsent | null>;

  /**
   * Create new cookie consent record
   *
   * Business rules:
   * - Either userId OR anonymousId required (not both)
   * - TTL automatically set to 12 months
   * - Necessary cookies always TRUE
   *
   * @param input - cookie consent data
   * @throws Error if both userId and anonymousId provided
   * @throws Error if neither userId nor anonymousId provided
   */
  save(input: CreateCookieConsentInput): Promise<CookieConsent>;

  /**
   * Update existing cookie consent preferences
   *
   * @param id - consent identifier
   * @param updates - partial updates (analytics/marketing only)
   * @returns Updated consent
   * @throws Error if consent not found
   */
  update(id: string, updates: UpdateCookieConsentInput): Promise<CookieConsent>;

  /**
   * Delete expired consents (automatic cleanup job)
   *
   * @returns Number of deleted records
   */
  deleteExpired(): Promise<number>;

  /**
   * Soft delete all consents for user (cascade RGPD deletion)
   * Art. 17 RGPD (Right to erasure)
   *
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteByUser(userId: string): Promise<number>;

  /**
   * Hard delete all consents for user (purge after retention period)
   * Art. 17 RGPD (Right to erasure)
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteByUser(userId: string): Promise<number>;

  /**
   * List all consents for a user (RGPD export)
   * Art. 15 RGPD (Right of access)
   *
   * @param userId - user identifier
   * @returns All consents (including expired)
   */
  findAllByUser(userId: string): Promise<CookieConsent[]>;
}
