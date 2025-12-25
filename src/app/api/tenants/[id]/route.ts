/**
 * Tenant by ID Endpoints (PLATFORM admin only)
 * LOT 5.3 - API Layer
 *
 * GET /api/tenants/:id - Get tenant details
 * PUT /api/tenants/:id - Update tenant
 * DELETE /api/tenants/:id - Soft delete tenant (cascade users)
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Audit event emitted
 * - Soft delete cascades to users
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withPlatformAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { getTenant } from '@/app/usecases/tenants/getTenant';
import { updateTenant } from '@/app/usecases/tenants/updateTenant';
import { deleteTenant } from '@/app/usecases/tenants/deleteTenant';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, validationError } from '@/lib/errorResponse';
import { validateBody, UpdateTenantSchema } from '@/lib/validation';
import { ZodError } from 'zod';

/**
 * GET /api/tenants/:id - Get tenant details (PLATFORM admin only)
 */
export const GET = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: { id: string } }) => {
        try {
          const context = requireContext(req);
          const tenantId = params.id;

          if (!tenantId) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          // Fetch tenant
          const result = await getTenant(
            { tenantId },
            {
              tenantRepo: new PgTenantRepo(),
            }
          );

          logger.info({
            tenantId,
            actorId: context.userId,
          }, 'Tenant retrieved');

          return NextResponse.json({
            tenant: {
              id: result.tenant.id,
              name: result.tenant.name,
              slug: result.tenant.slug,
              createdAt: result.tenant.createdAt,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/tenants/:id error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * PUT /api/tenants/:id - Update tenant (PLATFORM admin only)
 */
export const PUT = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: { id: string } }) => {
        try {
          const context = requireContext(req);
          const tenantId = params.id;

          if (!tenantId) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          // Validate request body
          const body = await validateBody(req, UpdateTenantSchema);

          // Update tenant
          await updateTenant(
            {
              tenantId,
              name: body.name,
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
          }, 'Tenant updated');

          return NextResponse.json({
            tenant: {
              id: tenantId,
              name: body.name,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PUT /api/tenants/:id error');

          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * DELETE /api/tenants/:id - Soft delete tenant (PLATFORM admin only)
 *
 * IMPORTANT: Cascades soft delete to all tenant users
 */
export const DELETE = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest, { params }: { params: { id: string } }) => {
        try {
          const context = requireContext(req);
          const tenantId = params.id;

          if (!tenantId) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          // Delete tenant (cascade to users)
          await deleteTenant(
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
          }, 'Tenant deleted (cascaded to users)');

          return NextResponse.json({
            message: 'Tenant deleted',
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'DELETE /api/tenants/:id error');

          if (errorMessage.includes('not found')) {
            return NextResponse.json(notFoundError('Tenant'), { status: 404 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
