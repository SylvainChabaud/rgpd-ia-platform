import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserScope } from '@/shared/actorScope'

/**
 * Authentication User (P1 data only)
 *
 * RGPD Compliance:
 * - NO email (P2 data)
 * - NO password or sensitive data
 * - Only public metadata (P1)
 */
export interface AuthUser {
  id: string
  displayName: string
  scope: UserScope
  role: string
  tenantId: string | null
}

/**
 * Authentication State
 */
interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: AuthUser) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

/**
 * Authentication Store (Zustand)
 *
 * SECURITY (httpOnly cookies):
 * - JWT token stored in httpOnly cookie (not accessible via JavaScript)
 * - Refresh token also in httpOnly cookie
 * - User metadata persisted in localStorage for display only
 * - Auto-refresh when access token expires
 *
 * RGPD Compliance:
 * - No sensitive data (email, password) stored
 * - Only P1 user metadata persisted
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * Login action
       * Called after successful login API response
       * Token is already in httpOnly cookie, just store user info
       */
      login: (user: AuthUser) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      /**
       * Logout action
       * Calls backend to clear httpOnly cookies
       */
      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch {
          // Ignore errors, clear local state anyway
        }
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      /**
       * Check authentication status
       * Called on app load to verify session with backend
       */
      checkAuth: async () => {
        // Skip if already loading
        if (get().isLoading) return

        set({ isLoading: true })

        try {
          // Try to get user info from /api/auth/me
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false
            })
            return
          }

          // If 401, try to refresh the token
          if (response.status === 401) {
            const refreshed = await get().refreshToken()
            if (refreshed) {
              // Retry checkAuth after successful refresh
              set({ isLoading: false })
              await get().checkAuth()
              return
            }
          }

          // Not authenticated
          set({ user: null, isAuthenticated: false, isLoading: false })
        } catch {
          // Network error - assume not authenticated
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      /**
       * Refresh access token using refresh token
       * Returns true if refresh was successful
       */
      refreshToken: async () => {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            // Update user info if returned
            if (data.user) {
              set({
                user: {
                  id: data.user.id,
                  displayName: get().user?.displayName || '',
                  scope: data.user.scope,
                  role: data.user.role,
                  tenantId: data.user.tenantId,
                },
                isAuthenticated: true
              })
            }
            return true
          }

          return false
        } catch {
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user info (for display), NOT authentication state
      partialize: (state) => ({ user: state.user }),
    }
  )
)
