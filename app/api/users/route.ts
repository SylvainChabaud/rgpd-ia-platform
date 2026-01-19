/**
 * Users Endpoints (Tenant-scoped)
 * LOT 5.3 - API Layer (Enhanced in LOT 12.1)
 *
 * GET /api/users - List users in tenant (with filters)
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
import { withTenantAdmin, withTenantAdminOrDpo } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { createUser } from '@/app/usecases/users/createUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { Sha256PasswordHasher } from '@/infrastructure/security/Sha256PasswordHasher';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError } from '@/lib/errorResponse';
import { validateBody, CreateUserSchema } from '@/lib/validation';
import { ZodError, z } from 'zod';

/**
 * Extended pagination schema with filters for LOT 12.1
 */
const ListUsersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  role: z.string().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/users - List users in tenant (with filters)
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - role: string (filter by role: admin, member)
 * - status: 'active' | 'suspended' (filter by suspension status)
 * - search: string (search in displayName)
 * - sortBy: 'name' | 'createdAt' | 'role' (default: createdAt)
 * - sortOrder: 'asc' | 'desc' (default: desc)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdminOrDpo(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Parse query params with extended schema
          const searchParams = req.nextUrl.searchParams;
          let query: z.infer<typeof ListUsersQuerySchema>;
          try {
            query = ListUsersQuerySchema.parse({
              limit: searchParams.get('limit') || undefined,
              offset: searchParams.get('offset') || undefined,
              role: searchParams.get('role') || undefined,
              status: searchParams.get('status') || undefined,
              search: searchParams.get('search') || undefined,
              sortBy: searchParams.get('sortBy') || undefined,
              sortOrder: searchParams.get('sortOrder') || undefined,
            });
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Fetch users with filters
          const userRepo = new PgUserRepo();
          const users = await userRepo.listFilteredByTenant({
            tenantId: context.tenantId!,
            limit: query.limit,
            offset: query.offset,
            role: query.role,
            status: query.status,
            search: query.search,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          });

          // Get total count for pagination
          const total = await userRepo.countByTenant({
            tenantId: context.tenantId!,
            role: query.role,
            status: query.status,
            search: query.search,
          });

          logger.info({
            tenantId: context.tenantId,
            count: users.length,
            filters: { role: query.role, status: query.status, search: query.search ? '[REDACTED]' : undefined },
          }, 'Users listed');

          // RGPD-safe: Do not expose email_hash or password_hash
          return NextResponse.json({
            users: users.map(user => ({
              id: user.id,
              displayName: user.displayName,
              role: user.role,
              scope: user.scope,
              createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
              dataSuspended: user.dataSuspended || false,
              dataSuspendedAt: user.dataSuspendedAt instanceof Date
                ? user.dataSuspendedAt.toISOString()
                : (user.dataSuspendedAt || null),
            })),
            total,
            limit: query.limit,
            offset: query.offset,
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

          // RGPD-safe response:
          // - Email NEVER returned in clear text (P2 data)
          // - Email is hashed (SHA-256) before storage
          // - Only userId (P1) and displayName (P1) are returned
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
