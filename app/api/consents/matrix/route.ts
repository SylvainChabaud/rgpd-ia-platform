/**
 * Consent Matrix Endpoint (Tenant-scoped)
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * GET /api/consents/matrix - Get users x purposes consent matrix
 *
 * RGPD compliance:
 * - Tenant admin only
 * - Tenant isolation enforced
 * - Only P1/P2 metadata (user displayName, purpose label, consent status)
 * - NO email displayed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/infrastructure/logging/middleware';
import { withAuth } from '@/middleware/auth';
import { withTenantAdminOrDpo } from '@/middleware/rbac';
import { requireContext } from '@/lib/requestContext';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgUserRepo } from '@/infrastructure/repositories/PgUserRepo';
import { pool } from '@/infrastructure/db/pg';
import { logger } from '@/infrastructure/logging/logger';
import { internalError, validationError, tenantContextRequiredError } from '@/lib/errorResponse';
import { z, ZodError } from 'zod';

/**
 * Schema for matrix query params
 * Note: limit max is 1000 to support stats aggregation on hub page
 */
const MatrixQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().max(100).optional(),
  purposeId: z.string().uuid().optional(),
  status: z.enum(['granted', 'revoked', 'pending', 'all']).default('all'),
});

type ConsentStatus = 'granted' | 'revoked' | 'pending';

interface ConsentCell {
  purposeId: string;
  status: ConsentStatus;
  grantedAt: string | null;
  revokedAt: string | null;
}

interface MatrixRow {
  userId: string;
  displayName: string;
  consents: ConsentCell[];
}

/**
 * GET /api/consents/matrix - Get users x purposes consent matrix
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - search: string (search in user displayName)
 * - purposeId: string (filter by specific purpose)
 * - status: 'granted' | 'revoked' | 'pending' | 'all' (filter by consent status)
 */
export const GET = withLogging(
  withAuth(
    withTenantAdminOrDpo(
      async (req: NextRequest) => {
        try {
          const context = requireContext(req);

          if (!context.tenantId) {
            return NextResponse.json(tenantContextRequiredError(), { status: 403 });
          }

          // Parse query params
          const searchParams = req.nextUrl.searchParams;
          let query: z.infer<typeof MatrixQuerySchema>;
          try {
            query = MatrixQuerySchema.parse({
              limit: searchParams.get('limit') || undefined,
              offset: searchParams.get('offset') || undefined,
              search: searchParams.get('search') || undefined,
              purposeId: searchParams.get('purposeId') || undefined,
              status: searchParams.get('status') || undefined,
            });
          } catch (error: unknown) {
            if (error instanceof ZodError) {
              return NextResponse.json(validationError(error.issues), { status: 400 });
            }
            return NextResponse.json(validationError({}), { status: 400 });
          }

          // Fetch all active purposes for the tenant
          const purposeRepo = new PgPurposeRepo();
          let purposes = await purposeRepo.findAll(context.tenantId, true); // Include inactive for complete view

          // Filter by purposeId if specified
          if (query.purposeId) {
            purposes = purposes.filter(p => p.id === query.purposeId);
          }

          // Fetch users with pagination and search
          const userRepo = new PgUserRepo();
          const users = await userRepo.listFilteredByTenant({
            tenantId: context.tenantId,
            limit: query.limit,
            offset: query.offset,
            search: query.search,
            sortBy: 'name',
            sortOrder: 'asc',
          });

          const totalUsers = await userRepo.countByTenant({
            tenantId: context.tenantId,
            search: query.search,
          });

          if (users.length === 0) {
            return NextResponse.json({
              purposes: purposes.map(p => ({
                id: p.id,
                label: p.label,
                description: p.description,
                isRequired: p.isRequired,
                isActive: p.isActive,
              })),
              matrix: [],
              total: 0,
              limit: query.limit,
              offset: query.offset,
            });
          }

          // Build consent lookup map
          // Query all consents for these users in one go
          const userIds = users.map(u => u.id);
          const consentsResult = await pool.query(
            `SELECT
               c.user_id,
               c.purpose,
               c.purpose_id,
               c.granted,
               c.granted_at,
               c.revoked_at,
               c.created_at
             FROM consents c
             WHERE c.tenant_id = $1 AND c.user_id = ANY($2)
             ORDER BY c.created_at DESC`,
            [context.tenantId, userIds]
          );

          // Build lookup: userId -> purpose -> consent (latest)
          const consentLookup: Map<string, Map<string, ConsentCell>> = new Map();

          for (const row of consentsResult.rows) {
            const userId = row.user_id;
            // Use purpose_id if available, otherwise use purpose text as key
            const purposeKey = row.purpose_id || row.purpose;

            if (!consentLookup.has(userId)) {
              consentLookup.set(userId, new Map());
            }

            const userConsents = consentLookup.get(userId)!;

            // Only keep the latest consent per purpose
            if (!userConsents.has(purposeKey)) {
              let status: ConsentStatus = 'pending';
              if (row.revoked_at) {
                status = 'revoked';
              } else if (row.granted) {
                status = 'granted';
              }

              userConsents.set(purposeKey, {
                purposeId: row.purpose_id || row.purpose,
                status,
                grantedAt: row.granted_at?.toISOString() || null,
                revokedAt: row.revoked_at?.toISOString() || null,
              });
            }
          }

          // Build matrix rows
          const matrix: MatrixRow[] = [];

          for (const user of users) {
            const userConsents = consentLookup.get(user.id) || new Map<string, ConsentCell>();

            const consents: ConsentCell[] = purposes.map(purpose => {
              // Check by purpose_id first, then by label
              const consent = userConsents.get(purpose.id) || userConsents.get(purpose.label);

              if (consent) {
                return {
                  purposeId: purpose.id,
                  status: consent.status,
                  grantedAt: consent.grantedAt,
                  revokedAt: consent.revokedAt,
                };
              }

              // No consent record = pending
              return {
                purposeId: purpose.id,
                status: 'pending' as ConsentStatus,
                grantedAt: null,
                revokedAt: null,
              };
            });

            // Apply status filter if not 'all'
            if (query.status !== 'all') {
              const hasMatchingStatus = consents.some(c => c.status === query.status);
              if (!hasMatchingStatus) {
                continue; // Skip this user if no matching consent status
              }
            }

            matrix.push({
              userId: user.id,
              displayName: user.displayName,
              consents,
            });
          }

          logger.info({
            tenantId: context.tenantId,
            userCount: matrix.length,
            purposeCount: purposes.length,
            filters: {
              search: query.search ? '[REDACTED]' : undefined,
              purposeId: query.purposeId,
              status: query.status,
            },
          }, 'Consent matrix fetched');

          return NextResponse.json({
            purposes: purposes.map(p => ({
              id: p.id,
              label: p.label,
              description: p.description,
              isRequired: p.isRequired,
              isActive: p.isActive,
            })),
            matrix,
            total: totalUsers,
            limit: query.limit,
            offset: query.offset,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ error: errorMessage }, 'GET /api/consents/matrix error');
          return NextResponse.json(internalError(), { status: 500 });
        }
      }
    )
  )
);
