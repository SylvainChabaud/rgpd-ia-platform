/**
 * Purpose Templates Endpoints (Platform-level)
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * GET /api/purposes/templates - List available purpose templates
 *
 * RGPD compliance:
 * - Templates are platform-level (not tenant-scoped)
 * - Read-only for tenant admins
 * - Pre-validated for RGPD compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeTemplateRepo } from '@/infrastructure/repositories/PgPurposeTemplateRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { getPool } from '@/infrastructure/db/pool';
import {
  PURPOSE_CATEGORY,
  RISK_LEVEL,
  SECTOR,
  LAWFUL_BASIS_LABELS,
  LAWFUL_BASIS_DESCRIPTIONS,
  CATEGORY_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  DATA_CLASS_LABELS,
  DATA_CLASS_DESCRIPTIONS,
  SECTOR_LABELS,
  SECTOR_DESCRIPTIONS,
} from '@/app/ports/PurposeTemplateRepo';

// Zod enum tuples derived from constants
const PURPOSE_CATEGORY_VALUES = [
  PURPOSE_CATEGORY.AI_PROCESSING,
  PURPOSE_CATEGORY.ANALYTICS,
  PURPOSE_CATEGORY.MARKETING,
  PURPOSE_CATEGORY.ESSENTIAL,
  PURPOSE_CATEGORY.PROFESSIONAL,
] as const;

const RISK_LEVEL_VALUES = [
  RISK_LEVEL.LOW,
  RISK_LEVEL.MEDIUM,
  RISK_LEVEL.HIGH,
  RISK_LEVEL.CRITICAL,
] as const;

const SECTOR_VALUES = [
  SECTOR.GENERAL,
  SECTOR.ACCOUNTING,
  SECTOR.LEGAL,
  SECTOR.HEALTH,
  SECTOR.FINANCE,
  SECTOR.HR,
] as const;

/**
 * Schema for listing templates with filters
 */
const ListTemplatesQuerySchema = z.object({
  category: z.enum(PURPOSE_CATEGORY_VALUES).optional(),
  riskLevel: z.enum(RISK_LEVEL_VALUES).optional(),
  sector: z.enum(SECTOR_VALUES).optional(),
  aiOnly: z.coerce.boolean().default(false),
});

/**
 * GET /api/purposes/templates - List available purpose templates
 *
 * Query params:
 * - category: Filter by category (AI_PROCESSING, ANALYTICS, MARKETING, ESSENTIAL, PROFESSIONAL)
 * - riskLevel: Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)
 * - sector: Filter by sector (GENERAL, ACCOUNTING, LEGAL, HEALTH, FINANCE, HR)
 * - aiOnly: Only return AI-specific templates (default: false)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          let query: z.infer<typeof ListTemplatesQuerySchema>;
          try {
            query = ListTemplatesQuerySchema.parse({
              category: searchParams.get('category') || undefined,
              riskLevel: searchParams.get('riskLevel') || undefined,
              sector: searchParams.get('sector') || undefined,
              aiOnly: searchParams.get('aiOnly') === 'true',
            });
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Fetch templates with combined filters (AND logic)
          const pool = getPool();
          const templateRepo = new PgPurposeTemplateRepo(pool);

          const filterParams = {
            category: query.category,
            riskLevel: query.riskLevel,
            sector: query.sector,
            aiOnly: query.aiOnly,
          };

          logger.debug({ filterParams }, 'Fetching templates with filters');

          const templates = await templateRepo.findWithFilters(filterParams);

          logger.info({
            tenantId: context.tenantId,
            count: templates.length,
            filters: query,
          }, 'Purpose templates listed');

          return NextResponse.json({
            templates: templates.map(template => ({
              id: template.id,
              code: template.code,
              name: template.name,
              description: template.description,
              lawfulBasis: template.lawfulBasis,
              lawfulBasisLabel: LAWFUL_BASIS_LABELS[template.lawfulBasis],
              lawfulBasisDescription: LAWFUL_BASIS_DESCRIPTIONS[template.lawfulBasis],
              category: template.category,
              categoryLabel: CATEGORY_LABELS[template.category],
              riskLevel: template.riskLevel,
              riskLevelLabel: RISK_LEVEL_LABELS[template.riskLevel],
              riskLevelColor: RISK_LEVEL_COLORS[template.riskLevel],
              sector: template.sector,
              sectorLabel: SECTOR_LABELS[template.sector],
              sectorDescription: SECTOR_DESCRIPTIONS[template.sector],
              defaultRetentionDays: template.defaultRetentionDays,
              requiresDpia: template.requiresDpia,
              maxDataClass: template.maxDataClass,
              maxDataClassLabel: DATA_CLASS_LABELS[template.maxDataClass],
              maxDataClassDescription: DATA_CLASS_DESCRIPTIONS[template.maxDataClass],
              isAiPurpose: template.isAiPurpose,
              cnilReference: template.cnilReference,
            })),
            total: templates.length,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/purposes/templates error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
