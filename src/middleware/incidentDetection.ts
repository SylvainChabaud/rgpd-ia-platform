/**
 * Incident Detection Middleware
 *
 * Middleware for automatic detection of security incidents.
 * Integrates with the incident creation system (EPIC 9).
 *
 * Detection types:
 * - Cross-tenant access attempts
 * - Brute force detection (via FailedLoginTracker)
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * RGPD Compliance:
 * - Art. 32: Mesures techniques sécurité
 * - Art. 33: Détection et enregistrement violations
 */

import { NextRequest, NextResponse } from "next/server";
import {
  evaluateDetectionEvent,
  DETECTION_EVENT_TYPE,
  type CrossTenantEvent,
} from "@/app/usecases/incident";
import { createIncident } from "@/app/usecases/incident";
import { PgSecurityIncidentRepo } from "@/infrastructure/repositories/PgSecurityIncidentRepo";
import {
  createIncidentAlertService,
  type IncidentAlertConfig,
} from "@/infrastructure/alerts/IncidentAlertService";
import { createEmailAlertService } from "@/infrastructure/alerts/AlertService";
import { logEvent, logError } from "@/shared/logger";

// =============================================================================
// TYPES
// =============================================================================

type NextHandler = (req: NextRequest) => Promise<NextResponse>;

// =============================================================================
// ALERT CONFIG HELPER
// =============================================================================

function getAlertConfig(): IncidentAlertConfig {
  return {
    emailRecipients: {
      dpo: process.env.ALERT_DPO_EMAILS?.split(",") || ["dpo@example.com"],
      devops: process.env.ALERT_DEVOPS_EMAILS?.split(",") || [
        "devops@example.com",
      ],
      security: process.env.ALERT_SECURITY_EMAILS?.split(",") || [
        "security@example.com",
      ],
    },
    slack: process.env.SLACK_WEBHOOK_URL
      ? {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || "#security-alerts",
        }
      : undefined,
    pagerDuty: process.env.PAGERDUTY_ROUTING_KEY
      ? {
          routingKey: process.env.PAGERDUTY_ROUTING_KEY,
        }
      : undefined,
    dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",
  };
}

// =============================================================================
// CROSS-TENANT DETECTION
// =============================================================================

/**
 * Detect and report cross-tenant access attempt
 *
 * This is called when a user tries to access data from a different tenant.
 * Creates a CRITICAL incident immediately.
 *
 * @param event - Cross-tenant access event details
 */
