/**
 * Security Incident Detail API Endpoints
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * GET /api/incidents/[id] - Get incident details
 * PATCH /api/incidents/[id] - Update incident
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations
 * - Audit trail for all modifications
 */

import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/infrastructure/logging/middleware";
import { withAuth } from "@/middleware/auth";
import { withRBAC } from "@/middleware/rbac";
import { requireContext } from "@/lib/requestContext";
import { logger } from "@/infrastructure/logging/logger";
import {
  internalError,
  notFoundError,
  validationError,
} from "@/lib/errorResponse";
import { z, ZodError } from "zod";
import { PgSecurityIncidentRepo } from "@/infrastructure/repositories/PgSecurityIncidentRepo";
import { logEvent } from "@/shared/logger";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UpdateIncidentSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z
    .enum([
      "UNAUTHORIZED_ACCESS",
      "CROSS_TENANT_ACCESS",
      "DATA_LEAK",
      "PII_IN_LOGS",
      "DATA_LOSS",
      "SERVICE_UNAVAILABLE",
      "MALWARE",
      "VULNERABILITY_EXPLOITED",
      "OTHER",
    ])
    .optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(5000).optional(),
  dataCategories: z.array(z.enum(["P0", "P1", "P2", "P3"])).optional(),
  usersAffected: z.number().int().min(0).optional(),
  recordsAffected: z.number().int().min(0).optional(),
  riskLevel: z.enum(["UNKNOWN", "NONE", "LOW", "MEDIUM", "HIGH"]).optional(),
  remediationActions: z.string().max(10000).nullable().optional(),
});

const MarkCnilNotifiedSchema = z.object({
  action: z.literal("mark_cnil_notified"),
  cnilReference: z.string().max(100).optional(),
});

const MarkUsersNotifiedSchema = z.object({
  action: z.literal("mark_users_notified"),
});

const MarkResolvedSchema = z.object({
  action: z.literal("mark_resolved"),
  remediationActions: z.string().min(1).max(10000),
});

const PatchActionSchema = z.discriminatedUnion("action", [
  MarkCnilNotifiedSchema,
  MarkUsersNotifiedSchema,
  MarkResolvedSchema,
  UpdateIncidentSchema.extend({ action: z.literal("update").optional() }),
]);

// =============================================================================
// HANDLERS
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/incidents/[id] - Get incident details
 *
 * Access: SUPER_ADMIN, DPO
 */
