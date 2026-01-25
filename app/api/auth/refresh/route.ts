/**
 * POST /api/auth/refresh
 * LOT 5.3 - Token refresh endpoint
 *
 * Refreshes access token using refresh token from httpOnly cookie
 *
 * SECURITY:
 * - Refresh token in httpOnly cookie (XSS-safe)
 * - New access token returned in httpOnly cookie
 * - Refresh token also rotated (sliding window)
 *
 * RGPD compliance:
 * - JWT contains only P1 data (userId, tenantId, scope, role)
 * - No sensitive data logged
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { verifyJwt, signJwt, signRefreshToken, TOKEN_EXPIRATION } from '@/lib/jwt';
import { unauthorizedError } from '@/lib/errorResponse';
import { logger } from '@/infrastructure/logging/logger';
import { AUTH_COOKIES, REFRESH_TOKEN_PATH } from '@/shared/auth/constants';

export const POST = withLogging(
  async (req: NextRequest) => {
    try {
      // Get refresh token from httpOnly cookie
      const refreshToken = req.cookies.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

      if (!refreshToken) {
        return NextResponse.json(
          unauthorizedError('No refresh token'),
          { status: 401 }
        );
      }

      // Verify refresh token
      let payload;
      try {
        payload = verifyJwt(refreshToken);
      } catch {
        // Invalid or expired refresh token - user must login again
        const response = NextResponse.json(
          unauthorizedError('Invalid refresh token'),
          { status: 401 }
        );
        // Clear both cookies
        response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, '', { maxAge: 0, path: '/' });
        response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, '', { maxAge: 0, path: REFRESH_TOKEN_PATH });
        return response;
      }

      // Generate new access token (preserve cguAccepted for Art. 7 RGPD compliance)
      const newAccessToken = signJwt({
        userId: payload.userId,
        tenantId: payload.tenantId,
        scope: payload.scope,
        role: payload.role,
        cguAccepted: payload.cguAccepted,
      });

      // Rotate refresh token (sliding window pattern, preserve cguAccepted)
      const newRefreshToken = signRefreshToken({
        userId: payload.userId,
        tenantId: payload.tenantId,
        scope: payload.scope,
        role: payload.role,
        cguAccepted: payload.cguAccepted,
      });

      // Create response
      const response = NextResponse.json({
        message: 'Token refreshed',
        user: {
          id: payload.userId,
          scope: payload.scope,
          role: payload.role,
          tenantId: payload.tenantId,
        },
      });

      // Set new access token cookie
      response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS,
      });

      // Set new refresh token cookie (rotation)
      response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: REFRESH_TOKEN_PATH,
        maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS,
      });

      return response;
    } catch (error) {
      logger.error({
        event: 'auth.refresh.error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Token refresh error');

      return NextResponse.json(
        unauthorizedError('Token refresh failed'),
        { status: 401 }
      );
    }
  }
);
