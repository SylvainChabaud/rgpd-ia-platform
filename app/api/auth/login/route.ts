/**
 * POST /api/auth/login
 * LOT 5.3 - Authentication endpoint
 *
 * Authenticates user and returns JWT token
 *
 * RGPD compliance:
 * - Email never logged (hashed for lookup)
 * - Password never logged or exposed
 * - JWT contains only P1 data
 * - Failed attempts audited
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withRateLimit } from '@/middleware/rateLimit';
import { validateBody, LoginRequestSchema } from '@/lib/validation';
import { validationError, internalError } from '@/lib/errorResponse';
import { signJwt, signRefreshToken, TOKEN_EXPIRATION } from '@/lib/jwt';
import { authenticateUser } from '@/app/usecases/auth/authenticateUser';
import { createAuthDependencies } from '@/app/dependencies';
import { ZodError } from 'zod';
import { AUTH_COOKIES, REFRESH_TOKEN_PATH, AUTH_ERROR_MESSAGES } from '@/shared/auth/constants';

export const POST = withLogging(
  withRateLimit({ maxRequests: 10, windowMs: 60000 })(
    async (req: NextRequest) => {
      // Dependencies (via factory - BOUNDARIES.md section 11)
      // Initialize ONCE at the start to avoid duplicate instantiation
      const deps = createAuthDependencies();

      try {
        // Validate request body
        const body = await validateBody(req, LoginRequestSchema);

        // Authenticate user
        const user = await authenticateUser(
          deps.userRepo,
          deps.passwordHasher,
          deps.auditEventWriter,
          deps.tenantRepo,
          {
            email: body.email,
            password: body.password,
          }
        );

        // Check CGU acceptance (Art. 7 RGPD - consent must be explicit)
        let cguAccepted = false;
        let activeCguVersionId: string | null = null;

        const activeVersion = await deps.cguRepo.findActiveVersion();
        if (activeVersion) {
          activeCguVersionId = activeVersion.id;
          // Check if user has accepted current CGU version
          if (user.tenantId) {
            cguAccepted = await deps.cguRepo.hasUserAcceptedActiveVersion(
              user.tenantId,
              user.userId
            );
          }
        } else {
          // No active CGU version = no acceptance required
          cguAccepted = true;
        }

        // Generate access token (15 min) - includes CGU status for middleware
        const token = signJwt({
          userId: user.userId,
          tenantId: user.tenantId,
          scope: user.scope,
          role: user.role,
          cguAccepted,
        });

        // Generate refresh token (7 days) - includes CGU status
        const refreshToken = signRefreshToken({
          userId: user.userId,
          tenantId: user.tenantId,
          scope: user.scope,
          role: user.role,
          cguAccepted,
        });

        // Create response with token and user info
        // Include CGU acceptance status for frontend to handle
        const response = NextResponse.json({
          token,
          user: {
            id: user.userId,
            displayName: user.displayName,
            scope: user.scope,
            role: user.role,
            tenantId: user.tenantId,
          },
          cgu: {
            accepted: cguAccepted,
            versionId: activeCguVersionId,
          },
        });

        // Set HTTP-only cookie for access token (short-lived: 15 min)
        // SECURITY: httpOnly prevents XSS attacks from reading the token
        // sameSite: 'lax' allows the cookie to be sent on same-site requests
        // secure: true in production (HTTPS only)
        response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS,
        });

        // Set HTTP-only cookie for refresh token (long-lived: 7 days)
        // Used only by /api/auth/refresh endpoint
        response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: REFRESH_TOKEN_PATH, // Restricted to refresh endpoint only
          maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS,
        });

        return response;
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            validationError(error.issues),
            { status: 400 }
          );
        }

        if (error instanceof Error) {
          if (error.message === 'Invalid credentials') {
            return NextResponse.json(
              { error: 'Authentication failed', message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS },
              { status: 401 }
            );
          }

          if (error.message === 'Account suspended') {
            return NextResponse.json(
              { error: 'Account suspended', message: AUTH_ERROR_MESSAGES.ACCOUNT_SUSPENDED },
              { status: 403 }
            );
          }

          if (error.message === 'Tenant suspended') {
            return NextResponse.json(
              { error: 'Tenant suspended', message: AUTH_ERROR_MESSAGES.TENANT_SUSPENDED },
              { status: 403 }
            );
          }
        }

        // Internal error (don't expose details)
        // SECURITY: Use logger instead of console.error to avoid exposing stack traces
        deps.logger.error({
          event: 'auth.login.error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Login error');
        return NextResponse.json(
          internalError(),
          { status: 500 }
        );
      }
    }
  )
);
