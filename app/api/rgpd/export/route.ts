/**
 * POST /api/rgpd/export
 * LOT 5.3 - RGPD Data Export endpoint
 *
 * Request export of all user data (RGPD Art. 15, 20)
 * Returns encrypted bundle with download token
 *
 * RGPD compliance:
 * - User can only export their own data
 * - Export encrypted (AES-256-GCM)
 * - TTL 7 days
 * - Audit event emitted
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withCurrentUser } from '@/middleware/tenant';
import { requireContext } from '@/lib/requestContext';
import { ACTOR_SCOPE } from '@/shared/actorScope';
import { internalError } from '@/lib/errorResponse';
import { exportUserData } from '@/app/usecases/rgpd/exportUserData';
import { PgConsentRepo } from '@/infrastructure/repositories/PgConsentRepo';
import { PgAiJobRepo } from '@/infrastructure/repositories/PgAiJobRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { PgAuditEventReader } from '@/infrastructure/audit/PgAuditEventReader';
import { AesEncryptionService } from '@/infrastructure/crypto/AesEncryptionService';
import { FileExportStorageService } from '@/infrastructure/storage/FileExportStorageService';
import { logger } from '@/infrastructure/logging/logger';

export const POST = withLogging(
  withAuth(
    withCurrentUser(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          // Only TENANT scope users can export their data
          if (context.scope !== ACTOR_SCOPE.TENANT || !context.tenantId) {
            return NextResponse.json(
              { error: 'Forbidden', message: 'Only tenant users can export their data' },
              { status: 403 }
            );
          }

          // Dependencies
          const consentRepo = new PgConsentRepo();
          const aiJobRepo = new PgAiJobRepo();
          const auditWriter = new PgAuditEventWriter();
          const auditEventReader = new PgAuditEventReader();
          const encryptionService = new AesEncryptionService();
          const exportStorage = new FileExportStorageService();

          // Execute export use-case
          const result = await exportUserData(
            consentRepo,
            aiJobRepo,
            auditWriter,
            auditEventReader,
            encryptionService,
            exportStorage,
            {
              tenantId: context.tenantId,
              userId: context.userId,
            }
          );

          // Return export info
          return NextResponse.json({
            exportId: result.exportId,
            downloadToken: result.downloadToken,
            password: result.password,
            expiresAt: result.expiresAt.toISOString(),
            message: 'Export created successfully. Save the password - it will not be shown again.',
          });
        } catch (error) {
          logger.error({
            event: 'rgpd_export_error',
            error: error instanceof Error ? error.message : String(error),
          }, 'POST /api/rgpd/export error');
          return NextResponse.json(
            internalError(),
            { status: 500 }
          );
        }
      }
    )
  )
);
