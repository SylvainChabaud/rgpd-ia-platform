/**
 * User Audit Events Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * GET /api/users/:id/audit - Get user audit events (paginated)
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 metadata (event types, IDs, timestamps)
 * - No P2/P3 content in metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';

/**
 * GET /api/users/:id/audit - Get user audit events
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: userId } = await params;

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
          const offset = parseInt(searchParams.get('offset') || '0', 10);

          if (isNaN(limit) || limit < 1 || isNaN(offset) || offset < 0) {
            return NextResponse.json(validationError({ message: 'Invalid pagination params' }), { status: 400 });
          }

          // Fetch user to verify tenant
          const userRepo = new PgUserRepo();
          const user = await userRepo.findById(userId);

          if (!user) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // SECURITY: Verify user belongs to tenant
          if (user.tenantId !== context.tenantId) {
            logger.warn({
              userId,
              requestingTenant: context.tenantId,
              userTenant: user.tenantId,
            }, 'Cross-tenant audit access attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Fetch audit events where user is actor OR target
          // NOTE: metadata is excluded to ensure RGPD compliance (may contain P2/P3)
          const result = await pool.query(
            `SELECT
               id,
               event_type,
               actor_id,
               target_id,
               created_at
             FROM audit_events
             WHERE tenant_id = $1 AND (actor_id = $2 OR target_id = $2)
             ORDER BY created_at DESC
             LIMIT $3 OFFSET $4`,
            [context.tenantId, userId, limit, offset]
          );

          // Get total count
          const countResult = await pool.query(
            `SELECT COUNT(*) as total
             FROM audit_events
             WHERE tenant_id = $1 AND (actor_id = $2 OR target_id = $2)`,
            [context.tenantId, userId]
          );

          const events = result.rows.map((row) => ({
            id: row.id,
            type: row.event_type,
            actorId: row.actor_id,
            targetId: row.target_id,
            createdAt: row.created_at?.toISOString() || null,
            // Note: isActor helps frontend display if user performed or received action
            isActor: row.actor_id === userId,
            isTarget: row.target_id === userId,
          }));

          logger.info({
            userId,
            tenantId: context.tenantId,
            count: events.length,
          }, 'User audit events fetched');

          return NextResponse.json({
            events,
            total: parseInt(countResult.rows[0]?.total || '0', 10),
            limit,
            offset,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users/:id/audit error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
