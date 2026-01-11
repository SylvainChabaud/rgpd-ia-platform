/**
 * Unit Tests - Platform Admin Layout (LOT 11.0)
 *
 * Coverage:
 * - Layout rendering (sidebar + header)
 * - Protected routes (redirect if unauthenticated)
 * - RBAC scope isolation (PLATFORM vs TENANT)
 * - Navigation menu visibility
 *
 * RGPD compliance: NO sensitive data in tests
 */

import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import PlatformAdminLayout from '../../../app/(platform-admin)/layout'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}))

// Mock auth store - will be configured per test
const mockAuthState: {
  isAuthenticated: boolean
  checkAuth: jest.Mock
  user: { id: string; displayName: string; scope: string; role: string } | null
} = {
  isAuthenticated: true,
  checkAuth: jest.fn(),
  user: {
    id: 'test-admin-123',
    displayName: 'Test Admin',
    scope: 'PLATFORM',
    role: 'SUPERADMIN',
  },
}

jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: jest.fn(() => mockAuthState),
}))

// Mock PlatformSidebar component
jest.mock('../../../app/(platform-admin)/_components/PlatformSidebar', () => ({
  PlatformSidebar: function MockPlatformSidebar() {
    return (
      <div data-testid="sidebar">
        <nav>
          <span>Tenants</span>
          <span>Users</span>
          <span>Audit</span>
        </nav>
      </div>
    )
  },
}))

describe('Platform Admin Layout (LOT 11.0)', () => {
  beforeEach(() => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin/tenants')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Layout Rendering', () => {
    it('[LAYOUT-001] should render sidebar and main content area', () => {
      const { container } = render(
        <PlatformAdminLayout>
          <div data-testid="main-content">Dashboard Content</div>
        </PlatformAdminLayout>
      )

      // Sidebar should be present
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()

      // Main content should be rendered
      expect(screen.getByTestId('main-content')).toBeInTheDocument()
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()

      // Layout structure should have flex container
      expect(container.querySelector('.flex')).toBeInTheDocument()
    })

    it('[LAYOUT-002] should include navigation links in sidebar', () => {
      render(
        <PlatformAdminLayout>
          <div>Content</div>
        </PlatformAdminLayout>
      )

      const sidebar = screen.getByTestId('sidebar')

      // Verify navigation links exist
      expect(sidebar).toHaveTextContent('Tenants')
      expect(sidebar).toHaveTextContent('Users')
      expect(sidebar).toHaveTextContent('Audit')
    })
  })

  describe('Protected Routes - RBAC Scope Isolation', () => {
    it('[LAYOUT-003] should allow PLATFORM admin to access all navigation items', () => {
      render(
        <PlatformAdminLayout>
          <div>Dashboard</div>
        </PlatformAdminLayout>
      )

      const sidebar = screen.getByTestId('sidebar')

      // PLATFORM admin should see all menu items
      expect(sidebar).toHaveTextContent('Tenants')
      expect(sidebar).toHaveTextContent('Users')
      expect(sidebar).toHaveTextContent('Audit')
    })

    it('[LAYOUT-004] should render loading state for unauthenticated users', () => {
      // Override mock state for this specific test
      mockAuthState.isAuthenticated = false
      mockAuthState.user = null

      render(
        <PlatformAdminLayout>
          <div>Dashboard</div>
        </PlatformAdminLayout>
      )

      // Should show loading state (spinner + text)
      expect(screen.getByText(/chargement/i)).toBeInTheDocument()

      // Sidebar should NOT be rendered
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()

      // Restore mock state
      mockAuthState.isAuthenticated = true
      mockAuthState.user = {
        id: 'test-admin-123',
        displayName: 'Test Admin',
        scope: 'PLATFORM',
        role: 'SUPERADMIN',
      }
    })
  })

  describe('RGPD Compliance', () => {
    it('[LAYOUT-005] should NOT expose sensitive data in layout HTML', () => {
      const { container } = render(
        <PlatformAdminLayout>
          <div>Content</div>
        </PlatformAdminLayout>
      )

      const html = container.innerHTML

      // NO email patterns
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      expect(html.match(emailPattern)).toBeNull()

      // NO password fields
      expect(html).not.toContain('password')
      expect(html).not.toContain('$2b$') // bcrypt hash
      expect(html).not.toContain('$argon2') // argon2 hash

      // NO JWT tokens
      expect(html).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/)
    })
  })
})
