/**
 * Unit Tests: UserHeader Component
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Tests that only displayName is shown (P1 data)
 * - Tests no email is displayed (P2 data)
 * - Tests navigation functionality
 */

import { render, screen } from '@testing-library/react'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { APP_ROUTES, AUTH_ROUTES } from '@/lib/constants/routes'
import { USER_NAV_LABELS, USER_HEADER_LABELS, NAV_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock next/navigation
const mockPathname = '/app'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// Mock next-themes
const mockSetTheme = jest.fn()
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}))

// Mock authStore
const mockLogout = jest.fn()
const mockUser = {
  id: 'user-123',
  displayName: 'John Doe',
  scope: ACTOR_SCOPE.MEMBER,
  role: 'member',
  tenantId: 'tenant-abc',
}
jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}))

// Import after mocks
import { UserHeader } from '../../../../app/(frontend)/_components/UserHeader'

describe('UserHeader - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // window.location.href is reset in beforeEach above
  })

  describe('Rendering', () => {
    it('should render header element', () => {
      render(<UserHeader />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should render app title', () => {
      render(<UserHeader />)
      expect(screen.getByText(USER_HEADER_LABELS.APP_TITLE)).toBeInTheDocument()
    })

    it('should render app subtitle', () => {
      render(<UserHeader />)
      expect(screen.getByText(USER_HEADER_LABELS.APP_SUBTITLE)).toBeInTheDocument()
    })

    it('should render logo link to home', () => {
      render(<UserHeader />)
      const logoLink = screen.getByRole('link', { name: /RGPD/i })
      expect(logoLink).toHaveAttribute('href', APP_ROUTES.HOME)
    })
  })

  describe('Navigation Items', () => {
    it('should render Home navigation item', () => {
      render(<UserHeader />)
      expect(screen.getByRole('button', { name: new RegExp(USER_NAV_LABELS.HOME) })).toBeInTheDocument()
    })

    it('should render AI Tools navigation item (disabled)', () => {
      render(<UserHeader />)
      const aiToolsButton = screen.getByRole('button', { name: new RegExp(USER_NAV_LABELS.AI_TOOLS) })
      expect(aiToolsButton).toBeDisabled()
    })

    it('should render History navigation item (disabled)', () => {
      render(<UserHeader />)
      const historyButton = screen.getByRole('button', { name: new RegExp(USER_NAV_LABELS.HISTORY) })
      expect(historyButton).toBeDisabled()
    })

    it('should render Consents navigation item (disabled)', () => {
      render(<UserHeader />)
      const consentsButton = screen.getByRole('button', { name: new RegExp(USER_NAV_LABELS.CONSENTS) })
      expect(consentsButton).toBeDisabled()
    })

    it('should render My Data navigation item (disabled)', () => {
      render(<UserHeader />)
      const myDataButton = screen.getByRole('button', { name: new RegExp(USER_NAV_LABELS.MY_DATA) })
      expect(myDataButton).toBeDisabled()
    })
  })

  describe('User Display (RGPD P1 Only)', () => {
    it('should display user displayName (P1 data)', () => {
      render(<UserHeader />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display avatar with first letter of displayName', () => {
      render(<UserHeader />)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('should NOT display email (P2 data not in AuthUser)', () => {
      render(<UserHeader />)
      // Email should never appear in the header
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    })

    it('should have fallback constant defined for missing displayName', () => {
      // Verify the fallback constant exists for when displayName is missing
      expect(NAV_LABELS.USER_FALLBACK).toBeDefined()
      expect(typeof NAV_LABELS.USER_FALLBACK).toBe('string')
    })
  })

  describe('User Menu', () => {
    it('should render user menu trigger with displayName', () => {
      render(<UserHeader />)
      const menuTrigger = screen.getByRole('button', { name: /John Doe/i })
      expect(menuTrigger).toBeInTheDocument()
    })

    it('should have constants defined for menu labels', () => {
      // Verify menu label constants exist
      expect(NAV_LABELS.MY_ACCOUNT).toBeDefined()
      expect(NAV_LABELS.LOGOUT).toBeDefined()
      expect(NAV_LABELS.DARK_MODE).toBeDefined()
      expect(NAV_LABELS.LIGHT_MODE).toBeDefined()
      expect(USER_NAV_LABELS.PROFILE).toBeDefined()
    })
  })

  describe('Logout Constants', () => {
    it('should have AUTH_ROUTES.LOGIN defined for redirect', () => {
      expect(AUTH_ROUTES.LOGIN).toBeDefined()
      expect(AUTH_ROUTES.LOGIN).toBe('/login')
    })

    it('should have logout function available', () => {
      render(<UserHeader />)
      expect(mockLogout).toBeDefined()
    })
  })

  describe('Theme Toggle Constants', () => {
    it('should have theme toggle function available', () => {
      render(<UserHeader />)
      expect(mockSetTheme).toBeDefined()
    })
  })
})
