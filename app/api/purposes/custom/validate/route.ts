/**
 * Validate Custom Purpose Endpoint
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * POST /api/purposes/custom/validate - Validate custom purpose before creation
 *
 * RGPD compliance:
 * - Provides RGPD guidance (suggested base légale, risk level)
 * - Warns about DPIA requirements
 * - Guides non-expert tenant admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { getCustomPurposeValidator } from '@/app/services/CustomPurposeValidator';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import {
  DATA_CLASS,
  LAWFUL_BASIS_LABELS,
  LAWFUL_BASIS_DESCRIPTIONS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '@/app/ports/PurposeTemplateRepo';

// Zod enum tuple derived from DATA_CLASS constants
const DATA_CLASS_VALUES = [
  DATA_CLASS.P0,
  DATA_CLASS.P1,
  DATA_CLASS.P2,
  DATA_CLASS.P3,
] as const;

/**
 * Schema for validating custom purpose
 */
const ValidateCustomPurposeSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  description: z.string().min(1, 'Description is required'),
  dataClassInvolved: z.array(z.enum(DATA_CLASS_VALUES)).min(1, 'At least one data class must be selected'),
  processingTypes: z.array(z.string()).default([]),
  automaticDecision: z.boolean().default(false),
  highRisk: z.boolean().optional().default(false),
});

/**
 * POST /api/purposes/custom/validate - Validate custom purpose
 *
 * Body:
 * - label: string - Purpose label
 * - description: string - Purpose description
 * - dataClassInvolved: string[] - Data classes (P0, P1, P2, P3)
 * - processingTypes: string[] - Processing types (AI_AUTOMATED, PROFILING, etc.)
 * - automaticDecision: boolean - Involves automated decision (Art. 22)
 * - highRisk: boolean - User indicates high risk
 *
 * Returns:
 * - isValid: boolean
 * - suggestedLawfulBasis: string
 * - suggestedRiskLevel: string
 * - warnings: string[]
 * - errors: string[]
 * - requiresDpia: boolean
 * - canProceed: boolean
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
          let body: z.infer<typeof ValidateCustomPurposeSchema>;
          try {
            const rawBody = await req.json();
            body = ValidateCustomPurposeSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }

          // Validate using CustomPurposeValidator
          const validator = getCustomPurposeValidator();
          const result = validator.validate({
            label: body.label,
            description: body.description,
            dataClassInvolved: body.dataClassInvolved,
            processingTypes: body.processingTypes,
            automaticDecision: body.automaticDecision,
            highRisk: body.highRisk,
          });

          logger.info({
            tenantId: context.tenantId,
            actorId: context.userId,
            isValid: result.isValid,
            suggestedRiskLevel: result.suggestedRiskLevel,
            requiresDpia: result.requiresDpia,
          }, 'Custom purpose validated');

          return NextResponse.json({
            validation: {
              isValid: result.isValid,
              suggestedLawfulBasis: result.suggestedLawfulBasis,
              suggestedLawfulBasisLabel: LAWFUL_BASIS_LABELS[result.suggestedLawfulBasis],
              suggestedLawfulBasisDescription: LAWFUL_BASIS_DESCRIPTIONS[result.suggestedLawfulBasis],
              suggestedRiskLevel: result.suggestedRiskLevel,
              suggestedRiskLevelLabel: RISK_LEVEL_LABELS[result.suggestedRiskLevel],
              suggestedRiskLevelColor: RISK_LEVEL_COLORS[result.suggestedRiskLevel],
              warnings: result.warnings,
              errors: result.errors,
              requiresDpia: result.requiresDpia,
              canProceed: result.canProceed,
            },
            // Provide all lawful basis options for UI
            lawfulBasisOptions: Object.entries(LAWFUL_BASIS_LABELS).map(([value, label]) => ({
              value,
              label,
              description: LAWFUL_BASIS_DESCRIPTIONS[value as keyof typeof LAWFUL_BASIS_DESCRIPTIONS],
              isRecommended: value === result.suggestedLawfulBasis,
            })),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/purposes/custom/validate error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
