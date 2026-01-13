/**
 * Create Custom Purpose Endpoint
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * POST /api/purposes/custom - Create custom purpose (after validation)
 *
 * RGPD compliance:
 * - Requires explicit lawful basis selection
 * - Requires DPIA acknowledgment for high-risk purposes
 * - Full audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, conflictError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import {
  LAWFUL_BASIS,
  PURPOSE_CATEGORY,
  RISK_LEVEL,
  DATA_CLASS,
} from '@/app/ports/PurposeTemplateRepo';

// Zod enum tuples derived from constants
const LAWFUL_BASIS_VALUES = [
  LAWFUL_BASIS.CONSENT,
  LAWFUL_BASIS.CONTRACT,
  LAWFUL_BASIS.LEGAL_OBLIGATION,
  LAWFUL_BASIS.VITAL_INTEREST,
  LAWFUL_BASIS.PUBLIC_INTEREST,
  LAWFUL_BASIS.LEGITIMATE_INTEREST,
] as const;

const PURPOSE_CATEGORY_VALUES = [
  PURPOSE_CATEGORY.AI_PROCESSING,
  PURPOSE_CATEGORY.ANALYTICS,
  PURPOSE_CATEGORY.MARKETING,
  PURPOSE_CATEGORY.ESSENTIAL,
] as const;

const RISK_LEVEL_VALUES = [
  RISK_LEVEL.LOW,
  RISK_LEVEL.MEDIUM,
  RISK_LEVEL.HIGH,
  RISK_LEVEL.CRITICAL,
] as const;

const DATA_CLASS_VALUES = [
  DATA_CLASS.P0,
  DATA_CLASS.P1,
  DATA_CLASS.P2,
  DATA_CLASS.P3,
] as const;

/**
 * Schema for creating custom purpose
 */
const CreateCustomPurposeSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters').max(100, 'Label must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be at most 500 characters'),
  lawfulBasis: z.enum(LAWFUL_BASIS_VALUES),
  category: z.enum(PURPOSE_CATEGORY_VALUES).default(PURPOSE_CATEGORY.AI_PROCESSING),
  riskLevel: z.enum(RISK_LEVEL_VALUES).default(RISK_LEVEL.MEDIUM),
  maxDataClass: z.enum(DATA_CLASS_VALUES).default(DATA_CLASS.P1),
  isRequired: z.boolean().optional().default(false),
  acknowledgeDpiaWarning: z.boolean().optional().default(false),
});

/**
 * POST /api/purposes/custom - Create custom purpose
 *
 * Body:
 * - label: string (required)
 * - description: string (required)
 * - lawfulBasis: string (required) - RGPD Art. 6 lawful basis
 * - category: string (optional) - Default: AI_PROCESSING
 * - riskLevel: string (optional) - Default: MEDIUM
 * - maxDataClass: string (optional) - Default: P1
 * - isRequired: boolean (optional) - Default: false
 * - acknowledgeDpiaWarning: boolean (required if HIGH/CRITICAL risk)
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
          let body: z.infer<typeof CreateCustomPurposeSchema>;
          try {
            const rawBody = await req.json();
            body = CreateCustomPurposeSchema.parse(rawBody);
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }

          // Check DPIA acknowledgment for high-risk purposes
          const HIGH_RISK_LEVELS = [RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL] as const;
          const isHighRisk = (HIGH_RISK_LEVELS as readonly string[]).includes(body.riskLevel);
          if (isHighRisk && !body.acknowledgeDpiaWarning) {
            return NextResponse.json(validationError([{
              path: ['acknowledgeDpiaWarning'],
              message: 'DPIA acknowledgment is required for high-risk purposes',
            }]), { status: 400 });
          }

          // Check for duplicate label
          const purposeRepo = new PgPurposeRepo();
          const existing = await purposeRepo.findByLabel(context.tenantId, body.label);
          if (existing) {
            return NextResponse.json(conflictError('A purpose with this label already exists'), { status: 409 });
          }

          // Determine if DPIA is required based on risk level or data classification
          const requiresDpia = isHighRisk || body.maxDataClass === DATA_CLASS.P3;

          // Create purpose
          const purpose = await purposeRepo.create(context.tenantId, {
            label: body.label,
            description: body.description,
            lawfulBasis: body.lawfulBasis,
            category: body.category,
            riskLevel: body.riskLevel,
            maxDataClass: body.maxDataClass,
            requiresDpia,
            isRequired: body.isRequired,
            isActive: true,
          });

          // Emit audit event
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'purpose.custom.created',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            targetId: purpose.id,
            tenantId: context.tenantId,
            metadata: {
              lawfulBasis: body.lawfulBasis,
              riskLevel: body.riskLevel,
              maxDataClass: body.maxDataClass,
              requiresDpia,
              acknowledgeDpiaWarning: body.acknowledgeDpiaWarning,
            },
          });

          logger.info({
            purposeId: purpose.id,
            tenantId: context.tenantId,
            actorId: context.userId,
            lawfulBasis: body.lawfulBasis,
            riskLevel: body.riskLevel,
            requiresDpia,
          }, 'Custom purpose created');

          return NextResponse.json({
            purpose: {
              id: purpose.id,
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
            warnings: requiresDpia ? [
              'Cette finalité nécessite une Analyse d\'Impact (DPIA). Contactez votre DPO avant mise en production.',
            ] : [],
          }, { status: 201 });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/purposes/custom error');

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
