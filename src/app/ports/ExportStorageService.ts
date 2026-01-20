/**
 * ExportStorageService port
 *
 * Classification: Infrastructure abstraction
 * Purpose: Abstract storage operations for RGPD exports
 *
 * CRITICAL RGPD:
 * - Encrypted data only (never store plaintext P2 data)
 * - TTL enforcement for automatic cleanup
 * - Tenant isolation via metadata
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

import type { EncryptedData } from "@/app/ports/EncryptionService";
import type { ExportMetadata } from "@/domain/rgpd/ExportBundle";

/**
 * ExportStorageService interface
 *
 * Abstracts storage operations for testability and flexibility
 * Supports both file system and future database implementations
 */
export interface ExportStorageService {
  /**
   * Store encrypted export bundle
   *
   * @param exportId - Export unique identifier
   * @param encrypted - Encrypted bundle data
   * @returns File path or storage reference
   */
  storeEncryptedBundle(
    exportId: string,
    encrypted: EncryptedData
  ): Promise<string>;

  /**
   * Read encrypted export bundle
   *
   * @param exportId - Export unique identifier
   * @returns Encrypted data
   * @throws Error if not found
   */
  readEncryptedBundle(exportId: string): Promise<EncryptedData>;

  /**
   * Delete export bundle
   *
   * @param exportId - Export unique identifier
   */
  deleteExportBundle(exportId: string): Promise<void>;

  /**
   * Store export metadata
   *
   * @param metadata - Export metadata (P1 data only)
   */
  storeExportMetadata(metadata: ExportMetadata): void;

  /**
   * Get export metadata by exportId
   *
   * @param exportId - Export unique identifier
   * @returns Metadata or null if not found
   */
  getExportMetadata(exportId: string): ExportMetadata | null;

  /**
   * Get export metadata by download token
   *
   * @param token - Download token
   * @returns Metadata or null if not found
   */
  getExportMetadataByToken(token: string): ExportMetadata | null;

  /**
   * Get all export metadata for a user (for purge operations)
   *
   * @param tenantId - Tenant identifier
   * @param userId - User identifier
   * @returns List of metadata
   */
  getExportMetadataByUserId(
    tenantId: string,
    userId: string
  ): ExportMetadata[];

  /**
   * Delete export metadata
   *
   * @param exportId - Export unique identifier
   */
  deleteExportMetadata(exportId: string): void;

  /**
   * Clean up expired exports
   *
   * @returns Number of exports deleted
   */
  cleanupExpiredExports(): Promise<number>;
}
