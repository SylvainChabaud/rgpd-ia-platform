import { randomUUID } from "crypto";
import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AiJobRepo } from "@/app/ports/AiJobRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import type {
  ExportBundle,
  ExportData,
  ExportMetadata,
  ExportAuditEvent,
} from "@/domain/rgpd/ExportBundle";
import {
  EXPORT_TTL_DAYS,
  EXPORT_MAX_DOWNLOADS,
  EXPORT_VERSION,
} from "@/domain/rgpd/ExportBundle";
import {
  encrypt,
  generateExportPassword,
} from "@/infrastructure/crypto/encryption";
import {
  storeEncryptedBundle,
  storeExportMetadata,
} from "@/infrastructure/storage/ExportStorage";
import { pool } from "@/infrastructure/db/pg";

/**
 * Export User Data use-case (RGPD Art. 15, 20)
 *
 * RGPD compliance:
 * - Right to access (Art. 15)
 * - Right to data portability (Art. 20)
 * - Tenant-scoped isolation
 * - Encrypted export with TTL
 * - Audit event emitted (P1 only)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

export type ExportUserDataInput = {
  tenantId: string;
  userId: string;
};

export type ExportUserDataOutput = {
  exportId: string;
  downloadToken: string;
  password: string; // User must save this password
  expiresAt: Date;
};

export async function exportUserData(
  consentRepo: ConsentRepo,
  aiJobRepo: AiJobRepo,
  auditWriter: AuditEventWriter,
  input: ExportUserDataInput
): Promise<ExportUserDataOutput> {
  const { tenantId, userId } = input;

  // Validation
  if (!tenantId || !userId) {
    throw new Error("tenantId and userId are required");
  }

  // Generate export ID and metadata
  const exportId = randomUUID();
  const downloadToken = randomUUID();
  const password = generateExportPassword();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Step 1: Collect user data (tenant-scoped)
  const [consents, aiJobs, auditEvents] = await Promise.all([
    consentRepo.findByUser(tenantId, userId),
    aiJobRepo.findByUser(tenantId, userId),
    fetchAuditEvents(tenantId, userId),
  ]);

  const exportData: ExportData = {
    consents,
    aiJobs,
    auditEvents,
  };

  // Step 2: Create export bundle
  const bundle: ExportBundle = {
    exportId,
    tenantId,
    userId,
    generatedAt: now,
    expiresAt,
    version: EXPORT_VERSION,
    data: exportData,
  };

  // Step 3: Encrypt bundle
  const bundleJson = JSON.stringify(bundle, null, 2);
  const encrypted = encrypt(bundleJson, password);

  // Step 4: Store encrypted bundle
  const filePath = await storeEncryptedBundle(exportId, encrypted);

  // Step 5: Store metadata
  const metadata: ExportMetadata = {
    exportId,
    tenantId,
    userId,
    createdAt: now,
    expiresAt,
    downloadToken,
    downloadCount: 0,
    filePath,
  };
  storeExportMetadata(metadata);

  // Step 6: Emit audit event (P1 only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.export.created",
    actorScope: "TENANT",
    actorId: userId,
    tenantId,
    metadata: {
      exportId,
    },
  });

  return {
    exportId,
    downloadToken,
    password,
    expiresAt,
  };
}

/**
 * Fetch audit events for user (P1 data only)
 *
 * Returns minimal audit event info (no metadata to avoid P2 leakage)
 */
async function fetchAuditEvents(
  tenantId: string,
  userId: string
): Promise<ExportAuditEvent[]> {
  // Query audit_events table (P1 data only)
  // Note: DB schema uses event_type, created_at (LOT 1 migration)
  const res = await pool.query(
    `SELECT id, event_type, created_at
     FROM audit_events
     WHERE tenant_id = $1 AND actor_id = $2
     ORDER BY created_at DESC
     LIMIT 1000`,
    [tenantId, userId]
  );

  return res.rows.map((row) => ({
    id: row.id,
    eventName: row.event_type,
    occurredAt: new Date(row.created_at),
    actorScope: "TENANT", // Simplified: assume TENANT scope for user events
  }));
}
