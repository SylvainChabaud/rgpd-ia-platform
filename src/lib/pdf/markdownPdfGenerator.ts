/**
 * Shared PDF Generator for RGPD Documents
 *
 * Generates PDF exports for markdown documentation (DPIA, Registre, etc.)
 * Used by /api/docs/dpia/export and /api/docs/registre/export
 *
 * LOT 10.4/10.5 - Document export PDF
 */

import jsPDF from "jspdf";

/**
 * PDF Theme configuration
 */
export interface PdfTheme {
  /** Main title color (hex or rgb string) */
  accentColor: { r: number; g: number; b: number };
  /** Metadata box background color */
  metadataBoxColor: { r: number; g: number; b: number };
  /** Warning/confidentiality box color (optional) */
  warningBoxColor?: { r: number; g: number; b: number };
}

/**
 * Pre-defined themes for RGPD documents
 */
export const PDF_THEMES = {
  dpia: {
    accentColor: { r: 139, g: 92, b: 246 }, // Purple
    metadataBoxColor: { r: 243, g: 232, b: 255 }, // Light purple
    warningBoxColor: { r: 255, g: 237, b: 213 }, // Light orange
  },
  registre: {
    accentColor: { r: 37, g: 99, b: 235 }, // Blue
    metadataBoxColor: { r: 240, g: 248, b: 255 }, // Light blue
  },
} as const satisfies Record<string, PdfTheme>;

/**
 * PDF Document metadata
 */
export interface PdfDocumentMetadata {
  /** Main document title */
  title: string;
  /** Subtitle (e.g., "Article 35 RGPD") */
  subtitle: string;
  /** Key-value pairs to display in metadata box */
  fields: Record<string, string | number | null>;
  /** Theme to use */
  theme: PdfTheme;
  /** Optional confidentiality notice lines */
  confidentialityNotice?: string[];
  /** Footer text */
  footerText: string;
  /** Title patterns for bold formatting (regex strings) */
  titlePatterns?: {
    main: RegExp[];
    sub: RegExp[];
    section?: RegExp[];
  };
}

/**
 * Convert markdown content to plain text for PDF
 * Removes markdown syntax for cleaner PDF output
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove headers (keep text only)
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    // Remove horizontal rules
    .replace(/^(-{3,}|\*{3,})$/gm, "")
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, "$1")
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, "\u2022 ")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Remove emojis (for DPIA)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    // Clean up multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Generate a PDF document from markdown content
 *
 * @param markdownContent - Raw markdown content to convert
 * @param metadata - Document metadata and configuration
 * @returns PDF as Uint8Array
 */
export function generateMarkdownPdf(
  markdownContent: string,
  metadata: PdfDocumentMetadata
): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number): boolean => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(metadata.title, margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(metadata.subtitle, margin, yPosition);
  yPosition += 10;

  // Metadata box
  const metadataEntries = Object.entries(metadata.fields).filter(
    ([, v]) => v !== null && v !== undefined
  );
  const boxHeight = 5 + metadataEntries.length * 5 + 5;

  const boxColor = metadata.theme.metadataBoxColor;
  doc.setFillColor(boxColor.r, boxColor.g, boxColor.b);
  doc.rect(margin, yPosition, contentWidth, boxHeight, "F");
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`M\u00e9tadonn\u00e9es`, margin + 5, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  for (const [key, value] of metadataEntries) {
    doc.text(`${key} : ${value}`, margin + 5, yPosition);
    yPosition += 5;
  }
  yPosition += 5;

  // Confidentiality notice (optional)
  if (metadata.confidentialityNotice && metadata.theme.warningBoxColor) {
    checkPageBreak(15);
    const warningColor = metadata.theme.warningBoxColor;
    doc.setFillColor(warningColor.r, warningColor.g, warningColor.b);
    doc.rect(margin, yPosition, contentWidth, 10, "F");
    yPosition += 3;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    for (const line of metadata.confidentialityNotice) {
      doc.text(line, margin + 5, yPosition);
      yPosition += 4;
    }
    yPosition += 3;
  }

  // Content
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const plainText = markdownToPlainText(markdownContent);
  const lines = plainText.split("\n");

  const patterns = metadata.titlePatterns ?? {
    main: [],
    sub: [],
    section: [],
  };

  for (const line of lines) {
    if (!line.trim()) {
      yPosition += 3;
      continue;
    }

    // Detect title type
    const isMainTitle = patterns.main.some((p) => p.test(line));
    const isSubTitle = patterns.sub.some((p) => p.test(line));
    const isSectionMarker = patterns.section?.some((p) => p.test(line)) ?? false;

    if (isMainTitle) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
    } else if (isSubTitle) {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
    } else if (isSectionMarker) {
      checkPageBreak(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
    } else {
      doc.setFont("helvetica", "normal");
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
    doc.setFont("helvetica", "italic");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} sur ${totalPages} - ${metadata.footerText}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
