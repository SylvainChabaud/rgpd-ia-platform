/**
 * Platform Users Endpoints (Super Admin only)
 * LOT 11.2 - Back Office Super Admin
 *
 * GET /api/platform/users - List ALL users across tenants
 * POST /api/platform/users - Create user in any tenant
 *
 * RGPD compliance:
 * - PLATFORM scope required (Super Admin only)
 * - Cross-tenant access authorized for platform admins
 * - Email redacted in responses (P2 data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { createUser } from '@/app/usecases/users/createUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { Sha256PasswordHasher } from '@/infrastructure/security/Sha256PasswordHasher';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError, forbiddenError } from '@/lib/errorResponse';
import { validateBody, PaginationSchema, validateQuery } from '@/lib/validation';
import { createUserSchema } from '@/lib/validation/userSchemas';
import { ZodError } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Middleware to check PLATFORM scope
 */
function withPlatformAdmin(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const context = requireContext(req);

    if (context.scope !== ACTOR_SCOPE.PLATFORM) {
      return NextResponse.json(
        forbiddenError('PLATFORM scope required'),
        { status: 403 }
      );
    }

    return handler(req);
  };
}

/**
 * GET /api/platform/users - List ALL users (cross-tenant)
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

          // Fetch ALL users (cross-tenant for PLATFORM admin)
          const userRepo = new PgUserRepo();
          const users = await userRepo.listAll(
            query.limit,
            query.offset
          );

          logger.info({
            actorId: context.userId,
            count: users.length,
          }, 'Platform admin listed all users');

          // RGPD-safe: Do not expose email_hash or password_hash
          // Return P1 data only
          return NextResponse.json({
            users: users.map(user => ({
              id: user.id,
              displayName: user.displayName,
              tenantId: user.tenantId,
              scope: user.scope,
              role: user.role,
              createdAt: user.createdAt,
              dataSuspended: user.dataSuspended || false,
              dataSuspendedAt: user.dataSuspendedAt || null,
            })),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/platform/users error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * POST /api/platform/users - Create user in any tenant
 */
export const POST = withLogging(
  withAuth(
    withPlatformAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Validate request body (use schema with tenantId for platform admin)
          const body = await validateBody(req, createUserSchema);

          // Create user (tenantId from body, not from context)
          const result = await createUser(
            {
              tenantId: body.tenantId,
              email: body.email,
              displayName: body.displayName,
              password: body.password,
              role: body.role,
              actorId: context.userId,
            },
            {
              userRepo: new PgUserRepo(),
              passwordHasher: new Sha256PasswordHasher(),
              auditEventWriter: new PgAuditEventWriter(),
            }
          );

          logger.info({
            userId: result.userId,
            tenantId: body.tenantId,
            actorId: context.userId,
          }, 'Platform admin created user');

          // RGPD-safe: Do not return email in response
          return NextResponse.json({
            userId: result.userId,
            email: '[REDACTED]',
            displayName: body.displayName,
            role: body.role,
            tenantId: body.tenantId,
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/platform/users error');

          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          if (errorMessage.includes('already exists')) {
            return NextResponse.json(conflictError('User with this email already exists'), { status: 409 });
          }

          if (errorMessage.includes('VIOLATION')) {
            return NextResponse.json(internalError(), { status: 500 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
