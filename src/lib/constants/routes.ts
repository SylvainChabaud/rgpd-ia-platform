/**
 * Routes Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized route definitions for all application routes.
 * Prevents hardcoded route strings across components.
 *
 * Used by:
 * - Layouts (tenant-admin, platform-admin, frontend)
 * - Middleware (auth redirects)
 * - Navigation components
 * - E2E tests
 */

// =========================
// Portal Routes (Tenant Admin)
// =========================

/**
 * Portal base path
 * Used for scope-based redirects
 */
export const PORTAL_BASE = '/portal' as const;

/**
 * Tenant portal routes
 * Used for navigation and Link components
 */
export const PORTAL_ROUTES = {
  BASE: PORTAL_BASE,
  DASHBOARD: '/portal/dashboard',
  DPIA: '/portal/dpia',
  DPIA_DETAIL: (id: string) => `/portal/dpia/${id}` as const,
  REGISTRE: '/portal/registre',
  PURPOSES: '/portal/purposes',
  CONSENTS: '/portal/consents',
  USERS: '/portal/users',
  SETTINGS: '/portal/settings',
} as const;

// =========================
// Admin Routes (Platform Admin)
// =========================

/**
 * Admin base path
 * Used for scope-based redirects
 */
export const ADMIN_BASE = '/admin' as const;

/**
 * Platform admin routes
 * Used for superadmin navigation
 */
export const ADMIN_ROUTES = {
  BASE: ADMIN_BASE,
  DASHBOARD: '/admin/dashboard',
  TENANTS: '/admin/tenants',
  TENANT_DETAIL: (id: string) => `/admin/tenants/${id}` as const,
  USERS: '/admin/users',
  AUDIT: '/admin/audit',
} as const;

// =========================
// Frontend Routes (End User)
// =========================

/**
 * Frontend base path
 * Used for end-user interface
 */
export const APP_BASE = '/app' as const;

/**
 * Frontend routes
 * Placeholder for EPIC 13 implementation
 */
export const APP_ROUTES = {
  BASE: APP_BASE,
  HOME: '/app',
} as const;

// =========================
// Auth Routes
// =========================

/**
 * Authentication routes
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  LOGOUT: '/logout',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
} as const;

// =========================
// API Base
// =========================

/**
 * API base path prefix
 */
export const API_BASE_PATH = '/api' as const;
