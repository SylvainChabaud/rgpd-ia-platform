import { NextRequest, NextResponse } from 'next/server';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { PgDpiaRepo } from '@/infrastructure/repositories/PgDpiaRepo';
import { logger } from '@/infrastructure/logging/logger';

/**
 * GET /api/tenants/:id/dpia/:dpiaId/export
 * LOT 12.4 - DPO: Export DPIA as PDF
 *
 * RGPD compliance:
 * - Art. 35: DPIA documentation for CNIL
 * - Art. 38.3: DPO access required
 * - Tenant isolation enforced
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dpiaId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, dpiaId } = await params;
    if (!tenantId || !dpiaId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // RBAC: DPO, TENANT_ADMIN, or SUPERADMIN
    const hasPermission = requirePermission(
      authResult.user,
      ['dpia:export'],
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

    const dpiaRepo = new PgDpiaRepo();
    const dpia = await dpiaRepo.findById(tenantId, dpiaId);

    if (!dpia) {
      return NextResponse.json({ error: 'DPIA not found' }, { status: 404 });
    }

    // Generate PDF content (HTML-based for simplicity)
    const pdfContent = generateDpiaPdfContent(dpia, tenantId);

    // Audit log (P1 data only)
    logger.info({
      event: 'dpia.exported',
      tenantId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      dpiaId,
      format: 'pdf',
    }, 'DPO exported DPIA as PDF');

    // Return as downloadable file
    const filename = `dpia-${dpia.id}-${new Date().toISOString().split('T')[0]}.html`;

    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error({
      event: 'dpia.export.error',
      error: error instanceof Error ? error.message : String(error),
    }, 'GET /api/tenants/:id/dpia/:dpiaId/export error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate DPIA PDF content (HTML format for browser printing)
 * Art. 35 RGPD documentation format
 */
function generateDpiaPdfContent(
  dpia: {
    id: string;
    title: string;
    description: string;
    overallRiskLevel: string;
    dataProcessed: readonly string[];
    dataClassification: string;
    securityMeasures: readonly string[];
    status: string;
    dpoComments: string | null;
    validatedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    purposeLabel?: string;
    risks?: readonly {
      riskName: string;
      description: string;
      likelihood: string;
      impact: string;
      mitigation: string;
    }[];
  },
  tenantId: string
): string {
  const statusBadge = {
    PENDING: '<span style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:4px;">En attente</span>',
    APPROVED: '<span style="background:#d1fae5;color:#065f46;padding:4px 8px;border-radius:4px;">Approuvee</span>',
    REJECTED: '<span style="background:#fee2e2;color:#991b1b;padding:4px 8px;border-radius:4px;">Rejetee</span>',
  };

  const riskLevelBadge = {
    LOW: '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;">Faible</span>',
    MEDIUM: '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;">Moyen</span>',
    HIGH: '<span style="background:#fed7aa;color:#c2410c;padding:2px 6px;border-radius:4px;">Eleve</span>',
    CRITICAL: '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Critique</span>',
  };

  const risksHtml = dpia.risks && dpia.risks.length > 0
    ? dpia.risks.map((risk, index) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:8px;">${index + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;"><strong>${escapeHtml(risk.riskName)}</strong><br/><small>${escapeHtml(risk.description)}</small></td>
        <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${riskLevelBadge[risk.likelihood as keyof typeof riskLevelBadge] || risk.likelihood}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${riskLevelBadge[risk.impact as keyof typeof riskLevelBadge] || risk.impact}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(risk.mitigation)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="border:1px solid #e5e7eb;padding:8px;text-align:center;">Aucun risque identifie</td></tr>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DPIA - ${escapeHtml(dpia.title)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .meta p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analyse d'Impact (DPIA)</h1>
    ${statusBadge[dpia.status as keyof typeof statusBadge] || dpia.status}
  </div>

  <div class="meta">
    <p><strong>ID:</strong> ${escapeHtml(dpia.id)}</p>
    <p><strong>Tenant ID:</strong> ${escapeHtml(tenantId)}</p>
    <p><strong>Finalite:</strong> ${escapeHtml(dpia.purposeLabel || 'N/A')}</p>
    <p><strong>Date de creation:</strong> ${formatDate(dpia.createdAt)}</p>
    ${dpia.validatedAt ? `<p><strong>Date de validation:</strong> ${formatDate(dpia.validatedAt)}</p>` : ''}
  </div>

  <h2>1. Description du traitement</h2>
  <p><strong>Titre:</strong> ${escapeHtml(dpia.title)}</p>
  <p>${escapeHtml(dpia.description)}</p>

  <h2>2. Classification des donnees</h2>
  <table>
    <tr>
      <th>Niveau de risque global</th>
      <td>${riskLevelBadge[dpia.overallRiskLevel as keyof typeof riskLevelBadge] || dpia.overallRiskLevel}</td>
    </tr>
    <tr>
      <th>Classification des donnees</th>
      <td>${escapeHtml(dpia.dataClassification)}</td>
    </tr>
    <tr>
      <th>Donnees traitees</th>
      <td>${dpia.dataProcessed.length > 0 ? dpia.dataProcessed.map(escapeHtml).join(', ') : 'Non specifie'}</td>
    </tr>
  </table>

  <h2>3. Evaluation des risques (Art. 35.7.c)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:30%">Risque</th>
        <th style="width:15%">Probabilite</th>
        <th style="width:15%">Impact</th>
        <th style="width:35%">Mesures d'attenuation</th>
      </tr>
    </thead>
    <tbody>
      ${risksHtml}
    </tbody>
  </table>

  <h2>4. Mesures de securite (Art. 32)</h2>
  <ul>
    ${dpia.securityMeasures.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
  </ul>

  ${dpia.dpoComments ? `
  <h2>5. Avis du DPO</h2>
  <div style="background:#f0f9ff;padding:15px;border-radius:8px;border-left:4px solid #3b82f6;">
    ${escapeHtml(dpia.dpoComments)}
  </div>
  ` : ''}

  ${dpia.rejectionReason ? `
  <h2>Motif de rejet</h2>
  <div style="background:#fef2f2;padding:15px;border-radius:8px;border-left:4px solid #ef4444;">
    ${escapeHtml(dpia.rejectionReason)}
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Document genere le:</strong> ${formatDate(new Date())}</p>
    <p><strong>Reference RGPD:</strong> Article 35 - Analyse d'impact relative a la protection des donnees</p>
    <p><strong>Plateforme:</strong> RGPD IA Platform - LOT 12.4</p>
    <p style="margin-top:10px;"><em>Ce document est destine a la documentation RGPD et peut etre presente lors d'un controle CNIL.</em></p>
  </div>
</body>
</html>`;
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
