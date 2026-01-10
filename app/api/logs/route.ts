/**
 * System Logs API
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * GET /api/logs
 * Read system logs (dev: local file, prod: TODO Loki/Elasticsearch)
 *
 * CRITICAL TODO (Production - LOT 11.3):
 * ===========================================
 * This endpoint MUST be migrated to a centralized log aggregation system in production.
 * Current implementation reads from local files - NOT suitable for distributed systems.
 *
 * Production Migration Options:
 * 1. Grafana Loki (Recommended)
 *    - LogQL queries: {job="api",level="error"} | json
 *    - HTTP API: /loki/api/v1/query_range
 *    - SDK: @grafana/loki
 *    - Docker: grafana/loki + promtail (log collector)
 *
 * 2. Elasticsearch + Kibana
 *    - Query DSL via REST API
 *    - SDK: @elastic/elasticsearch
 *    - Requires ELK stack deployment
 *
 * 3. AWS CloudWatch Logs
 *    - filterLogEvents API
 *    - SDK: @aws-sdk/client-cloudwatch-logs
 *
 * 4. Stdout + External Collector (Simplest)
 *    - Keep logger writing to stdout
 *    - Deploy Promtail/Fluentd/Vector as sidecar
 *    - Query via Loki/Elasticsearch
 *
 * Migration Steps:
 * - [ ] Deploy log aggregation system (Loki/ELK)
 * - [ ] Configure log collector (Promtail/Fluentd)
 * - [ ] Update this endpoint to query log system API
 * - [ ] Add tenant filtering for multi-tenant isolation
 * - [ ] Update logger.ts to remove pino/file in production
 * - [ ] Enable at-rest encryption (volume-level or Loki native)
 * - [ ] Configure log retention policy (30 days for P1, per DATA_CLASSIFICATION.md)
 * - [ ] Test log retention and automatic purge
 * - [ ] Verify no P2/P3 data in logs (audit sample)
 *
 * RGPD Compliance:
 * - No sensitive user data in logs (enforced by EPIC 1.3)
 * - Only P0/P1 data: UUIDs, event types, timestamps (DATA_CLASSIFICATION.md)
 * - Filtering by level, date, tenant
 * - Pagination enforced (max 100 lines)
 * - Log retention: 30 days for P1 (DATA_CLASSIFICATION.md §5)
 * - Encryption at rest: volume-level or Loki native (not app-level)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError, validationError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';
import { readFile, readdir, stat, unlink } from 'fs/promises';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const QuerySchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Parse log files and filter by level
 *
 * DEVELOPMENT ONLY - Read from local files (logs/*.log)
 *
 * Note: pino-roll creates numbered files (app.log, app.1.log, app.2.log, etc.)
 * We read ALL .log files and merge them, sorted by timestamp (most recent first)
 *
 * TODO (Production - LOT 11.3): Replace with Loki/Elasticsearch query
 * Example Loki query:
 *   const response = await fetch('http://loki:3100/loki/api/v1/query_range', {
 *     method: 'POST',
 *     body: JSON.stringify({
 *       query: `{job="api",level="${filters.level}"} | json`,
 *       limit: filters.limit,
 *       start: filters.startTime,
 *       end: filters.endTime,
 *     })
 *   });
 *
 * See: https://grafana.com/docs/loki/latest/api/
 */
