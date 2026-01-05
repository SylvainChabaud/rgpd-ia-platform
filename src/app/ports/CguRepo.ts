/**
 * CguRepo port
 *
 * Classification: P0 (public content) + P1 (acceptance metadata)
 * Purpose: manage CGU versions and user acceptances
 * Retention: indefinite (legal compliance)
 *
 * RGPD Compliance: Art. 13-14 (Transparent information)
 *                  Art. 7 (Conditions for consent)
 *
 * CRITICAL RGPD:
 * - CGU versions are public (P0)
 * - User acceptances are metadata (P1)
 * - IP addresses anonymized after 7 days (EPIC 8)
 * - Versioning ensures users accept current version
 * - Audit trail for compliance proof
 */

import { CguVersion } from '@/domain/legal/CguVersion';
import { CguAcceptance } from '@/domain/legal/CguAcceptance';

export interface CreateCguVersionInput {
  version: string;
  content: string;
  effectiveDate: Date;
  summary?: string;
}

export interface CreateCguAcceptanceInput {
  tenantId: string;
  userId: string;
  cguVersionId: string;
  ipAddress?: string;
  userAgent?: string;
  acceptanceMethod: 'checkbox' | 'button' | 'api';
}

export interface CguRepo {
  /**
   * Find active CGU version (currently in effect)
   *
   * @returns Active version or null if none
   */
  findActiveVersion(): Promise<CguVersion | null>;

  /**
   * Find CGU version by ID
   *
   * @param id - version identifier
   * @returns CGU version or null
   */
  findVersionById(id: string): Promise<CguVersion | null>;

  /**
   * Find CGU version by version string (e.g., "1.0.0")
   *
   * @param version - semantic version string
   * @returns CGU version or null
   */
  findVersionByNumber(version: string): Promise<CguVersion | null>;

  /**
   * List all CGU versions (ordered by effectiveDate DESC)
   *
   * @returns All versions, most recent first
   */
  findAllVersions(): Promise<CguVersion[]>;

  /**
   * Create new CGU version
   *
   * Business rules:
   * - Version must follow semver (X.Y.Z)
   * - New version is NOT active by default
   * - Must be activated explicitly
   *
   * @param input - CGU version data
   * @throws Error if version already exists
   * @throws Error if version format invalid
   */
  createVersion(input: CreateCguVersionInput): Promise<CguVersion>;

  /**
   * Activate a CGU version (deactivates previous active version)
   *
   * Business rules:
   * - Only one version can be active at a time
   * - Automatically deactivates previous active version
   * - Triggers notification email to all users
   *
   * @param versionId - version identifier to activate
   * @throws Error if version not found
   * @throws Error if version effectiveDate in future
   */
  activateVersion(versionId: string): Promise<void>;

  /**
   * Record user acceptance of CGU version
   *
   * Business rules:
   * - User can only accept each version once
   * - IP address stored but anonymized after 7 days
   * - Acceptance method tracked for audit
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param input - acceptance data
   * @throws Error if user already accepted this version
   * @throws Error if tenantId is empty
   */
  recordAcceptance(
    tenantId: string,
    input: CreateCguAcceptanceInput
  ): Promise<CguAcceptance>;

  /**
   * Find user's acceptance of active CGU version
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Acceptance record or null if not accepted
   */
  findUserAcceptanceOfActiveVersion(
    tenantId: string,
    userId: string
  ): Promise<CguAcceptance | null>;

  /**
   * Check if user accepted active CGU version
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns true if user accepted active version
   */
  hasUserAcceptedActiveVersion(
    tenantId: string,
    userId: string
  ): Promise<boolean>;

  /**
   * List all acceptances for a user (RGPD export)
   * Art. 15 RGPD (Right of access)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns All user acceptances
   */
  findAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<CguAcceptance[]>;

  /**
   * Anonymize IP addresses for acceptances older than 7 days
   * EPIC 8 - IP anonymization (Art. 32 RGPD)
   *
   * @returns Number of rows anonymized
   */
  anonymizeOldIpAddresses(): Promise<number>;

  /**
   * Soft delete all acceptances for user (cascade RGPD deletion)
   * Art. 17 RGPD (Right to erasure)
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  softDeleteAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<number>;

  /**
   * Hard delete all acceptances for user (purge after retention period)
   * Art. 17 RGPD (Right to erasure)
   * CRITICAL: Only call after soft delete + retention period
   *
   * @param tenantId - REQUIRED tenant isolation
   * @param userId - user identifier
   * @returns Number of rows affected
   */
  hardDeleteAcceptancesByUser(
    tenantId: string,
    userId: string
  ): Promise<number>;
}
