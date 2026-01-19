import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgPurposeRepo } from '@/infrastructure/repositories/PgPurposeRepo';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import {
  buildRegistreEntry,
  toRegistreCsvRow,
  getLawfulBasisLabel,
  getCategoryLabel,
  type RegistreEntry,
  PURPOSE_CATEGORY,
  LAWFUL_BASIS,
} from '@/domain/dpia';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/registre/export
 * LOT 12.4 - DPO: Export Registre Art. 30 (CSV or PDF)
 *
 * RGPD compliance:
 * - Art. 30: Registre documentation for CNIL
 * - Art. 38.3: DPO access required
 * - Tenant isolation enforced
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

    // RBAC: DPO, TENANT_ADMIN, or SUPERADMIN
    const hasPermission = requirePermission(
      authResult.user,
      ['registre:export'],
      { allowedRoles: [ACTOR_ROLE.DPO, ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.SUPERADMIN] }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: DPO or Admin role required' },
        { status: 403 }
      );
    }

    // CRITICAL: Tenant isolation
    if (
      (authResult.user.role === ACTOR_ROLE.TENANT_ADMIN || authResult.user.role === ACTOR_ROLE.DPO) &&
      authResult.user.tenantId !== tenantId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Tenant mismatch' },
        { status: 403 }
      );
    }

    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Fetch purposes for tenant
    const purposeRepo = new PgPurposeRepo();
    const dpiaRepo = new PgDpiaRepo();

    const purposes = await purposeRepo.findAll(tenantId, true);
    const dpias = await dpiaRepo.findAllWithPurposeInfo(tenantId);

    // Build registre entries
    const registreEntries: RegistreEntry[] = purposes.map((purpose) => {
      const dpia = dpias.find((d) => d.purposeId === purpose.id);

      return buildRegistreEntry({
        tenantId,
        purposeId: purpose.id,
        purposeName: purpose.label,
        purposeDescription: purpose.description,
        category: mapPurposeCategory(purpose.category),
        lawfulBasis: mapLawfulBasis(purpose.lawfulBasis),
        riskLevel: mapRiskLevel(purpose.riskLevel),
        dataClassification: mapDataClass(purpose.maxDataClass),
        requiresDpia: purpose.requiresDpia,
        isActive: purpose.isActive,
        activatedAt: purpose.isActive ? purpose.createdAt : null,
        createdAt: purpose.createdAt,
        updatedAt: purpose.updatedAt,
        dpiaId: dpia?.id,
        dpiaStatus: dpia?.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
      });
    });

    // Audit log (P1 data only)
    logger.info({
      event: 'registre.exported',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      format,
      count: registreEntries.length,
    }, 'DPO exported Registre Art. 30');

    if (format === 'csv') {
      return generateCsvResponse(registreEntries, tenantId);
    } else {
      return generatePdfResponse(registreEntries, tenantId);
    }
  } catch (error) {
    logger.error({
      event: 'registre.export.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/registre/export error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateCsvResponse(entries: RegistreEntry[], tenantId: string): NextResponse {
  // Convert entries to CSV rows
  const csvRows = entries.map(toRegistreCsvRow);

  // Get headers from first row
  const headers = csvRows.length > 0 ? Object.keys(csvRows[0]) : [];

  // Build CSV content
  const csvLines = [
    headers.join(';'),
    ...csvRows.map((row) =>
      headers.map((h) => `"${(row[h] || '').replace(/"/g, '""')}"`).join(';')
    ),
  ];

  const csvContent = '\uFEFF' + csvLines.join('\n'); // BOM for Excel compatibility
  const filename = `registre-art30-${tenantId}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function generatePdfResponse(entries: RegistreEntry[], tenantId: string): NextResponse {
  const entriesHtml = entries.map((entry, index) => `
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;">${index + 1}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;"><strong>${escapeHtml(entry.purposeName)}</strong></td>
      <td style="border:1px solid #e5e7eb;padding:8px;">${getCategoryLabel(entry.category)}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;">${getLawfulBasisLabel(entry.lawfulBasis)}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${entry.dataClassification}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${getRiskBadge(entry.riskLevel)}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${entry.isActive ? '✓' : '✗'}</td>
      <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${entry.dpiaStatus || 'N/A'}</td>
    </tr>
  `).join('');

  const pdfContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registre des Traitements - Art. 30 RGPD</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 40px; font-size: 12px; }
    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { margin-bottom: 20px; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .meta p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
    th { background: #1f2937; color: white; border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; }
    @media print {
      body { padding: 10px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Registre des Activites de Traitement</h1>
    <p style="color:#6b7280;">Article 30 du Reglement General sur la Protection des Donnees (RGPD)</p>
  </div>

  <div class="meta">
    <p><strong>Tenant ID:</strong> ${escapeHtml(tenantId)}</p>
    <p><strong>Date de generation:</strong> ${formatDate(new Date())}</p>
    <p><strong>Nombre de traitements:</strong> ${entries.length}</p>
    <p><strong>Traitements actifs:</strong> ${entries.filter(e => e.isActive).length}</p>
  </div>

  <h2>Liste des Traitements</h2>
  <table>
    <thead>
      <tr>
        <th style="width:3%">#</th>
        <th style="width:20%">Finalite</th>
        <th style="width:12%">Categorie</th>
        <th style="width:18%">Base legale</th>
        <th style="width:8%">Donnees</th>
        <th style="width:10%">Risque</th>
        <th style="width:7%">Actif</th>
        <th style="width:10%">DPIA</th>
      </tr>
    </thead>
    <tbody>
      ${entriesHtml}
    </tbody>
  </table>

  <h2>Informations Complementaires</h2>
  <table>
    <tr>
      <th>Responsable du traitement</th>
      <td>Voir coordonnees tenant</td>
    </tr>
    <tr>
      <th>DPO</th>
      <td>Designe au niveau tenant</td>
    </tr>
    <tr>
      <th>Mesures de securite</th>
      <td>Chiffrement AES-256-GCM, TLS 1.3, RLS PostgreSQL, Audit logging</td>
    </tr>
    <tr>
      <th>Transferts hors UE</th>
      <td>Non (traitement UE uniquement)</td>
    </tr>
  </table>

  <div class="footer">
    <p><strong>Document genere le:</strong> ${formatDate(new Date())}</p>
    <p><strong>Reference RGPD:</strong> Article 30 - Registre des activites de traitement</p>
    <p><strong>Plateforme:</strong> RGPD IA Platform - LOT 12.4</p>
    <p style="margin-top:10px;"><em>Ce document est destine a la documentation RGPD et peut etre presente lors d'un controle CNIL.</em></p>
  </div>
</body>
</html>`;

  const filename = `registre-art30-${tenantId}-${new Date().toISOString().split('T')[0]}.html`;

  return new NextResponse(pdfContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function getRiskBadge(riskLevel: string): string {
  const badges: Record<string, string> = {
    LOW: '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;">Faible</span>',
    MEDIUM: '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;">Moyen</span>',
    HIGH: '<span style="background:#fed7aa;color:#c2410c;padding:2px 6px;border-radius:4px;">Eleve</span>',
    CRITICAL: '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Critique</span>',
  };
  return badges[riskLevel] || riskLevel;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper mappers (same as in route.ts)

function mapPurposeCategory(category: string): RegistreEntry['category'] {
  const mapping: Record<string, RegistreEntry['category']> = {
    ai_processing: PURPOSE_CATEGORY.AI_PROCESSING,
    data_analysis: PURPOSE_CATEGORY.DATA_ANALYSIS,
    marketing: PURPOSE_CATEGORY.MARKETING,
    security: PURPOSE_CATEGORY.SECURITY,
    legal_compliance: PURPOSE_CATEGORY.LEGAL_COMPLIANCE,
    customer_service: PURPOSE_CATEGORY.CUSTOMER_SERVICE,
    research: PURPOSE_CATEGORY.RESEARCH,
  };
  return mapping[category] || PURPOSE_CATEGORY.OTHER;
}

function mapLawfulBasis(basis: string): RegistreEntry['lawfulBasis'] {
  const mapping: Record<string, RegistreEntry['lawfulBasis']> = {
    consent: LAWFUL_BASIS.CONSENT,
    contract: LAWFUL_BASIS.CONTRACT,
    legal_obligation: LAWFUL_BASIS.LEGAL_OBLIGATION,
    vital_interest: LAWFUL_BASIS.VITAL_INTEREST,
    public_interest: LAWFUL_BASIS.PUBLIC_INTEREST,
    legitimate_interest: LAWFUL_BASIS.LEGITIMATE_INTEREST,
  };
  return mapping[basis] || LAWFUL_BASIS.CONSENT;
}

function mapRiskLevel(riskLevel: string): RegistreEntry['riskLevel'] {
  const mapping: Record<string, RegistreEntry['riskLevel']> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'CRITICAL',
  };
  return mapping[riskLevel.toLowerCase()] || 'MEDIUM';
}

function mapDataClass(dataClass: string): RegistreEntry['dataClassification'] {
  const mapping: Record<string, RegistreEntry['dataClassification']> = {
    P0: 'P0',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
  };
  return mapping[dataClass] || 'P1';
}
