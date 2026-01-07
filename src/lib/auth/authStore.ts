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
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  checkAuth: () => void
}

/**
 * Authentication Store (Zustand)
 *
 * RGPD Compliance:
 * - JWT token stored in sessionStorage (auto-cleared on browser close)
 * - Only user metadata persisted in localStorage (NO token)
 * - No sensitive data (email, password) stored
 *
 * Security:
 * - Token NOT persisted (sessionStorage only)
 * - Auto-logout on token missing
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      /**
       * Login action
       * Stores JWT in sessionStorage and user info in state
       */
      login: (token: string, user: AuthUser) => {
        // Store token in sessionStorage (cleared on browser close)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth_token', token)
        }
        set({ token, user, isAuthenticated: true })
      },

      /**
       * Logout action
       * Clears token and user info
       */
      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_token')
        }
        set({ token: null, user: null, isAuthenticated: false })
      },

      /**
       * Check authentication status
       * Called on app load to restore session
       */
      checkAuth: () => {
        if (typeof window !== 'undefined') {
          const token = sessionStorage.getItem('auth_token')
          if (!token) {
            get().logout()
          } else {
            // Token exists, restore auth state
            set({ token, isAuthenticated: true })
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user info, NOT token (security best practice)
      partialize: (state) => ({ user: state.user }),
    }
  )
)
