/**
 * SecurityIncident Domain Entity
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (obligatoire)
 * - Art. 33: Notification CNIL (72h si risque)
 * - Art. 34: Notification personnes (si risque élevé)
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 */

// =============================================================================
// ENUMS / TYPES
// =============================================================================

/**
 * Incident severity levels
 * Used for prioritization and alerting
 */
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Incident types (Art. 33.3 - nature of violation)
 */
export type IncidentType =
  | "UNAUTHORIZED_ACCESS" // Brute force, privilege escalation
  | "CROSS_TENANT_ACCESS" // Tenant isolation violation (CRITICAL)
  | "DATA_LEAK" // Mass export, exposed API
  | "PII_IN_LOGS" // PII detected in logs (EPIC 8)
  | "DATA_LOSS" // Backup failure, corruption
  | "SERVICE_UNAVAILABLE" // Prolonged downtime (> 4h)
  | "MALWARE" // Malware/ransomware detected
  | "VULNERABILITY_EXPLOITED" // Exploited vulnerability
  | "OTHER"; // Other security incident

/**
 * Risk level for GDPR notification decision (Art. 33-34)
 */
export type RiskLevel =
  | "UNKNOWN" // Evaluation in progress
  | "NONE" // No risk to rights/freedoms
  | "LOW" // Low risk
  | "MEDIUM" // Medium risk
  | "HIGH"; // High risk → CNIL + users notification required

/**
 * Data classification categories affected
 */
export type DataCategory = "P0" | "P1" | "P2" | "P3";

/**
 * How incident was detected
 */
export type DetectionSource =
  | "SYSTEM" // Automated detection (middleware, monitoring)
  | "MONITORING" // Observability alerts (EPIC 7)
  | "USER" // User reported
  | "AUDIT" // Internal audit
  | "PENTEST"; // Security testing

// =============================================================================
// DOMAIN ENTITY
// =============================================================================

/**
 * Security Incident entity
 * Represents a security incident or data breach (Art. 33.5 registry)
 */
export interface SecurityIncident {
  id: string;

  // Tenant scope (null = platform-wide incident)
  tenantId: string | null;

  // Classification
  severity: IncidentSeverity;
  type: IncidentType;
  title: string;
  description: string;

  // Affected data (Art. 33.3)
  dataCategories: DataCategory[];
  usersAffected: number;
  recordsAffected: number;

  // Risk evaluation (Art. 33-34)
  riskLevel: RiskLevel;

  // CNIL notification (Art. 33)
  cnilNotified: boolean;
  cnilNotifiedAt: Date | null;
  cnilReference: string | null;

  // Users notification (Art. 34)
  usersNotified: boolean;
  usersNotifiedAt: Date | null;

  // Remediation
  remediationActions: string | null;
  resolvedAt: Date | null;

  // Detection metadata
  detectedAt: Date;
  detectedBy: DetectionSource;
  sourceIp: string | null;

  // Audit trail
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Input for creating a new security incident
 */
export interface CreateSecurityIncidentInput {
  tenantId?: string | null;
  severity: IncidentSeverity;
  type: IncidentType;
  title: string;
  description: string;
  dataCategories?: DataCategory[];
  usersAffected?: number;
  recordsAffected?: number;
  riskLevel?: RiskLevel;
  detectedBy?: DetectionSource;
  sourceIp?: string | null;
  createdBy?: string | null;
}

/**
 * Creates a new SecurityIncident with defaults
 */
export function createSecurityIncident(
  input: CreateSecurityIncidentInput
): Omit<SecurityIncident, "id" | "createdAt" | "updatedAt"> {
  return {
    tenantId: input.tenantId ?? null,
    severity: input.severity,
    type: input.type,
    title: input.title,
    description: input.description,
    dataCategories: input.dataCategories ?? [],
    usersAffected: input.usersAffected ?? 0,
    recordsAffected: input.recordsAffected ?? 0,
    riskLevel: input.riskLevel ?? "UNKNOWN",
    cnilNotified: false,
    cnilNotifiedAt: null,
    cnilReference: null,
    usersNotified: false,
    usersNotifiedAt: null,
    remediationActions: null,
    resolvedAt: null,
    detectedAt: new Date(),
    detectedBy: input.detectedBy ?? "SYSTEM",
    sourceIp: input.sourceIp ?? null,
    createdBy: input.createdBy ?? null,
  };
}

// =============================================================================
// BUSINESS RULES
// =============================================================================

/**
 * Check if CNIL notification is required (Art. 33)
 * Required within 72 hours if risk to rights/freedoms
 */
export function isCnilNotificationRequired(incident: SecurityIncident): boolean {
  // HIGH risk = mandatory notification
  if (incident.riskLevel === "HIGH") return true;

  // MEDIUM risk = notification recommended (DPO decision)
  if (incident.riskLevel === "MEDIUM") return true;

  // CRITICAL severity always requires notification
  if (incident.severity === "CRITICAL") return true;

  // Cross-tenant access = always critical
  if (incident.type === "CROSS_TENANT_ACCESS") return true;

  return false;
}

/**
 * Check if users notification is required (Art. 34)
 * Required if HIGH risk to rights/freedoms
 */
export function isUsersNotificationRequired(
  incident: SecurityIncident
): boolean {
  // Only HIGH risk requires users notification
  return incident.riskLevel === "HIGH";
}

/**
 * Calculate CNIL notification deadline (72 hours from detection)
 */
export function getCnilDeadline(incident: SecurityIncident): Date {
  const deadline = new Date(incident.detectedAt);
  deadline.setHours(deadline.getHours() + 72);
  return deadline;
}

/**
 * Check if CNIL deadline is approaching (< 24h remaining)
 */
export function isCnilDeadlineApproaching(incident: SecurityIncident): boolean {
  if (incident.cnilNotified) return false;
  if (!isCnilNotificationRequired(incident)) return false;

  const deadline = getCnilDeadline(incident);
  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursRemaining > 0 && hoursRemaining < 24;
}

/**
 * Check if CNIL deadline is passed (overdue)
 */
export function isCnilDeadlineOverdue(incident: SecurityIncident): boolean {
  if (incident.cnilNotified) return false;
  if (!isCnilNotificationRequired(incident)) return false;

  const deadline = getCnilDeadline(incident);
  return new Date() > deadline;
}

/**
 * Severity order for sorting
 */
export const SEVERITY_ORDER: Record<IncidentSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Risk level order for sorting
 */
export const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  NONE: 1,
  UNKNOWN: 0,
};
