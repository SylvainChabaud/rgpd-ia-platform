'use client'

/**
 * Legal Header Component
 * Conditional header for legal pages (CGU, Politique de confidentialité, etc.)
 *
 * RGPD Compliance:
 * - Legal pages are public (accessible without authentication)
 * - Authenticated users see full navigation for seamless UX
 * - Non-authenticated users see minimal header with login link
 *
 * LOT 13.0 - Layout consistency across app
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { AUTH_ROUTES } from '@/lib/constants/routes'
import { UserHeader } from '@app/(frontend)/_components/UserHeader'

interface AuthCheckResponse {
  user: {
    id: string
    scope: string
  }
}

/**
 * Minimal header for non-authenticated users
 */
function MinimalHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">RGPD IA Platform</h1>
            <p className="text-xs text-muted-foreground">Conformité & Protection des données</p>
          </div>
        </Link>

        {/* Login Button */}
        <Link href={AUTH_ROUTES.LOGIN}>
          <Button variant="outline" className="gap-2">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Se connecter</span>
          </Button>
        </Link>
      </div>
    </header>
  )
}

/**
 * Legal Header - Conditional display based on authentication
 *
 * - Checks /api/auth/me to determine auth status
 * - Shows UserHeader if authenticated
 * - Shows MinimalHeader if not authenticated
 */
export function LegalHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (response.ok) {
          const data: AuthCheckResponse = await response.json()
          setIsAuthenticated(!!data.user)
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  // Loading state - show minimal header to avoid layout shift
  if (isAuthenticated === null) {
    return <MinimalHeader />
  }

  // Authenticated - show full navigation
  if (isAuthenticated) {
    return <UserHeader />
  }

  // Not authenticated - show minimal header
  return <MinimalHeader />
}
