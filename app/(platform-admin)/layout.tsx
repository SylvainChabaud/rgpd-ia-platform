'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { PlatformSidebar } from './_components/PlatformSidebar'

/**
 * Platform Admin Layout - Super Admin Routes (/admin/*)
 *
 * Security:
 * - Requires PLATFORM scope
 * - Redirects to /login if not authenticated
 * - Redirects TENANT users to /portal
 * - Redirects MEMBER users to /app
 *
 * RGPD Compliance:
 * - No sensitive data in layout
 * - Auth check respects session storage (auto-cleared on browser close)
 *
 * Routes:
 * - /admin/* - Protected (requires PLATFORM auth)
 */
export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, checkAuth, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session from sessionStorage
    checkAuth()
    // Allow state to settle before checking auth
    setIsLoading(false)
  }, [checkAuth])

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check PLATFORM scope - redirect other scopes to their interfaces
    if (user?.scope === ACTOR_SCOPE.TENANT) {
      router.push('/portal')
      return
    }

    if (user?.scope !== ACTOR_SCOPE.PLATFORM) {
      router.push('/login')
      return
    }
  }, [isLoading, isAuthenticated, router, pathname, user])

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Protected pages: sidebar + content
  return (
    <div className="flex h-screen overflow-hidden">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
