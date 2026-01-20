/**
 * LOT 5.1 BLOCKER TESTS: RGPD Export (bundle chiffré + TTL)
 *
 * Requirements (from TASKS.md LOT 5.1):
 * - Export ne contient que le périmètre tenant/utilisateur
 * - Le bundle est chiffré et expirant
 * - Aucun contenu sensible n'est écrit en logs
 *
 * RGPD_TESTING.md:
 * - Test export RGPD (bundle chiffré + TTL)
 * - Test export scope correct
 * - Test TTL appliqué
 *
 * Classification: P1 (technical tests, no sensitive data)
 * Uses: Real export functionality with encryption
 */

import { pool } from "@/infrastructure/db/pg";
import { PgConsentRepo } from "@/infrastructure/repositories/PgConsentRepo";
import { PgAiJobRepo } from "@/infrastructure/repositories/PgAiJobRepo";
import { PgAuditEventReader } from "@/infrastructure/audit/PgAuditEventReader";
import { InMemoryAuditEventWriter } from "@/app/audit/InMemoryAuditEventWriter";
import { exportUserData } from "@/app/usecases/rgpd/exportUserData";
import { downloadExport } from "@/app/usecases/rgpd/downloadExport";
import { AesEncryptionService } from "@/infrastructure/crypto/AesEncryptionService";
import { FileExportStorageService } from "@/infrastructure/storage/FileExportStorageService";
import type { ExportBundle } from "@/domain/rgpd/ExportBundle";
import { EXPORT_MAX_DOWNLOADS } from "@/domain/rgpd/ExportBundle";
import { newId } from "@/shared/ids";

// Test fixtures
const TENANT_A_ID = newId();
const TENANT_B_ID = newId();
const USER_A_ID = newId();
const USER_B_ID = newId();

// Shared instances for cleanup
const sharedExportStorage = new FileExportStorageService();

/**
 * Cleanup: delete all test data using SECURITY DEFINER function
 */
async function cleanup() {
  // First: cleanup by slug pattern (handles old test data with different IDs)
  const existingTenants = await pool.query(
    "SELECT id FROM tenants WHERE slug IN ('export-test-a', 'export-test-b')"
  );
  if (existingTenants.rows.length > 0) {
    const tenantIds = existingTenants.rows.map((row) => row.id);
    await pool.query("SELECT cleanup_test_data($1::UUID[])", [tenantIds]);
  }

  // Second: cleanup by current test IDs
  await pool.query("SELECT cleanup_test_data($1::UUID[])", [[TENANT_A_ID, TENANT_B_ID]]);

  // Cleanup export files
  await sharedExportStorage.cleanupExpiredExports();
}

/**
 * Setup: create test tenants
 */
async function setupTenants() {
  // Clean first to avoid duplicate slug errors
  await cleanup();
  
  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_A_ID, "export-test-a", "Export Test A"]
  );

  await pool.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)",
    [TENANT_B_ID, "export-test-b", "Export Test B"]
  );
}

