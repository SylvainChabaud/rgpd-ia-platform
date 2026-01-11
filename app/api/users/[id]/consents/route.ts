/**
 * User Consents Endpoint (Tenant-scoped)
 * LOT 12.1 - Tenant User Management
 *
 * GET /api/users/:id/consents - Get user consents list
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1/P2 metadata (consent status, dates, purpose)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError } from '@/lib/errorResponse';

/**
 * GET /api/users/:id/consents - Get user consents list
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
            }, 'Cross-tenant consents access attempt blocked');
            return NextResponse.json(forbiddenError('Cross-tenant access denied'), { status: 403 });
          }

          // Fetch consents
          // Note: Schema uses 'purpose' (text) directly, not purpose_id foreign key
          const result = await pool.query(
            `SELECT
               id,
               purpose,
               granted,
               granted_at,
               revoked_at,
               created_at
             FROM consents
             WHERE tenant_id = $1 AND user_id = $2
             ORDER BY created_at DESC`,
            [context.tenantId, userId]
          );

          // Map purpose text to human-readable labels
          const purposeLabels: Record<string, { label: string; description: string }> = {
            'analytics': { label: 'Analytiques', description: 'Collecte de données pour analyse d\'usage' },
            'ai_processing': { label: 'Traitement IA', description: 'Utilisation des données pour les services d\'IA' },
            'marketing': { label: 'Marketing', description: 'Communications marketing et promotionnelles' },
          };

          const consents = result.rows.map((row) => {
            const purposeInfo = purposeLabels[row.purpose] || {
              label: row.purpose,
              description: `Consentement pour ${row.purpose}`,
            };
            return {
              id: row.id,
              purposeId: row.purpose,
              purposeLabel: purposeInfo.label,
              purposeDescription: purposeInfo.description,
              granted: row.granted,
              grantedAt: row.granted_at?.toISOString() || null,
              revokedAt: row.revoked_at?.toISOString() || null,
              createdAt: row.created_at?.toISOString() || null,
              status: row.revoked_at ? 'revoked' : (row.granted ? 'granted' : 'pending'),
            };
          });

          logger.info({
            userId,
            tenantId: context.tenantId,
            count: consents.length,
          }, 'User consents fetched');

          return NextResponse.json({
            consents,
            total: consents.length,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users/:id/consents error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
