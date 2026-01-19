/**
 * API Query Utilities
 * Shared helpers to reduce code duplication in API routes and hooks
 *
 * Classification: P0 (utility code, no data)
 */

import { z, ZodError } from 'zod';

/**
 * Build API endpoint with query parameters
 * Filters out undefined/null values automatically
 *
 * @param base - Base endpoint path (e.g., '/purposes')
 * @param params - Key-value pairs to add as query params
 * @returns Full endpoint with query string (e.g., '/purposes?includeInactive=true')
 *
 * @example
 * buildApiEndpoint('/purposes', { includeInactive: true, limit: 10 })
 * // Returns: '/purposes?includeInactive=true&limit=10'
 */
export function buildApiEndpoint(
  base: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Parse and validate query parameters from URLSearchParams
 * Throws ValidationError if schema validation fails
 *
 * @param searchParams - URLSearchParams from request
 * @param schema - Zod schema for validation
 * @returns Validated and typed query params
 *
 * @example
 * const query = parseQueryParams(req.nextUrl.searchParams, ListUsersSchema);
 */
export function parseQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const rawParams = Object.fromEntries(searchParams.entries());
  return schema.parse(rawParams);
}

/**
 * Safe parse with error result instead of throwing
 * Useful for routes that need custom error handling
 *
 * @param searchParams - URLSearchParams from request
 * @param schema - Zod schema for validation
 * @returns Object with success flag, data or error
 */
export function safeParseQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  const rawParams = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(rawParams);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}
