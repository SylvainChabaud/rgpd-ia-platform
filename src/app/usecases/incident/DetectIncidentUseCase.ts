/**
 * DetectIncident Use Case
 *
 * Automatic incident detection based on security events.
 * Called by middlewares and monitoring services.
 *
 * RGPD Compliance:
 * - Art. 33: Détection violations automatique
 * - Art. 32: Mesures techniques sécurité
 *
 * Detection types:
 * - BRUTE_FORCE: > 10 failed logins in 5 minutes
 * - CROSS_TENANT_ACCESS: ANY cross-tenant query attempt
 * - MASS_EXPORT: > 10,000 records exported in 1 hour
 * - PII_IN_LOGS: PII detected in logs (EPIC 8)
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 */

import type { CreateIncidentInput } from "./CreateIncidentUseCase";
import type { IncidentType, IncidentSeverity } from "@/domain/incident";
import { logEvent } from "@/shared/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Brute force detection event
 */
export interface BruteForceEvent {
  type: "BRUTE_FORCE";
  userId?: string;
  email?: string;
  sourceIp: string;
  attemptCount: number;
  timeWindowMinutes: number;
  tenantId?: string;
}

/**
 * Cross-tenant access attempt event
 */
export interface CrossTenantEvent {
  type: "CROSS_TENANT_ACCESS";
  actorTenantId: string;
  targetTenantId: string;
  actorUserId: string;
  endpoint: string;
  sourceIp: string;
}

/**
 * Mass export detection event
 */
export interface MassExportEvent {
  type: "MASS_EXPORT";
  userId: string;
  tenantId: string;
  recordCount: number;
  timeWindowMinutes: number;
  exportType: string;
  sourceIp?: string;
}

/**
 * PII in logs detection event (from EPIC 8)
 */
export interface PiiInLogsEvent {
  type: "PII_IN_LOGS";
  logFile: string;
  lineCount: number;
  piiTypes: string[];
  detectedAt: Date;
}

/**
 * Backup failure event
 */
export interface BackupFailureEvent {
  type: "BACKUP_FAILURE";
  backupType: string;
  errorMessage: string;
  consecutiveFailures: number;
}

/**
 * Union of all detection event types
 */
export type DetectionEvent =
  | BruteForceEvent
  | CrossTenantEvent
  | MassExportEvent
  | PiiInLogsEvent
  | BackupFailureEvent;

// =============================================================================
// THRESHOLDS (configurable)
// =============================================================================

export const DETECTION_THRESHOLDS = {
  BRUTE_FORCE_ATTEMPTS: 10,
  BRUTE_FORCE_WINDOW_MINUTES: 5,
  MASS_EXPORT_RECORDS: 10000,
  MASS_EXPORT_WINDOW_MINUTES: 60,
  BACKUP_CONSECUTIVE_FAILURES: 2,
} as const;

// =============================================================================
// DETECTION LOGIC
// =============================================================================

/**
 * Evaluates a detection event and returns incident creation input if threshold exceeded
 */
export function evaluateDetectionEvent(
  event: DetectionEvent
): CreateIncidentInput | null {
  switch (event.type) {
    case "BRUTE_FORCE":
      return evaluateBruteForce(event);
    case "CROSS_TENANT_ACCESS":
      return evaluateCrossTenant(event);
    case "MASS_EXPORT":
      return evaluateMassExport(event);
    case "PII_IN_LOGS":
      return evaluatePiiInLogs(event);
    case "BACKUP_FAILURE":
      return evaluateBackupFailure(event);
    default:
      return null;
  }
}

/**
 * Evaluate brute force attack
 */
function evaluateBruteForce(event: BruteForceEvent): CreateIncidentInput | null {
  if (event.attemptCount < DETECTION_THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
    return null;
  }

  logEvent("incident.detection.brute_force", {
    sourceIp: event.sourceIp,
    attemptCount: event.attemptCount,
  });

  return {
    severity: "MEDIUM",
    type: "UNAUTHORIZED_ACCESS",
    title: `Brute force attack detected from ${event.sourceIp}`,
    description: `${event.attemptCount} failed login attempts in ${event.timeWindowMinutes} minutes from IP ${event.sourceIp}. ${event.email ? `Target: ${event.email}` : ""}`,
    tenantId: event.tenantId ?? null,
    riskLevel: "LOW", // Brute force blocked = low risk
    detectedBy: "SYSTEM",
    sourceIp: event.sourceIp,
    usersAffected: event.userId ? 1 : 0,
  };
}

/**
 * Evaluate cross-tenant access attempt (CRITICAL)
 */
