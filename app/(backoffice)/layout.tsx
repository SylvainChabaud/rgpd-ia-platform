'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { Sidebar } from './_components/Sidebar'

/**
 * Back Office Layout - Protected Routes
 *
 * Security:
 * - Checks authentication on mount
 * - Redirects to login if not authenticated
 * - Checks PLATFORM scope (redirects TENANT users)
 * - Restores session from sessionStorage
 *
 * RGPD Compliance:
 * - No sensitive data in layout
 * - Auth check respects session storage (auto-cleared on browser close)
 *
 * Routes:
 * - /login - Public (login form)
 * - /* - Protected (requires PLATFORM auth)
 */
export default function BackofficeLayout({
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

    // Allow login page without auth
    if (pathname === '/login') {
      return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check PLATFORM scope
    if (user?.scope !== ACTOR_SCOPE.PLATFORM) {
      // Redirect TENANT users to their tenant interface (EPIC 12)
      router.push('/')
    }
  }, [isAuthenticated, checkAuth, router, pathname, user])

  // Login page: no sidebar, just content
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Protected pages: show loading while checking auth
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

  // Protected pages: sidebar + content
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
