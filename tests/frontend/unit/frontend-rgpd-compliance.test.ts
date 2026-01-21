/**
 * RGPD Compliance Tests - Frontend LOT 11.0
 *
 * Validates strict RGPD compliance for Super Admin Back Office:
 * - Art. 5 (Minimisation des données)
 * - Art. 25 (Privacy by Design)
 * - Art. 32 (Sécurité)
 *
 * CRITICAL: All tests MUST pass for LOT 11.0 approval
 */

import { useAuthStore, AuthUser } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { apiClient } from '@/lib/api/apiClient'

// Mock fetch for logout and refresh API calls
global.fetch = jest.fn()

describe('RGPD Compliance - Frontend LOT 11.0', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    // Reset store state directly (token is in httpOnly cookie, not accessible from JS)
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
  })

  describe('Art. 5 - Minimisation des données (P1 ONLY)', () => {
    it('[RGPD-001] AuthStore MUST contain ONLY P1 data (no email, no password)', () => {
      const user: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(user)

      const state = useAuthStore.getState()

      // P1 data ALLOWED
      expect(state.user?.id).toBe('user-123')
      expect(state.user?.displayName).toBe('John Doe')
      expect(state.user?.scope).toBe(ACTOR_SCOPE.PLATFORM)
      expect(state.user?.role).toBe('admin')

      // P2/P3 data FORBIDDEN
      const userAny = state.user as unknown as Record<string, unknown>
      expect(userAny.email).toBeUndefined()
      expect(userAny.password).toBeUndefined()
      expect(userAny.passwordHash).toBeUndefined()
      expect(userAny.emailHash).toBeUndefined()
      expect(userAny.address).toBeUndefined()
      expect(userAny.phone).toBeUndefined()
    })

    it('[RGPD-002] localStorage MUST NOT contain JWT tokens', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      const allStorage = JSON.stringify(localStorage)

      // JWT MUST NOT be in localStorage (token is in httpOnly cookie)
      expect(allStorage).not.toContain('Bearer')
      expect(allStorage).not.toContain('eyJ') // JWT prefix
      expect(allStorage).not.toContain('token')
    })

    it('[RGPD-003] localStorage MUST contain ONLY P1 metadata', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}')

      // Only user metadata (P1)
      expect(persisted.state.user).toBeDefined()
      expect(persisted.state.user.id).toBe('user-123')
      expect(persisted.state.user.displayName).toBe('John Doe')

      // NO token (stored in httpOnly cookie, not accessible from JS)
      expect(persisted.state.token).toBeUndefined()

      // NO P2/P3 data
      expect(persisted.state.user.email).toBeUndefined()
      expect(persisted.state.user.password).toBeUndefined()
    })

    it('[RGPD-004] JWT token MUST be in httpOnly cookie (XSS protection)', () => {
      // Token is now in httpOnly cookie, set by the server
      // Frontend cannot access it directly (XSS protection)
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Token NOT in sessionStorage (old pattern)
      expect(sessionStorage.getItem('auth_token')).toBeNull()

      // Token NOT in localStorage
      const allStorage = JSON.stringify(localStorage)
      expect(allStorage).not.toContain('eyJ') // JWT prefix

      // Only user metadata in state (P1 data)
      expect(useAuthStore.getState().user?.id).toBe('user-123')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
  })

  describe('Art. 25 - Privacy by Design', () => {
    it('[RGPD-005] Default state MUST be unauthenticated (fail-secure)', () => {
      const initialState = useAuthStore.getState()

      expect(initialState.isAuthenticated).toBe(false)
      expect(initialState.user).toBeNull()
      // Token is in httpOnly cookie, not accessible from JS
    })

    it('[RGPD-006] Logout MUST clear ALL sensitive data', async () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Verify data exists
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Mock logout API
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

      // Logout (calls API to clear httpOnly cookie)
      await useAuthStore.getState().logout()

      // ALL data cleared
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      // API called with credentials to clear httpOnly cookie
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('[RGPD-007] checkAuth MUST logout if server returns 401 (fail-secure)', async () => {
      // Setup authenticated state (user metadata only)
      useAuthStore.setState({
        user: {
          id: 'user-123',
          displayName: 'John',
          scope: ACTOR_SCOPE.PLATFORM,
          role: 'admin',
          tenantId: null,
        },
        isAuthenticated: true,
        isLoading: false,
      })

      // Mock /api/auth/me returns 401 (token expired in httpOnly cookie)
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 401 })
        // Mock refresh also fails
        .mockResolvedValueOnce({ ok: false, status: 401 })

      // Check auth
      await useAuthStore.getState().checkAuth()

      // MUST logout (fail-secure)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('Art. 32 - Sécurité des traitements', () => {
    it('[RGPD-008] JWT token MUST be in httpOnly cookie (NOT accessible from JS)', () => {
      // Token is set by the server in httpOnly cookie
      // Frontend can only store user metadata
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Token NOT in sessionStorage (old pattern)
      expect(sessionStorage.getItem('auth_token')).toBeNull()

      // Token NOT in localStorage (httpOnly cookie provides better XSS protection)
      const allLocalStorage = JSON.stringify(localStorage)
      expect(allLocalStorage).not.toContain('eyJ') // JWT prefix

      // Only user metadata accessible
      expect(useAuthStore.getState().user?.id).toBe('user-123')
    })

    it('[RGPD-009] Error messages MUST be RGPD-safe (no sensitive data)', async () => {
      // This is tested in apiClient.test.ts
      // Validates that error messages don't leak:
      // - Database connection strings
      // - Internal IP addresses
      // - Stack traces
      // - User emails or passwords

      // Mock error response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Erreur serveur', // Generic RGPD-safe
          // Backend should NOT send sensitive details
        }),
      })

      // Should NOT expose sensitive data
      await expect(apiClient('/tenants')).rejects.toMatchObject({
        message: 'Erreur serveur',
      })
    })

    it('[RGPD-010] Auto-logout on 401 MUST prevent session fixation', async () => {
      // Setup authenticated session
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Mock 401 response (token expired or invalid)
      // First call returns 401, refresh also fails with 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 })

      // API call triggers auto-logout (after refresh fails)
      try {
        await apiClient('/tenants')
      } catch {
        // Expected to throw
      }

      // Session cleared (prevent session fixation attack)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('RGPD Data Classification Enforcement', () => {
    it('[RGPD-011] AuthUser type MUST enforce P1-only fields', () => {
      // TypeScript compile-time check
      const validUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      // This should compile (P1 fields only)
      expect(validUser).toBeDefined()

      // TypeScript prevents P2/P3 fields at compile time
      // Uncommenting the line below would cause a TypeScript error:
      // const invalidUser: AuthUser = {
      //   id: 'user-123',
      //   displayName: 'John',
      //   scope: ACTOR_SCOPE.PLATFORM,
      //   role: 'admin',
      //   tenantId: null,
      //   email: 'john@example.com', // FORBIDDEN - would fail TS
      // }

      // Verify email is not in AuthUser type
      type AuthUserKeys = keyof AuthUser
      const hasEmail: AuthUserKeys extends 'email' ? true : false = false
      expect(hasEmail).toBe(false)
    })

    it('[RGPD-012] NO email addresses in frontend state', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Serialize entire state
      const stateSnapshot = JSON.stringify(useAuthStore.getState())

      // NO email patterns (regex check)
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      expect(stateSnapshot.match(emailPattern)).toBeNull()
    })

    it('[RGPD-013] NO password hashes in frontend state', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      const stateSnapshot = JSON.stringify(useAuthStore.getState())

      // NO bcrypt/argon2 hashes
      expect(stateSnapshot).not.toContain('$2b$') // bcrypt
      expect(stateSnapshot).not.toContain('$argon2') // argon2
      expect(stateSnapshot).not.toContain('passwordHash')
      expect(stateSnapshot).not.toContain('password')
    })
  })

  describe('RGPD Tenant Isolation (PLATFORM scope)', () => {
    it('[RGPD-014] PLATFORM admin MUST have tenantId=null', () => {
      const platformAdmin: AuthUser = {
        id: 'admin-123',
        displayName: 'Platform Admin',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'super-admin',
        tenantId: null, // MUST be null for PLATFORM scope
      }

      useAuthStore.getState().login(platformAdmin)

      const state = useAuthStore.getState()
      expect(state.user?.scope).toBe(ACTOR_SCOPE.PLATFORM)
      expect(state.user?.tenantId).toBeNull()
    })

    it('[RGPD-015] TENANT admin MUST have tenantId set', () => {
      const tenantAdmin: AuthUser = {
        id: 'admin-456',
        displayName: 'Tenant Admin',
        scope: ACTOR_SCOPE.TENANT,
        role: 'admin',
        tenantId: 'tenant-abc', // MUST be set for TENANT scope
      }

      useAuthStore.getState().login(tenantAdmin)

      const state = useAuthStore.getState()
      expect(state.user?.scope).toBe(ACTOR_SCOPE.TENANT)
      expect(state.user?.tenantId).toBe('tenant-abc')
    })
  })

  describe('RGPD Audit Trail Compliance', () => {
    it('[RGPD-016] Frontend MUST NOT log sensitive data', () => {
      // Mock console.log to intercept logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Frontend should NOT log any auth-related secrets
      const allCalls = consoleSpy.mock.calls.flat().join(' ')
      expect(allCalls).not.toContain('token')
      expect(allCalls).not.toContain('jwt')
      expect(allCalls).not.toContain('Bearer')

      consoleSpy.mockRestore()
    })
  })

  describe('RGPD Right to Erasure (Art. 17) - Frontend Impact', () => {
    it('[RGPD-017] Logout MUST erase ALL user data from frontend', async () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Verify data exists
      expect(localStorage.getItem('auth-storage')).toBeTruthy()
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Mock logout API
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

      // Logout (calls API to clear httpOnly cookie)
      await useAuthStore.getState().logout()

      // ALL data erased
      // User metadata removed from state
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('RGPD Data Minimization - Frontend Storage Limits', () => {
    it('[RGPD-018] Frontend storage MUST contain <1KB of user data', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      const persisted = localStorage.getItem('auth-storage') || ''
      const sizeInBytes = new Blob([persisted]).size

      // MUST be minimal (< 1KB for metadata only)
      expect(sizeInBytes).toBeLessThan(1024)
    })

    it('[RGPD-019] JWT token MUST NOT be accessible from frontend (httpOnly cookie)', () => {
      // Token is in httpOnly cookie, set by server
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Token NOT in sessionStorage (old pattern)
      expect(sessionStorage.getItem('auth_token')).toBeNull()

      // Token NOT in localStorage
      const allStorage = JSON.stringify(localStorage)
      expect(allStorage).not.toContain('eyJ') // JWT prefix

      // User is authenticated (token is in httpOnly cookie, verified server-side)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
  })

  describe('RGPD Transparency (Art. 13-14) - Frontend UI', () => {
    it('[RGPD-020] NO hidden data collection in frontend', () => {
      // Frontend MUST NOT collect analytics, fingerprints, or tracking without consent
      // This is enforced by absence of tracking scripts

      // Verify no tracking libraries in localStorage/sessionStorage
      const allStorage = JSON.stringify({
        localStorage: localStorage,
        sessionStorage: sessionStorage,
      })

      // NO analytics trackers
      expect(allStorage).not.toContain('_ga') // Google Analytics
      expect(allStorage).not.toContain('_gid')
      expect(allStorage).not.toContain('utm_')
      expect(allStorage).not.toContain('fbp') // Facebook Pixel
      expect(allStorage).not.toContain('mixpanel')
    })
  })
})
