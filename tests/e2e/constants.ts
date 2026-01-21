/**
 * E2E Test Constants
 *
 * Centralized constants for E2E tests to avoid duplication
 * and ensure consistency across test files.
 *
 * SECURITY:
 * - Test credentials use @*.local domains (not real domains)
 * - Passwords are test-only (not real credentials)
 */

import { ACTOR_SCOPE } from '@/shared/actorScope';

// =========================
// Timeouts (milliseconds)
// =========================

/**
 * E2E test timeouts
 * Adjust based on CI/local environment performance
 */
export const E2E_TIMEOUTS = {
  /** Navigation timeout (page loads, redirects) */
  NAVIGATION: 30000,
  /** Element visibility timeout */
  ELEMENT: 10000,
  /** Selector wait timeout */
  SELECTOR: 5000,
  /** Short wait for animations/transitions */
  SHORT_WAIT: 2000,
  /** Logout redirect timeout */
  LOGOUT: 15000,
} as const;

// =========================
// Test Users
// =========================

/**
 * Platform admin test user
 * Used for /admin/* route tests
 */
export const TEST_PLATFORM_ADMIN = {
  email: 'admin@platform.local',
  password: 'AdminPass123!',
  displayName: 'Admin Platform',
  scope: ACTOR_SCOPE.PLATFORM,
} as const;

/**
 * Tenant admin test user (tenant1)
 * Used for /portal/* route tests when testing auth rejection
 */
export const TEST_TENANT_ADMIN = {
  email: 'admin@tenant1.local',
  password: 'TenantPass123!',
  displayName: 'Admin Tenant',
  scope: ACTOR_SCOPE.TENANT,
} as const;

/**
 * ACME tenant admin test user
 * Used for /portal/* dashboard tests
 */
export const TEST_TENANT_ADMIN_ACME = {
  email: 'admin@acme.local',
  password: 'Admin1234',
  displayName: 'Admin ACME',
  tenantSlug: 'acme',
  scope: ACTOR_SCOPE.TENANT,
} as const;

/**
 * TechCorp tenant admin test user
 * Used for cross-tenant isolation tests
 */
export const TEST_TENANT_ADMIN_TECHCORP = {
  email: 'admin@techcorp.local',
  password: 'Admin1234',
  displayName: 'Admin TechCorp',
  tenantSlug: 'techcorp',
  scope: ACTOR_SCOPE.TENANT,
} as const;

/**
 * DPO test user (ACME tenant)
 * Used for DPO-specific tests (DPIA, Registre, RGPD Art. 35/30/15-22)
 */
export const TEST_DPO_ACME = {
  email: 'dpo@acme.local',
  password: 'Dpo12345',
  displayName: 'Marie Dubois (DPO)',
  tenantSlug: 'acme',
  scope: ACTOR_SCOPE.TENANT,
  role: 'DPO',
} as const;

// =========================
// Base URLs
// =========================

/**
 * Base URL for assertions
 * Note: In Playwright, use relative paths for navigation
 */
export const BASE_URL = 'http://localhost:3000' as const;

// =========================
// Storage Keys (for verification)
// =========================

/**
 * Storage keys to verify httpOnly cookie migration
 * These should NOT contain tokens after migration
 */
export const LEGACY_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_STORAGE: 'auth-storage',
} as const;
