/**
 * AI Invoke Endpoint
 * LOT 5.3 - API Layer
 *
 * POST /api/ai/invoke
 * Invoke Gateway LLM (stub for now)
 *
 * RGPD compliance:
 * - Consent verification mandatory (ai_processing purpose)
 * - No direct LLM call (must go through Gateway LLM)
 * - No storage of prompts/outputs (metadata only)
 * - Rate limiting enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withRateLimit } from '@/middleware/rateLimit';
import { requireContext } from '@/lib/requestContext';
import { PgConsentRepo } from '@/infrastructure/repositories/PgConsentRepo';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { validateBody, AiInvokeSchema } from '@/lib/validation';
import { ZodError } from 'zod';

/**
 * POST /api/ai/invoke - Invoke Gateway LLM (stub)
 *
 * IMPORTANT:
 * - This is a STUB implementation (Gateway LLM not implemented yet)
 * - Creates job with status PENDING only
 * - MUST verify ai_processing consent before proceeding
 * - Rate limited to 50 requests per user
 */
export const POST = withLogging(
  withAuth(
    withRateLimit({ maxRequests: 50 })(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Validate request body
          const body = await validateBody(req, AiInvokeSchema);

          // CRITICAL RGPD: Verify ai_processing consent
          const consentRepo = new PgConsentRepo();
          const consent = await consentRepo.findByUserAndPurpose(
            context.tenantId!,
            context.userId,
            'ai_processing'
          );

          if (!consent || !consent.granted) {
            logger.warn({
              userId: context.userId,
              tenantId: context.tenantId,
              purpose: body.purpose,
            }, 'AI invocation blocked: missing consent');

            return NextResponse.json(
              forbiddenError('AI processing consent required. Please grant consent before using AI features.'),
              { status: 403 }
            );
          }

          // Create AI job (metadata only, no content)
          const aiJobRepo = new PgAiJobRepo();
          const jobId = await aiJobRepo.create(context.tenantId!, {
            userId: context.userId,
            purpose: body.purpose,
            modelRef: body.modelRef || null,
          });

          logger.info({
            jobId,
            userId: context.userId,
            tenantId: context.tenantId,
            purpose: body.purpose,
          }, 'AI job created (stub)');

          // STUB: Return job ID with PENDING status
          // Real implementation would invoke Gateway LLM here
          return NextResponse.json({
            jobId,
            status: 'PENDING',
            message: 'Job created (Gateway LLM not implemented yet)',
          }, { status: 202 }); // 202 Accepted
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'POST /api/ai/invoke error');

          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }

          if (errorMessage.includes('VIOLATION') || errorMessage.includes('consent')) {
            return NextResponse.json(forbiddenError(errorMessage), { status: 403 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
