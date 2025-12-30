/**
 * GET /api/auth/me
 * LOT 5.3 - Get current user info
 *
 * Returns current authenticated user information
 * Requires valid JWT token
 *
 * RGPD compliance:
 * - Returns only P1/P2 data (no sensitive data)
 * - Email hash NOT exposed (only displayName)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { internalError } from '@/lib/errorResponse';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';

export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        // Fetch full user info from database
        const userRepo = new PgUserRepo();
        const user = await userRepo.findById(context.userId);

        if (!user) {
          return NextResponse.json(
            { error: 'Not found', message: 'User not found' },
            { status: 404 }
          );
        }

        // Return user info (P1/P2 data only)
        return NextResponse.json({
          user: {
            id: user.id,
            displayName: user.displayName,
            scope: user.scope,
            role: user.role,
            tenantId: user.tenantId,
            createdAt: user.createdAt.toISOString(),
          },
        });
      } catch (error) {
        console.error('GET /api/auth/me error:', error);
        return NextResponse.json(
          internalError(),
          { status: 500 }
        );
      }
    }
  )
);