async function readLogsFromFile(filters: {
  level?: string;
  limit: number;
  offset: number;
}): Promise<Array<{
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}>> {
  const logDir = join(process.cwd(), 'logs');

  // Check if log directory exists (dev mode)
  if (!existsSync(logDir)) {
    return [];
  }

  try {
    // Read ALL .log files (app.log, app.1.log, app.2.log, etc.)
    const files = await readdir(logDir);
    const logFiles = files.filter(f => f.endsWith('.log')).sort();

    let allLogs: Array<{
      timestamp: string;
      level: string;
      message: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Read and parse each log file
    for (const file of logFiles) {
      const filePath = join(logDir, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        // Parse JSON logs (pino format)
        const logs = lines
          .map(line => {
            try {
              const parsed = JSON.parse(line);
              return {
                timestamp: new Date(parsed.time).toISOString(),
                level: parsed.level === 50 ? 'error' : parsed.level === 40 ? 'warn' : parsed.level === 30 ? 'info' : 'debug',
                message: parsed.msg || '',
                metadata: parsed.metadata || {},
              };
            } catch {
              return null;
            }
          })
          .filter((log): log is NonNullable<typeof log> => log !== null);

        allLogs = allLogs.concat(logs);
      } catch (error) {
        logger.error({ file, error }, 'Failed to read log file');
      }
    }

    // Sort by timestamp (most recent first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter by level
    let filtered = allLogs;
    if (filters.level) {
      filtered = allLogs.filter(log => log.level === filters.level);
    }

    // Pagination
    const paginated = filtered.slice(filters.offset, filters.offset + filters.limit);

    return paginated;
  } catch (error) {
    logger.error({ error }, 'Failed to read log files');
    return [];
  }
}

/**
 * GET /api/logs - Read system logs
 *
 * Query params:
 * - level: error | warn | info | debug (optional)
 * - limit: max records (default: 50, max: 100)
 * - offset: pagination offset (default: 0)
 *
 * SECURITY: PLATFORM admin only
 *
 * TODO (Production):
 * - Integrate Grafana Loki for log aggregation
 * - Query via LogQL: {job="api"} |= "error" | json
 * - Alternative: Elasticsearch query DSL
 * - Add tenant filtering for multi-tenant logs
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        if (!isPlatformAdmin(context)) {
          return NextResponse.json(
            forbiddenError('PLATFORM admin access required'),
            { status: 403 }
          );
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const params = Object.fromEntries(searchParams.entries());

        let query;
        try {
          query = QuerySchema.parse(params);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            return NextResponse.json(validationError(error.issues), { status: 400 });
          }
          return NextResponse.json(validationError({}), { status: 400 });
        }

        // DEVELOPMENT: Read from local file
        // TODO (Production - LOT 11.3): Replace with Loki/Elasticsearch query
        // For production, check NODE_ENV and call appropriate log aggregation API
        const logs = await readLogsFromFile({
          level: query.level,
          limit: query.limit,
          offset: query.offset,
        });

        logger.info(
          {
            actorId: context.userId,
            count: logs.length,
            level: query.level || 'all',
          },
          'System logs fetched'
        );

        return NextResponse.json({
          logs,
          pagination: {
            limit: query.limit,
            offset: query.offset,
            hasMore: logs.length === query.limit,
          },
          environment: process.env.NODE_ENV || 'development',
          note: process.env.NODE_ENV === 'production'
            ? 'TODO: Integrate Loki/Elasticsearch for production logs'
            : 'Reading from local log file (dev mode)',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/logs error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);

/**
 * Get log statistics for RGPD compliance monitoring
 */
async function getLogStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  oldestFileAge: number | null;
  rgpdCompliant: boolean;
}> {
  const logDir = join(process.cwd(), 'logs');

  if (!existsSync(logDir)) {
    return { totalFiles: 0, totalSize: 0, oldestFileAge: null, rgpdCompliant: true };
  }

  try {
    const files = readdirSync(logDir).filter(f => f.endsWith('.log'));

    if (files.length === 0) {
      return { totalFiles: 0, totalSize: 0, oldestFileAge: null, rgpdCompliant: true };
    }

    let totalSize = 0;
    let oldestTime = Date.now();

    for (const file of files) {
      const filePath = join(logDir, file);
      const stats = statSync(filePath);
      totalSize += stats.size;
      if (stats.mtimeMs < oldestTime) {
        oldestTime = stats.mtimeMs;
      }
    }

    const oldestFileAge = Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60 * 24));
    const rgpdCompliant = oldestFileAge <= 30;

    return { totalFiles: files.length, totalSize, oldestFileAge, rgpdCompliant };
  } catch {
    return { totalFiles: 0, totalSize: 0, oldestFileAge: null, rgpdCompliant: true };
  }
}

/**
 * Purge old log files (> 30 days)
 */
async function purgeOldLogs(): Promise<{ deletedCount: number; deletedSize: number }> {
  const logDir = join(process.cwd(), 'logs');

  if (!existsSync(logDir)) {
    return { deletedCount: 0, deletedSize: 0 };
  }

  const files = await readdir(logDir);
  const logFiles = files.filter(f => f.endsWith('.log'));

  const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
  let deletedCount = 0;
  let deletedSize = 0;

  for (const file of logFiles) {
    const filePath = join(logDir, file);
    try {
      const stats = await stat(filePath);
      if (stats.mtimeMs < cutoffTime) {
        deletedSize += stats.size;
        await unlink(filePath);
        deletedCount++;
        logger.info({ file, size: stats.size }, 'Log file purged (RGPD compliance)');
      }
    } catch (error) {
      logger.error({ file, error }, 'Failed to purge log file');
    }
  }

  return { deletedCount, deletedSize };
}

/**
 * DELETE /api/logs - Purge old logs (RGPD compliance)
 *
 * SECURITY: PLATFORM admin only
 * RGPD: Deletes logs older than 30 days (DATA_CLASSIFICATION.md)
 * Audit: Logs the purge action with actor ID
 */
export const DELETE = withLogging(
  withAuth(
    async (req: NextRequest) => {
      try {
        const context = requireContext(req);

        if (!isPlatformAdmin(context)) {
          return NextResponse.json(
            forbiddenError('PLATFORM admin access required'),
            { status: 403 }
          );
        }

        // Get stats before purge
        const statsBefore = await getLogStats();

        // Purge old logs
        const { deletedCount, deletedSize } = await purgeOldLogs();

        // Get stats after purge
        const statsAfter = await getLogStats();

        // Audit log
        logger.info(
          {
            actorId: context.userId,
            deletedCount,
            deletedSize,
            before: statsBefore,
            after: statsAfter,
          },
          'Logs purged (RGPD compliance)'
        );

        return NextResponse.json({
          success: true,
          deletedCount,
          deletedSize: (deletedSize / 1024).toFixed(2) + ' KB',
          before: statsBefore,
          after: statsAfter,
          message: deletedCount > 0
            ? `${deletedCount} fichier(s) de logs purgé(s) avec succès`
            : 'Aucun fichier de logs ancien à purger',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'DELETE /api/logs error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
