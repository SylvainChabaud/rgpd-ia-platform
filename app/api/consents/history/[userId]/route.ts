/**
 * Consent History Endpoint (Tenant-scoped)
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * GET /api/consents/history/:userId - Get consent history for a user
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1/P2 metadata (dates, status, purpose)
 * - Full audit trail for RGPD accountability
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';

/**
 * Schema for history query params
 */
const HistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
  purposeId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

interface ConsentHistoryEntry {
  id: string;
  purposeId: string;
  purposeLabel: string;
  action: 'granted' | 'revoked' | 'created';
  timestamp: string;
  source: 'user' | 'admin' | 'system';
}

/**
 * GET /api/consents/history/:userId - Get consent history for a user
 *
 * Query params:
 * - limit: number (default: 100, max: 200)
 * - offset: number (default: 0)
 * - purposeId: string (filter by specific purpose)
 * - startDate: ISO date string (filter from date)
 * - endDate: ISO date string (filter to date)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
        try {
          const context = requireContext(req);
          const { userId } = await params;

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          if (!userId) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          // Verify user exists and belongs to tenant
          const userRepo = new PgUserRepo();
          const user = await userRepo.findById(userId);

          if (!user) {
            return NextResponse.json(notFoundError('User'), { status: 404 });
          }

          if (user.tenantId !== context.tenantId) {
            logger.warn({
              userId,
              requestingTenant: context.tenantId,
              userTenant: user.tenantId,
            }, 'Cross-tenant consent history access attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          let query: z.infer<typeof HistoryQuerySchema>;
          try {
            query = HistoryQuerySchema.parse({
              limit: searchParams.get('limit') || undefined,
              offset: searchParams.get('offset') || undefined,
              purposeId: searchParams.get('purposeId') || undefined,
              startDate: searchParams.get('startDate') || undefined,
              endDate: searchParams.get('endDate') || undefined,
            });
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Build query for consent history
          // We create a timeline by combining granted_at and revoked_at events
          let historyQuery = `
            WITH consent_events AS (
              -- Grant events
              SELECT
                c.id,
                c.purpose AS purpose_label,
                c.purpose_id,
                'granted' AS action,
                c.granted_at AS timestamp,
                c.created_at
              FROM consents c
              WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.granted_at IS NOT NULL

              UNION ALL

              -- Revoke events
              SELECT
                c.id,
                c.purpose AS purpose_label,
                c.purpose_id,
                'revoked' AS action,
                c.revoked_at AS timestamp,
                c.created_at
              FROM consents c
              WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.revoked_at IS NOT NULL
            )
            SELECT
              e.id,
              e.purpose_label,
              e.purpose_id,
              e.action,
              e.timestamp,
              p.label AS purpose_name
            FROM consent_events e
            LEFT JOIN purposes p ON p.id = e.purpose_id AND p.tenant_id = $1
          `;

          const queryParams: unknown[] = [context.tenantId, userId];
          let paramIndex = 3;

          // Add filters
          const conditions: string[] = [];

          if (query.purposeId) {
            // Cast to UUID if valid, otherwise compare as text label
            // Use COALESCE to handle NULL purpose_id gracefully
            conditions.push(`(e.purpose_id::text = $${paramIndex} OR e.purpose_label = $${paramIndex})`);
            queryParams.push(query.purposeId);
            paramIndex++;
          }

          if (query.startDate) {
            conditions.push(`e.timestamp >= $${paramIndex}`);
            queryParams.push(query.startDate);
            paramIndex++;
          }

          if (query.endDate) {
            conditions.push(`e.timestamp <= $${paramIndex}`);
            queryParams.push(query.endDate);
            paramIndex++;
          }

          if (conditions.length > 0) {
            historyQuery += ` WHERE ${conditions.join(' AND ')}`;
          }

          historyQuery += ` ORDER BY e.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
          queryParams.push(query.limit, query.offset);

          const result = await pool.query(historyQuery, queryParams);

          // Map purpose labels
          const purposeLabels: Record<string, string> = {
            'analytics': 'Analytiques',
            'ai_processing': 'Traitement IA',
            'marketing': 'Marketing',
          };

          const history: ConsentHistoryEntry[] = result.rows.map(row => ({
            id: row.id,
            purposeId: row.purpose_id || row.purpose_label,
            purposeLabel: row.purpose_name || purposeLabels[row.purpose_label] || row.purpose_label,
            action: row.action as 'granted' | 'revoked',
            timestamp: row.timestamp?.toISOString() || new Date().toISOString(),
            source: 'user', // Default to user; could be enhanced with audit trail
          }));

          // Get total count
          let countQuery = `
            WITH consent_events AS (
              SELECT c.id, c.purpose_id, c.purpose AS purpose_label, c.granted_at AS timestamp
              FROM consents c
              WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.granted_at IS NOT NULL

              UNION ALL

              SELECT c.id, c.purpose_id, c.purpose AS purpose_label, c.revoked_at AS timestamp
              FROM consents c
              WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.revoked_at IS NOT NULL
            )
            SELECT COUNT(*) AS total FROM consent_events e
          `;

          const countParams: unknown[] = [context.tenantId, userId];
          let countParamIndex = 3;
          const countConditions: string[] = [];

          if (query.purposeId) {
            // Cast to UUID if valid, otherwise compare as text label
            countConditions.push(`(e.purpose_id::text = $${countParamIndex} OR e.purpose_label = $${countParamIndex})`);
            countParams.push(query.purposeId);
            countParamIndex++;
          }

          if (query.startDate) {
            countConditions.push(`e.timestamp >= $${countParamIndex}`);
            countParams.push(query.startDate);
            countParamIndex++;
          }

          if (query.endDate) {
            countConditions.push(`e.timestamp <= $${countParamIndex}`);
            countParams.push(query.endDate);
            countParamIndex++;
          }

          if (countConditions.length > 0) {
            countQuery += ` WHERE ${countConditions.join(' AND ')}`;
          }

          const countResult = await pool.query(countQuery, countParams);
          const total = parseInt(countResult.rows[0].total, 10);

          logger.info({
            userId,
            tenantId: context.tenantId,
            historyCount: history.length,
            filters: {
              purposeId: query.purposeId,
              startDate: query.startDate,
              endDate: query.endDate,
            },
          }, 'Consent history fetched');

          return NextResponse.json({
            user: {
              id: user.id,
              displayName: user.displayName,
            },
            history,
            total,
            limit: query.limit,
            offset: query.offset,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/consents/history/:userId error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
