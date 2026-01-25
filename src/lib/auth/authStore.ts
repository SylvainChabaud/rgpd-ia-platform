import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserScope } from '@/shared/actorScope'
import { API_AUTH_ROUTES } from '@/lib/constants/routes'
import { STORAGE_KEYS } from '@/lib/constants/cookies'
import { NAV_LABELS } from '@/lib/constants/ui/ui-labels'

/**
 * Validate and sanitize displayName
 * SECURITY: Prevents XSS and injection attacks
 *
 * Rules:
 * - Max 100 characters
 * - Only alphanumeric, spaces, hyphens, underscores, accented chars
 * - Trim whitespace
 * - Return fallback if invalid
 */
const MAX_DISPLAY_NAME_LENGTH = 100;
const VALID_DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}\s\-_'.]+$/u;

function sanitizeDisplayName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return NAV_LABELS.USER_FALLBACK;
  }

  // Trim and limit length
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);

  if (!trimmed) {
    return NAV_LABELS.USER_FALLBACK;
  }

  // Validate pattern (Unicode letters, numbers, spaces, hyphens, underscores, apostrophes, periods)
  if (!VALID_DISPLAY_NAME_PATTERN.test(trimmed)) {
    // Remove invalid characters
    const cleaned = trimmed.replace(/[^\p{L}\p{N}\s\-_'.]/gu, '').trim();
    return cleaned || NAV_LABELS.USER_FALLBACK;
  }

  return trimmed;
}

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
       * SECURITY: Sanitizes displayName to prevent XSS
       */
      login: (user: AuthUser) => {
        const sanitizedUser: AuthUser = {
          ...user,
          displayName: sanitizeDisplayName(user.displayName),
        };
        set({ user: sanitizedUser, isAuthenticated: true, isLoading: false })
      },

      /**
       * Logout action
       * Calls backend to clear httpOnly cookies
       */
      logout: async () => {
        try {
          await fetch(API_AUTH_ROUTES.LOGOUT, {
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
          const response = await fetch(API_AUTH_ROUTES.ME, {
            method: 'GET',
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            // SECURITY: Sanitize displayName from API response
            const sanitizedUser: AuthUser = {
              ...data.user,
              displayName: sanitizeDisplayName(data.user?.displayName),
            };
            set({
              user: sanitizedUser,
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
          const response = await fetch(API_AUTH_ROUTES.REFRESH, {
            method: 'POST',
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            // Update user info if returned
            // SECURITY: Sanitize displayName from refresh response
            if (data.user) {
              set({
                user: {
                  id: data.user.id,
                  displayName: sanitizeDisplayName(get().user?.displayName || data.user.displayName),
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
      name: STORAGE_KEYS.AUTH_STORAGE,
      // Only persist user info (for display), NOT authentication state
      partialize: (state) => ({ user: state.user }),
    }
  )
)
