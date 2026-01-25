'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { AUTH_ROUTES, ADMIN_ROUTES, PORTAL_ROUTES } from '@/lib/constants/routes'
import { USER_LOADING_LABELS } from '@/lib/constants/ui/ui-labels'
import { UserHeader } from './_components/UserHeader'
import { UserFooter } from './_components/UserFooter'

/**
 * Frontend User Layout - End User Routes (/app/*)
 * LOT 13.0 - Authentification & Layout User
 *
 * Security:
 * - Requires MEMBER scope
 * - Redirects to /login if not authenticated
 * - Redirects PLATFORM users to /admin
 * - Redirects TENANT users to /portal
 *
 * RGPD Compliance:
 * - No sensitive data in layout
 * - JWT token in httpOnly cookie (XSS-safe)
 * - User-scoped data only
 * - Cookie Banner integration (Art. 7, ePrivacy)
 * - Legal page links in footer (Art. 13/14)
 *
 * Routes:
 * - /app/* - Protected (requires MEMBER auth)
 */
export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, checkAuth, user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Verify session with backend (token is in httpOnly cookie)
    // Note: checkAuth is stable from Zustand store, but we use empty deps
    // to ensure this runs exactly once on mount
    const verifyAuth = async () => {
      await checkAuth()
      setIsChecking(false)
    }
    verifyAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Only check redirects after initial auth check is complete
    if (isChecking) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(AUTH_ROUTES.LOGIN)
      return
    }

    // Check MEMBER scope - redirect other scopes to their interfaces
    if (user?.scope === ACTOR_SCOPE.PLATFORM) {
      router.push(ADMIN_ROUTES.BASE)
      return
    }

    if (user?.scope === ACTOR_SCOPE.TENANT) {
      router.push(PORTAL_ROUTES.BASE)
      return
    }

    // If scope is not MEMBER (e.g., undefined or invalid), redirect to login
    if (user?.scope !== ACTOR_SCOPE.MEMBER) {
      router.push(AUTH_ROUTES.LOGIN)
      return
    }
  }, [isChecking, isAuthenticated, router, user])

  /**
   * Defense in Depth - Triple condition guard
   *
   * This guard combines 3 conditions intentionally:
   * 1. isChecking: Prevents content flash during async auth verification
   * 2. !isAuthenticated: Blocks unauthenticated users (belt to middleware's suspenders)
   * 3. scope !== MEMBER: Ensures only MEMBER users see this layout
   *
   * SECURITY: This client-side check complements server-side middleware protection.
   * Even if middleware fails or JS is manipulated, children won't render without
   * proper auth state. The redirect useEffect handles navigation, this guard
   * handles rendering.
   */
  if (isChecking || !isAuthenticated || user?.scope !== ACTOR_SCOPE.MEMBER) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">{USER_LOADING_LABELS.VERIFICATION}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with navigation */}
      <UserHeader />

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer with legal links */}
      <UserFooter />

      {/* Cookie Consent Banner is in global Providers (RGPD Art. 7, ePrivacy) */}
    </div>
  )
}
