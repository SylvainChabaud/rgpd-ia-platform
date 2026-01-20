/**
 * Purposes Endpoints (Tenant-scoped)
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * GET /api/purposes - List purposes in tenant
 * POST /api/purposes - Create purpose in tenant
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1 metadata (labels, descriptions, config)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin, withTenantAdminOrDpo } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { LAWFUL_BASIS } from '@/app/ports/PurposeTemplateRepo';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * Schema for listing purposes
 */
const ListPurposesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

/**
 * Schema for creating a purpose
 */
const CreatePurposeSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters').max(100, 'Label must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be at most 500 characters'),
  isRequired: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

/**
 * GET /api/purposes - List purposes in tenant
 *
 * Query params:
 * - includeInactive: boolean (default: false)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdminOrDpo(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          let query: z.infer<typeof ListPurposesQuerySchema>;
          try {
            query = ListPurposesQuerySchema.parse({
              includeInactive: searchParams.get('includeInactive') === 'true',
            });
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Fetch purposes
          const purposeRepo = new PgPurposeRepo();
          const purposes = await purposeRepo.findAll(context.tenantId, query.includeInactive);

          // Fetch DPIA statuses for purposes that require DPIA (LOT 12.4)
          // Use batch query to avoid N+1 performance issue
          const dpiaRepo = new PgDpiaRepo();
          const purposesWithDpia = purposes.filter(p => p.requiresDpia);
          const purposeIds = purposesWithDpia.map(p => p.id);

          // Single batch query instead of N+1 loop
          const dpias = await dpiaRepo.findByPurposeIds(context.tenantId, purposeIds);
          const dpiaInfoMap = new Map<string, { status: string | null; id: string | null; rejectionReason: string | null }>(
            dpias.map(dpia => [dpia.purposeId, { status: dpia.status, id: dpia.id, rejectionReason: dpia.rejectionReason }])
          );

          logger.info({
            tenantId: context.tenantId,
            count: purposes.length,
            includeInactive: query.includeInactive,
          }, 'Purposes listed');

          return NextResponse.json({
            purposes: purposes.map(purpose => {
              const dpiaInfo = purpose.requiresDpia ? dpiaInfoMap.get(purpose.id) : null;
              return {
                id: purpose.id,
                templateId: purpose.templateId,
                label: purpose.label,
                description: purpose.description,
                lawfulBasis: purpose.lawfulBasis,
                category: purpose.category,
                riskLevel: purpose.riskLevel,
                maxDataClass: purpose.maxDataClass,
                requiresDpia: purpose.requiresDpia,
                dpiaStatus: dpiaInfo?.status ?? null,
                dpiaId: dpiaInfo?.id ?? null,
                dpiaRejectionReason: dpiaInfo?.rejectionReason ?? null,
                isRequired: purpose.isRequired,
                isActive: purpose.isActive,
                isFromTemplate: purpose.isFromTemplate,
                isSystem: purpose.isSystem,
                validationStatus: purpose.validationStatus,
                createdAt: purpose.createdAt.toISOString(),
                updatedAt: purpose.updatedAt.toISOString(),
              };
            }),
            total: purposes.length,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/purposes error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);

/**
 * POST /api/purposes - Create purpose in tenant
 */
export const POST = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Parse and validate body
          let body: z.infer<typeof CreatePurposeSchema>;
          try {
            const rawBody = await req.json();
            body = CreatePurposeSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }

          // Check for duplicate label
          const purposeRepo = new PgPurposeRepo();
          const existing = await purposeRepo.findByLabel(context.tenantId, body.label);
          if (existing) {
            return NextResponse.json(conflictError('A purpose with this label already exists'), { status: 409 });
          }

          // Create purpose
          // Note: This basic endpoint uses CONSENT as default lawful basis
          // For custom purposes with specific lawful basis, use POST /api/purposes/custom
          const purpose = await purposeRepo.create(context.tenantId, {
            label: body.label,
            description: body.description,
            lawfulBasis: LAWFUL_BASIS.CONSENT,
            isRequired: body.isRequired,
            isActive: body.isActive,
          });

          // Emit audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'purpose.created',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            targetId: purpose.id,
            tenantId: context.tenantId,
          });

          logger.info({
            purposeId: purpose.id,
            tenantId: context.tenantId,
            actorId: context.userId,
          }, 'Purpose created');

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
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/purposes error');

          if (errorMessage.includes('VIOLATION')) {
            return NextResponse.json(internalError(), { status: 500 });
          }

          if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
            return NextResponse.json(conflictError('A purpose with this label already exists'), { status: 409 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
