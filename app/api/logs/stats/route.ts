/**
 * System Logs Statistics API
 * LOT 11.3 - RGPD Compliance Monitoring
 *
 * GET /api/logs/stats
 * Returns log file statistics for RGPD compliance dashboard
 *
 * SECURITY: PLATFORM admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { requireContext, isPlatformAdmin } from '@/lib/requestContext';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, forbiddenError } from '@/lib/errorResponse';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Get log statistics for RGPD compliance monitoring
 */
function getLogStats(): {
  totalFiles: number;
  totalSize: number;
  oldestFileAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
} {
  const logDir = join(process.cwd(), 'logs');

  if (!existsSync(logDir)) {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFileAge: null,
      rgpdCompliant: true,
      warning: null,
    };
  }

  try {
    const allFiles = readdirSync(logDir);
    const files = allFiles.filter(f => f.endsWith('.log'));

    // Info logging (visible with LOG_LEVEL=info)
    logger.info({ logDir, allFiles, logFiles: files, fileCount: files.length }, 'Log stats - scanning directory');

    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFileAge: null,
        rgpdCompliant: true,
        warning: null,
      };
    }

    let totalSize = 0;
    let oldestTime = Date.now();
    let successfulFiles = 0;

    for (const file of files) {
      try {
        const filePath = join(logDir, file);
        const stats = statSync(filePath);
        totalSize += stats.size;
        successfulFiles++;
        if (stats.mtimeMs < oldestTime) {
          oldestTime = stats.mtimeMs;
        }
      } catch (fileError) {
        // Ignore individual file errors (e.g., EPERM on locked files)
        logger.warn({ file, error: fileError instanceof Error ? fileError.message : String(fileError) }, 'Failed to stat log file (file may be locked)');
      }
    }

    // If no files could be read, return empty stats
    if (successfulFiles === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFileAge: null,
        rgpdCompliant: true,
        warning: null,
      };
    }

    const oldestFileAge = Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60 * 24));
    const rgpdCompliant = oldestFileAge <= 30;

    let warning = null;
    if (!rgpdCompliant) {
      warning = `Les logs dépassent la politique de rétention de 30 jours (plus ancien: ${oldestFileAge} jours). Purge requise pour conformité RGPD.`;
    }

    return { totalFiles: successfulFiles, totalSize, oldestFileAge, rgpdCompliant, warning };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), logDir }, 'Failed to read log stats');
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFileAge: null,
      rgpdCompliant: true,
      warning: null,
    };
  }
}

/**
 * GET /api/logs/stats - Get log statistics
 *
 * Returns:
 * - totalFiles: number of log files
 * - totalSize: total size in bytes
 * - oldestFileAge: age of oldest file in days
 * - rgpdCompliant: true if all logs <= 30 days
 * - warning: message if non-compliant
 */
export const GET = withLogging(
  withAuth(
    async (req: NextRequest) => {
      logger.info('GET /api/logs/stats - endpoint called');

      try {
        const context = requireContext(req);

        logger.info({ userId: context.userId, role: context.role }, 'Auth context');

        if (!isPlatformAdmin(context)) {
          logger.warn({ userId: context.userId, role: context.role }, 'Access denied - not PLATFORM admin');
          return NextResponse.json(
            forbiddenError('PLATFORM admin access required'),
            { status: 403 }
          );
        }

        const stats = getLogStats();

        logger.info(
          {
            actorId: context.userId,
            rgpdCompliant: stats.rgpdCompliant,
          },
          'Log statistics fetched'
        );

        return NextResponse.json({
          ...stats,
          totalSizeFormatted: (stats.totalSize / 1024).toFixed(2) + ' KB',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage }, 'GET /api/logs/stats error');
        return NextResponse.json(internalError(), { status: 500 });
      }
    }
  )
);
