import { randomUUID } from "crypto";
import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { AiJobRepo } from "@/app/ports/AiJobRepo";
import type { AuditEventWriter } from "@/app/ports/AuditEventWriter";
import type { AuditEventReader } from "@/app/ports/AuditEventReader";
import type { EncryptionService } from "@/app/ports/EncryptionService";
import type { ExportStorageService } from "@/app/ports/ExportStorageService";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import type {
  ExportBundle,
  ExportData,
  ExportMetadata,
  ExportAuditEvent,
  ExportConsent,
  ExportAiJob,
} from "@/domain/rgpd/ExportBundle";
import { EXPORT_VERSION } from "@/domain/rgpd/ExportBundle";
import { RGPD_EXPORT_RETENTION_DAYS } from "@/domain/retention/RetentionPolicy";
import { ACTOR_SCOPE } from "@/shared/actorScope";

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
  auditEventReader: AuditEventReader,
  encryptionService: EncryptionService,
  exportStorage: ExportStorageService,
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
  const password = encryptionService.generateExportPassword();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RGPD_EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Step 1: Collect user data (tenant-scoped via repositories)
  const [consentsRaw, aiJobsRaw, auditEventsRaw] = await Promise.all([
    consentRepo.findByUser(tenantId, userId),
    aiJobRepo.findByUser(tenantId, userId),
    auditEventReader.findByUser(tenantId, userId, 1000),
  ]);

  // Map consents to domain export format
  const consents: ExportConsent[] = consentsRaw.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    userId: c.userId,
    purpose: c.purpose,
    purposeId: c.purposeId,
    granted: c.granted,
    grantedAt: c.grantedAt,
    revokedAt: c.revokedAt,
    createdAt: c.createdAt,
  }));

  // Map AI jobs to domain export format
  const aiJobs: ExportAiJob[] = aiJobsRaw.map((job) => ({
    id: job.id,
    tenantId: job.tenantId,
    userId: job.userId,
    purpose: job.purpose,
    modelRef: job.modelRef,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }));

  // Map audit events to export format
  const auditEvents: ExportAuditEvent[] = auditEventsRaw.map((event) => ({
    id: event.id,
    eventName: event.eventType,
    occurredAt: event.createdAt,
    actorScope: ACTOR_SCOPE.TENANT, // Simplified: assume TENANT scope for user events
  }));

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
  const encrypted = encryptionService.encrypt(bundleJson, password);

  // Step 4: Store encrypted bundle
  const filePath = await exportStorage.storeEncryptedBundle(exportId, encrypted);

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
  exportStorage.storeExportMetadata(metadata);

  // Step 6: Emit audit event (P1 only)
  await emitAuditEvent(auditWriter, {
    id: randomUUID(),
    eventName: "rgpd.export.created",
    actorScope: ACTOR_SCOPE.TENANT,
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
