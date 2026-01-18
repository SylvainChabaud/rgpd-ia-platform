/**
 * RGPD Export Bundle Domain Model
 *
 * Classification: P2 (contains personal data)
 * Purpose: RGPD right to access & data portability (Art. 15, 20 RGPD)
 *
 * LOT 5.1 — Export RGPD (bundle chiffré + TTL)
 */

import type { Consent } from "@/app/ports/ConsentRepo";
import type { AiJob } from "@/app/ports/AiJobRepo";

/**
 * RGPD Export Bundle Structure
 *
 * Contains ALL user data within tenant scope:
 * - User consents (P2)
 * - AI jobs history (P2)
 * - Audit events related to user (P1)
 */
export type ExportBundle = {
  exportId: string;
  tenantId: string;
  userId: string;
  generatedAt: Date;
  expiresAt: Date;
  version: string; // Format version for future evolution
  data: ExportData;
};

export type ExportData = {
  consents: Consent[];
  aiJobs: AiJob[];
  auditEvents: ExportAuditEvent[];
};

/**
 * Audit event for export (P1 data only)
 * Excludes metadata to avoid P2 leakage
 */
export type ExportAuditEvent = {
  id: string;
  eventName: string;
  occurredAt: Date;
  actorScope: string;
};

/**
 * Export Metadata (stored separately from encrypted bundle)
 *
 * Classification: P1 (technical identifiers only)
 */
export type ExportMetadata = {
  exportId: string;
  tenantId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  downloadToken: string; // Opaque token for download
  downloadCount: number;
  filePath: string; // Encrypted file location
};

/**
 * Export Configuration
 */
export const EXPORT_MAX_DOWNLOADS = 3;
export const EXPORT_VERSION = "1.0.0";
