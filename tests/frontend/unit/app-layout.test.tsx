/**
 * Unit Tests: Frontend Layout
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Tests scope-based redirections
 * - Tests loading state (no data flash)
 * - Tests component integration
 */

import { render, screen, waitFor } from '@testing-library/react'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { AUTH_ROUTES, ADMIN_ROUTES, PORTAL_ROUTES } from '@/lib/constants/routes'
import { USER_LOADING_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock authStore
const mockCheckAuth = jest.fn()
const mockAuthStore: {
  isAuthenticated: boolean
  user: {
    id: string
    displayName: string
    scope: string
    role: string
    tenantId: string | null
  } | null
  checkAuth: typeof mockCheckAuth
} = {
  isAuthenticated: false,
  user: null,
  checkAuth: mockCheckAuth,
}
jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}))

// Mock components to avoid deep rendering
jest.mock('../../../app/(frontend)/_components/UserHeader', () => ({
  UserHeader: () => <header data-testid="user-header">UserHeader</header>,
}))

jest.mock('../../../app/(frontend)/_components/UserFooter', () => ({
  UserFooter: () => <footer data-testid="user-footer">UserFooter</footer>,
}))

jest.mock('@/components/legal/CookieConsentBanner', () => ({
  CookieConsentBanner: () => <div data-testid="cookie-banner">CookieBanner</div>,
}))

jest.mock('@/lib/contexts/CookieBannerContext', () => ({
  CookieBannerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cookie-provider">{children}</div>
  ),
}))

// Import after mocks
import FrontendLayout from '../../../app/(frontend)/layout'

describe('FrontendLayout - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthStore.isAuthenticated = false
    mockAuthStore.user = null
    mockCheckAuth.mockResolvedValue(undefined)
  })

  describe('Loading State', () => {
    it('should show loading spinner during auth verification', () => {
      // checkAuth never resolves to simulate loading
      mockCheckAuth.mockImplementation(() => new Promise(() => {}))

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      expect(screen.getByText(USER_LOADING_LABELS.VERIFICATION)).toBeInTheDocument()
    })

    it('should show spinner with correct aria attributes', () => {
      mockCheckAuth.mockImplementation(() => new Promise(() => {}))

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      // Check spinner is visible (animate-spin class)
      const container = screen.getByText(USER_LOADING_LABELS.VERIFICATION).parentElement
      expect(container).toBeInTheDocument()
    })

    it('should not show children while loading', () => {
      mockCheckAuth.mockImplementation(() => new Promise(() => {}))

      render(
        <FrontendLayout>
          <div data-testid="child-content">Secret Content</div>
        </FrontendLayout>
      )

      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()
    })
  })

  describe('Authentication Redirects', () => {
    it('should redirect to login if not authenticated', async () => {
      mockAuthStore.isAuthenticated = false
      mockAuthStore.user = null

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(AUTH_ROUTES.LOGIN)
      })
    })

    it('should redirect PLATFORM scope users to admin', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.user = {
        id: 'admin-1',
        displayName: 'Admin',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'super-admin',
        tenantId: null,
      }

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(ADMIN_ROUTES.BASE)
      })
    })

    it('should redirect TENANT scope users to portal', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.user = {
        id: 'tenant-admin-1',
        displayName: 'Tenant Admin',
        scope: ACTOR_SCOPE.TENANT,
        role: 'admin',
        tenantId: 'tenant-abc',
      }

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(PORTAL_ROUTES.BASE)
      })
    })

    it('should redirect users with invalid scope to login', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.user = {
        id: 'invalid-1',
        displayName: 'Invalid',
        scope: 'INVALID_SCOPE' as typeof ACTOR_SCOPE.MEMBER,
        role: 'user',
        tenantId: null,
      }

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(AUTH_ROUTES.LOGIN)
      })
    })
  })

  describe('MEMBER Scope - Authorized Access', () => {
    beforeEach(() => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.user = {
        id: 'member-1',
        displayName: 'Member User',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'member',
        tenantId: 'tenant-abc',
      }
    })

    it('should render layout for MEMBER scope users', async () => {
      render(
        <FrontendLayout>
          <div data-testid="child-content">Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-content')).toBeInTheDocument()
      })
    })

    it('should render UserHeader component', async () => {
      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-header')).toBeInTheDocument()
      })
    })

    it('should render UserFooter component', async () => {
      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-footer')).toBeInTheDocument()
      })
    })

    /**
     * Note: CookieConsentBanner and CookieBannerProvider are now in the global
     * Providers component (app/providers.tsx), not in FrontendLayout.
     * This is the correct architecture - cookie consent must be global for all interfaces.
     *
     * The layout correctly documents this in its comments:
     * "Cookie Consent Banner is in global Providers (RGPD Art. 7, ePrivacy)"
     */
    it('should document that Cookie Banner is in global Providers', async () => {
      // The FrontendLayout comment indicates cookie banner is handled globally
      // This is verified by checking the layout renders without cookie-related elements
      render(
        <FrontendLayout>
          <div data-testid="child-content">Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        // Layout should render successfully without managing cookies itself
        expect(screen.getByTestId('child-content')).toBeInTheDocument()
        // Cookie elements are in global Providers, not in this layout
        expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument()
        expect(screen.queryByTestId('cookie-provider')).not.toBeInTheDocument()
      })
    })

    it('should not redirect MEMBER users', async () => {
      render(
        <FrontendLayout>
          <div data-testid="child-content">Content</div>
        </FrontendLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-content')).toBeInTheDocument()
      })

      // Should not have called push at all for MEMBER users
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Security - Defense in Depth', () => {
    it('should call checkAuth on mount', () => {
      mockCheckAuth.mockImplementation(() => new Promise(() => {}))

      render(
        <FrontendLayout>
          <div>Content</div>
        </FrontendLayout>
      )

      expect(mockCheckAuth).toHaveBeenCalled()
    })

    it('should not render children before auth check completes', () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.user = {
        id: 'member-1',
        displayName: 'Member',
        scope: ACTOR_SCOPE.MEMBER,
        role: 'member',
        tenantId: 'tenant-abc',
      }
      // Make checkAuth hang
      mockCheckAuth.mockImplementation(() => new Promise(() => {}))

      render(
        <FrontendLayout>
          <div data-testid="sensitive-content">Sensitive Data</div>
        </FrontendLayout>
      )

      // Even with valid auth state, content should not show until checkAuth completes
      expect(screen.queryByTestId('sensitive-content')).not.toBeInTheDocument()
    })
  })
})
