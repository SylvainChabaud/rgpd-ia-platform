/**
 * HTTP Logging Middleware - RGPD-Safe
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * RGPD COMPLIANCE:
 * - NO request body logging (may contain P2/P3 data)
 * - NO query params logging (may contain sensitive filters)
 * - Only: method, path, status, duration, requestId
 * - IP anonymization (last octet masked)
 *
 * USAGE:
 *   import { withLogging } from '@/infrastructure/logging/middleware';
 *   export const GET = withLogging(async (req) => { ... });
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger, LogEvent } from './logger';
import { randomUUID } from 'crypto';

/**
 * Anonymize IP address (RGPD requirement)
 * Example: 192.168.1.123 → 192.168.1.0
 */
function anonymizeIP(ip: string | null): string {
  if (!ip) return 'unknown';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }

  // IPv6 - mask last 64 bits
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  }

  return 'unknown';
}

/**
 * Extract safe request metadata (P0/P1 only)
 */
function extractRequestMetadata(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

  return {
    method: req.method,
    path: req.nextUrl.pathname,
    // Anonymize IP (RGPD requirement)
    ip: anonymizeIP(ip),
    userAgent: req.headers.get('user-agent') || 'unknown',
    // NO query params (may contain sensitive data)
    // NO body (may contain P2/P3 data)
  };
}

/**
 * HTTP Logging Middleware
 * Wraps API route handlers with automatic logging
 *
 * @example
 * export const GET = withLogging(async (req) => {
 *   return NextResponse.json({ data: 'example' });
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withLogging<T extends NextHandler>(
  handler: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (req: NextRequest, context?: any) => {
    const requestId = randomUUID();
    const startTime = Date.now();

    // Create request-scoped logger
    const requestLogger = createLogger({
      requestId,
      ...extractRequestMetadata(req),
    });

    // Log request start
    requestLogger.info(
      { event: LogEvent.HTTP_REQUEST },
      `${req.method} ${req.nextUrl.pathname}`
    );

    try {
      // Execute handler
      const response = await handler(req, context);

      // Log response
      const duration = Date.now() - startTime;
      requestLogger.info(
        {
          event: LogEvent.HTTP_RESPONSE,
          status: response.status,
          duration,
        },
        `${req.method} ${req.nextUrl.pathname} - ${response.status} (${duration}ms)`
      );

      // Add request ID to response headers (for tracing)
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error: unknown) {
      // Log error
      const duration = Date.now() - startTime;
      const errorInfo = error instanceof Error
        ? { message: error.message, name: error.name }
        : { message: 'Unknown error', name: 'Error' };

      requestLogger.error(
        {
          event: LogEvent.HTTP_ERROR,
          error: errorInfo,
          duration,
        },
        `${req.method} ${req.nextUrl.pathname} - ERROR (${duration}ms)`
      );

      // Re-throw to be handled by error boundary
      throw error;
    }
  }) as T;
}

/**
 * Middleware for Next.js middleware.ts
 * Use this in middleware.ts for global logging
 */
export function loggingMiddleware(req: NextRequest) {
  const requestId = randomUUID();
  const requestLogger = createLogger({
    requestId,
    ...extractRequestMetadata(req),
  });

  requestLogger.debug(
    { event: LogEvent.HTTP_REQUEST },
    `${req.method} ${req.nextUrl.pathname}`
  );

  // Continue to next middleware/handler
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export default withLogging;
