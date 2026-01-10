/**
 * Security Incidents API Endpoints
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * GET /api/incidents - List all incidents (SUPER_ADMIN, DPO)
 * POST /api/incidents - Create new incident (SUPER_ADMIN, DPO, SYSTEM)
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (obligatoire)
 * - Art. 33: Notification CNIL tracking
 * - Art. 34: Notification users tracking
 * - Audit trail for all operations
 */

import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/infrastructure/logging/middleware";
import { withAuth } from "@/middleware/auth";
import { withRBAC } from "@/middleware/rbac";
import { requireContext } from "@/lib/requestContext";
import { logger } from "@/infrastructure/logging/logger";
import {
  internalError,
  validationError,
} from "@/lib/errorResponse";
import { z, ZodError } from "zod";
import { PgSecurityIncidentRepo } from "@/infrastructure/repositories/PgSecurityIncidentRepo";
import { createIncident } from "@/app/usecases/incident";
import {
  createIncidentAlertService,
  type IncidentAlertConfig,
} from "@/infrastructure/alerts/IncidentAlertService";
import { createEmailAlertService } from "@/infrastructure/alerts/AlertService";
import { ACTOR_ROLE } from "@/shared/actorRole";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateIncidentSchema = z.object({
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
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  tenantId: z.string().uuid().nullable().optional(),
  dataCategories: z.array(z.enum(["P0", "P1", "P2", "P3"])).optional(),
  usersAffected: z.number().int().min(0).optional(),
  recordsAffected: z.number().int().min(0).optional(),
  riskLevel: z.enum(["UNKNOWN", "NONE", "LOW", "MEDIUM", "HIGH"]).optional(),
  sourceIp: z.string().regex(/^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/).nullable().optional(),
});

const ListIncidentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
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
  resolved: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  tenantId: z.string().uuid().optional(),
});

// =============================================================================
// ALERT SERVICE CONFIG
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
// HANDLERS
// =============================================================================

/**
 * GET /api/incidents - List all incidents
 *
 * Access: SUPERADMIN, DPO
 */
export const GET = withLogging(
  withAuth(
    withRBAC([ACTOR_ROLE.SUPERADMIN, ACTOR_ROLE.DPO])(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          const queryObj = Object.fromEntries(searchParams.entries());

          let query;
          try {
            query = ListIncidentsQuerySchema.parse(queryObj);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), {
                status: 400,
              });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Build filters
          const filters: Record<string, unknown> = {};
          if (query.severity) filters.severity = query.severity;
          if (query.type) filters.type = query.type;
          if (query.resolved !== undefined) filters.resolved = query.resolved;
          if (query.tenantId) filters.tenantId = query.tenantId;

          // Fetch incidents
          const incidentRepo = new PgSecurityIncidentRepo();
          const result = await incidentRepo.findAll(
            filters as Parameters<typeof incidentRepo.findAll>[0],
            {
              limit: query.limit,
              offset: query.offset,
              orderBy: "detected_at",
              orderDir: "DESC",
            }
          );

          logger.info(
            {
              actorId: context.userId,
              count: result.data.length,
              total: result.total,
            },
            "Incidents listed"
          );

          return NextResponse.json({
            incidents: result.data.map((incident) => ({
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
              usersNotified: incident.usersNotified,
              usersNotifiedAt: incident.usersNotifiedAt,
              resolvedAt: incident.resolvedAt,
              detectedAt: incident.detectedAt,
              detectedBy: incident.detectedBy,
              createdAt: incident.createdAt,
            })),
            pagination: {
              total: result.total,
              limit: result.limit,
              offset: result.offset,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error({ error: errorMessage }, "GET /api/incidents error");
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * POST /api/incidents - Create new incident
 *
 * Access: SUPERADMIN, DPO (manual creation)
 * Note: System can also create via internal use case
 */
export const POST = withLogging(
  withAuth(
    withRBAC([ACTOR_ROLE.SUPERADMIN, ACTOR_ROLE.DPO])(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Validate request body
          let body;
          try {
            const rawBody = await req.json();
            body = CreateIncidentSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), {
                status: 400,
              });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Create alert service
          const alertConfig = getAlertConfig();
          const emailService = createEmailAlertService([
            ...alertConfig.emailRecipients.dpo,
            ...alertConfig.emailRecipients.devops,
          ]);
          const alertService = createIncidentAlertService(
            alertConfig,
            emailService
          );

          // Create incident via use case
          const incidentRepo = new PgSecurityIncidentRepo();
          const result = await createIncident(
            {
              severity: body.severity,
              type: body.type,
              title: body.title,
              description: body.description,
              tenantId: body.tenantId ?? null,
              dataCategories: body.dataCategories,
              usersAffected: body.usersAffected,
              recordsAffected: body.recordsAffected,
              riskLevel: body.riskLevel,
              sourceIp: body.sourceIp ?? null,
              detectedBy: "USER", // Manual creation by user
              actorId: context.userId,
            },
            {
              incidentRepo,
              alertService,
            }
          );

          logger.info(
            {
              actorId: context.userId,
              incidentId: result.incident.id,
              severity: result.incident.severity,
              type: result.incident.type,
            },
            "Incident created"
          );

          return NextResponse.json(
            {
              incident: {
                id: result.incident.id,
                tenantId: result.incident.tenantId,
                severity: result.incident.severity,
                type: result.incident.type,
                title: result.incident.title,
                riskLevel: result.incident.riskLevel,
                detectedAt: result.incident.detectedAt,
                createdAt: result.incident.createdAt,
              },
              cnilNotificationRequired: result.cnilNotificationRequired,
              usersNotificationRequired: result.usersNotificationRequired,
              alertsSent: result.alertsSent,
            },
            { status: 201 }
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error({ error: errorMessage }, "POST /api/incidents error");
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
