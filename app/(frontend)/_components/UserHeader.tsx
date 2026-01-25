'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Home, Sparkles, History, ShieldCheck, Database, User, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { APP_ROUTES, AUTH_ROUTES } from '@/lib/constants/routes'
import { USER_NAV_LABELS, USER_HEADER_LABELS, NAV_LABELS } from '@/lib/constants/ui/ui-labels'

// =========================
// Constants
// =========================

const THEME = {
  DARK: 'dark',
  LIGHT: 'light',
} as const

/**
 * Navigation items for End User (MEMBER scope)
 * All routes prefixed with /app/
 * Labels from @/lib/constants/ui/ui-labels.ts
 *
 * LOT 13.0: Only Home enabled, others disabled (pending LOT 13.1-13.4)
 */
const navItems = [
  {
    href: APP_ROUTES.HOME,
    label: USER_NAV_LABELS.HOME,
    icon: Home,
    disabled: false, // LOT 13.0
  },
  {
    href: APP_ROUTES.AI_TOOLS,
    label: USER_NAV_LABELS.AI_TOOLS,
    icon: Sparkles,
    disabled: true, // LOT 13.1
  },
  {
    href: APP_ROUTES.HISTORY,
    label: USER_NAV_LABELS.HISTORY,
    icon: History,
    disabled: true, // LOT 13.2
  },
  {
    href: APP_ROUTES.CONSENTS,
    label: USER_NAV_LABELS.CONSENTS,
    icon: ShieldCheck,
    disabled: true, // LOT 13.3
  },
  {
    href: APP_ROUTES.MY_DATA,
    label: USER_NAV_LABELS.MY_DATA,
    icon: Database,
    disabled: true, // LOT 13.4
  },
]

/**
 * User Header Navigation Component
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Only displayName shown (P1 data) - NO email
 * - User avatar shows first letter of displayName
 * - No sensitive data in UI
 *
 * Features:
 * - Horizontal navigation (distinct from sidebar pattern)
 * - Active route highlighting with /app/ prefix
 * - User menu with logout
 * - Theme toggle (dark/light mode)
 * - Disabled items for pending LOTs (13.1-13.4)
 */
export function UserHeader() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    window.location.href = AUTH_ROUTES.LOGIN
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo & Title */}
        <Link href={APP_ROUTES.HOME} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">{USER_HEADER_LABELS.APP_TITLE}</h1>
            <p className="text-xs text-muted-foreground">{USER_HEADER_LABELS.APP_SUBTITLE}</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            // Check if current path matches or starts with the nav item href
            const isActive = pathname === item.href ||
              (item.href !== APP_ROUTES.HOME && pathname.startsWith(item.href + '/'))

            if (item.disabled) {
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="text-muted-foreground cursor-not-allowed opacity-50"
                  disabled
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              )
            }

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline truncate max-w-[150px]">
                {user?.displayName || NAV_LABELS.USER_FALLBACK}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{NAV_LABELS.MY_ACCOUNT}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href={APP_ROUTES.PROFILE}>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {USER_NAV_LABELS.PROFILE}
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={() => setTheme(theme === THEME.DARK ? THEME.LIGHT : THEME.DARK)}>
              {theme === THEME.DARK ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  {NAV_LABELS.LIGHT_MODE}
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  {NAV_LABELS.DARK_MODE}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {NAV_LABELS.LOGOUT}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
