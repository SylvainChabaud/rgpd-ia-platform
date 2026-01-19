'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_ROLE } from '@/shared/actorRole'
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
import { Home, Users, ShieldCheck, FileText, LogOut, Moon, Sun, FileCheck, BookOpen } from 'lucide-react'
import { useTheme } from 'next-themes'
import { NAV_LABELS, ROLE_SUBTITLES } from '@/lib/constants/ui/ui-labels'

// =========================
// Constants
// =========================

const THEME = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;

/**
 * Navigation items for Tenant Admin (TENANT scope)
 * All routes prefixed with /portal/
 * Labels from @/lib/constants/ui/ui-labels.ts
 */
const baseNavItems = [
  {
    href: '/portal/dashboard',
    label: NAV_LABELS.DASHBOARD,
    icon: Home,
  },
  {
    href: '/portal/users',
    label: NAV_LABELS.USERS,
    icon: Users,
  },
  {
    href: '/portal/consents',
    label: NAV_LABELS.CONSENTS,
    icon: ShieldCheck,
  },
  {
    href: '/portal/rgpd',
    label: NAV_LABELS.RGPD,
    icon: FileText,
  },
]

/**
 * DPO-specific navigation items
 * LOT 12.4 - Fonctionnalites DPO
 *
 * RGPD Compliance:
 * - Art. 35: DPIA management
 * - Art. 30: Registre des traitements
 * - Art. 38.3: DPO role independence
 */
const dpoNavItems = [
  {
    href: '/portal/dpia',
    label: NAV_LABELS.DPIA,
    icon: FileCheck,
  },
  {
    href: '/portal/registre',
    label: NAV_LABELS.REGISTRE,
    icon: BookOpen,
  },
]

/**
 * Tenant Sidebar Navigation Component
 * LOT 12.0 - Dashboard Tenant Admin
 * LOT 12.4 - DPO conditional menus
 *
 * RGPD Compliance:
 * - Only displayName shown (P1 data) - NO email
 * - User avatar shows first letter of displayName
 * - No sensitive data in UI
 * - Art. 38.3: DPO menus shown conditionally based on role
 *
 * Features:
 * - Active route highlighting with /portal/ prefix
 * - User menu with logout
 * - Theme toggle (dark/light mode)
 * - DPO-specific navigation items (DPIA, Registre Art. 30)
 */
export function TenantSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  // Build navigation items based on user role
  // LOT 12.4: DPO sees DPIA and Registre menus
  const isDpo = user?.role === ACTOR_ROLE.DPO
  const navItems = isDpo
    ? [...baseNavItems, ...dpoNavItems]
    : baseNavItems

  // Determine subtitle based on role
  const roleSubtitle = isDpo ? ROLE_SUBTITLES.DPO : ROLE_SUBTITLES.TENANT_ADMIN

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-xl font-bold">RGPD Platform</h1>
        <p className="text-sm text-muted-foreground">{roleSubtitle}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          // Check if current path matches or starts with the nav item href
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start">
              <Avatar className="mr-2 h-6 w-6">
                <AvatarFallback className="text-xs">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{user?.displayName || NAV_LABELS.USER_FALLBACK}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{NAV_LABELS.MY_ACCOUNT}</DropdownMenuLabel>
            <DropdownMenuSeparator />
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
    </aside>
  )
}
