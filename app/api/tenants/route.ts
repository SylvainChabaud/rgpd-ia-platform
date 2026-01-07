/**
 * Tenants Endpoints (PLATFORM admin only)
 * LOT 5.3 - API Layer
 *
 * GET /api/tenants - List all tenants
 * POST /api/tenants - Create tenant
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withPlatformAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { listTenants } from '@/app/usecases/tenants/listTenants';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError } from '@/lib/errorResponse';
import { validateBody, CreateTenantSchema, PaginationSchema, validateQuery } from '@/lib/validation';
import { newId } from '@/shared/ids';
import { ZodError } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * GET /api/tenants - List all tenants (PLATFORM admin only)
 */
export const GET = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          let query;
          try {
            query = validateQuery(searchParams, PaginationSchema);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Fetch tenants
          const result = await listTenants(
            {
              limit: query.limit,
              offset: query.offset,
            },
            {
              tenantRepo: new PgTenantRepo(),
            }
          );

          logger.info({
            actorId: context.userId,
            count: result.tenants.length,
          }, 'Tenants listed');

          return NextResponse.json({
            tenants: result.tenants.map(tenant => ({
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              createdAt: tenant.createdAt,
              deletedAt: tenant.deletedAt || null,
            })),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/tenants error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * POST /api/tenants - Create tenant (PLATFORM admin only)
 */
export const POST = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Validate request body
          const body = await validateBody(req, CreateTenantSchema);

          // Check if tenant already exists
          const tenantRepo = new PgTenantRepo();
          const existing = await tenantRepo.findBySlug(body.slug);
          if (existing) {
            return NextResponse.json(conflictError('Tenant with this slug already exists'), { status: 409 });
          }

          // Create tenant
          const tenantId = newId();
          await tenantRepo.create({
            id: tenantId,
            slug: body.slug,
            name: body.name,
          });

          // Emit audit event
          await new PgAuditEventWriter().write({
            id: newId(),
            eventName: 'tenant.created',
            actorScope: ACTOR_SCOPE.PLATFORM,
            actorId: context.userId,
            tenantId: undefined,
            targetId: tenantId,
          });

          logger.info({
            tenantId,
            actorId: context.userId,
          }, 'Tenant created');

          return NextResponse.json({
            tenantId,
            name: body.name,
            slug: body.slug,
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/tenants error');

          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            return NextResponse.json(conflictError('Tenant with this slug already exists'), { status: 409 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
