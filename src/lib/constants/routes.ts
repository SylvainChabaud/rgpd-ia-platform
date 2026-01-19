/**
 * Portal Routes Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized route definitions for the tenant portal.
 * Prevents hardcoded route strings across components.
 */

// =========================
// Portal Routes
// =========================

/**
 * Tenant portal routes
 * Used for navigation and Link components
 */
export const PORTAL_ROUTES = {
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
// Admin Routes
// =========================

/**
 * Platform admin routes
 * Used for superadmin navigation
 */
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/dashboard',
  TENANTS: '/admin/tenants',
  TENANT_DETAIL: (id: string) => `/admin/tenants/${id}` as const,
  USERS: '/admin/users',
  AUDIT: '/admin/audit',
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
