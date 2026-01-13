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
import {
  INCIDENT_SEVERITY,
  INCIDENT_TYPE,
  INCIDENT_RISK_LEVEL,
  INCIDENT_DATA_CATEGORY,
  DETECTION_SOURCE,
} from "@/domain/incident";
import { logEvent } from "@/shared/logger";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Detection event type constants
 */
export const DETECTION_EVENT_TYPE = {
  BRUTE_FORCE: "BRUTE_FORCE",
  CROSS_TENANT_ACCESS: "CROSS_TENANT_ACCESS",
  MASS_EXPORT: "MASS_EXPORT",
  PII_IN_LOGS: "PII_IN_LOGS",
  BACKUP_FAILURE: "BACKUP_FAILURE",
} as const;

export type DetectionEventType = (typeof DETECTION_EVENT_TYPE)[keyof typeof DETECTION_EVENT_TYPE];

// =============================================================================
// TYPES
// =============================================================================

/**
 * Brute force detection event
 */
export interface BruteForceEvent {
  type: typeof DETECTION_EVENT_TYPE.BRUTE_FORCE;
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
  type: typeof DETECTION_EVENT_TYPE.CROSS_TENANT_ACCESS;
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
  type: typeof DETECTION_EVENT_TYPE.MASS_EXPORT;
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
  type: typeof DETECTION_EVENT_TYPE.PII_IN_LOGS;
  logFile: string;
  lineCount: number;
  piiTypes: string[];
  detectedAt: Date;
}

/**
 * Backup failure event
 */
export interface BackupFailureEvent {
  type: typeof DETECTION_EVENT_TYPE.BACKUP_FAILURE;
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
    case DETECTION_EVENT_TYPE.BRUTE_FORCE:
      return evaluateBruteForce(event);
    case DETECTION_EVENT_TYPE.CROSS_TENANT_ACCESS:
      return evaluateCrossTenant(event);
    case DETECTION_EVENT_TYPE.MASS_EXPORT:
      return evaluateMassExport(event);
    case DETECTION_EVENT_TYPE.PII_IN_LOGS:
      return evaluatePiiInLogs(event);
    case DETECTION_EVENT_TYPE.BACKUP_FAILURE:
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
    severity: INCIDENT_SEVERITY.MEDIUM,
    type: INCIDENT_TYPE.UNAUTHORIZED_ACCESS,
    title: `Brute force attack detected from ${event.sourceIp}`,
    description: `${event.attemptCount} failed login attempts in ${event.timeWindowMinutes} minutes from IP ${event.sourceIp}. ${event.email ? `Target: ${event.email}` : ""}`,
    tenantId: event.tenantId ?? null,
    riskLevel: INCIDENT_RISK_LEVEL.LOW, // Brute force blocked = low risk
    detectedBy: ACTOR_SCOPE.SYSTEM,
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
    severity: INCIDENT_SEVERITY.CRITICAL,
    type: INCIDENT_TYPE.CROSS_TENANT_ACCESS,
    title: `Cross-tenant access attempt: ${event.actorTenantId} → ${event.targetTenantId}`,
    description: `User ${event.actorUserId} from tenant ${event.actorTenantId} attempted to access data from tenant ${event.targetTenantId}. Endpoint: ${event.endpoint}. This is a CRITICAL isolation violation.`,
    tenantId: event.targetTenantId, // Affected tenant
    dataCategories: [INCIDENT_DATA_CATEGORY.P1, INCIDENT_DATA_CATEGORY.P2], // Assume metadata + auth data at risk
    riskLevel: INCIDENT_RISK_LEVEL.HIGH, // Cross-tenant = always high risk
    detectedBy: ACTOR_SCOPE.SYSTEM,
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
    severity: INCIDENT_SEVERITY.HIGH,
    type: INCIDENT_TYPE.DATA_LEAK,
    title: `Unusual data export: ${event.recordCount} records`,
    description: `User ${event.userId} exported ${event.recordCount} records in ${event.timeWindowMinutes} minutes. Export type: ${event.exportType}. This may indicate data exfiltration.`,
    tenantId: event.tenantId,
    recordsAffected: event.recordCount,
    riskLevel: INCIDENT_RISK_LEVEL.MEDIUM, // Suspicious but may be legitimate
    detectedBy: ACTOR_SCOPE.SYSTEM,
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

  const severity: IncidentSeverity = hasSensitivePii ? INCIDENT_SEVERITY.HIGH : INCIDENT_SEVERITY.MEDIUM;

  // Description uses count, not actual types (for safe logging)
  return {
    severity,
    type: INCIDENT_TYPE.PII_IN_LOGS,
    title: `PII detected in logs: ${event.piiTypes.length} type(s)`,
    description: `${event.lineCount} log lines containing ${event.piiTypes.length} PII type(s) detected in ${event.logFile}. Immediate remediation required.`,
    tenantId: null, // Platform-wide incident
    dataCategories: [INCIDENT_DATA_CATEGORY.P2], // PII data
    riskLevel: hasSensitivePii ? INCIDENT_RISK_LEVEL.HIGH : INCIDENT_RISK_LEVEL.MEDIUM,
    detectedBy: DETECTION_SOURCE.MONITORING,
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
    severity: INCIDENT_SEVERITY.HIGH,
    type: INCIDENT_TYPE.DATA_LOSS,
    title: `Backup failure: ${event.consecutiveFailures} consecutive failures`,
    description: `${event.backupType} backup has failed ${event.consecutiveFailures} times consecutively. Error: ${event.errorMessage}. Data loss risk if not addressed.`,
    tenantId: null, // Platform-wide incident
    riskLevel: INCIDENT_RISK_LEVEL.MEDIUM,
    detectedBy: DETECTION_SOURCE.MONITORING,
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
    case DETECTION_EVENT_TYPE.CROSS_TENANT_ACCESS:
      return INCIDENT_SEVERITY.CRITICAL;
    case DETECTION_EVENT_TYPE.MASS_EXPORT:
    case DETECTION_EVENT_TYPE.BACKUP_FAILURE:
      return INCIDENT_SEVERITY.HIGH;
    case DETECTION_EVENT_TYPE.BRUTE_FORCE:
    case DETECTION_EVENT_TYPE.PII_IN_LOGS:
      return INCIDENT_SEVERITY.MEDIUM;
    default:
      return INCIDENT_SEVERITY.LOW;
  }
}

/**
 * Maps detection event type to incident type
 */
export function mapEventToIncidentType(eventType: DetectionEvent["type"]): IncidentType {
  switch (eventType) {
    case DETECTION_EVENT_TYPE.BRUTE_FORCE:
      return INCIDENT_TYPE.UNAUTHORIZED_ACCESS;
    case DETECTION_EVENT_TYPE.CROSS_TENANT_ACCESS:
      return INCIDENT_TYPE.CROSS_TENANT_ACCESS;
    case DETECTION_EVENT_TYPE.MASS_EXPORT:
      return INCIDENT_TYPE.DATA_LEAK;
    case DETECTION_EVENT_TYPE.PII_IN_LOGS:
      return INCIDENT_TYPE.PII_IN_LOGS;
    case DETECTION_EVENT_TYPE.BACKUP_FAILURE:
      return INCIDENT_TYPE.DATA_LOSS;
    default:
      return INCIDENT_TYPE.OTHER;
  }
}
