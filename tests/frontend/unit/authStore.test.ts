/**
 * Unit Tests: Authentication Store (Zustand)
 *
 * Coverage:
 * - Login/logout functionality
 * - Session persistence
 * - RGPD compliance (P1 data only, sessionStorage for JWT)
 * - Security (no sensitive data persisted)
 */

import { useAuthStore, AuthUser } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'

describe('AuthStore - Unit Tests', () => {
  beforeEach(() => {
    // Clear store before each test
    useAuthStore.getState().logout()
  })

  describe('Initial State', () => {
    it('should have null token and user on init', () => {
      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
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

    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'

    it('should store token in sessionStorage on login', () => {
      useAuthStore.getState().login(mockToken, mockUser)

      const storedToken = sessionStorage.getItem('jwt_token')
      expect(storedToken).toBe(mockToken)
    })

    it('should update state on login', () => {
      useAuthStore.getState().login(mockToken, mockUser)

      const state = useAuthStore.getState()
      expect(state.token).toBe(mockToken)
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should persist user info in localStorage (NOT token)', () => {
      useAuthStore.getState().login(mockToken, mockUser)

      // User info persisted
      const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      expect(persisted.state.user).toEqual(mockUser)

      // Token NOT persisted in localStorage (RGPD security)
      expect(persisted.state.token).toBeUndefined()
    })
  })

  describe('Logout Functionality', () => {
    it('should clear token from sessionStorage on logout', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }
      const mockToken = 'test-token'

      // Login first
      useAuthStore.getState().login(mockToken, mockUser)
      expect(sessionStorage.getItem('jwt_token')).toBe(mockToken)

      // Logout
      useAuthStore.getState().logout()
      expect(sessionStorage.getItem('jwt_token')).toBeNull()
    })

    it('should reset state on logout', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login('test-token', mockUser)
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('checkAuth Functionality', () => {
    it('should restore auth if token exists in sessionStorage', () => {
      const mockToken = 'existing-token'
      sessionStorage.setItem('jwt_token', mockToken)

      useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.token).toBe(mockToken)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should logout if no token in sessionStorage', () => {
      // Set initial authenticated state
      useAuthStore.setState({ token: 'old-token', isAuthenticated: true })

      // Clear sessionStorage
      sessionStorage.removeItem('jwt_token')

      // Check auth
      useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
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

      useAuthStore.getState().login('test-token', mockUser)

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

    it('should store JWT in sessionStorage (cleared on browser close)', () => {
      useAuthStore.getState().login('test-token', {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // Token in sessionStorage (RGPD compliant - auto-cleared)
      expect(sessionStorage.getItem('jwt_token')).toBe('test-token')

      // Token NOT in localStorage (security violation)
      const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      expect(persisted.state?.token).toBeUndefined()
    })

    it('should NOT leak sensitive data in persisted state', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        displayName: 'John Doe',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      }

      useAuthStore.getState().login('sensitive-jwt-token', mockUser)

      const persisted = localStorage.getItem('auth-storage')
      expect(persisted).toBeDefined()

      // Parse persisted data
      const parsed = JSON.parse(persisted!)

      // JWT token MUST NOT be in localStorage
      expect(JSON.stringify(parsed)).not.toContain('sensitive-jwt-token')

      // Only user metadata (P1) should be persisted
      expect(parsed.state.user).toBeDefined()
      expect(parsed.state.token).toBeUndefined()
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

      useAuthStore.getState().login('token', platformUser)

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

      useAuthStore.getState().login('token', tenantUser)

      const state = useAuthStore.getState()
      expect(state.user?.scope).toBe(ACTOR_SCOPE.TENANT)
      expect(state.user?.tenantId).toBe('tenant-abc')
    })
  })
})
