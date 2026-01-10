/**
 * API Endpoint: GET /api/docs/registre/export
 *
 * RGPD: Art. 30 (Registre des traitements) - Export PDF
 * Classification: P0 (document public interne)
 * Access: SUPER_ADMIN, DPO uniquement
 *
 * LOT 10.4 — Registre des Traitements (Export PDF pour audit CNIL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { emitAuditEvent } from '@/infrastructure/audit/auditService';
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
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate PDF from markdown content
 */
function generatePDF(markdownContent: string, metadata: {
  lastModified: string | null;
  validatedBy: string | null;
  treatmentsCount: number;
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
  doc.text('Registre des Traitements', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Article 30 RGPD - Document obligatoire', margin, yPosition);
  yPosition += 10;

  // Metadata box
  doc.setFillColor(240, 248, 255); // Light blue
  doc.rect(margin, yPosition, contentWidth, 25, 'F');
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Métadonnées du registre', margin + 5, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`Dernière mise à jour : ${metadata.lastModified || 'Non renseignée'}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Validé par : ${metadata.validatedBy || 'En attente DPO'}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Nombre de traitements recensés : ${metadata.treatmentsCount}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`, margin + 5, yPosition);
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

    // Check if it's a title (all caps or starts with specific patterns)
    const isTitle = /^(Traitement \d+|Responsable|Sous-traitants|Mesures|Droits|Révisions|Validation|Références)/i.test(line);

    if (isTitle) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    // Split long lines
    const splitLines = doc.splitTextToSize(line, contentWidth);

    for (const splitLine of splitLines) {
      checkPageBreak(6);
      doc.text(splitLine, margin, yPosition);
      yPosition += isTitle ? 6 : 5;
    }

    if (isTitle) {
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
      `Page ${i} sur ${totalPages} - Registre des Traitements RGPD - Confidentiel`,
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
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Only SUPERADMIN or DPO can access
    const hasPermission = requirePermission(user, ['registre:export'], {
      allowedRoles: ['SUPERADMIN', 'DPO'],
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only SUPER_ADMIN or DPO can export registre' },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), 'docs', 'rgpd', 'registre-traitements.md');
    const markdown = await readFile(filePath, 'utf-8');

    // Extract metadata
    const lastModifiedMatch = markdown.match(/Dernière mise à jour[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);
    const treatmentsCount = (markdown.match(/^## Traitement \d+/gm) || []).length;

    const metadata = {
      lastModified: lastModifiedMatch ? lastModifiedMatch[1] : null,
      validatedBy: validatedByMatch ? validatedByMatch[1].trim() : null,
      treatmentsCount,
    };

    // Generate PDF
    const pdfBuffer = generatePDF(markdown, metadata);

    // Audit event
    await emitAuditEvent({
      eventType: 'docs.registre.exported',
      actorId: user.id,
      tenantId: user.tenantId || null,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'pdf',
      },
    });

    // Return PDF file
    const filename = `registre-traitements-${new Date().toISOString().split('T')[0]}.pdf`;

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
    console.error('Error exporting registre:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
