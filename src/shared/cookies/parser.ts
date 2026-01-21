/**
 * Cookie Parser Utilities
 *
 * SECURITY: Safe cookie parsing without regex (ReDoS-resistant)
 * Reference: .claude/rules/security.md - "Parsing de cookies (anti-ReDoS)"
 */

/**
 * Parse cookies from header string into key-value object
 * SECURITY: Uses split-based parsing to avoid ReDoS vulnerabilities
 *
 * @param cookieHeader - The Cookie header string (e.g., "name=value; other=data")
 * @returns Object with cookie names as keys and values as values
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};

  for (const cookie of cookieHeader.split(';')) {
    const trimmed = cookie.trim();
    if (!trimmed) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      cookies[key] = valueParts.join('=');
    }
  }

  return cookies;
}

/**
 * Get a specific cookie value by name
 * SECURITY: Avoid regex-based extraction to prevent ReDoS
 *
 * @param cookieHeader - The Cookie header string
 * @param name - The cookie name to extract
 * @returns The cookie value or undefined if not found
 */
export function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const trimmed = cookie.trim();
    if (!trimmed) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key === name) {
      return valueParts.join('=');
    }
  }

  return undefined;
}

/**
 * Check if a cookie exists in the header
 *
 * @param cookieHeader - The Cookie header string
 * @param name - The cookie name to check
 * @returns True if the cookie exists
 */
export function hasCookie(cookieHeader: string | null, name: string): boolean {
  return getCookieValue(cookieHeader, name) !== undefined;
}
