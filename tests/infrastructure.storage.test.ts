/**
 * infrastructure.storage.test.ts — Export Storage tests
 *
 * Coverage target: All branches for export file operations
 *
 * RGPD Compliance:
 * - TTL enforcement
 * - Secure file deletion
 * - Metadata management
 */

import {
  storeEncryptedBundle,
  readEncryptedBundle,
  deleteExportBundle,
  storeExportMetadata,
  getExportMetadata,
  getExportMetadataByToken,
  getExportMetadataByUserId,
  deleteExportMetadata,
  cleanupExpiredExports,
} from "@/infrastructure/storage/ExportStorage";
import type { ExportMetadata } from "@/domain/rgpd/ExportBundle";
import { existsSync, unlinkSync, rmdirSync } from "fs";
import { join } from "path";

const TEST_EXPORT_DIR = "./data/exports";

describe("Export Storage", () => {
  const testExportId = "test-export-" + Date.now();

  afterAll(async () => {
    // Cleanup test files
    const testFilePath = join(TEST_EXPORT_DIR, `${testExportId}.enc`);
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe("storeEncryptedBundle", () => {
    it("stores encrypted bundle to file", async () => {
      const encrypted = {
        ciphertext: "test-encrypted-data",
        iv: "test-iv",
        authTag: "test-auth-tag",
        salt: "test-salt",
      };

      const filePath = await storeEncryptedBundle(testExportId, encrypted);

      expect(filePath).toContain(testExportId);
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe("readEncryptedBundle", () => {
    it("reads encrypted bundle from file", async () => {
      const encrypted = {
        ciphertext: "read-test-data",
        iv: "read-test-iv",
        authTag: "read-test-tag",
        salt: "read-test-salt",
      };

      await storeEncryptedBundle(testExportId, encrypted);
      const result = await readEncryptedBundle(testExportId);

      expect(result.iv).toBe("read-test-iv");
      expect(result.ciphertext).toBe("read-test-data");
      expect(result.authTag).toBe("read-test-tag");
    });

    it("throws error for non-existent file", async () => {
      await expect(
        readEncryptedBundle("non-existent-export-id")
      ).rejects.toThrow();
    });
  });

  describe("deleteExportBundle", () => {
    it("deletes existing export file", async () => {
      const deleteTestId = "delete-test-" + Date.now();
      const encrypted = {
        ciphertext: "delete-test-data",
        iv: "delete-test-iv",
        authTag: "delete-test-tag",
        salt: "delete-test-salt",
      };

      const filePath = await storeEncryptedBundle(deleteTestId, encrypted);
      expect(existsSync(filePath)).toBe(true);

      await deleteExportBundle(deleteTestId);
      expect(existsSync(filePath)).toBe(false);
    });

    it("does not throw for non-existent file (ENOENT)", async () => {
      // Should not throw
      await expect(
        deleteExportBundle("non-existent-file-id")
      ).resolves.toBeUndefined();
    });
  });

  describe("Metadata operations", () => {
    const testMetadata: ExportMetadata = {
      exportId: "meta-test-export",
      tenantId: "tenant-1",
      userId: "user-1",
      downloadToken: "token-abc-123",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      downloadCount: 0,
      createdAt: new Date(),
      filePath: "./data/exports/meta-test-export.enc",
    };

    beforeEach(() => {
      // Clean up any existing test metadata
      deleteExportMetadata("meta-test-export");
      deleteExportMetadata("meta-test-export-2");
    });

    it("stores and retrieves metadata by exportId", () => {
      storeExportMetadata(testMetadata);
      const result = getExportMetadata("meta-test-export");

      expect(result).not.toBeNull();
      expect(result?.exportId).toBe("meta-test-export");
      expect(result?.tenantId).toBe("tenant-1");
    });

    it("returns null for non-existent exportId", () => {
      const result = getExportMetadata("non-existent-id");
      expect(result).toBeNull();
    });

    it("retrieves metadata by download token", () => {
      storeExportMetadata(testMetadata);
      const result = getExportMetadataByToken("token-abc-123");

      expect(result).not.toBeNull();
      expect(result?.downloadToken).toBe("token-abc-123");
    });

    it("returns null for non-existent token", () => {
      const result = getExportMetadataByToken("invalid-token");
      expect(result).toBeNull();
    });

    it("retrieves metadata by userId", () => {
      storeExportMetadata(testMetadata);
      storeExportMetadata({
        ...testMetadata,
        exportId: "meta-test-export-2",
        downloadToken: "token-def-456",
      });

      const results = getExportMetadataByUserId("tenant-1", "user-1");

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("returns empty array for user with no exports", () => {
      const results = getExportMetadataByUserId("tenant-999", "user-999");
      expect(results).toHaveLength(0);
    });

    it("deletes metadata", () => {
      storeExportMetadata(testMetadata);
      expect(getExportMetadata("meta-test-export")).not.toBeNull();

      deleteExportMetadata("meta-test-export");
      expect(getExportMetadata("meta-test-export")).toBeNull();
    });
  });

  describe("cleanupExpiredExports", () => {
    it("cleans up expired exports", async () => {
      const expiredMetadata: ExportMetadata = {
        exportId: "expired-export-" + Date.now(),
        tenantId: "tenant-1",
        userId: "user-1",
        downloadToken: "expired-token",
        expiresAt: new Date(Date.now() - 1000), // Already expired
        downloadCount: 0,
        createdAt: new Date(Date.now() - 2000),
        filePath: "./data/exports/expired-export.enc",
      };

      storeExportMetadata(expiredMetadata);

      const count = await cleanupExpiredExports();

      expect(count).toBeGreaterThanOrEqual(1);
      expect(getExportMetadata(expiredMetadata.exportId)).toBeNull();
    });

    it("does not clean up non-expired exports", async () => {
      const validMetadata: ExportMetadata = {
        exportId: "valid-export-" + Date.now(),
        tenantId: "tenant-1",
        userId: "user-1",
        downloadToken: "valid-token-" + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        downloadCount: 0,
        createdAt: new Date(),
        filePath: "./data/exports/valid-export.enc",
      };

      storeExportMetadata(validMetadata);

      await cleanupExpiredExports();

      expect(getExportMetadata(validMetadata.exportId)).not.toBeNull();

      // Cleanup
      deleteExportMetadata(validMetadata.exportId);
    });
  });
});
