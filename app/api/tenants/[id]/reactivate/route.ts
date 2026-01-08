/**
 * Tenant Reactivate Endpoint (LOT 11.0 - US 11.4)
 *
 * POST /api/tenants/:id/reactivate - Réactiver un tenant suspendu
 *
 * RGPD compliance:
 * - Audit trail logged (tenant.unsuspended)
 * - PLATFORM admin only
 * - Restaure l'accès pour tous les users du tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withPlatformAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { unsuspendTenant } from '@app/usecases/tenants/unsuspendTenant';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError } from '@/lib/errorResponse';

/**
 * POST /api/tenants/:id/reactivate - Réactiver tenant (PLATFORM admin only)
 */
export const POST = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: tenantId } = await params;

          if (!tenantId) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          // Unsuspend tenant
          await unsuspendTenant(
            {
              tenantId,
              actorId: context.userId,
            },
            {
              tenantRepo: new PgTenantRepo(),
              auditEventWriter: new PgAuditEventWriter(),
            }
          );

          logger.info({
            tenantId,
            actorId: context.userId,
          }, 'Tenant reactivated');

          return NextResponse.json({
            message: 'Tenant reactivated successfully',
          });

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/tenants/:id/reactivate error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          if (errorMessage.includes('not suspended')) {
            return NextResponse.json(
              { error: 'Tenant is not suspended' },
              { status: 400 }
            );
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
