/**
 * Unit Tests: Authentication Store (Zustand)
 *
 * Coverage:
 * - Login/logout functionality
 * - Session verification via API (httpOnly cookies)
 * - RGPD compliance (P1 data only, httpOnly cookies for JWT)
 * - Security (no sensitive data persisted)
 */

import { useAuthStore, AuthUser } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { API_AUTH_ROUTES } from '@/lib/constants/routes'
import { STORAGE_KEYS } from '@/lib/constants/cookies'
import { NAV_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock fetch
global.fetch = jest.fn()

describe('AuthStore - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state (sync logout without API call)
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Initial State', () => {
    it('should have null user on init', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Login Functionality', () => {
    const mockUser: AuthUser = {
      id: 'user-123',
      displayName: 'John Doe',
      scope: ACTOR_SCOPE.PLATFORM,
      role: 'admin',
      tenantId: null,
    }

    it('should update state on login (token is in httpOnly cookie)', () => {
      useAuthStore.getState().login(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should persist user info in localStorage (for display only)', () => {
      useAuthStore.getState().login(mockUser)

      // User info persisted
      const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      expect(persisted.state.user).toEqual(mockUser)
    })
  })

  describe('Logout Functionality', () => {
    it('should call logout API and reset state', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      // Login first
      useAuthStore.getState().login(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Mock logout API
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

      // Logout
      await useAuthStore.getState().logout()

      // Should call logout API with credentials
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should reset state even if logout API fails', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(mockUser)

      // Mock logout API failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      // Logout should still work
      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('checkAuth Functionality', () => {
    it('should call /api/auth/me and update state on success', async () => {
      const mockUserResponse = {
        user: {
          id: 'user-123',
          displayName: 'John Doe',
          scope: ACTOR_SCOPE.PLATFORM,
          role: 'admin',
          tenantId: null,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUserResponse,
      })

      await useAuthStore.getState().checkAuth()

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUserResponse.user)
    })

    it('should try refresh token on 401 from /api/auth/me', async () => {
      // First call to /api/auth/me returns 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Then refresh token call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-123', scope: 'PLATFORM', role: 'admin', tenantId: null },
          }),
        })
        // Then retry /api/auth/me succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: 'user-123',
              displayName: 'John Doe',
              scope: ACTOR_SCOPE.PLATFORM,
              role: 'admin',
              tenantId: null,
            },
          }),
        })

      await useAuthStore.getState().checkAuth()

      // Should have called /api/auth/me, then /api/auth/refresh
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object))
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('should set isAuthenticated to false if refresh fails', async () => {
      // /api/auth/me returns 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh token also fails
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('refreshToken Functionality', () => {
    it('should call /api/auth/refresh and return true on success', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', scope: 'PLATFORM', role: 'admin', tenantId: null },
        }),
      })

      const result = await useAuthStore.getState().refreshToken()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('should return false if refresh fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      })

      const result = await useAuthStore.getState().refreshToken()

      expect(result).toBe(false)
    })
  })

  describe('RGPD Compliance Tests', () => {
    it('should ONLY store P1 data (no email, no password)', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(mockUser)

      const state = useAuthStore.getState()

      // P1 data allowed
      expect(state.user?.id).toBeDefined()
      expect(state.user?.displayName).toBeDefined()
      expect(state.user?.scope).toBeDefined()
      expect(state.user?.role).toBeDefined()

      // P2/P3 data MUST NOT exist
      const userRecord = state.user as unknown as Record<string, unknown>
      expect(userRecord.email).toBeUndefined()
      expect(userRecord.password).toBeUndefined()
      expect(userRecord.passwordHash).toBeUndefined()
    })

    it('should NOT have token in state (token is in httpOnly cookie)', () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // State should not have token property
      const state = useAuthStore.getState()
      const stateRecord = state as unknown as Record<string, unknown>
      expect(stateRecord.token).toBeUndefined()
    })

    it('should NOT leak sensitive data in persisted state', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(mockUser)

      const persisted = localStorage.getItem('auth-storage')
      expect(persisted).toBeDefined()

      // Parse persisted data
      const parsed = JSON.parse(persisted!)

      // Only user metadata (P1) should be persisted
      expect(parsed.state.user).toBeDefined()

      // No sensitive data should be in localStorage
      expect(JSON.stringify(parsed)).not.toContain('password')
      expect(JSON.stringify(parsed)).not.toContain('token')
    })
  })

  describe('Security Tests', () => {
    it('should handle PLATFORM scope users', () => {
      const platformUser: AuthUser = {
        id: 'admin-123',
        displayName: 'Platform Admin',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'super-admin',
        tenantId: null,
      }

      useAuthStore.getState().login(platformUser)

      const state = useAuthStore.getState()
      expect(state.user?.scope).toBe(ACTOR_SCOPE.PLATFORM)
      expect(state.user?.tenantId).toBeNull()
    })

    it('should handle TENANT scope users', () => {
      const tenantUser: AuthUser = {
        id: 'user-456',
        displayName: 'Tenant User',
        scope: ACTOR_SCOPE.TENANT,
        role: 'admin',
        tenantId: 'tenant-abc',
      }

      useAuthStore.getState().login(tenantUser)

      const state = useAuthStore.getState()
      expect(state.user?.scope).toBe(ACTOR_SCOPE.TENANT)
      expect(state.user?.tenantId).toBe('tenant-abc')
    })
  })

  describe('DisplayName Sanitization (XSS Prevention)', () => {
    it('should sanitize XSS script tags in displayName on login', () => {
      const maliciousUser: AuthUser = {
        id: 'user-xss',
        displayName: '<script>alert("xss")</script>',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(maliciousUser)

      const state = useAuthStore.getState()
      // Script tags should be removed, leaving "alertxss"
      expect(state.user?.displayName).not.toContain('<script>')
      expect(state.user?.displayName).not.toContain('</script>')
      expect(state.user?.displayName).not.toContain('<')
      expect(state.user?.displayName).not.toContain('>')
    })

    it('should sanitize HTML injection attempts', () => {
      const maliciousUser: AuthUser = {
        id: 'user-html',
        displayName: '<img src=x onerror=alert(1)>',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(maliciousUser)

      const state = useAuthStore.getState()
      // SECURITY: HTML tags and special chars are stripped
      expect(state.user?.displayName).not.toContain('<')
      expect(state.user?.displayName).not.toContain('>')
      expect(state.user?.displayName).not.toContain('=')
      // Result is safe text: "img srcx onerroralert1" (harmless as plain text)
    })

    it('should truncate displayName exceeding max length (100 chars)', () => {
      const longName = 'A'.repeat(150)
      const userWithLongName: AuthUser = {
        id: 'user-long',
        displayName: longName,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(userWithLongName)

      const state = useAuthStore.getState()
      expect(state.user?.displayName.length).toBeLessThanOrEqual(100)
    })

    it('should return fallback for null displayName', () => {
      const userWithNull: AuthUser = {
        id: 'user-null',
        displayName: null as unknown as string,
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(userWithNull)

      const state = useAuthStore.getState()
      expect(state.user?.displayName).toBe(NAV_LABELS.USER_FALLBACK)
    })

    it('should return fallback for empty displayName', () => {
      const userWithEmpty: AuthUser = {
        id: 'user-empty',
        displayName: '   ',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(userWithEmpty)

      const state = useAuthStore.getState()
      expect(state.user?.displayName).toBe(NAV_LABELS.USER_FALLBACK)
    })

    it('should preserve valid Unicode characters (accents)', () => {
      const userWithAccents: AuthUser = {
        id: 'user-unicode',
        displayName: 'José García-López',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(userWithAccents)

      const state = useAuthStore.getState()
      expect(state.user?.displayName).toBe('José García-López')
    })

    it('should preserve apostrophes and periods in names', () => {
      const userWithPunctuation: AuthUser = {
        id: 'user-punct',
        displayName: "Dr. O'Brien Jr.",
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(userWithPunctuation)

      const state = useAuthStore.getState()
      expect(state.user?.displayName).toBe("Dr. O'Brien Jr.")
    })

    it('should sanitize displayName from checkAuth API response', async () => {
      const maliciousResponse = {
        user: {
          id: 'user-api-xss',
          displayName: '<div onclick="hack()">Evil</div>',
          scope: ACTOR_SCOPE.PLATFORM,
          role: 'admin',
          tenantId: null,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => maliciousResponse,
      })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      // SECURITY: HTML tags and special chars are stripped
      expect(state.user?.displayName).not.toContain('<')
      expect(state.user?.displayName).not.toContain('>')
      expect(state.user?.displayName).not.toContain('"')
      // Result is safe text: "div onclickhackEvildiv" (harmless as plain text)
    })

    it('should sanitize displayName from refreshToken API response', async () => {
      // First login with a valid user
      const validUser: AuthUser = {
        id: 'user-refresh',
        displayName: 'ValidName',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }
      useAuthStore.getState().login(validUser)

      // Mock refresh response with malicious displayName
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: 'user-refresh',
            displayName: '"><script>steal()</script>',
            scope: ACTOR_SCOPE.PLATFORM,
            role: 'admin',
            tenantId: null,
          },
        }),
      })

      await useAuthStore.getState().refreshToken()

      const state = useAuthStore.getState()
      expect(state.user?.displayName).not.toContain('<script>')
    })
  })

  describe('API Routes Constants Usage', () => {
    it('should use API_AUTH_ROUTES.LOGOUT constant', async () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'Test',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

      await useAuthStore.getState().logout()

      expect(global.fetch).toHaveBeenCalledWith(API_AUTH_ROUTES.LOGOUT, {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('should use API_AUTH_ROUTES.ME constant', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'user-123',
            displayName: 'Test',
            scope: ACTOR_SCOPE.PLATFORM,
            role: 'admin',
            tenantId: null,
          },
        }),
      })

      await useAuthStore.getState().checkAuth()

      expect(global.fetch).toHaveBeenCalledWith(API_AUTH_ROUTES.ME, {
        method: 'GET',
        credentials: 'include',
      })
    })

    it('should use API_AUTH_ROUTES.REFRESH constant', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', scope: 'PLATFORM', role: 'admin', tenantId: null },
        }),
      })

      await useAuthStore.getState().refreshToken()

      expect(global.fetch).toHaveBeenCalledWith(API_AUTH_ROUTES.REFRESH, {
        method: 'POST',
        credentials: 'include',
      })
    })
  })

  describe('Storage Keys Constants Usage', () => {
    it('should persist user info with STORAGE_KEYS.AUTH_STORAGE key', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login(mockUser)

      const persisted = localStorage.getItem(STORAGE_KEYS.AUTH_STORAGE)
      expect(persisted).toBeDefined()
      expect(JSON.parse(persisted!).state.user).toEqual(mockUser)
    })
  })
})
