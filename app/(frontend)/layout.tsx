'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { AUTH_ROUTES, ADMIN_ROUTES, PORTAL_ROUTES } from '@/lib/constants/routes'

/**
 * Frontend User Layout - End User Routes (/app/*)
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
 * - Cookie Banner integration (LOT 13.0)
 *
 * Routes:
 * - /app/* - Protected (requires MEMBER auth)
 *
 * Note: This is a placeholder layout for EPIC 13 implementation.
 * The full layout with Cookie Banner will be created in LOT 13.0.
 */
export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, checkAuth, user } = useAuthStore()

  useEffect(() => {
    // Verify session with backend (token is in httpOnly cookie)
    checkAuth()

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
  }, [isAuthenticated, checkAuth, router, user])

  // Show loading while checking auth
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Placeholder layout - Full layout with header, footer, cookie banner in EPIC 13
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header will be added in LOT 13.0 */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">RGPD Platform</h1>
          <p className="text-sm text-muted-foreground">User Interface</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer will be added in LOT 13.0 */}
      <footer className="border-t bg-muted/40">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          RGPD Platform - Interface Utilisateur (EPIC 13)
        </div>
      </footer>

      {/* Cookie Banner will be added in LOT 13.0 */}
    </div>
  )
}
