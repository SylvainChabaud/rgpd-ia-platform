/**
 * Purpose Template Detail Endpoint
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * GET /api/purposes/templates/:code - Get template details by code
 *
 * RGPD compliance:
 * - Templates are platform-level (not tenant-scoped)
 * - Read-only for tenant admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeTemplateRepo } from '@/infrastructure/repositories/PgPurposeTemplateRepo';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, tenantContextRequiredError } from '@/lib/errorResponse';
import { getPool } from '@/infrastructure/db/pool';
import {
  LAWFUL_BASIS_LABELS,
  LAWFUL_BASIS_DESCRIPTIONS,
  RISK_LEVEL_LABELS,
  CATEGORY_LABELS,
  DATA_CLASS_LABELS,
  DATA_CLASS_DESCRIPTIONS,
} from '@/app/ports/PurposeTemplateRepo';

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/purposes/templates/:code - Get template details
 *
 * Returns template with:
 * - Full RGPD information
 * - Localized labels and descriptions
 * - Adoption status for current tenant
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest, context: RouteParams) => {
        try {
          const reqContext = requireContext(req);
          const { code } = await context.params;

          if (!reqContext.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Fetch template
          const pool = getPool();
          const templateRepo = new PgPurposeTemplateRepo(pool);
          const template = await templateRepo.findByCode(code);

          if (!template) {
            return NextResponse.json(notFoundError('Template not found'), { status: 404 });
          }

          // Check if already adopted by tenant
          const purposeRepo = new PgPurposeRepo();
          const isAdopted = await purposeRepo.isTemplateAdopted(reqContext.tenantId, template.id);

          // Get adoption count
          const adoptionCount = await templateRepo.countAdoptions(template.id);

          logger.info({
            tenantId: reqContext.tenantId,
            templateCode: code,
            isAdopted,
          }, 'Purpose template details retrieved');

          return NextResponse.json({
            template: {
              id: template.id,
              code: template.code,
              version: template.version,
              name: template.name,
              description: template.description,
              lawfulBasis: template.lawfulBasis,
              lawfulBasisLabel: LAWFUL_BASIS_LABELS[template.lawfulBasis],
              lawfulBasisDescription: LAWFUL_BASIS_DESCRIPTIONS[template.lawfulBasis],
              category: template.category,
              categoryLabel: CATEGORY_LABELS[template.category],
              riskLevel: template.riskLevel,
              riskLevelLabel: RISK_LEVEL_LABELS[template.riskLevel],
              defaultRetentionDays: template.defaultRetentionDays,
              requiresDpia: template.requiresDpia,
              maxDataClass: template.maxDataClass,
              maxDataClassLabel: DATA_CLASS_LABELS[template.maxDataClass],
              maxDataClassDescription: DATA_CLASS_DESCRIPTIONS[template.maxDataClass],
              isAiPurpose: template.isAiPurpose,
              cnilReference: template.cnilReference,
              createdAt: template.createdAt.toISOString(),
              updatedAt: template.updatedAt.toISOString(),
            },
            adoption: {
              isAdopted,
              totalAdoptions: adoptionCount,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/purposes/templates/:code error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
