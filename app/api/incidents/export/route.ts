/**
 * Security Incidents Export API
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/incidents/export
 * Export incidents (violations registry) as CSV
 *
 * RGPD Compliance:
 * - Art. 33.5: Registre des violations (export for CNIL audit)
 * - P1 data only
 * - UTF-8 with BOM (Excel-compatible)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withRBAC } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { PgSecurityIncidentRepo } from '@/infrastructure/repositories/PgSecurityIncidentRepo';
import { ACTOR_ROLE } from '@/shared/actorRole';

const QuerySchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z
    .enum([
      'UNAUTHORIZED_ACCESS',
      'CROSS_TENANT_ACCESS',
      'DATA_LEAK',
      'PII_IN_LOGS',
      'DATA_LOSS',
      'SERVICE_UNAVAILABLE',
      'MALWARE',
      'VULNERABILITY_EXPLOITED',
      'OTHER',
    ])
    .optional(),
  resolved: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

/**
 * Convert incidents to CSV format (CNIL-ready)
 *
 * Format: UTF-8 with BOM, semicolon separator
 */
function generateCSV(incidents: Array<{
  id: string;
  tenantId: string | null;
  severity: string;
  type: string;
  title: string;
  dataCategories: string[] | null;
  usersAffected: number | null;
  recordsAffected: number | null;
  riskLevel: string;
  cnilNotified: boolean;
  cnilNotifiedAt: Date | null;
  usersNotified: boolean;
  usersNotifiedAt: Date | null;
  resolvedAt: Date | null;
  detectedAt: Date;
}>): string {
  const BOM = '\uFEFF';

  const header = [
    'ID',
    'Detected At',
    'Severity',
    'Type',
    'Title',
    'Data Categories',
    'Users Affected',
    'Records Affected',
    'Risk Level',
    'CNIL Notified',
    'CNIL Notified At',
    'Users Notified',
    'Users Notified At',
    'Resolved At',
    'Tenant ID',
  ].join(';');

  const rows = incidents.map(incident => {
    return [
      incident.id,
      incident.detectedAt.toISOString(),
      incident.severity,
      incident.type,
      `"${incident.title.replace(/"/g, '""')}"`, // Escape quotes
      incident.dataCategories?.join(',') || '',
      incident.usersAffected || '',
      incident.recordsAffected || '',
      incident.riskLevel,
      incident.cnilNotified ? 'Yes' : 'No',
      incident.cnilNotifiedAt?.toISOString() || '',
      incident.usersNotified ? 'Yes' : 'No',
      incident.usersNotifiedAt?.toISOString() || '',
      incident.resolvedAt?.toISOString() || '',
      incident.tenantId || '',
    ].join(';');
  });

  return BOM + [header, ...rows].join('\n');
}

/**
 * GET /api/incidents/export - Export incidents as CSV
 *
 * Access: SUPER_ADMIN, DPO
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
            query = QuerySchema.parse(queryObj);
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

          // Fetch ALL incidents (no pagination for export)
          const incidentRepo = new PgSecurityIncidentRepo();
          const result = await incidentRepo.findAll(
            filters as Parameters<typeof incidentRepo.findAll>[0],
            {
              limit: 10000, // Max export
              offset: 0,
              orderBy: 'detected_at',
              orderDir: 'DESC',
            }
          );

          // Generate CSV
          const csv = generateCSV(result.data);

          logger.info(
            {
              actorId: context.userId,
              count: result.data.length,
            },
            'Incidents exported'
          );

          // Return CSV file
          const filename = `registre-violations-${new Date().toISOString().split('T')[0]}.csv`;

          return new NextResponse(csv, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/incidents/export error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
