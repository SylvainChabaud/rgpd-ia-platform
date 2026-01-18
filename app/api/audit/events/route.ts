/**
 * Audit Events Endpoint
 * LOT 5.3 - API Layer
 *
 * GET /api/audit/events
 * List audit events (admin only)
 *
 * RGPD compliance:
 * - PLATFORM admin: all events
 * - TENANT admin: only their tenant's events
 * - No sensitive data exposed (P1 only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin, isTenantAdmin } from '@/lib/requestContext';
import { PgAuditEventReader } from '@/infrastructure/audit/PgAuditEventReader';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';

const QuerySchema = z.object({
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/audit/events - List audit events
 *
 * SECURITY:
 * - PLATFORM admin: can see all events
 * - TENANT admin: can only see events for their tenant
 * - Regular users: denied
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Check if user is admin (PLATFORM or TENANT)
        const isPlatform = isPlatformAdmin(context);
        const isTenant = isTenantAdmin(context);

        if (!isPlatform && !isTenant) {
          return NextResponse.json(
            forbiddenError('Admin access required to view audit events'),
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
          limit: number;
          offset: number;
          tenantId?: string;
        } = {
          eventType: query.eventType,
          limit: query.limit,
          offset: query.offset,
        };

        // TENANT admin: filter by tenant
        if (isTenant && !isPlatform && context.tenantId) {
          filters.tenantId = context.tenantId;
        }

        // PLATFORM admin: no tenant filter (can see all events)

        const events = await auditEventReader.list(filters);

        logger.info({
          actorId: context.userId,
          scope: context.scope,
          count: events.length,
          filtered: isTenant && !isPlatform,
        }, 'Audit events listed');

        return NextResponse.json({
          events: events.map(event => ({
            id: event.id,
            eventType: event.eventType,
            actorId: event.actorId,
            actorDisplayName: event.actorDisplayName,
            tenantId: event.tenantId,
            tenantName: event.tenantName,
            targetId: event.targetId,
            createdAt: event.createdAt,
          })),
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/audit/events error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
