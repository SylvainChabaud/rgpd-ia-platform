/**
 * Next.js Middleware
 * LOT 5.3 - API Layer
 *
 * CORS Configuration
 * Handles CORS headers and preflight requests for API routes
 *
 * SECURITY:
 * - Only allow configured origins
 * - Handle OPTIONS preflight requests
 * - Restrict allowed methods and headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Get allowed origins from environment variable
  // Default to localhost:3000 for development
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  const response = NextResponse.next();

  // Set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: '/api/:path*',
};
