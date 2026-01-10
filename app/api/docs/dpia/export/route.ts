/**
 * API Endpoint: GET /api/docs/dpia/export
 *
 * RGPD: Art. 35 (DPIA Gateway LLM) - Export PDF
 * Classification: P0 (document interne confidentiel)
 * Access: SUPERADMIN, DPO uniquement
 *
 * LOT 10.5 — DPIA Gateway LLM (Export PDF pour documentation conformité)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest } from '@/app/middleware/auth';
import { emitAuditEvent } from '@/infrastructure/audit/auditService';
import { ACTOR_ROLE } from '@/shared/actorRole';
import jsPDF from 'jspdf';

/**
 * Convert markdown content to plain text for PDF
 * Removes markdown syntax for cleaner PDF output
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers (keep text only)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove horizontal rules
    .replace(/^(-{3,}|\*{3,})$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate PDF from DPIA markdown content
 */
function generatePDF(markdownContent: string, metadata: {
  dateRealized: string | null;
  validatedBy: string | null;
  nextRevision: string | null;
  riskLevel: string;
  risksCount: number;
}): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DPIA Gateway LLM', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Article 35 RGPD - Analyse d\'Impact relative à la Protection des Données', margin, yPosition);
  yPosition += 10;

  // Metadata box
  doc.setFillColor(243, 232, 255); // Light purple
  doc.rect(margin, yPosition, contentWidth, 30, 'F');
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Métadonnées de la DPIA', margin + 5, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`Date de réalisation : ${metadata.dateRealized || 'Non renseignée'}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Validé par : ${metadata.validatedBy || 'En attente DPO'}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Prochaine révision : ${metadata.nextRevision || 'À déterminer'}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Niveau de risque résiduel : ${metadata.riskLevel}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Nombre de risques évalués : ${metadata.risksCount}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`, margin + 5, yPosition);
  yPosition += 10;

  // Risk level indicator
  checkPageBreak(15);
  doc.setFillColor(255, 237, 213); // Light orange
  doc.rect(margin, yPosition, contentWidth, 10, 'F');
  yPosition += 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('CONFIDENTIEL - Document soumis au secret professionnel (Art. 35.10 RGPD)', margin + 5, yPosition);
  yPosition += 5;
  doc.text('Ne peut être communiqué qu\'à la CNIL sur demande expresse', margin + 5, yPosition);
  yPosition += 10;

  // Content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const plainText = markdownToPlainText(markdownContent);
  const lines = plainText.split('\n');

  for (const line of lines) {
    if (!line.trim()) {
      yPosition += 3;
      continue;
    }

    // Check if it's a title (specific patterns from DPIA structure)
    const isMainTitle = /^(Résumé exécutif|Description systématique|Nécessité et proportionnalité|Évaluation des risques|Mesures d'atténuation|Droits des personnes|Consultations|Validation et suivi|Conclusion|Références)/i.test(line);
    const isSubTitle = /^(Risque \d+|Traitement concerné|Risque global|Principales mesures|Nature du traitement|Architecture technique|Technologies utilisées|Acteurs|Nécessité du traitement|Proportionnalité|Méthodologie|Approbation|Révisions prévues|Traçabilité|Acceptabilité du risque|Recommandations)/i.test(line);
    const isSectionMarker = /^(Description|Impact|Vraisemblance|Risque brut|Mesures d'atténuation|Risque résiduel|Personnes concernées)/i.test(line);

    if (isMainTitle) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    } else if (isSubTitle) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
    } else if (isSectionMarker) {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    // Split long lines
    const splitLines = doc.splitTextToSize(line, contentWidth);

    for (const splitLine of splitLines) {
      checkPageBreak(6);
      doc.text(splitLine, margin, yPosition);
      yPosition += isMainTitle ? 6 : isSubTitle ? 5.5 : 5;
    }

    if (isMainTitle) {
      yPosition += 3;
    } else if (isSubTitle) {
      yPosition += 2;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} sur ${totalPages} - DPIA Gateway LLM (Art. 35 RGPD) - CONFIDENTIEL`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // RBAC: Only SUPERADMIN or DPO can access
    const allowedRoles = [ACTOR_ROLE.SUPERADMIN, ACTOR_ROLE.DPO];
    const isAuthorized = allowedRoles.includes(user.role as (typeof allowedRoles)[number]);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only SUPERADMIN or DPO can export DPIA' },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), 'docs', 'rgpd', 'dpia.md');
    const markdown = await readFile(filePath, 'utf-8');

    // Extract metadata
    const dateMatch = markdown.match(/Date de réalisation[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);
    const nextRevisionMatch = markdown.match(/Prochaine révision[:\s]+([0-9-]+)/);
    const riskLevelMatch = markdown.match(/Risque global[:\s\n]+[🔴🟡🟢]+\s+\*\*(.+?)\*\*/);
    const risksCount = (markdown.match(/###.*Risque \d+/g) || []).length;

    const metadata = {
      dateRealized: dateMatch ? dateMatch[1] : null,
      validatedBy: validatedByMatch ? validatedByMatch[1].trim() : null,
      nextRevision: nextRevisionMatch ? nextRevisionMatch[1] : null,
      riskLevel: riskLevelMatch ? riskLevelMatch[1] : 'UNKNOWN',
      risksCount,
    };

    // Generate PDF
    const pdfBuffer = generatePDF(markdown, metadata);

    // Audit event
    await emitAuditEvent({
      eventType: 'docs.dpia.exported',
      actorId: user.id,
      tenantId: user.tenantId,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'pdf',
        riskLevel: metadata.riskLevel,
      },
    });

    // Return PDF file
    const filename = `dpia-gateway-llm-${new Date().toISOString().split('T')[0]}.pdf`;

    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(pdfBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting DPIA:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