beforeAll(async () => {
  await setupTenants();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("LOT 5.1 - RGPD Export (BLOCKER)", () => {
  const consentRepo = new PgConsentRepo();
  const aiJobRepo = new PgAiJobRepo();
  const auditWriter = new InMemoryAuditEventWriter();
  const encryptionService = new AesEncryptionService();
  const exportStorage = new FileExportStorageService();

  test("BLOCKER: Export contains only user scope data (tenant isolation)", async () => {
    // GIVEN: User A in Tenant A has consents and jobs
    await consentRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "export_test",
      granted: true,
      grantedAt: new Date(),
    });

    await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "export_test",
    });

    // GIVEN: User B in Tenant B also has data
    await consentRepo.create(TENANT_B_ID, {
      userId: USER_B_ID,
      purpose: "export_test",
      granted: true,
      grantedAt: new Date(),
    });

    // WHEN: User A exports their data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // THEN: Export should be created
    expect(result.exportId).toBeDefined();
    expect(result.downloadToken).toBeDefined();
    expect(result.password).toBeDefined();
    expect(result.expiresAt).toBeInstanceOf(Date);

    // THEN: Download export and decrypt
    const downloadResult = await downloadExport(auditWriter, exportStorage, {
      downloadToken: result.downloadToken,
      requestingUserId: USER_A_ID,
      requestingTenantId: TENANT_A_ID,
    });

    const decrypted = encryptionService.decrypt(downloadResult.encryptedData, result.password);
    const bundle: ExportBundle = JSON.parse(decrypted);

    // CRITICAL: Export must contain ONLY user A data (tenant isolation)
    expect(bundle.tenantId).toBe(TENANT_A_ID);
    expect(bundle.userId).toBe(USER_A_ID);
    expect(bundle.data.consents.length).toBeGreaterThan(0);
    expect(bundle.data.consents[0].userId).toBe(USER_A_ID);
    expect(bundle.data.consents[0].tenantId).toBe(TENANT_A_ID);

    // CRITICAL: No data from User B or Tenant B
    const hasUserBData = bundle.data.consents.some(
      (c) => c.userId === USER_B_ID || c.tenantId === TENANT_B_ID
    );
    expect(hasUserBData).toBe(false);
  });

  test("BLOCKER: Bundle is encrypted (cannot read without password)", async () => {
    // GIVEN: User exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // WHEN: Attempt to download
    const downloadResult = await downloadExport(auditWriter, exportStorage, {
      downloadToken: result.downloadToken,
      requestingUserId: USER_A_ID,
      requestingTenantId: TENANT_A_ID,
    });

    // THEN: Encrypted data should NOT be readable as JSON
    expect(() => {
      JSON.parse(downloadResult.encryptedData.ciphertext);
    }).toThrow();

    // THEN: Decryption with WRONG password should fail
    expect(() => {
      encryptionService.decrypt(downloadResult.encryptedData, "wrong-password");
    }).toThrow();

    // THEN: Decryption with CORRECT password should succeed
    const decrypted = encryptionService.decrypt(downloadResult.encryptedData, result.password);
    const bundle = JSON.parse(decrypted);
    expect(bundle.userId).toBe(USER_A_ID);
  });

  test("BLOCKER: TTL expiration enforced", async () => {
    // GIVEN: User exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // WHEN: Manually expire the export (simulate TTL)
    const metadata = exportStorage.getExportMetadataByToken(result.downloadToken);
    if (metadata) {
      metadata.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
    }

    // THEN: Download should fail with expiration error
    await expect(
      downloadExport(auditWriter, exportStorage, {
        downloadToken: result.downloadToken,
        requestingUserId: USER_A_ID,
        requestingTenantId: TENANT_A_ID,
      })
    ).rejects.toThrow(/expired/i);
  });

  test("BLOCKER: Download count limit enforced", async () => {
    // GIVEN: User exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // WHEN: Download multiple times (up to limit)
    for (let i = 0; i < EXPORT_MAX_DOWNLOADS; i++) {
      const downloadResult = await downloadExport(auditWriter, exportStorage, {
        downloadToken: result.downloadToken,
        requestingUserId: USER_A_ID,
        requestingTenantId: TENANT_A_ID,
      });

      expect(downloadResult.remainingDownloads).toBe(
        EXPORT_MAX_DOWNLOADS - i - 1
      );
    }

    // THEN: Next download should fail with limit error
    await expect(
      downloadExport(auditWriter, exportStorage, {
        downloadToken: result.downloadToken,
        requestingUserId: USER_A_ID,
        requestingTenantId: TENANT_A_ID,
      })
    ).rejects.toThrow(/limit reached/i);
  });

  test("BLOCKER: Cross-user access denied", async () => {
    // GIVEN: User A exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // WHEN: User B (different user, different tenant) attempts to download
    // THEN: Should be rejected
    await expect(
      downloadExport(auditWriter, exportStorage, {
        downloadToken: result.downloadToken,
        requestingUserId: USER_B_ID,
        requestingTenantId: TENANT_B_ID,
      })
    ).rejects.toThrow(/do not own/i);
  });

  test("BLOCKER: Audit events created (P1 only)", async () => {
    // GIVEN: Fresh audit writer
    const freshAuditWriter = new InMemoryAuditEventWriter();

    // WHEN: User exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      freshAuditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // THEN: Audit event "rgpd.export.created" must be present
    const events = freshAuditWriter.events;
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe("rgpd.export.created");
    expect(events[0].tenantId).toBe(TENANT_A_ID);
    expect(events[0].actorId).toBe(USER_A_ID);
    expect(events[0].metadata?.exportId).toBe(result.exportId);

    // CRITICAL: No sensitive data in audit event
    expect(events[0]).not.toHaveProperty("password");
    expect(events[0]).not.toHaveProperty("encryptedData");
    expect(events[0]).not.toHaveProperty("bundle");
  });

  test("BLOCKER: Export bundle format is stable and complete", async () => {
    // GIVEN: User has multiple data types
    await consentRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "format_test",
      granted: true,
      grantedAt: new Date(),
    });

    await aiJobRepo.create(TENANT_A_ID, {
      userId: USER_A_ID,
      purpose: "format_test",
    });

    // WHEN: User exports data
    const result = await exportUserData(
      consentRepo,
      aiJobRepo,
      auditWriter,
      new PgAuditEventReader(),
      encryptionService,
      exportStorage,
      {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
      }
    );

    // THEN: Download and decrypt
    const downloadResult = await downloadExport(auditWriter, exportStorage, {
      downloadToken: result.downloadToken,
      requestingUserId: USER_A_ID,
      requestingTenantId: TENANT_A_ID,
    });

    const decrypted = encryptionService.decrypt(downloadResult.encryptedData, result.password);
    const bundle: ExportBundle = JSON.parse(decrypted);

    // CRITICAL: Bundle must have stable structure
    expect(bundle).toHaveProperty("exportId");
    expect(bundle).toHaveProperty("tenantId");
    expect(bundle).toHaveProperty("userId");
    expect(bundle).toHaveProperty("generatedAt");
    expect(bundle).toHaveProperty("expiresAt");
    expect(bundle).toHaveProperty("version");
    expect(bundle).toHaveProperty("data");

    // CRITICAL: Data section must include all categories
    expect(bundle.data).toHaveProperty("consents");
    expect(bundle.data).toHaveProperty("aiJobs");
    expect(bundle.data).toHaveProperty("auditEvents");

    // CRITICAL: Each data type must be an array
    expect(Array.isArray(bundle.data.consents)).toBe(true);
    expect(Array.isArray(bundle.data.aiJobs)).toBe(true);
    expect(Array.isArray(bundle.data.auditEvents)).toBe(true);
  });
});
