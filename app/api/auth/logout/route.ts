/**
 * POST /api/auth/logout
 * LOT 5.3 - Logout endpoint
 *
 * Logs out current user
 *
 * NOTE: Since we use stateless JWT, logout is client-side only
 * Client should delete the token from storage
 * For production: implement token blacklist with Redis
 *
 * RGPD compliance:
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { internalError } from '@/lib/errorResponse';

export const POST = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Emit audit event
        const auditWriter = new PgAuditEventWriter();
        await emitAuditEvent(auditWriter, {
          id: randomUUID(),
          eventName: 'auth.logout',
          actorScope: context.scope,
          actorId: context.userId,
          tenantId: context.tenantId || undefined,
          metadata: {},
        });

        // Return success
        // Client should delete token from storage
        return NextResponse.json({
          message: 'Logged out successfully',
        });
      } catch (error) {
        console.error('POST /api/auth/logout error:', error);
        return NextResponse.json(
          internalError(),
          { status: 500 }
        );
      }
    }
  )
);