function evaluateCrossTenant(event: CrossTenantEvent): CreateIncidentInput {
  logEvent("incident.detection.cross_tenant", {
    actorTenantId: event.actorTenantId,
    targetTenantId: event.targetTenantId,
    actorUserId: event.actorUserId,
  });

  return {
    severity: "CRITICAL",
    type: "CROSS_TENANT_ACCESS",
    title: `Cross-tenant access attempt: ${event.actorTenantId} → ${event.targetTenantId}`,
    description: `User ${event.actorUserId} from tenant ${event.actorTenantId} attempted to access data from tenant ${event.targetTenantId}. Endpoint: ${event.endpoint}. This is a CRITICAL isolation violation.`,
    tenantId: event.targetTenantId, // Affected tenant
    dataCategories: ["P1", "P2"], // Assume metadata + auth data at risk
    riskLevel: "HIGH", // Cross-tenant = always high risk
    detectedBy: "SYSTEM",
    sourceIp: event.sourceIp,
    usersAffected: 0, // Unknown at detection time
  };
}

/**
 * Evaluate mass export (potential data exfiltration)
 */
function evaluateMassExport(event: MassExportEvent): CreateIncidentInput | null {
  if (event.recordCount < DETECTION_THRESHOLDS.MASS_EXPORT_RECORDS) {
    return null;
  }

  logEvent("incident.detection.mass_export", {
    userId: event.userId,
    recordCount: event.recordCount,
  });

  return {
    severity: "HIGH",
    type: "DATA_LEAK",
    title: `Unusual data export: ${event.recordCount} records`,
    description: `User ${event.userId} exported ${event.recordCount} records in ${event.timeWindowMinutes} minutes. Export type: ${event.exportType}. This may indicate data exfiltration.`,
    tenantId: event.tenantId,
    recordsAffected: event.recordCount,
    riskLevel: "MEDIUM", // Suspicious but may be legitimate
    detectedBy: "SYSTEM",
    sourceIp: event.sourceIp ?? null,
    usersAffected: 1,
    actorId: event.userId,
  };
}

/**
 * Evaluate PII in logs detection (from EPIC 8)
 *
 * NOTE: piiTypes must use safe labels (not actual PII values)
 * e.g., "national_id", "payment_info", "personal_email" instead of actual data
 */
function evaluatePiiInLogs(event: PiiInLogsEvent): CreateIncidentInput {
  // Count types without logging actual types (they might be PII patterns)
  logEvent("incident.detection.pii_in_logs", {
    logFile: event.logFile,
    piiTypeCount: event.piiTypes.length,
    lineCount: event.lineCount,
  });

  // Check for sensitive PII types (using safe labels)
  const hasSensitivePii = event.piiTypes.some(
    (t) =>
      t.includes("national_id") ||
      t.includes("payment") ||
      t.includes("credit") ||
      t.includes("ssn") ||
      t.toLowerCase().includes("social_security")
  );

  const severity: IncidentSeverity = hasSensitivePii ? "HIGH" : "MEDIUM";

  // Description uses count, not actual types (for safe logging)
  return {
    severity,
    type: "PII_IN_LOGS",
    title: `PII detected in logs: ${event.piiTypes.length} type(s)`,
    description: `${event.lineCount} log lines containing ${event.piiTypes.length} PII type(s) detected in ${event.logFile}. Immediate remediation required.`,
    tenantId: null, // Platform-wide incident
    dataCategories: ["P2"], // PII data
    riskLevel: hasSensitivePii ? "HIGH" : "MEDIUM",
    detectedBy: "MONITORING",
    recordsAffected: event.lineCount,
  };
}

/**
 * Evaluate backup failure
 */
function evaluateBackupFailure(
  event: BackupFailureEvent
): CreateIncidentInput | null {
  if (event.consecutiveFailures < DETECTION_THRESHOLDS.BACKUP_CONSECUTIVE_FAILURES) {
    return null;
  }

  logEvent("incident.detection.backup_failure", {
    backupType: event.backupType,
    consecutiveFailures: event.consecutiveFailures,
  });

  return {
    severity: "HIGH",
    type: "DATA_LOSS",
    title: `Backup failure: ${event.consecutiveFailures} consecutive failures`,
    description: `${event.backupType} backup has failed ${event.consecutiveFailures} times consecutively. Error: ${event.errorMessage}. Data loss risk if not addressed.`,
    tenantId: null, // Platform-wide incident
    riskLevel: "MEDIUM",
    detectedBy: "MONITORING",
  };
}

// =============================================================================
// SEVERITY MAPPING
// =============================================================================

/**
 * Maps detection event type to default severity
 */
export function getDefaultSeverity(eventType: DetectionEvent["type"]): IncidentSeverity {
  switch (eventType) {
    case "CROSS_TENANT_ACCESS":
      return "CRITICAL";
    case "MASS_EXPORT":
    case "BACKUP_FAILURE":
      return "HIGH";
    case "BRUTE_FORCE":
    case "PII_IN_LOGS":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

/**
 * Maps detection event type to incident type
 */
export function mapEventToIncidentType(eventType: DetectionEvent["type"]): IncidentType {
  switch (eventType) {
    case "BRUTE_FORCE":
      return "UNAUTHORIZED_ACCESS";
    case "CROSS_TENANT_ACCESS":
      return "CROSS_TENANT_ACCESS";
    case "MASS_EXPORT":
      return "DATA_LEAK";
    case "PII_IN_LOGS":
      return "PII_IN_LOGS";
    case "BACKUP_FAILURE":
      return "DATA_LOSS";
    default:
      return "OTHER";
  }
}
