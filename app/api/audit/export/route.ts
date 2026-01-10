/**
 * Audit Trail Export API
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/audit/export
 * Export audit events as CSV (RGPD-safe, P1 only)
 *
 * RGPD Compliance:
 * - Art. 5 (Minimisation): P1 data only
 * - No sensitive metadata content
 * - Tenant isolation enforced
 * - UTF-8 with BOM (Excel-compatible)
 * - Separator: semicolon (European standard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin, isTenantAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { PgAuditEventReader } from '@/infrastructure/audit/PgAuditEventReader';
import { z, ZodError } from 'zod';

const QuerySchema = z.object({
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
});

/**
 * Convert audit events to CSV format (RGPD-safe)
 *
 * Format: UTF-8 with BOM, semicolon separator
 * Columns: ID, Event Type, Actor ID, Tenant ID, Target ID, Created At
 *
 * CRITICAL: No metadata content exported (P1 only)
 */
function generateCSV(events: Array<{
  id: string;
  eventType: string;
  actorId: string | null;
  tenantId: string | null;
  targetId: string | null;
  createdAt: Date;
}>): string {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Header (European standard: semicolon separator)
  const header = 'ID;Event Type;Actor ID;Tenant ID;Target ID;Created At';

  // Rows
  const rows = events.map(event => {
    return [
      event.id,
      event.eventType,
      event.actorId || '',
      event.tenantId || '',
      event.targetId || '',
      event.createdAt.toISOString(),
    ].join(';');
  });

  return BOM + [header, ...rows].join('\n');
}

/**
 * GET /api/audit/export - Export audit trail as CSV
 *
 * Query params:
 * - eventType: filter by event type (optional)
 * - startDate: ISO datetime (optional)
 * - endDate: ISO datetime (optional)
 * - limit: max records (default: 1000, max: 10000)
 *
 * SECURITY:
 * - PLATFORM admin: all events
 * - TENANT admin: only their tenant's events
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Check if user is admin
        const isPlatform = isPlatformAdmin(context);
        const isTenant = isTenantAdmin(context);

        if (!isPlatform && !isTenant) {
          return NextResponse.json(
            forbiddenError('Admin access required to export audit events'),
            { status: 403 }
          );
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const params = Object.fromEntries(searchParams.entries());

        let query;
        try {
          query = QuerySchema.parse(params);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }
          return NextResponse.json(validationError({}), { status: 400 });
        }

        // Build filters
        const auditEventReader = new PgAuditEventReader();

        const filters: {
          eventType?: string;
          startDate?: string;
          endDate?: string;
          limit: number;
          offset: number;
          tenantId?: string;
        } = {
          eventType: query.eventType,
          startDate: query.startDate,
          endDate: query.endDate,
          limit: query.limit,
          offset: 0,
        };

        // TENANT admin: filter by tenant
        if (isTenant && !isPlatform && context.tenantId) {
          filters.tenantId = context.tenantId;
        }

        // Fetch events
        const events = await auditEventReader.list(filters);

        // Generate CSV (RGPD-safe: P1 only, no metadata)
        const csv = generateCSV(events);

        // Audit the export action
        logger.info(
          {
            actorId: context.userId,
            scope: context.scope,
            count: events.length,
            filtered: isTenant && !isPlatform,
          },
          'Audit trail exported'
        );

        // Return CSV file
        const filename = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/audit/export error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
