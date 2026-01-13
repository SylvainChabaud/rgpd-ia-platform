'use client'

// =========================
// Constants
// =========================

const THEME = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;

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
import { Home, Users, Building2, FileText, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

/**
 * Navigation items for Super Admin (Platform scope)
 * All routes prefixed with /admin/
 */
const navItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/admin/tenants',
    label: 'Tenants',
    icon: Building2,
  },
  {
    href: '/admin/users',
    label: 'Utilisateurs',
    icon: Users,
  },
  {
    href: '/admin/audit',
    label: 'Audit & Monitoring',
    icon: FileText,
  },
]

/**
 * Platform Sidebar Navigation Component
 *
 * RGPD Compliance:
 * - Only displayName shown (P1 data) - NO email
 * - User avatar shows first letter of displayName
 * - No sensitive data in UI
 *
 * Features:
 * - Active route highlighting with /admin/ prefix
 * - User menu with logout
 * - Theme toggle (dark/light mode)
 */
export function PlatformSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-xl font-bold">RGPD Platform</h1>
        <p className="text-sm text-muted-foreground">Super Admin</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
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
                  {user?.displayName[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{user?.displayName || 'Admin'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === THEME.DARK ? THEME.LIGHT : THEME.DARK)}>
              {theme === THEME.DARK ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Mode clair
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Mode sombre
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