export async function reportCrossTenantAccess(
  event: Omit<CrossTenantEvent, "type">
): Promise<void> {
  const detectionEvent: CrossTenantEvent = {
    type: DETECTION_EVENT_TYPE.CROSS_TENANT_ACCESS,
    ...event,
  };

  const incidentInput = evaluateDetectionEvent(detectionEvent);
  if (!incidentInput) {
    // Should not happen for cross-tenant events
    logError("incident.detection.cross_tenant_no_input", {});
    return;
  }

  try {
    // Create incident
    const alertConfig = getAlertConfig();
    const emailService = createEmailAlertService([
      ...alertConfig.emailRecipients.dpo,
      ...alertConfig.emailRecipients.security,
    ]);
    const alertService = createIncidentAlertService(alertConfig, emailService);
    const incidentRepo = new PgSecurityIncidentRepo();

    const result = await createIncident(incidentInput, {
      incidentRepo,
      alertService,
    });

    logEvent("incident.cross_tenant_reported", {
      incidentId: result.incident.id,
      actorTenantId: event.actorTenantId,
      targetTenantId: event.targetTenantId,
    });
  } catch (error) {
    // Log but don't fail the request
    logError("incident.cross_tenant_report_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Middleware to detect cross-tenant access
 *
 * Wraps a handler and checks if the request is attempting
 * to access data from a different tenant than the actor's tenant.
 *
 * @param handler - Next handler to wrap
 * @returns Wrapped handler with cross-tenant detection
 */
export function withCrossTenantDetection(handler: NextHandler): NextHandler {
  return async (req: NextRequest) => {
    // Get actor tenant from context (set by auth middleware)
    const actorTenantId = req.headers.get("x-actor-tenant-id");
    const targetTenantId = req.headers.get("x-tenant-id");
    const actorUserId = req.headers.get("x-user-id");

    // If both are present and different, this is a cross-tenant attempt
    if (
      actorTenantId &&
      targetTenantId &&
      actorTenantId !== targetTenantId &&
      actorUserId
    ) {
      // Get source IP
      const forwardedFor = req.headers.get("x-forwarded-for");
      const sourceIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

      // Report the incident (async, don't block request)
      reportCrossTenantAccess({
        actorTenantId,
        targetTenantId,
        actorUserId,
        endpoint: req.nextUrl.pathname,
        sourceIp,
      }).catch(() => {
        // Already logged in reportCrossTenantAccess
      });

      // Return 403 immediately
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Cross-tenant access not allowed",
          code: "CROSS_TENANT_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    // Continue with original handler
    return handler(req);
  };
}

// =============================================================================
// BRUTE FORCE DETECTION (via FailedLoginTracker)
// =============================================================================

import {
  recordFailedLogin,
  clearFailedLogins,
  getFailedLoginCount,
} from "@/infrastructure/security/FailedLoginTracker";
import type { BruteForceEvent } from "@/app/usecases/incident";
import { DETECTION_THRESHOLDS, DETECTION_EVENT_TYPE as DET } from "@/app/usecases/incident";

/**
 * Record a failed login attempt and check for brute force
 *
 * @param sourceIp - IP address of the request
 * @param email - Email attempted
 * @param tenantId - Tenant ID if known
 * @returns true if incident was created
 */
export async function recordFailedLoginAndDetect(
  sourceIp: string,
  email?: string,
  tenantId?: string
): Promise<boolean> {
  const { count, thresholdExceeded } = recordFailedLogin(sourceIp, email);

  if (!thresholdExceeded) {
    return false;
  }

  // Create brute force incident
  const event: BruteForceEvent = {
    type: DET.BRUTE_FORCE,
    sourceIp,
    email,
    attemptCount: count,
    timeWindowMinutes: DETECTION_THRESHOLDS.BRUTE_FORCE_WINDOW_MINUTES,
    tenantId,
  };

  const incidentInput = evaluateDetectionEvent(event);
  if (!incidentInput) {
    return false;
  }

  try {
    const alertConfig = getAlertConfig();
    const emailService = createEmailAlertService([
      ...alertConfig.emailRecipients.devops,
      ...alertConfig.emailRecipients.security,
    ]);
    const alertService = createIncidentAlertService(alertConfig, emailService);
    const incidentRepo = new PgSecurityIncidentRepo();

    await createIncident(incidentInput, {
      incidentRepo,
      alertService,
    });

    logEvent("incident.brute_force_reported", {
      sourceIp,
      attemptCount: count,
    });

    return true;
  } catch (error) {
    logError("incident.brute_force_report_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Clear failed logins on successful authentication
 *
 * @param sourceIp - IP address that successfully logged in
 */
export function onSuccessfulLogin(sourceIp: string): void {
  clearFailedLogins(sourceIp);
}

/**
 * Get current brute force status for an IP
 *
 * @param sourceIp - IP address to check
 * @returns Current failed attempt count
 */
export function getBruteForceStatus(sourceIp: string): number {
  return getFailedLoginCount(sourceIp);
}

// =============================================================================
// EXPORT VOLUME DETECTION
// =============================================================================

// In-memory storage for export tracking
const exportCounts = new Map<string, { count: number; windowStart: number }>();
const EXPORT_WINDOW_MS =
  DETECTION_THRESHOLDS.MASS_EXPORT_WINDOW_MINUTES * 60 * 1000;

/**
 * Record an export and check for mass export
 *
 * @param userId - User performing the export
 * @param tenantId - Tenant ID
 * @param recordCount - Number of records exported
 * @param exportType - Type of export (e.g., "users", "consents")
 * @param sourceIp - Source IP
 * @returns true if incident was created
 */
export async function recordExportAndDetect(
  userId: string,
  tenantId: string,
  recordCount: number,
  exportType: string,
  sourceIp?: string
): Promise<boolean> {
  const now = Date.now();
  const key = `${userId}:${tenantId}`;

  // Get or create entry
  let entry = exportCounts.get(key);
  if (!entry || now - entry.windowStart > EXPORT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    exportCounts.set(key, entry);
  }

  // Add to count
  entry.count += recordCount;

  // Check threshold
  if (entry.count < DETECTION_THRESHOLDS.MASS_EXPORT_RECORDS) {
    return false;
  }

  // Create mass export incident
  const event = {
    type: DET.MASS_EXPORT,
    userId,
    tenantId,
    recordCount: entry.count,
    timeWindowMinutes: DETECTION_THRESHOLDS.MASS_EXPORT_WINDOW_MINUTES,
    exportType,
    sourceIp,
  };

  const incidentInput = evaluateDetectionEvent(event);
  if (!incidentInput) {
    return false;
  }

  try {
    const alertConfig = getAlertConfig();
    const emailService = createEmailAlertService([
      ...alertConfig.emailRecipients.dpo,
    ]);
    const alertService = createIncidentAlertService(alertConfig, emailService);
    const incidentRepo = new PgSecurityIncidentRepo();

    await createIncident(incidentInput, {
      incidentRepo,
      alertService,
    });

    logEvent("incident.mass_export_reported", {
      userId,
      tenantId,
      recordCount: entry.count,
    });

    // Reset counter after creating incident
    entry.count = 0;
    entry.windowStart = now;

    return true;
  } catch (error) {
    logError("incident.mass_export_report_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