export const GET = withLogging(
  withAuth(
    withRBAC(["SUPER_ADMIN", "DPO"])(
      async (req: NextRequest, { params }: RouteParams) => {
        try {
          const context = requireContext(req);
          const { id } = await params;

          // Validate UUID format
          if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return NextResponse.json(
              { error: "Invalid incident ID format" },
              { status: 400 }
            );
          }

          // Fetch incident
          const incidentRepo = new PgSecurityIncidentRepo();
          const incident = await incidentRepo.findById(id);

          if (!incident) {
            return NextResponse.json(notFoundError("Incident"), {
              status: 404,
            });
          }

          logger.info(
            {
              actorId: context.userId,
              incidentId: id,
            },
            "Incident fetched"
          );

          return NextResponse.json({
            incident: {
              id: incident.id,
              tenantId: incident.tenantId,
              severity: incident.severity,
              type: incident.type,
              title: incident.title,
              description: incident.description,
              dataCategories: incident.dataCategories,
              usersAffected: incident.usersAffected,
              recordsAffected: incident.recordsAffected,
              riskLevel: incident.riskLevel,
              cnilNotified: incident.cnilNotified,
              cnilNotifiedAt: incident.cnilNotifiedAt,
              cnilReference: incident.cnilReference,
              usersNotified: incident.usersNotified,
              usersNotifiedAt: incident.usersNotifiedAt,
              remediationActions: incident.remediationActions,
              resolvedAt: incident.resolvedAt,
              detectedAt: incident.detectedAt,
              detectedBy: incident.detectedBy,
              sourceIp: incident.sourceIp,
              createdBy: incident.createdBy,
              createdAt: incident.createdAt,
              updatedAt: incident.updatedAt,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            { error: errorMessage },
            "GET /api/incidents/[id] error"
          );
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * PATCH /api/incidents/[id] - Update incident or perform action
 *
 * Actions:
 * - mark_cnil_notified: Mark incident as notified to CNIL
 * - mark_users_notified: Mark users as notified
 * - mark_resolved: Mark incident as resolved
 * - (default): Update incident details
 *
 * Access: SUPER_ADMIN, DPO
 */
export const PATCH = withLogging(
  withAuth(
    withRBAC(["SUPER_ADMIN", "DPO"])(
      async (req: NextRequest, { params }: RouteParams) => {
        try {
          const context = requireContext(req);
          const { id } = await params;

          // Validate UUID format
          if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return NextResponse.json(
              { error: "Invalid incident ID format" },
              { status: 400 }
            );
          }

          // Check incident exists
          const incidentRepo = new PgSecurityIncidentRepo();
          const existing = await incidentRepo.findById(id);

          if (!existing) {
            return NextResponse.json(notFoundError("Incident"), {
              status: 404,
            });
          }

          // Parse and validate request body
          let body;
          try {
            const rawBody = await req.json();
            body = PatchActionSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), {
                status: 400,
              });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          let updated;
          let eventType: string;

          // Handle specific actions
          if ("action" in body && body.action === "mark_cnil_notified") {
            updated = await incidentRepo.markCnilNotified(
              id,
              body.cnilReference,
              context.userId
            );
            eventType = "security.incident_cnil_notified";
          } else if (
            "action" in body &&
            body.action === "mark_users_notified"
          ) {
            updated = await incidentRepo.markUsersNotified(id, context.userId);
            eventType = "security.incident_users_notified";
          } else if ("action" in body && body.action === "mark_resolved") {
            updated = await incidentRepo.markResolved(
              id,
              body.remediationActions,
              context.userId
            );
            eventType = "security.incident_resolved";
          } else {
            // Regular update
            const updateInput: Parameters<typeof incidentRepo.update>[1] = {};
            if ("severity" in body && body.severity)
              updateInput.severity = body.severity;
            if ("type" in body && body.type) updateInput.type = body.type;
            if ("title" in body && body.title) updateInput.title = body.title;
            if ("description" in body && body.description)
              updateInput.description = body.description;
            if ("dataCategories" in body && body.dataCategories)
              updateInput.dataCategories = body.dataCategories;
            if ("usersAffected" in body && body.usersAffected !== undefined)
              updateInput.usersAffected = body.usersAffected;
            if ("recordsAffected" in body && body.recordsAffected !== undefined)
              updateInput.recordsAffected = body.recordsAffected;
            if ("riskLevel" in body && body.riskLevel)
              updateInput.riskLevel = body.riskLevel;
            if ("remediationActions" in body)
              updateInput.remediationActions = body.remediationActions;

            updated = await incidentRepo.update(id, updateInput, context.userId);
            eventType = "security.incident_updated";
          }

          // Emit audit event
          logEvent("audit.incident_updated", {
            eventType,
            incidentId: id,
            severity: updated.severity,
            riskLevel: updated.riskLevel,
            actorId: context.userId,
          });

          logger.info(
            {
              actorId: context.userId,
              incidentId: id,
              eventType,
            },
            "Incident updated"
          );

          return NextResponse.json({
            incident: {
              id: updated.id,
              tenantId: updated.tenantId,
              severity: updated.severity,
              type: updated.type,
              title: updated.title,
              riskLevel: updated.riskLevel,
              cnilNotified: updated.cnilNotified,
              cnilNotifiedAt: updated.cnilNotifiedAt,
              cnilReference: updated.cnilReference,
              usersNotified: updated.usersNotified,
              usersNotifiedAt: updated.usersNotifiedAt,
              resolvedAt: updated.resolvedAt,
              updatedAt: updated.updatedAt,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            { error: errorMessage },
            "PATCH /api/incidents/[id] error"
          );
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
