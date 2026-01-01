/**
 * CreateIncident Use Case
 *
 * Creates a new security incident in the registry and triggers alerts.
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (obligatoire)
 * - Art. 33: Déclenchement workflow notification CNIL
 * - Art. 34: Évaluation notification personnes
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 */

import type {
  SecurityIncident,
  CreateSecurityIncidentInput,
} from "@/domain/incident";
import {
  isCnilNotificationRequired,
  isUsersNotificationRequired,
} from "@/domain/incident";
import type { SecurityIncidentRepo } from "@/domain/incident";
import type { IncidentAlertService } from "@/infrastructure/alerts/IncidentAlertService";
import { logEvent } from "@/shared/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input for creating an incident via use case
 */
export interface CreateIncidentInput {
  // Required fields
  severity: CreateSecurityIncidentInput["severity"];
  type: CreateSecurityIncidentInput["type"];
  title: string;
  description: string;

  // Optional fields
  tenantId?: string | null;
  dataCategories?: CreateSecurityIncidentInput["dataCategories"];
  usersAffected?: number;
  recordsAffected?: number;
  riskLevel?: CreateSecurityIncidentInput["riskLevel"];
  detectedBy?: CreateSecurityIncidentInput["detectedBy"];
  sourceIp?: string | null;

  // Actor creating the incident (null for system detection)
  actorId?: string | null;
}

/**
 * Result of creating an incident
 */
export interface CreateIncidentResult {
  incident: SecurityIncident;
  cnilNotificationRequired: boolean;
  usersNotificationRequired: boolean;
  alertsSent: boolean;
}

/**
 * Dependencies for the use case
 */
export interface CreateIncidentDeps {
  incidentRepo: SecurityIncidentRepo;
  alertService: IncidentAlertService;
}

// =============================================================================
// USE CASE
// =============================================================================

/**
 * Create a new security incident
 *
 * 1. Validates input
 * 2. Creates incident in registry (Art. 33.5)
 * 3. Evaluates notification requirements (Art. 33-34)
 * 4. Sends alerts to appropriate channels
 * 5. Emits audit event
 */
export async function createIncident(
  input: CreateIncidentInput,
  deps: CreateIncidentDeps
): Promise<CreateIncidentResult> {
  // Validate required fields
  if (!input.title || input.title.trim() === "") {
    throw new Error("Incident title is required");
  }
  if (!input.description || input.description.trim() === "") {
    throw new Error("Incident description is required");
  }

  // Create incident in registry
  const incident = await deps.incidentRepo.create({
    tenantId: input.tenantId ?? null,
    severity: input.severity,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    dataCategories: input.dataCategories,
    usersAffected: input.usersAffected,
    recordsAffected: input.recordsAffected,
    riskLevel: input.riskLevel,
    detectedBy: input.detectedBy,
    sourceIp: input.sourceIp,
    createdBy: input.actorId ?? null,
  });

  // Evaluate notification requirements
  const cnilRequired = isCnilNotificationRequired(incident);
  const usersRequired = isUsersNotificationRequired(incident);

  // Send alerts
  let alertsSent = false;
  try {
    await deps.alertService.notifyIncident(incident);
    alertsSent = true;
  } catch (error) {
    // Log but don't fail the use case if alerts fail
    logEvent("incident.alerts_failed", {
      incidentId: incident.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Emit audit event (RGPD-safe: no sensitive data)
  logEvent("audit.incident_created", {
    incidentId: incident.id,
    severity: incident.severity,
    type: incident.type,
    cnilRequired,
    usersRequired,
    actorId: input.actorId ?? "SYSTEM",
  });

  logEvent("incident.created", {
    incidentId: incident.id,
    severity: incident.severity,
    type: incident.type,
    cnilRequired,
    usersRequired,
  });

  return {
    incident,
    cnilNotificationRequired: cnilRequired,
    usersNotificationRequired: usersRequired,
    alertsSent,
  };
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates the use case with injected dependencies
 */
export function createIncidentUseCase(deps: CreateIncidentDeps) {
  return (input: CreateIncidentInput) => createIncident(input, deps);
}
