/**
 * API Constants
 * Centralized configuration for API endpoints, pagination, and cache settings.
 *
 * IMPORTANT: These constants are used across backend API routes and frontend hooks.
 * Changes here affect the entire application.
 */

// =========================
// Pagination Limits
// =========================

/**
 * Default and maximum pagination limits for API endpoints
 * Used for query validation (Zod schemas)
 */
export const API_PAGINATION = {
  /** Default items per page */
  DEFAULT_LIMIT: 50,
  /** Maximum items per page for standard lists */
  MAX_LIMIT: 100,
  /** Maximum items for aggregation queries (stats, matrix) */
  MAX_LIMIT_AGGREGATION: 1000,
  /** Maximum search string length */
  SEARCH_MAX_LENGTH: 100,
} as const;

// =========================
// Time Ranges
// =========================

/**
 * Time range limits for stats endpoints
 */
export const API_TIME_RANGES = {
  /** Default days for stats queries */
  STATS_DEFAULT_DAYS: 30,
  /** Maximum days for stats queries */
  STATS_MAX_DAYS: 90,
} as const;

// =========================
// Query Cache (TanStack Query)
// =========================

/**
 * Stale time constants for TanStack Query hooks
 * Determines how long cached data is considered fresh
 *
 * Note: Lower values = more frequent refetches, higher server load
 * Higher values = staler data, lower server load
 */
export const QUERY_STALE_TIME = {
  /** 30 seconds - data that changes frequently (consents, matrix) */
  SHORT: 30_000,
  /** 1 minute - standard data (purposes, users list) */
  MEDIUM: 60_000,
  /** 5 minutes - rarely changing data (templates, config) */
  LONG: 5 * 60_000,
  /** 15 minutes - mostly static data (DPIA approved, registre) */
  VERY_LONG: 15 * 60_000,
} as const;

// =========================
// HTTP Status Codes (for reference)
// =========================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
} as const;
