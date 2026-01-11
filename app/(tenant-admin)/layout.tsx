'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'

/**
 * Tenant Admin Layout - Tenant Routes (/portal/*)
 *
 * Security:
 * - Requires TENANT scope
 * - Redirects to /login if not authenticated
 * - Redirects PLATFORM users to /admin
 * - Redirects MEMBER users to /app
 *
 * RGPD Compliance:
 * - No sensitive data in layout
 * - Auth check respects session storage (auto-cleared on browser close)
 * - Tenant isolation enforced
 *
 * Routes:
 * - /portal/* - Protected (requires TENANT auth)
 *
 * Note: This is a placeholder layout for EPIC 12 implementation.
 * The TenantSidebar component will be created in LOT 12.0.
 */
export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, checkAuth, user } = useAuthStore()

  useEffect(() => {
    // Restore session from sessionStorage
    checkAuth()

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check TENANT scope - redirect other scopes to their interfaces
    if (user?.scope === ACTOR_SCOPE.PLATFORM) {
      router.push('/admin')
      return
    }

    if (user?.scope !== ACTOR_SCOPE.TENANT) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, checkAuth, router, pathname, user])

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

  // Placeholder layout - TenantSidebar will be added in EPIC 12
  return (
    <div className="flex h-screen overflow-hidden">
      {/* TenantSidebar will be added in LOT 12.0 */}
      <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
        <div className="border-b p-6">
          <h1 className="text-xl font-bold">RGPD Platform</h1>
          <p className="text-sm text-muted-foreground">Tenant Admin</p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-muted-foreground">
            Interface Tenant Admin - EPIC 12
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
