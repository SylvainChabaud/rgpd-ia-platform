/**
 * Tenant Activity API
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * GET /api/tenants/:id/activity
 * Provides tenant-scoped activity feed for dashboard
 *
 * RGPD Compliance:
 * - P1 data only (event types, IDs, timestamps)
 * - NO content (prompts, outputs, user data)
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin, isTenantAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, notFoundError, validationError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';
import { z, ZodError } from 'zod';
import type { ActivityEvent } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/tenants/:id/activity - Tenant activity feed
 *
 * Query params:
 * - limit: max events to return (default: 50, max: 100)
 *
 * SECURITY:
 * - TENANT admin: can only access their own tenant activity
 * - PLATFORM admin: can access any tenant activity
 * - Other users: denied (403)
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest, { params }: RouteParams) => {
      try {
        const context = requireContext(req);
        const { id: tenantId } = await params;

        // Security check: TENANT admin can only see their own tenant
        if (!isPlatformAdmin(context)) {
          if (!isTenantAdmin(context)) {
            return NextResponse.json(
              forbiddenError('Tenant admin access required'),
              { status: 403 }
            );
          }

          // CRITICAL RGPD: Tenant isolation check
          if (context.tenantId !== tenantId) {
            logger.warn(
              {
                actorId: context.userId,
                requestedTenantId: tenantId,
                actualTenantId: context.tenantId,
              },
              'Cross-tenant activity access attempt blocked'
            );
            return NextResponse.json(
              forbiddenError('Access denied to this tenant'),
              { status: 403 }
            );
          }
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const rawParams = Object.fromEntries(searchParams.entries());

        let query;
        try {
          query = QuerySchema.parse(rawParams);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }
          return NextResponse.json(validationError({}), { status: 400 });
        }

        const pool = getPool();

        // Check tenant exists
        const tenantCheck = await pool.query(
          'SELECT id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
          [tenantId]
        );

        if (tenantCheck.rows.length === 0) {
          return NextResponse.json(notFoundError('Tenant'), { status: 404 });
        }

        // Fetch activity events (tenant-scoped)
        // RGPD: Only P1 metadata, no content
        const [eventsResult, countResult] = await Promise.all([
          pool.query(
            `
            SELECT
              id,
              event_type as type,
              actor_id as "actorId",
              target_id as "targetId",
              created_at as "createdAt"
            FROM audit_events
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            `,
            [tenantId, query.limit]
          ),
          pool.query(
            'SELECT COUNT(*) as total FROM audit_events WHERE tenant_id = $1',
            [tenantId]
          ),
        ]);

        const events: ActivityEvent[] = eventsResult.rows.map((row) => ({
          id: row.id,
          type: row.type,
          actorId: row.actorId,
          targetId: row.targetId,
          createdAt: row.createdAt.toISOString(),
          // NOTE: metadata is intentionally omitted (may contain P2/P3 data)
        }));

        const total = parseInt(countResult.rows[0]?.total || '0');

        logger.info(
          {
            actorId: context.userId,
            tenantId,
            eventsCount: events.length,
            totalEvents: total,
          },
          'Tenant activity fetched'
        );

        return NextResponse.json({ events, total });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/tenants/[id]/activity error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
