/**
 * Current User API
 * LOT 1.6 - Email chiffré pour notifications RGPD
 *
 * GET /api/users/me
 * Returns current user profile including decrypted email
 *
 * RGPD Compliance:
 * - User can only see their OWN email (Art. 15 - Droit d'accès)
 * - Email decrypted on-demand, never cached
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext } from '@/lib/requestContext';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, notFoundError } from '@/lib/errorResponse';

/**
 * GET /api/users/me - Get current user profile with email
 *
 * RGPD Art. 15: User has right to access their personal data
 * This endpoint allows user to see their own email address
 */
export const GET = withLogging(
  withAuth(async (req: NextRequest) => {
    try {
      const context = requireContext(req);
      const userId = context.userId;

      if (!userId) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }

      const userRepo = new PgUserRepo();

      // Get user data
      const user = await userRepo.findById(userId);
      if (!user) {
        return NextResponse.json(notFoundError('User'), { status: 404 });
      }

      // Get decrypted email (Art. 15 - User's own data)
      const email = await userRepo.getDecryptedEmail(userId);

      logger.info(
        {
          userId,
          hasEmail: !!email,
        },
        'User accessed their profile (Art. 15)'
      );

      // Return user profile with email
      return NextResponse.json({
        user: {
          id: user.id,
          displayName: user.displayName,
          email: email, // Decrypted email (Art. 15)
          role: user.role,
          scope: user.scope,
          tenantId: user.tenantId,
          createdAt:
            user.createdAt instanceof Date
              ? user.createdAt.toISOString()
              : user.createdAt,
          dataSuspended: user.dataSuspended || false,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'GET /api/users/me error');
      return NextResponse.json(internalError(), { status: 500 });
    }
  })
);
