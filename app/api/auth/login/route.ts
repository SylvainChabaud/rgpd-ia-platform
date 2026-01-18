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
import { signJwt } from '@/lib/jwt';
import { authenticateUser } from '@/app/usecases/auth/authenticateUser';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgTenantRepo } from '@/infrastructure/repositories/PgTenantRepo';
import { Sha256PasswordHasher } from '@/infrastructure/security/Sha256PasswordHasher';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { logger } from '@/infrastructure/logging/logger';
import { ZodError } from 'zod';

export const POST = withLogging(
  withRateLimit({ maxRequests: 10, windowMs: 60000 })(
    async (req: NextRequest) => {
      try {
        // Validate request body
        const body = await validateBody(req, LoginRequestSchema);

        // Dependencies
        const userRepo = new PgUserRepo();
        const tenantRepo = new PgTenantRepo();
        const passwordHasher = new Sha256PasswordHasher();
        const auditWriter = new PgAuditEventWriter();

        // Authenticate user
        const user = await authenticateUser(
          userRepo,
          passwordHasher,
          auditWriter,
          tenantRepo,
          {
            email: body.email,
            password: body.password,
          }
        );

        // Generate JWT
        const token = signJwt({
          userId: user.userId,
          tenantId: user.tenantId,
          scope: user.scope,
          role: user.role,
        });

        // Return token and user info
        return NextResponse.json({
          token,
          user: {
            id: user.userId,
            displayName: user.displayName,
            scope: user.scope,
            role: user.role,
            tenantId: user.tenantId,
          },
        });
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
              { error: 'Authentication failed', message: 'Invalid credentials' },
              { status: 401 }
            );
          }

          if (error.message === 'Account suspended') {
            return NextResponse.json(
              { error: 'Account suspended', message: 'Your account has been suspended. Please contact support.' },
              { status: 403 }
            );
          }

          if (error.message === 'Tenant suspended') {
            return NextResponse.json(
              { error: 'Tenant suspended', message: 'Your organization account has been suspended. Please contact support.' },
              { status: 403 }
            );
          }
        }

        // Internal error (don't expose details)
        // SECURITY: Use logger instead of console.error to avoid exposing stack traces
        logger.error({
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
