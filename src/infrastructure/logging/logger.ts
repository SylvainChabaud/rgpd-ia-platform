/**
 * RGPD-Safe Structured Logger
 * LOT 6.1 - Observabilité RGPD-safe
 *
 * SECURITY & RGPD:
 * - NO personal data (P2/P3) in logs (DATA_CLASSIFICATION.md)
 * - Only technical events (P0/P1)
 * - UUIDs and technical IDs only
 * - Structured JSON format
 * - Configurable log levels
 *
 * USAGE:
 *   import { logger } from '@/infrastructure/logging/logger';
 *   logger.info({ event: 'user_login', userId: 'uuid' }, 'User logged in');
 *   logger.error({ event: 'db_error', error: err.message }, 'Database error');
 */

import pino from 'pino';

// Log level from environment (default: info)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Redactor function - removes sensitive fields from logs
 * RGPD Compliance: P2/P3 data MUST NOT appear in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'sessionToken',
  'jwt',
  'email', // P2 - only log hashed or ID
  'name',  // P2 - only log ID
  'prompt', // P2/P3 - NEVER log prompts
  'response', // P2/P3 - NEVER log AI responses
  'payload', // P2/P3 - generic sensitive data
  // Nested fields (wildcard syntax for Pino redact)
  '*.email',
  '*.password',
  '*.token',
  '*.prompt',
  '*.response',
  // User name fields (but NOT error.name which is the error class name - P0)
  'user.name',
  'actor.name',
  'tenant.name',
];

/**
 * Redact sensitive fields recursively
 */
function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Create Pino logger instance
 *
 * Development: Logs to console (pino-pretty) + file (logs/app.log)
 * Production: TODO - Integrate with Loki/Elasticsearch/CloudWatch
 *              Current: Logs to stdout only (captured by container runtime)
 */
export const logger = pino({
  level: LOG_LEVEL,

  // CRITICAL: Redact sensitive fields in ALL environments (RGPD compliance)
  redact: {
    paths: SENSITIVE_FIELDS,
    censor: '[REDACTED]',
  },

  // Production: JSON structured logs (stdout only - TODO: Loki/Elasticsearch)
  // Development: pretty console + file
  ...(NODE_ENV === 'production'
    ? {
        // Production configuration
        // TODO (LOT 11.3 - Production): Replace stdout with Loki/Elasticsearch
        // Options:
        // 1. Grafana Loki: HTTP push API via pino-loki transport
        // 2. Elasticsearch: Bulk API via pino-elasticsearch
        // 3. AWS CloudWatch: pino-cloudwatch transport
        // 4. Keep stdout + centralized log collector (Promtail, Fluentd, Vector)
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development configuration
        // Multi-stream: console (pretty) + file (JSON)
        transport: {
          targets: [
            // Console output (pretty)
            {
              target: 'pino-pretty',
              level: LOG_LEVEL,
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
              },
            },
            // File output (JSON, for /api/logs endpoint)
            // Rotation: daily, max 30 days retention (RGPD compliance)
            {
              target: 'pino-roll',
              level: LOG_LEVEL,
              options: {
                file: 'logs/app.log',
                frequency: 'daily', // Rotate every day at midnight
                size: '10m', // Max 10MB per file (backup limit)
                mkdir: true, // Create logs/ directory if not exists
                // RGPD: Keep max 30 days (DATA_CLASSIFICATION.md §5)
                // Note: pino-roll doesn't auto-delete old files
                // Use: npm run purge:logs (manual) or cron job for cleanup
              },
            },
          ],
        },
      }),

  // Base fields (P0/P1 only)
  base: {
    env: NODE_ENV,
    // NO hostname/pid in production (could be sensitive)
    ...(NODE_ENV === 'development' && {
      pid: process.pid,
    }),
  },
});

/**
 * Create child logger with context
 * RGPD: Only P0/P1 data allowed in context
 *
 * @example
 * const requestLogger = createLogger({ requestId: 'uuid', userId: 'uuid' });
 * requestLogger.info({ event: 'api_call' }, 'API called');
 */
export function createLogger(context: Record<string, unknown>) {
  // Redact any sensitive data from context
  const safeContext = redactSensitiveData(context);
  return logger.child(safeContext as Record<string, unknown>);
}

/**
 * Log levels helper
 */
export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

/**
 * Standard event types (for filtering/monitoring)
 * P0/P1 events only - NO business/user data
 */
export const LogEvent = {
  // Application lifecycle
  APP_START: 'app_start',
  APP_SHUTDOWN: 'app_shutdown',

  // HTTP/API events
  HTTP_REQUEST: 'http_request',
  HTTP_RESPONSE: 'http_response',
  HTTP_ERROR: 'http_error',

  // Database events
  DB_QUERY: 'db_query',
  DB_ERROR: 'db_error',
  DB_CONNECTION: 'db_connection',

  // AI/LLM events
  AI_INVOKE: 'ai_invoke',
  AI_RESPONSE: 'ai_response',
  AI_ERROR: 'ai_error',

  // Authentication/Authorization (IDs only, NO user data)
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_FAILURE: 'auth_failure',
  AUTHZ_DENIED: 'authz_denied',

  // RGPD events (audit trail)
  RGPD_CONSENT_GRANTED: 'rgpd_consent_granted',
  RGPD_CONSENT_REVOKED: 'rgpd_consent_revoked',
  RGPD_EXPORT_REQUESTED: 'rgpd_export_requested',
  RGPD_DELETION_REQUESTED: 'rgpd_deletion_requested',
  RGPD_PURGE_COMPLETED: 'rgpd_purge_completed',

  // Jobs/Background tasks
  JOB_START: 'job_start',
  JOB_COMPLETE: 'job_complete',
  JOB_ERROR: 'job_error',

  // Security events
  SECURITY_VIOLATION: 'security_violation',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',

  // Infrastructure
  HEALTH_CHECK: 'health_check',
  METRICS_EXPORT: 'metrics_export',
} as const;

export type LogEvent = (typeof LogEvent)[keyof typeof LogEvent];

/**
 * Helper: Log with standard event type
 */
export function logEvent(
  event: LogEvent,
  data: Record<string, unknown> = {},
  message?: string
) {
  const safeData = redactSensitiveData({ event, ...data });
  logger.info(safeData, message || event);
}

/**
 * Helper: Log error with standard format
 * RGPD: Only error message + stack, NO user data
 */
export function logError(
  event: LogEvent,
  error: Error,
  context: Record<string, unknown> = {}
) {
  const safeContext = redactSensitiveData(context);
  logger.error(
    {
      event,
      error: {
        message: error.message,
        name: error.name,
        stack: NODE_ENV === 'development' ? error.stack : undefined,
      },
      ...safeContext as Record<string, unknown>,
    },
    `Error: ${error.message}`
  );
}

export default logger;
