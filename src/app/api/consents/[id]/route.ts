/**
 * Consent by ID Endpoint
 * LOT 5.3 - API Layer
 *
 * DELETE /api/consents/:id
 * Revoke a consent (Art. 7.3 - Right to withdraw consent)
 *
 * RGPD compliance:
 * - User can only revoke their own consents
 * - Tenant isolation enforced
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withCurrentUser } from '@/middleware/tenant';
import { requireContext } from '@/lib/requestContext';
import { revokeConsent } from '@/app/usecases/consent/revokeConsent';
import { PgConsentRepo } from '@/infrastructure/repositories/PgConsentRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError, forbiddenError, validationError } from '@/lib/errorResponse';

/**
 * DELETE /api/consents/:id - Revoke consent
 */
export const DELETE = withLogging(
  withAuth(
    withCurrentUser(
      async (req: NextRequest, { params }: { params: { id: string } }) => {
        try {
          const context = requireContext(req);
          const consentId = params.id;

          if (!consentId) {
            return NextResponse.json(validationError({ consentId: 'Consent ID is required' }), { status: 400 });
          }

          // Fetch consent to verify ownership
          const consentRepo = new PgConsentRepo();

          // Find all user consents and check if this ID belongs to them
          const userConsents = await consentRepo.findByUser(context.tenantId!, context.userId);
          const consent = userConsents.find(c => c.id === consentId);

          if (!consent) {
            return NextResponse.json(notFoundError('Consent'), { status: 404 });
          }

          // SECURITY: Verify consent belongs to current user
          if (consent.userId !== context.userId || consent.tenantId !== context.tenantId) {
            return NextResponse.json(forbiddenError('You can only revoke your own consents'), { status: 403 });
          }

          // Revoke consent
          await revokeConsent(
            consentRepo,
            new PgAuditEventWriter(),
            {
              tenantId: context.tenantId!,
              userId: context.userId,
              purpose: consent.purpose,
            }
          );

          logger.info({
            consentId,
            userId: context.userId,
            tenantId: context.tenantId,
            purpose: consent.purpose,
          }, 'Consent revoked');

          return NextResponse.json({
            message: 'Consent revoked',
            revokedAt: new Date().toISOString(),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'DELETE /api/consents/:id error');

          if (errorMessage.includes('VIOLATION')) {
            return NextResponse.json(forbiddenError(errorMessage), { status: 403 });
          }

          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
