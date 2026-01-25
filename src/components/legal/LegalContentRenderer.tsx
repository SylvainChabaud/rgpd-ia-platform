'use client';

/**
 * Client Component for rendering legal content with styled HTML
 *
 * RGPD: Art. 12-14 (Transparency of information)
 * Used by: politique-confidentialite, cgu, informations-rgpd pages
 *
 * LOT 10.0-10.2 - Legal Pages Styling
 */

interface LegalContentRendererProps {
  html: string;
  theme?: 'blue' | 'slate' | 'green';
}

export function LegalContentRenderer({ html, theme = 'blue' }: LegalContentRendererProps) {
  const themeColors = {
    blue: {
      h2Color: '#1e40af',
      h2Border: '#93c5fd',
      h3Border: '#3b82f6',
      listMarker: '#16a34a',
      theadBg: '#2563eb',
      theadBorder: '#1d4ed8',
      rowEvenBg: '#f8fafc',
      rowHoverBg: '#eff6ff',
      blockquoteBg: '#eff6ff',
      blockquoteBorder: '#3b82f6',
      codeBg: '#dbeafe',
      codeColor: '#1e40af',
      linkColor: '#2563eb',
      linkHover: '#1d4ed8',
      // Dark mode
      darkH2Color: '#93c5fd',
      darkH2Border: '#1e40af',
      darkTheadBg: '#1e40af',
      darkTheadBorder: '#1e3a8a',
      darkRowEvenBg: '#1e293b',
      darkRowHoverBg: '#1e3a5f',
      darkBlockquoteBg: '#1e3a5f',
      darkCodeBg: '#1e3a5f',
      darkCodeColor: '#93c5fd',
      darkLinkColor: '#60a5fa',
      darkLinkHover: '#93c5fd',
    },
    slate: {
      h2Color: '#334155',
      h2Border: '#94a3b8',
      h3Border: '#64748b',
      listMarker: '#64748b',
      theadBg: '#475569',
      theadBorder: '#334155',
      rowEvenBg: '#f8fafc',
      rowHoverBg: '#f1f5f9',
      blockquoteBg: '#f1f5f9',
      blockquoteBorder: '#64748b',
      codeBg: '#e2e8f0',
      codeColor: '#334155',
      linkColor: '#475569',
      linkHover: '#1e293b',
      // Dark mode
      darkH2Color: '#cbd5e1',
      darkH2Border: '#475569',
      darkTheadBg: '#334155',
      darkTheadBorder: '#1e293b',
      darkRowEvenBg: '#1e293b',
      darkRowHoverBg: '#334155',
      darkBlockquoteBg: '#1e293b',
      darkCodeBg: '#334155',
      darkCodeColor: '#cbd5e1',
      darkLinkColor: '#94a3b8',
      darkLinkHover: '#cbd5e1',
    },
    green: {
      h2Color: '#047857',
      h2Border: '#6ee7b7',
      h3Border: '#10b981',
      listMarker: '#10b981',
      theadBg: '#059669',
      theadBorder: '#047857',
      rowEvenBg: '#f0fdf4',
      rowHoverBg: '#dcfce7',
      blockquoteBg: '#ecfdf5',
      blockquoteBorder: '#10b981',
      codeBg: '#d1fae5',
      codeColor: '#047857',
      linkColor: '#059669',
      linkHover: '#047857',
      // Dark mode
      darkH2Color: '#6ee7b7',
      darkH2Border: '#047857',
      darkTheadBg: '#047857',
      darkTheadBorder: '#065f46',
      darkRowEvenBg: '#022c22',
      darkRowHoverBg: '#064e3b',
      darkBlockquoteBg: '#022c22',
      darkCodeBg: '#064e3b',
      darkCodeColor: '#6ee7b7',
      darkLinkColor: '#34d399',
      darkLinkHover: '#6ee7b7',
    },
  };

  const colors = themeColors[theme];

  return (
    <>
      <style jsx global>{`
        .legal-content {
          line-height: 1.8;
        }
        .legal-content h1 {
          display: none;
        }
        .legal-content h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 3rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid ${colors.h2Border};
          color: ${colors.h2Color};
        }
        .legal-content h2:first-of-type {
          margin-top: 0;
        }
        .legal-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-left: 1rem;
          border-left: 4px solid ${colors.h3Border};
          color: #1e293b;
        }
        .legal-content h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #334155;
        }
        .legal-content p {
          margin-top: 1rem;
          margin-bottom: 1rem;
          color: #475569;
        }
        .legal-content ul, .legal-content ol {
          margin-top: 1.25rem;
          margin-bottom: 1.25rem;
          padding-left: 0;
        }
        .legal-content ul {
          list-style-type: none;
        }
        .legal-content ol {
          list-style-type: decimal;
          padding-left: 2rem;
        }
        .legal-content li {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.75;
          padding-left: 1.75rem;
          position: relative;
        }
        .legal-content ul li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: ${colors.listMarker};
          font-weight: bold;
        }
        .legal-content ol li {
          padding-left: 0.5rem;
        }
        .legal-content ol li::marker {
          color: ${colors.h2Color};
          font-weight: 600;
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .legal-content thead {
          background-color: ${colors.theadBg};
        }
        .legal-content th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: white;
          border: 1px solid ${colors.theadBorder};
          font-size: 0.875rem;
        }
        .legal-content td {
          padding: 1rem;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.875rem;
        }
        .legal-content tbody tr:nth-child(even) {
          background-color: ${colors.rowEvenBg};
        }
        .legal-content tbody tr:hover {
          background-color: ${colors.rowHoverBg};
        }
        .legal-content blockquote {
          border-left: 4px solid ${colors.blockquoteBorder};
          padding-left: 1.5rem;
          padding-right: 1rem;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          font-style: italic;
          background-color: ${colors.blockquoteBg};
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .legal-content strong {
          font-weight: 600;
          color: #0f172a;
        }
        .legal-content code {
          background-color: ${colors.codeBg};
          color: ${colors.codeColor};
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
        }
        .legal-content hr {
          margin-top: 3rem;
          margin-bottom: 3rem;
          border: none;
          border-top: 1px solid #e2e8f0;
        }
        .legal-content a {
          color: ${colors.linkColor};
          text-decoration: underline;
          text-underline-offset: 4px;
          font-weight: 500;
        }
        .legal-content a:hover {
          color: ${colors.linkHover};
        }
        /* Dark mode support */
        .dark .legal-content h2 {
          color: ${colors.darkH2Color};
          border-bottom-color: ${colors.darkH2Border};
        }
        .dark .legal-content h3 {
          color: #e2e8f0;
          border-left-color: ${colors.h3Border};
        }
        .dark .legal-content h4 {
          color: #cbd5e1;
        }
        .dark .legal-content p,
        .dark .legal-content li,
        .dark .legal-content td {
          color: #94a3b8;
        }
        .dark .legal-content ul li::before {
          color: ${colors.listMarker};
        }
        .dark .legal-content strong {
          color: #f1f5f9;
        }
        .dark .legal-content thead {
          background-color: ${colors.darkTheadBg};
        }
        .dark .legal-content th {
          border-color: ${colors.darkTheadBorder};
        }
        .dark .legal-content td {
          border-color: #334155;
        }
        .dark .legal-content tbody tr:nth-child(even) {
          background-color: ${colors.darkRowEvenBg};
        }
        .dark .legal-content tbody tr:hover {
          background-color: ${colors.darkRowHoverBg};
        }
        .dark .legal-content blockquote {
          background-color: ${colors.darkBlockquoteBg};
        }
        .dark .legal-content code {
          background-color: ${colors.darkCodeBg};
          color: ${colors.darkCodeColor};
        }
        .dark .legal-content hr {
          border-top-color: #334155;
        }
        .dark .legal-content a {
          color: ${colors.darkLinkColor};
        }
        .dark .legal-content a:hover {
          color: ${colors.darkLinkHover};
        }
      `}</style>
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
