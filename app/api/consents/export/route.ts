/**
 * Consent Export Endpoint (Tenant-scoped)
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * GET /api/consents/export - Export consent matrix to CSV
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - RGPD-safe: P1/P2 only (NO email, NO prompt content)
 * - Audit event emitted for export action
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdmin } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, tenantContextRequiredError } from '@/lib/errorResponse';
import { ACTOR_SCOPE } from '@/shared/actorScope';

/**
 * UTF-8 BOM for Excel compatibility
 */
const CSV_BOM = '\uFEFF';

/**
 * CSV separator (European standard: semicolon)
 */
const CSV_SEPARATOR = ';';

/**
 * Escape CSV field (handle semicolons, quotes, newlines)
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If value contains separator, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(CSV_SEPARATOR) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/consents/export - Export consent matrix to CSV
 *
 * Returns a CSV file with columns:
 * - User ID
 * - User Name (displayName)
 * - Purpose Label
 * - Status (granted/revoked/pending)
 * - Granted At
 * - Revoked At
 *
 * Note: NO email exported (P2 data minimization)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdmin(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Fetch all purposes for the tenant
          const purposeRepo = new PgPurposeRepo();
          const purposes = await purposeRepo.findAll(context.tenantId, true);

          // Fetch all users in the tenant
          const userRepo = new PgUserRepo();
          const users = await userRepo.listFilteredByTenant({
            tenantId: context.tenantId,
            limit: 10000, // Large limit for export
            offset: 0,
            sortBy: 'name',
            sortOrder: 'asc',
          });

          if (users.length === 0) {
            // Return empty CSV with headers only
            const headers = CSV_BOM + ['User ID', 'User Name', 'Purpose', 'Status', 'Granted At', 'Revoked At'].join(CSV_SEPARATOR) + '\n';
            return new NextResponse(headers, {
              status: 200,
              headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="consents-export-${new Date().toISOString().split('T')[0]}.csv"`,
              },
            });
          }

          // Fetch all consents for these users
          const userIds = users.map(u => u.id);
          const consentsResult = await pool.query(
            `SELECT
               c.user_id,
               c.purpose,
               c.purpose_id,
               c.granted,
               c.granted_at,
               c.revoked_at
             FROM consents c
             WHERE c.tenant_id = $1 AND c.user_id = ANY($2)
             ORDER BY c.user_id, c.purpose`,
            [context.tenantId, userIds]
          );

          // Build lookup: userId -> purposeKey -> consent
          const consentLookup: Map<string, Map<string, {
            granted: boolean;
            grantedAt: Date | null;
            revokedAt: Date | null;
          }>> = new Map();

          for (const row of consentsResult.rows) {
            const userId = row.user_id;
            const purposeKey = row.purpose_id || row.purpose;

            if (!consentLookup.has(userId)) {
              consentLookup.set(userId, new Map());
            }

            const userConsents = consentLookup.get(userId)!;

            // Keep the latest consent per purpose
            if (!userConsents.has(purposeKey)) {
              userConsents.set(purposeKey, {
                granted: row.granted,
                grantedAt: row.granted_at,
                revokedAt: row.revoked_at,
              });
            }
          }

          // Purpose label lookup
          const purposeLabels: Map<string, string> = new Map();
          const defaultLabels: Record<string, string> = {
            'analytics': 'Analytiques',
            'ai_processing': 'Traitement IA',
            'marketing': 'Marketing',
          };

          for (const purpose of purposes) {
            purposeLabels.set(purpose.id, purpose.label);
            purposeLabels.set(purpose.label, purpose.label);
          }

          // Build CSV content
          const csvRows: string[] = [];

          // Header row (semicolon separator for European standard)
          csvRows.push(['User ID', 'User Name', 'Purpose', 'Status', 'Granted At', 'Revoked At'].join(CSV_SEPARATOR));

          // Data rows: one row per user per purpose
          for (const user of users) {
            const userConsents = consentLookup.get(user.id) || new Map();

            for (const purpose of purposes) {
              const consent = userConsents.get(purpose.id) || userConsents.get(purpose.label);

              let status = 'pending';
              let grantedAt = '';
              let revokedAt = '';

              if (consent) {
                if (consent.revokedAt) {
                  status = 'revoked';
                  revokedAt = consent.revokedAt.toISOString();
                } else if (consent.granted) {
                  status = 'granted';
                }
                if (consent.grantedAt) {
                  grantedAt = consent.grantedAt.toISOString();
                }
              }

              const row = [
                escapeCSV(user.id),
                escapeCSV(user.displayName),
                escapeCSV(purpose.label),
                escapeCSV(status),
                escapeCSV(grantedAt),
                escapeCSV(revokedAt),
              ].join(CSV_SEPARATOR);

              csvRows.push(row);
            }

            // Also include any consents with purpose text that don't match configured purposes
            for (const [purposeKey, consent] of userConsents.entries()) {
              // Skip if this is a purpose_id that matches a configured purpose
              if (purposes.some(p => p.id === purposeKey || p.label === purposeKey)) {
                continue;
              }

              let status = 'pending';
              let grantedAt = '';
              let revokedAt = '';

              if (consent.revokedAt) {
                status = 'revoked';
                revokedAt = consent.revokedAt.toISOString();
              } else if (consent.granted) {
                status = 'granted';
              }
              if (consent.grantedAt) {
                grantedAt = consent.grantedAt.toISOString();
              }

              const purposeLabel = purposeLabels.get(purposeKey) || defaultLabels[purposeKey] || purposeKey;

              const row = [
                escapeCSV(user.id),
                escapeCSV(user.displayName),
                escapeCSV(purposeLabel),
                escapeCSV(status),
                escapeCSV(grantedAt),
                escapeCSV(revokedAt),
              ].join(CSV_SEPARATOR);

              csvRows.push(row);
            }
          }

          // Add BOM for Excel compatibility + join rows
          const csvContent = CSV_BOM + csvRows.join('\n');

          // Emit audit event for export
          const auditWriter = new PgAuditEventWriter();
          await auditWriter.write({
            id: crypto.randomUUID(),
            eventName: 'consents.exported',
            actorScope: ACTOR_SCOPE.TENANT,
            actorId: context.userId,
            tenantId: context.tenantId,
          });

          logger.info({
            tenantId: context.tenantId,
            actorId: context.userId,
            userCount: users.length,
            purposeCount: purposes.length,
            rowCount: csvRows.length - 1,
          }, 'Consent matrix exported to CSV');

          const filename = `consents-export-${new Date().toISOString().split('T')[0]}.csv`;

          return new NextResponse(csvContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/consents/export error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
