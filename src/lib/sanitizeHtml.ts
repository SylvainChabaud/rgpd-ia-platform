/**
 * HTML Sanitization Utility
 *
 * SECURITY: Prevent XSS attacks when rendering user-provided or converted HTML
 * Uses whitelist approach for allowed tags and attributes
 *
 * This is a lightweight server-side sanitizer for trusted content (markdown files).
 * For untrusted user content, consider using DOMPurify or similar library.
 */

/**
 * Allowed HTML tags for markdown-converted content
 * Only safe structural and formatting tags
 */
const ALLOWED_TAGS = new Set([
  // Document structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'div', 'span',
  // Text formatting
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
  'code', 'pre', 'kbd', 'samp', 'var',
  'mark', 'small', 'sub', 'sup',
  // Lists
  'ul', 'ol', 'li',
  'dl', 'dt', 'dd',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'caption', 'colgroup', 'col',
  // Links and media
  'a',
  // Blockquotes
  'blockquote', 'cite', 'q',
  // Other semantic elements
  'abbr', 'address', 'article', 'aside', 'details', 'summary',
  'figure', 'figcaption', 'main', 'nav', 'section', 'time',
]);

/**
 * Allowed attributes per tag
 * Restrictive whitelist to prevent XSS
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'target', 'rel']),
  'abbr': new Set(['title']),
  'time': new Set(['datetime']),
  'td': new Set(['colspan', 'rowspan']),
  'th': new Set(['colspan', 'rowspan', 'scope']),
  'col': new Set(['span']),
  'colgroup': new Set(['span']),
  // Global attributes (applied to all elements)
  '*': new Set(['id', 'class', 'lang', 'dir']),
};

/**
 * URL schemes allowed in href attributes
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Validate and sanitize URL
 * Blocks javascript:, data:, and other dangerous schemes
 */
function sanitizeUrl(url: string): string | null {
  try {
    // Handle relative URLs
    if (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }

    // Parse absolute URLs
    const parsed = new URL(url);
    if (!ALLOWED_URL_SCHEMES.has(parsed.protocol)) {
      return null; // Block dangerous schemes
    }
    return url;
  } catch {
    // Invalid URL, block it
    return null;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Parse and sanitize HTML attributes string
 */
function sanitizeAttributes(tagName: string, attributesStr: string): string {
  const allowedForTag = ALLOWED_ATTRIBUTES[tagName] || new Set();
  const globalAllowed = ALLOWED_ATTRIBUTES['*'] || new Set();

  const result: string[] = [];

  // Match attribute patterns: name="value" or name='value' or name=value or name
  const attrRegex = /([a-z][a-z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
  let match;

  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? '';

    // Check if attribute is allowed
    if (!allowedForTag.has(attrName) && !globalAllowed.has(attrName)) {
      continue;
    }

    // Block event handlers (on*)
    if (attrName.startsWith('on')) {
      continue;
    }

    // Special handling for href
    if (attrName === 'href') {
      const sanitizedUrl = sanitizeUrl(attrValue);
      if (sanitizedUrl === null) {
        continue;
      }
      result.push(`${attrName}="${escapeHtml(sanitizedUrl)}"`);

      // Add security attributes for external links
      if (sanitizedUrl.startsWith('http')) {
        result.push('rel="noopener noreferrer"');
      }
    } else {
      // Escape attribute value
      result.push(`${attrName}="${escapeHtml(attrValue)}"`);
    }
  }

  return result.length > 0 ? ' ' + result.join(' ') : '';
}

/**
 * Sanitize HTML content
 *
 * Removes disallowed tags and attributes while preserving structure.
 * Safe for use with dangerouslySetInnerHTML.
 *
 * @param html - Raw HTML string (e.g., from marked)
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Process all tags
  result = result.replace(/<\/?([a-z][a-z0-9]*)\s*([^>]*)>/gi, (match, tagName, attributes) => {
    const tag = tagName.toLowerCase();

    // Remove disallowed tags
    if (!ALLOWED_TAGS.has(tag)) {
      return ''; // Strip the tag entirely
    }

    // Self-closing or void elements
    const isClosing = match.startsWith('</');
    if (isClosing) {
      return `</${tag}>`;
    }

    // Sanitize attributes
    const sanitizedAttrs = sanitizeAttributes(tag, attributes);

    // Handle self-closing syntax
    const isSelfClosing = match.endsWith('/>');
    return isSelfClosing ? `<${tag}${sanitizedAttrs}/>` : `<${tag}${sanitizedAttrs}>`;
  });

  return result;
}

/**
 * Configuration type for sanitizeHtml options
 */
export type SanitizeHtmlOptions = {
  /** Additional tags to allow beyond the default whitelist */
  additionalTags?: string[];
  /** Additional attributes to allow (tag -> attributes) */
  additionalAttributes?: Record<string, string[]>;
};
