'use client';

/**
 * Client-side HTML Sanitization Utility
 *
 * SECURITY: Prevent XSS attacks when rendering HTML content in client components
 * Uses browser's DOMParser for safe parsing and whitelist approach
 *
 * This version is designed for client-side use where DOMParser is available.
 */

/**
 * Allowed HTML tags for markdown-converted content
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
  // Links
  'a',
  // Blockquotes
  'blockquote', 'cite', 'q',
  // Other semantic elements
  'abbr', 'address', 'article', 'aside', 'details', 'summary',
  'figure', 'figcaption', 'main', 'nav', 'section', 'time',
]);

/**
 * Allowed attributes per tag
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'target', 'rel']),
  'abbr': new Set(['title']),
  'time': new Set(['datetime']),
  'td': new Set(['colspan', 'rowspan']),
  'th': new Set(['colspan', 'rowspan', 'scope']),
  'col': new Set(['span']),
  'colgroup': new Set(['span']),
  '*': new Set(['id', 'class', 'lang', 'dir']),
};

/**
 * URL schemes allowed in href attributes
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Validate URL for safety
 */
function isUrlSafe(url: string): boolean {
  try {
    if (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_URL_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Recursively sanitize DOM node
 */
function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  // Remove disallowed tags
  if (!ALLOWED_TAGS.has(tagName)) {
    // Keep children for inline elements, discard for script/style
    if (tagName === 'script' || tagName === 'style') {
      return null;
    }
    // Create a fragment with sanitized children
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(element.childNodes)) {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    }
    return fragment;
  }

  // Create clean element
  const cleanElement = document.createElement(tagName);

  // Copy allowed attributes
  const allowedForTag = ALLOWED_ATTRIBUTES[tagName] || new Set();
  const globalAllowed = ALLOWED_ATTRIBUTES['*'] || new Set();

  for (const attr of Array.from(element.attributes)) {
    const attrName = attr.name.toLowerCase();

    // Block event handlers
    if (attrName.startsWith('on')) {
      continue;
    }

    if (!allowedForTag.has(attrName) && !globalAllowed.has(attrName)) {
      continue;
    }

    // Special handling for href
    if (attrName === 'href') {
      if (!isUrlSafe(attr.value)) {
        continue;
      }
      cleanElement.setAttribute(attrName, attr.value);
      // Add security for external links
      if (attr.value.startsWith('http')) {
        cleanElement.setAttribute('rel', 'noopener noreferrer');
      }
    } else {
      cleanElement.setAttribute(attrName, attr.value);
    }
  }

  // Recursively sanitize children
  for (const child of Array.from(element.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      cleanElement.appendChild(sanitizedChild);
    }
  }

  return cleanElement;
}

/**
 * Sanitize HTML content (client-side)
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHtmlClient(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side fallback: return empty or throw
    console.warn('sanitizeHtmlClient called on server, returning empty string');
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const container = document.createElement('div');

  for (const child of Array.from(doc.body.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      container.appendChild(sanitizedChild);
    }
  }

  return container.innerHTML;
}
