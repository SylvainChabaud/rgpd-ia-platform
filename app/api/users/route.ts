/**
 * Users Endpoints (Tenant-scoped)
 * LOT 5.3 - API Layer
 *
 * GET /api/users - List users in tenant
 * POST /api/users - Create user in tenant
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Email hashed before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { createUser } from '@/app/usecases/users/createUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { Sha256PasswordHasher } from '@/infrastructure/security/Sha256PasswordHasher';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError } from '@/lib/errorResponse';
import { validateBody, CreateUserSchema, PaginationSchema, validateQuery } from '@/lib/validation';
import { ZodError } from 'zod';

/**
 * GET /api/users - List users in tenant
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
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

          // Fetch users
          const userRepo = new PgUserRepo();
          const users = await userRepo.listByTenant(
            context.tenantId!,
            query.limit,
            query.offset
          );

          logger.info({
            tenantId: context.tenantId,
            count: users.length,
          }, 'Users listed');

          // RGPD-safe: Do not expose email_hash or password_hash
          return NextResponse.json({
            users: users.map(user => ({
              id: user.id,
              displayName: user.displayName,
              role: user.role,
              createdAt: user.createdAt,
            })),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/users error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * POST /api/users - Create user in tenant
 */
export const POST = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Validate request body
          const body = await validateBody(req, CreateUserSchema);

          // Create user
          const result = await createUser(
            {
              tenantId: context.tenantId!,
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
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'User created');

          // RGPD-safe: Do not return email in response
          return NextResponse.json({
            userId: result.userId,
            email: '[REDACTED]',
            displayName: body.displayName,
            role: body.role,
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/users error');

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
