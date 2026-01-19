/**
 * Adopt Template Endpoint
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * POST /api/purposes/adopt - Adopt a purpose template for tenant
 *
 * RGPD compliance:
 * - Creates purpose with RGPD fields inherited from template
 * - Base légale, risque, catégorie are immutable
 * - Audit trail for template adoption
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeTemplateRepo } from '@/infrastructure/repositories/PgPurposeTemplateRepo';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError, notFoundError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { getPool } from '@/infrastructure/db/pool';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { autoCreateDpiaForPurpose } from '@/app/usecases/dpia/autoCreateDpiaForPurpose';

/**
 * Schema for adopting a template
 */
const AdoptTemplateSchema = z.object({
  templateCode: z.string().min(1, 'Template code is required'),
  label: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  isRequired: z.boolean().optional().default(false),
});

/**
 * POST /api/purposes/adopt - Adopt a purpose template
 *
 * Body:
 * - templateCode: string (required) - Template code to adopt
 * - label: string (optional) - Custom label (overrides template)
 * - description: string (optional) - Custom description (overrides template)
 * - isRequired: boolean (optional) - Make consent mandatory
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
          let body: z.infer<typeof AdoptTemplateSchema>;
          try {
            const rawBody = await req.json();
            body = AdoptTemplateSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }

          // Find template
          const pool = getPool();
          const templateRepo = new PgPurposeTemplateRepo(pool);
          const template = await templateRepo.findByCode(body.templateCode);

          if (!template) {
            return NextResponse.json(notFoundError(`Template '${body.templateCode}' not found`), { status: 404 });
          }

          if (!template.isActive) {
            return NextResponse.json(validationError([{
              path: ['templateCode'],
              message: 'Template is not active',
            }]), { status: 400 });
          }

          // Check if already adopted
          const purposeRepo = new PgPurposeRepo();
          const isAdopted = await purposeRepo.isTemplateAdopted(context.tenantId, template.id);

          if (isAdopted) {
            return NextResponse.json(
              conflictError(`Template '${body.templateCode}' is already adopted`),
              { status: 409 }
            );
          }

          // Create purpose from template
          const purpose = await purposeRepo.createFromTemplate(context.tenantId, {
            templateId: template.id,
            label: body.label,
            description: body.description,
            isRequired: body.isRequired,
          });

          // Emit audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'purpose.template.adopted',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            targetId: purpose.id,
            tenantId: context.tenantId,
            metadata: {
              templateCode: body.templateCode,
              templateId: template.id,
              customLabel: body.label ? true : false,
              customDescription: body.description ? true : false,
            },
          });

          // Auto-create DPIA for HIGH/CRITICAL risk purposes (LOT 12.4)
          // Inject dependencies per architecture boundaries (no direct infra imports in usecases)
          const { PgDpiaRepo } = await import('@/infrastructure/repositories/PgDpiaRepo');
          const dpiaRepo = new PgDpiaRepo();
          const dpiaResult = await autoCreateDpiaForPurpose(
            {
              tenantId: context.tenantId,
              actorId: context.userId,
              purpose: {
                id: purpose.id,
                label: purpose.label,
                description: purpose.description,
                riskLevel: purpose.riskLevel,
                maxDataClass: purpose.maxDataClass,
                requiresDpia: purpose.requiresDpia,
              },
              context: {
                templateCode: body.templateCode,
                source: 'adopt',
              },
            },
            {
              dpiaRepo,
              auditWriter,
              logger,
            }
          );

          logger.info({
            purposeId: purpose.id,
            templateCode: body.templateCode,
            tenantId: context.tenantId,
            actorId: context.userId,
            requiresDpia: purpose.requiresDpia,
            dpiaId: dpiaResult.dpiaId,
          }, 'Purpose template adopted');

          return NextResponse.json({
            purpose: {
              id: purpose.id,
              templateId: purpose.templateId,
              label: purpose.label,
              description: purpose.description,
              lawfulBasis: purpose.lawfulBasis,
              category: purpose.category,
              riskLevel: purpose.riskLevel,
              maxDataClass: purpose.maxDataClass,
              requiresDpia: purpose.requiresDpia,
              isRequired: purpose.isRequired,
              isActive: purpose.isActive,
              isFromTemplate: purpose.isFromTemplate,
              isSystem: purpose.isSystem,
              validationStatus: purpose.validationStatus,
              createdAt: purpose.createdAt.toISOString(),
              updatedAt: purpose.updatedAt.toISOString(),
            },
            dpiaId: dpiaResult.dpiaId,
            warnings: dpiaResult.warnings,
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/purposes/adopt error');

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
