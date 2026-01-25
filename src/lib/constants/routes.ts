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
 * Frontend routes for End User (MEMBER scope)
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Art. 15/17/20: Export, delete, access rights at /app/my-data
 * - Art. 7: Consent management at /app/consents
 * - User-scoped data only
 */
export const APP_ROUTES = {
  BASE: APP_BASE,
  HOME: '/app',
  AI_TOOLS: '/app/ai-tools',
  HISTORY: '/app/history',
  CONSENTS: '/app/consents',
  CONSENTS_HISTORY: '/app/consents/history',
  MY_DATA: '/app/my-data',
  MY_DATA_EXPORT: '/app/my-data/export',
  MY_DATA_DELETE: '/app/my-data/delete',
  PROFILE: '/app/profile',
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
// Legal Routes (Public)
// =========================

/**
 * Legal pages routes (public, SSG)
 * LOT 10.0-10.2 - Pages Légales
 *
 * RGPD Compliance:
 * - Art. 13/14: Privacy policy required
 * - Art. 7: Cookie consent information
 */
export const LEGAL_ROUTES = {
  PRIVACY_POLICY: '/politique-confidentialite',
  TERMS_OF_SERVICE: '/cgu',
  RGPD_INFO: '/informations-rgpd',
} as const;

// =========================
// API Base
// =========================

/**
 * API base path prefix
 */
export const API_BASE_PATH = '/api' as const;

// =========================
// API Routes (Internal)
// =========================

/**
 * Authentication API routes
 * LOT 13.0 - Authentification & Layout User
 */
export const API_AUTH_ROUTES = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  REFRESH: '/api/auth/refresh',
  REGISTER: '/api/auth/register',
} as const;

/**
 * Consent API routes
 * LOT 10.3 - Cookie Consent
 */
export const API_CONSENT_ROUTES = {
  COOKIES: '/api/consents/cookies',
} as const;

/**
 * RGPD API routes
 * LOT 13.4 - My Data
 */
export const API_RGPD_ROUTES = {
  EXPORT: '/api/rgpd/export',
  DELETE: '/api/rgpd/delete',
} as const;
