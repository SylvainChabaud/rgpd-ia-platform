import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { ExportMetadata } from "@/domain/rgpd/ExportBundle";
import type { EncryptedData } from "@/infrastructure/crypto/encryption";

/**
 * Export Storage (File System)
 *
 * Responsibilities:
 * - Store encrypted export bundles
 * - Store export metadata
 * - Clean up expired exports
 *
 * Classification: Infrastructure (handles P2 encrypted data)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

const EXPORT_DIR = process.env.EXPORT_DIR || "./data/exports";

/**
 * Ensure export directory exists
 */
async function ensureExportDir(): Promise<void> {
  if (!existsSync(EXPORT_DIR)) {
    await mkdir(EXPORT_DIR, { recursive: true });
  }
}

/**
 * Store encrypted export bundle
 *
 * @param exportId - Export unique identifier
 * @param encrypted - Encrypted bundle data
 * @returns File path
 */
export async function storeEncryptedBundle(
  exportId: string,
  encrypted: EncryptedData
): Promise<string> {
  await ensureExportDir();

  const filePath = join(EXPORT_DIR, `${exportId}.enc`);
  const content = JSON.stringify(encrypted, null, 2);

  await writeFile(filePath, content, "utf8");

  return filePath;
}

/**
 * Read encrypted export bundle
 *
 * @param exportId - Export unique identifier
 * @returns Encrypted data
 * @throws Error if file not found
 */
export async function readEncryptedBundle(
  exportId: string
): Promise<EncryptedData> {
  const filePath = join(EXPORT_DIR, `${exportId}.enc`);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as EncryptedData;
}

/**
 * Delete export bundle file
 *
 * @param exportId - Export unique identifier
 */
export async function deleteExportBundle(exportId: string): Promise<void> {
  const filePath = join(EXPORT_DIR, `${exportId}.enc`);

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
 * In-memory export metadata storage
 * TODO LOT futur: migrate to database (PgExportMetadataRepo)
 */
const metadataStore = new Map<string, ExportMetadata>();

/**
 * Store export metadata
 */
export function storeExportMetadata(metadata: ExportMetadata): void {
  metadataStore.set(metadata.exportId, metadata);
}

/**
 * Get export metadata by exportId
 */
export function getExportMetadata(exportId: string): ExportMetadata | null {
  return metadataStore.get(exportId) || null;
}

/**
 * Get export metadata by download token
 */
export function getExportMetadataByToken(
  token: string
): ExportMetadata | null {
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
export function getExportMetadataByUserId(
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
export function deleteExportMetadata(exportId: string): void {
  metadataStore.delete(exportId);
}

/**
 * Clean up expired exports
 *
 * @returns Number of exports deleted
 */
export async function cleanupExpiredExports(): Promise<number> {
  const now = new Date();
  let count = 0;

  for (const [exportId, metadata] of metadataStore.entries()) {
    if (metadata.expiresAt < now) {
      // Delete file
      await deleteExportBundle(exportId);

      // Delete metadata
      deleteExportMetadata(exportId);

      count++;
    }
  }

  return count;
}
