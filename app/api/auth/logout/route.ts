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
import { createAuditDependencies } from '@/app/dependencies';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { randomUUID } from 'crypto';
import { internalError } from '@/lib/errorResponse';
import { AUTH_COOKIES, REFRESH_TOKEN_PATH } from '@/shared/auth/constants';

export const POST = withLogging(
  withAuth(
    async (req: NextRequest) => {
      // Dependencies (via factory - BOUNDARIES.md section 11)
      // Initialize ONCE at the start to avoid duplicate instantiation
      const deps = createAuditDependencies();

      try {
        const context = requireContext(req);

        // Emit audit event
        await emitAuditEvent(deps.auditEventWriter, {
          id: randomUUID(),
          eventName: 'auth.logout',
          actorScope: context.scope,
          actorId: context.userId,
          tenantId: context.tenantId || undefined,
          metadata: {},
        });

        // Create response
        const response = NextResponse.json({
          message: 'Logged out successfully',
        });

        // Clear HTTP-only auth cookie (server-side protection)
        response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0, // Expire immediately
        });

        // Clear refresh token cookie
        response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: REFRESH_TOKEN_PATH,
          maxAge: 0, // Expire immediately
        });

        return response;
      } catch (error) {
        deps.logger.error({ event: 'auth.logout_error', error: error instanceof Error ? error.message : 'Unknown error' }, 'POST /api/auth/logout error');
        return NextResponse.json(
          internalError(),
          { status: 500 }
        );
      }
    }
  )
);
