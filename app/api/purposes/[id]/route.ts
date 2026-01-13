/**
 * Purpose Detail Endpoints (Tenant-scoped)
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * GET /api/purposes/:id - Get purpose by ID
 * PATCH /api/purposes/:id - Update purpose
 * DELETE /api/purposes/:id - Soft delete purpose
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Audit events emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, validationError, conflictError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Schema for updating a purpose
 */
const UpdatePurposeSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters').max(100, 'Label must be at most 100 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be at most 500 characters').optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/purposes/:id - Get purpose by ID
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: purposeId } = await params;

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          if (!purposeId) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          const purposeRepo = new PgPurposeRepo();
          const purpose = await purposeRepo.findById(context.tenantId, purposeId);

          if (!purpose) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          // Get consent count for this purpose
          const consentCount = await purposeRepo.countConsents(context.tenantId, purposeId);

          logger.info({
            purposeId,
            tenantId: context.tenantId,
          }, 'Purpose fetched');

          return NextResponse.json({
            purpose: {
              id: purpose.id,
              label: purpose.label,
              description: purpose.description,
              isRequired: purpose.isRequired,
              isActive: purpose.isActive,
              createdAt: purpose.createdAt.toISOString(),
              updatedAt: purpose.updatedAt.toISOString(),
              consentCount,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/purposes/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * PATCH /api/purposes/:id - Update purpose
 */
export const PATCH = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: purposeId } = await params;

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          if (!purposeId) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          // Parse and validate body
          let body: z.infer<typeof UpdatePurposeSchema>;
          try {
            const rawBody = await req.json();
            body = UpdatePurposeSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }

          const purposeRepo = new PgPurposeRepo();

          // Check if label is being changed and if it's already taken
          if (body.label) {
            const existing = await purposeRepo.findByLabel(context.tenantId, body.label);
            if (existing && existing.id !== purposeId) {
              return NextResponse.json(conflictError('A purpose with this label already exists'), { status: 409 });
            }
          }

          // Update purpose
          const purpose = await purposeRepo.update(context.tenantId, purposeId, {
            label: body.label,
            description: body.description,
            isRequired: body.isRequired,
            isActive: body.isActive,
          });

          if (!purpose) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          // Emit audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'purpose.updated',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            targetId: purpose.id,
            tenantId: context.tenantId,
          });

          logger.info({
            purposeId: purpose.id,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'Purpose updated');

          return NextResponse.json({
            purpose: {
              id: purpose.id,
              label: purpose.label,
              description: purpose.description,
              isRequired: purpose.isRequired,
              isActive: purpose.isActive,
              createdAt: purpose.createdAt.toISOString(),
              updatedAt: purpose.updatedAt.toISOString(),
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'PATCH /api/purposes/:id error');

          if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
            return NextResponse.json(conflictError('A purpose with this label already exists'), { status: 409 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * DELETE /api/purposes/:id - Soft delete purpose
 */
export const DELETE = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        try {
          const context = requireContext(req);
          const { id: purposeId } = await params;

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          if (!purposeId) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          const purposeRepo = new PgPurposeRepo();

          // Check if purpose exists and get consent count
          const purpose = await purposeRepo.findById(context.tenantId, purposeId);
          if (!purpose) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          const consentCount = await purposeRepo.countConsents(context.tenantId, purposeId);

          // Soft delete purpose
          const deleted = await purposeRepo.softDelete(context.tenantId, purposeId);

          if (!deleted) {
            return NextResponse.json(notFoundError('Purpose'), { status: 404 });
          }

          // Emit audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'purpose.deleted',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            targetId: purposeId,
            tenantId: context.tenantId,
          });

          logger.info({
            purposeId,
            tenantId: context.tenantId,
            actorId: context.userId,
            consentCount,
          }, 'Purpose deleted');

          return NextResponse.json({
            message: 'Purpose deleted successfully',
            purposeId,
            consentCount,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'DELETE /api/purposes/:id error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
