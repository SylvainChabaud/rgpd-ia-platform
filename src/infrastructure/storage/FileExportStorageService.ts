/**
 * File System Export Storage Service Implementation
 *
 * Implements the ExportStorageService port with file system storage
 *
 * Responsibilities:
 * - Store encrypted export bundles on file system
 * - Store export metadata in memory (TODO: migrate to database)
 * - Clean up expired exports
 *
 * Classification: Infrastructure (handles P2 encrypted data)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { ExportStorageService } from "@/app/ports/ExportStorageService";
import type { EncryptedData } from "@/app/ports/EncryptionService";
import type { ExportMetadata } from "@/domain/rgpd/ExportBundle";

const EXPORT_DIR = process.env.EXPORT_DIR || "./data/exports";

/**
 * In-memory export metadata storage
 * TODO LOT futur: migrate to database (PgExportMetadataRepo)
 */
const metadataStore = new Map<string, ExportMetadata>();

/**
 * File System Export Storage Service
 */
export class FileExportStorageService implements ExportStorageService {
  private exportDir: string;

  constructor(exportDir: string = EXPORT_DIR) {
    this.exportDir = exportDir;
  }

  /**
   * Ensure export directory exists
   */
  private async ensureExportDir(): Promise<void> {
    if (!existsSync(this.exportDir)) {
      await mkdir(this.exportDir, { recursive: true });
    }
  }

  /**
   * Store encrypted export bundle
   */
  async storeEncryptedBundle(
    exportId: string,
    encrypted: EncryptedData
  ): Promise<string> {
    await this.ensureExportDir();

    const filePath = join(this.exportDir, `${exportId}.enc`);
    const content = JSON.stringify(encrypted, null, 2);

    await writeFile(filePath, content, "utf8");

    return filePath;
  }

  /**
   * Read encrypted export bundle
   */
  async readEncryptedBundle(exportId: string): Promise<EncryptedData> {
    const filePath = join(this.exportDir, `${exportId}.enc`);
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as EncryptedData;
  }

  /**
   * Delete export bundle file
   */
  async deleteExportBundle(exportId: string): Promise<void> {
    const filePath = join(this.exportDir, `${exportId}.enc`);

    try {
      await unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * Store export metadata
   */
  storeExportMetadata(metadata: ExportMetadata): void {
    metadataStore.set(metadata.exportId, metadata);
  }

  /**
   * Get export metadata by exportId
   */
  getExportMetadata(exportId: string): ExportMetadata | null {
    return metadataStore.get(exportId) || null;
  }

  /**
   * Get export metadata by download token
   */
  getExportMetadataByToken(token: string): ExportMetadata | null {
    for (const metadata of metadataStore.values()) {
      if (metadata.downloadToken === token) {
        return metadata;
      }
    }
    return null;
  }

  /**
   * Get all export metadata for a user (for purge)
   */
  getExportMetadataByUserId(
    tenantId: string,
    userId: string
  ): ExportMetadata[] {
    const result: ExportMetadata[] = [];

    for (const metadata of metadataStore.values()) {
      if (metadata.tenantId === tenantId && metadata.userId === userId) {
        result.push(metadata);
      }
    }

    return result;
  }

  /**
   * Delete export metadata
   */
  deleteExportMetadata(exportId: string): void {
    metadataStore.delete(exportId);
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [exportId, metadata] of metadataStore.entries()) {
      if (metadata.expiresAt < now) {
        // Delete file
        await this.deleteExportBundle(exportId);

        // Delete metadata
        this.deleteExportMetadata(exportId);

        count++;
      }
    }

    return count;
  }
}
