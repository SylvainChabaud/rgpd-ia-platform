import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgRgpdRequestRepo } from '@/infrastructure/repositories/PgRgpdRequestRepo';
import { logger } from '@/infrastructure/logging/logger';

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
  if (str.includes(CSV_SEPARATOR) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/tenants/:id/rgpd/csv
 * LOT 12.3 - Tenant Admin: export RGPD requests as CSV
 *
 * RGPD compliance:
 * - Tenant isolation enforced
 * - P1 data only (IDs, dates, status - no email, no content)
 * - CSV is RGPD-safe for audit purposes
 * - Audit event emitted
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // RBAC: Only TENANT_ADMIN, DPO, or SUPERADMIN can access
    const hasPermission = requirePermission(
      authResult.user,
      ['rgpd:csv:export'],
      { allowedRoles: [ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.DPO, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (
      authResult.user.role === ACTOR_ROLE.TENANT_ADMIN &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined; // 'exports', 'deletions', or undefined for all
    const status = searchParams.get('status') || undefined;

    // Fetch all requests (no pagination for CSV export)
    const rgpdRequestRepo = new PgRgpdRequestRepo();
    const { requests } = await rgpdRequestRepo.findByTenant(tenantId, {
      limit: 10000, // Reasonable max for CSV export
      offset: 0,
      type: type === 'exports' ? 'EXPORT' : type === 'deletions' ? 'DELETE' : undefined,
      status,
    });

    // Generate CSV content (P1 data only - RGPD-safe)
    // European standard: semicolon separator + UTF-8 BOM for Excel
    const csvHeader = ['ID', 'Type', 'User ID', 'Status', 'Created At', 'Scheduled Purge At', 'Completed At'].join(CSV_SEPARATOR);
    const csvRows = requests.map((req) => {
      return [
        escapeCSV(req.id),
        escapeCSV(req.type),
        escapeCSV(req.userId),
        escapeCSV(req.status),
        escapeCSV(req.createdAt.toISOString()),
        escapeCSV(req.scheduledPurgeAt?.toISOString()),
        escapeCSV(req.completedAt?.toISOString()),
      ].join(CSV_SEPARATOR);
    });

    const csvContent = CSV_BOM + [csvHeader, ...csvRows].join('\n');

    // Log audit event
    logger.info({
      event: 'rgpd.csv.exported',
      tenantId,
      actorId: authResult.user.id,
      count: requests.length,
      type: type || 'all',
    }, 'Tenant admin exported RGPD requests as CSV');

    // Return CSV file
    const filename = `rgpd-requests-${tenantId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error({
      event: 'rgpd.csv.export_error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/rgpd/csv error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
