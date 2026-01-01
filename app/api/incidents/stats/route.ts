/**
 * Incident Statistics API Endpoint
 *
 * EPIC 9 — LOT 9.0 — Incident Response & Security Hardening
 *
 * GET /api/incidents/stats - Get incident statistics for dashboard
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (reporting)
 */

import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/infrastructure/logging/middleware";
import { withAuth } from "@/middleware/auth";
import { withRBAC } from "@/middleware/rbac";
import { requireContext } from "@/lib/requestContext";
import { logger } from "@/infrastructure/logging/logger";
import { internalError } from "@/lib/errorResponse";
import { PgSecurityIncidentRepo } from "@/infrastructure/repositories/PgSecurityIncidentRepo";

/**
 * GET /api/incidents/stats - Get incident statistics
 *
 * Returns:
 * - Count by severity
 * - Count by type
 * - Unresolved count
 * - CNIL notification status
 *
 * Access: SUPER_ADMIN, DPO
 */
export const GET = withLogging(
  withAuth(
    withRBAC(["SUPER_ADMIN", "DPO"])(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Parse optional tenant filter
          const tenantId = req.nextUrl.searchParams.get("tenantId") || undefined;

          const incidentRepo = new PgSecurityIncidentRepo();

          // Fetch statistics in parallel
          const [
            bySeverity,
            byType,
            unresolvedResult,
            pendingCnil,
          ] = await Promise.all([
            incidentRepo.countBySeverity(tenantId),
            incidentRepo.countByType(tenantId),
            incidentRepo.findUnresolved(
              tenantId ? { tenantId } : undefined,
              { limit: 1 }
            ),
            incidentRepo.findPendingCnilNotification(),
          ]);

          // Calculate totals
          const totalBySeverity = Object.values(bySeverity).reduce(
            (a, b) => a + b,
            0
          );

          logger.info(
            {
              actorId: context.userId,
              totalIncidents: totalBySeverity,
              tenantId,
            },
            "Incident stats fetched"
          );

          return NextResponse.json({
            stats: {
              total: totalBySeverity,
              bySeverity,
              byType,
              unresolved: unresolvedResult.total,
              pendingCnilNotification: pendingCnil.length,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            { error: errorMessage },
            "GET /api/incidents/stats error"
          );
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
