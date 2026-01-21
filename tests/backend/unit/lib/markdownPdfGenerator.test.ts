/**
 * Unit Tests: markdownPdfGenerator
 *
 * LOT 10.4/10.5 - PDF export for RGPD documents (DPIA, Registre)
 * Tests the shared PDF generation module
 */

import { describe, it, expect } from '@jest/globals';
import {
  markdownToPlainText,
  generateMarkdownPdf,
  PDF_THEMES,
} from '@/lib/pdf/markdownPdfGenerator';

describe('Lib: markdownPdfGenerator', () => {
  describe('markdownToPlainText()', () => {
    it('should remove code blocks', () => {
      const markdown = 'Text before\n```javascript\nconst x = 1;\n```\nText after';

      const result = markdownToPlainText(markdown);

      expect(result).not.toContain('```');
      expect(result).not.toContain('const x = 1');
      expect(result).toContain('Text before');
      expect(result).toContain('Text after');
    });

    it('should remove inline code but keep content', () => {
      const markdown = 'Use `npm install` to install';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('Use npm install to install');
      expect(result).not.toContain('`');
    });

    it('should remove bold/italic markers but keep text', () => {
      const markdown = '**bold** and *italic* and __underline__ and _emphasis_';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('bold and italic and underline and emphasis');
    });

    it('should remove header markers but keep text', () => {
      const markdown = '# H1\n## H2\n### H3\n#### H4';

      const result = markdownToPlainText(markdown);

      expect(result).toContain('H1');
      expect(result).toContain('H2');
      expect(result).toContain('H3');
      expect(result).toContain('H4');
      expect(result).not.toContain('#');
    });

    it('should remove horizontal rules', () => {
      const markdown = 'Before\n---\nAfter\n***\nEnd';

      const result = markdownToPlainText(markdown);

      expect(result).not.toContain('---');
      expect(result).not.toContain('***');
    });

    it('should convert list markers to bullet points', () => {
      const markdown = '- Item 1\n- Item 2\n* Item 3';

      const result = markdownToPlainText(markdown);

      expect(result).toContain('\u2022 Item 1');
      expect(result).toContain('\u2022 Item 2');
      expect(result).toContain('\u2022 Item 3');
    });

    it('should remove link syntax but keep text', () => {
      const markdown = 'Click [here](https://example.com) for info';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('Click here for info');
      expect(result).not.toContain('https://');
    });

    it('should remove images completely', () => {
      const markdown = 'Text ![alt text](image.png) more text';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('Text  more text');
      expect(result).not.toContain('![');
    });

    it('should remove emojis', () => {
      const markdown = 'Status: \uD83D\uDFE2 OK \uD83D\uDFE1 Warning \uD83D\uDD34 Error';

      const result = markdownToPlainText(markdown);

      expect(result).not.toContain('\uD83D');
      expect(result).toContain('Status:');
      expect(result).toContain('OK');
    });

    it('should collapse multiple newlines', () => {
      const markdown = 'Line 1\n\n\n\n\nLine 2';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should trim whitespace', () => {
      const markdown = '  \n  Content  \n  ';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('Content');
    });

    it('should handle blockquotes', () => {
      const markdown = '> This is a quote';

      const result = markdownToPlainText(markdown);

      expect(result).toBe('This is a quote');
      expect(result).not.toContain('>');
    });
  });

  describe('PDF_THEMES', () => {
    it('should have DPIA theme with purple accent', () => {
      const dpia = PDF_THEMES.dpia;

      expect(dpia.accentColor).toEqual({ r: 139, g: 92, b: 246 });
      expect(dpia.metadataBoxColor).toBeDefined();
      expect(dpia.warningBoxColor).toBeDefined();
    });

    it('should have Registre theme with blue accent', () => {
      const registre = PDF_THEMES.registre;

      expect(registre.accentColor).toEqual({ r: 37, g: 99, b: 235 });
      expect(registre.metadataBoxColor).toBeDefined();
    });
  });

  describe('generateMarkdownPdf()', () => {
    it('should generate a PDF as Uint8Array', () => {
      const markdown = '# Test Document\n\nThis is test content.';

      const pdf = generateMarkdownPdf(markdown, {
        title: 'Test PDF',
        subtitle: 'Unit Test Document',
        theme: PDF_THEMES.dpia,
        fields: {
          'Created': 'Today',
          'Author': 'Test',
        },
        footerText: 'Test Footer',
      });

      expect(pdf).toBeInstanceOf(Uint8Array);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it('should generate PDF starting with PDF header', () => {
      const markdown = '# Minimal Document';

      const pdf = generateMarkdownPdf(markdown, {
        title: 'Minimal',
        subtitle: 'Test',
        theme: PDF_THEMES.registre,
        fields: {},
        footerText: 'Footer',
      });

      // PDF files start with %PDF-
      const header = String.fromCharCode(...pdf.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('should include confidentiality notice if provided', () => {
      const markdown = '# Confidential Document';

      const pdf = generateMarkdownPdf(markdown, {
        title: 'Confidential',
        subtitle: 'Art. 35 RGPD',
        theme: PDF_THEMES.dpia,
        fields: {},
        footerText: 'Footer',
        confidentialityNotice: [
          'CONFIDENTIEL - Document soumis au secret professionnel',
        ],
      });

      // PDF is generated (can't easily verify content without PDF parser)
      expect(pdf.length).toBeGreaterThan(1000);
    });

    it('should handle empty metadata fields gracefully', () => {
      const markdown = '# Document';

      const pdf = generateMarkdownPdf(markdown, {
        title: 'Empty Fields',
        subtitle: 'Test',
        theme: PDF_THEMES.registre,
        fields: {
          'Empty': null,
          'Valid': 'Value',
        },
        footerText: 'Footer',
      });

      expect(pdf).toBeInstanceOf(Uint8Array);
    });

    it('should handle title patterns for formatting', () => {
      const markdown = '# Main Title\n\nRisque 1\n\nDescription of risk';

      const pdf = generateMarkdownPdf(markdown, {
        title: 'DPIA',
        subtitle: 'Test',
        theme: PDF_THEMES.dpia,
        fields: {},
        footerText: 'Footer',
        titlePatterns: {
          main: [/^Main Title$/i],
          sub: [/^Risque \d+$/i],
        },
      });

      expect(pdf).toBeInstanceOf(Uint8Array);
    });

    it('should handle long content with page breaks', () => {
      // Generate a long document
      const lines = Array(100).fill('This is a line of content that should be included in the PDF document.');
      const markdown = '# Long Document\n\n' + lines.join('\n\n');

      const pdf = generateMarkdownPdf(markdown, {
        title: 'Long Document',
        subtitle: 'Multi-page test',
        theme: PDF_THEMES.registre,
        fields: {},
        footerText: 'Page Footer',
      });

      // Longer documents should produce larger PDFs
      expect(pdf.length).toBeGreaterThan(5000);
    });
  });
});
