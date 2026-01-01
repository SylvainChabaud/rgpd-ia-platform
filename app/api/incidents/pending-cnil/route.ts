/**
 * Pending CNIL Notifications API Endpoint
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * GET /api/incidents/pending-cnil - List incidents requiring CNIL notification
 *
 * RGPD Compliance:
 * - Art. 33: Notification CNIL dans les 72 heures
 * - Affiche les incidents à risque non notifiés
 */

import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/infrastructure/logging/middleware";
import { withAuth } from "@/middleware/auth";
import { withRBAC } from "@/middleware/rbac";
import { requireContext } from "@/lib/requestContext";
import { logger } from "@/infrastructure/logging/logger";
import { internalError } from "@/lib/errorResponse";
import { PgSecurityIncidentRepo } from "@/infrastructure/repositories/PgSecurityIncidentRepo";
import {
  getCnilDeadline,
  isCnilDeadlineApproaching,
  isCnilDeadlineOverdue,
} from "@/domain/incident";

/**
 * GET /api/incidents/pending-cnil - List incidents pending CNIL notification
 *
 * Returns incidents that:
 * - Have HIGH or MEDIUM risk level
 * - Have not been notified to CNIL
 * - Were detected within the last 72 hours
 *
 * Access: SUPER_ADMIN, DPO
 */
export const GET = withLogging(
  withAuth(
    withRBAC(["SUPER_ADMIN", "DPO"])(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Fetch pending incidents
          const incidentRepo = new PgSecurityIncidentRepo();
          const incidents = await incidentRepo.findPendingCnilNotification();

          // Enrich with deadline information
          const enrichedIncidents = incidents.map((incident) => ({
            id: incident.id,
            tenantId: incident.tenantId,
            severity: incident.severity,
            type: incident.type,
            title: incident.title,
            riskLevel: incident.riskLevel,
            detectedAt: incident.detectedAt,
            cnilDeadline: getCnilDeadline(incident),
            deadlineApproaching: isCnilDeadlineApproaching(incident),
            deadlineOverdue: isCnilDeadlineOverdue(incident),
            usersAffected: incident.usersAffected,
            recordsAffected: incident.recordsAffected,
          }));

          // Sort by deadline (most urgent first)
          enrichedIncidents.sort((a, b) => {
            // Overdue first
            if (a.deadlineOverdue && !b.deadlineOverdue) return -1;
            if (!a.deadlineOverdue && b.deadlineOverdue) return 1;
            // Then approaching
            if (a.deadlineApproaching && !b.deadlineApproaching) return -1;
            if (!a.deadlineApproaching && b.deadlineApproaching) return 1;
            // Then by deadline date
            return a.cnilDeadline.getTime() - b.cnilDeadline.getTime();
          });

          logger.info(
            {
              actorId: context.userId,
              count: enrichedIncidents.length,
              overdueCount: enrichedIncidents.filter((i) => i.deadlineOverdue)
                .length,
            },
            "Pending CNIL notifications fetched"
          );

          return NextResponse.json({
            incidents: enrichedIncidents,
            summary: {
              total: enrichedIncidents.length,
              overdue: enrichedIncidents.filter((i) => i.deadlineOverdue)
                .length,
              approaching: enrichedIncidents.filter(
                (i) => i.deadlineApproaching && !i.deadlineOverdue
              ).length,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            { error: errorMessage },
            "GET /api/incidents/pending-cnil error"
          );
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
