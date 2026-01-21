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

import { z } from "zod";
import type {
  SecurityIncident,
  CreateSecurityIncidentInput,
} from "@/domain/incident";
import {
  isCnilNotificationRequired,
  isUsersNotificationRequired,
} from "@/domain/incident";
import type { SecurityIncidentRepo } from "@/app/ports/SecurityIncidentRepo";
import type { IncidentAlertService } from "@/app/ports/IncidentAlertService";
import { logEvent } from "@/shared/logger";
import { ACTOR_SCOPE } from "@/shared/actorScope";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Zod schema for validating CreateIncidentInput
 * Replaces manual validation for type-safety and consistent error messages
 */
const CreateIncidentInputSchema = z.object({
  // Required fields
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  type: z.enum([
    "UNAUTHORIZED_ACCESS",
    "CROSS_TENANT_ACCESS",
    "DATA_LEAK",
    "PII_IN_LOGS",
    "DATA_LOSS",
    "SERVICE_UNAVAILABLE",
    "MALWARE",
    "VULNERABILITY_EXPLOITED",
    "OTHER",
  ]),
  title: z.string().min(1, "Incident title is required").max(500).trim(),
  description: z.string().min(1, "Incident description is required").max(5000).trim(),

  // Optional fields
  tenantId: z.string().uuid().nullable().optional(),
  dataCategories: z.array(z.enum(["P0", "P1", "P2", "P3"])).optional(),
  usersAffected: z.number().int().min(0).optional(),
  recordsAffected: z.number().int().min(0).optional(),
  riskLevel: z.enum(["UNKNOWN", "NONE", "LOW", "MEDIUM", "HIGH"]).optional(),
  detectedBy: z.enum(["SYSTEM", "MONITORING", "USER", "AUDIT", "PENTEST"]).optional(),
  sourceIp: z.string().nullable().optional(),
  actorId: z.string().nullable().optional(),
});

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
  // Validate input with Zod (throws ZodError on failure)
  const validated = CreateIncidentInputSchema.parse(input);

  // Create incident in registry (using validated input)
  const incident = await deps.incidentRepo.create({
    tenantId: validated.tenantId ?? null,
    severity: validated.severity,
    type: validated.type,
    title: validated.title,
    description: validated.description,
    dataCategories: validated.dataCategories,
    usersAffected: validated.usersAffected,
    recordsAffected: validated.recordsAffected,
    riskLevel: validated.riskLevel,
    detectedBy: validated.detectedBy,
    sourceIp: validated.sourceIp,
    createdBy: validated.actorId ?? null,
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
  // NOTE: Single event to avoid duplication (was previously emitting two events)
  logEvent("incident.created", {
    incidentId: incident.id,
    severity: incident.severity,
    type: incident.type,
    cnilRequired,
    usersRequired,
    actorId: validated.actorId ?? ACTOR_SCOPE.SYSTEM,
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
