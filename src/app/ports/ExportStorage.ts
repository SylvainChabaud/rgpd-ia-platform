/**
 * ExportStorage port
 * LOT 5.1 - Export RGPD (bundle chiffré + TTL)
 *
 * Interface for managing encrypted export bundles.
 * RGPD compliance:
 * - Encrypted storage (P2 data)
 * - TTL-based expiration
 * - Crypto-shredding support
 */

import type { ExportMetadata } from '@/domain/rgpd/ExportBundle';

/**
 * Encrypted data structure
 * Contains the encrypted content and cryptographic metadata
 */
export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

/**
 * ExportStorage interface for managing export bundles
 *
 * SECURITY:
 * - All data is encrypted at rest
 * - Access controlled by download token
 * - TTL expiration enforced
 */
export interface ExportStorage {
  /**
   * Store encrypted export bundle
   *
   * @param exportId - Export unique identifier
   * @param encrypted - Encrypted bundle data
   * @returns File path
   */
  storeEncryptedBundle(exportId: string, encrypted: EncryptedData): Promise<string>;

  /**
   * Read encrypted export bundle
   *
   * @param exportId - Export unique identifier
   * @returns Encrypted data
   * @throws Error if file not found
   */
  readEncryptedBundle(exportId: string): Promise<EncryptedData>;

  /**
   * Delete export bundle file (crypto-shredding)
   *
   * @param exportId - Export unique identifier
   */
  deleteExportBundle(exportId: string): Promise<void>;

  /**
   * Store export metadata
   *
   * @param metadata - Export metadata
   */
  storeExportMetadata(metadata: ExportMetadata): void;

  /**
   * Get export metadata by token
   *
   * @param token - Download token
   * @returns Export metadata or undefined
   */
  getExportMetadataByToken(token: string): ExportMetadata | undefined;

  /**
   * Get export metadata by user ID
   *
   * @param tenantId - Tenant isolation
   * @param userId - User ID
   * @returns Array of export metadata
   */
  getExportMetadataByUserId(tenantId: string, userId: string): ExportMetadata[];

  /**
   * Delete export metadata
   *
   * @param exportId - Export unique identifier
   */
  deleteExportMetadata(exportId: string): void;
}
