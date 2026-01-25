/**
 * Unit Tests: UserFooter Component
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Art. 13/14: Tests privacy policy link
 * - Art. 7: Tests cookie management functionality
 * - ePrivacy Directive: Tests cookie settings access
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { LEGAL_ROUTES } from '@/lib/constants/routes'
import { USER_FOOTER_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock CookieBannerContext
const mockOpenBanner = jest.fn()
jest.mock('@/lib/contexts/CookieBannerContext', () => ({
  useCookieBanner: () => ({
    openBanner: mockOpenBanner,
  }),
}))

// Import after mocks
import { UserFooter } from '../../../../app/(frontend)/_components/UserFooter'

describe('UserFooter - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render footer element', () => {
      render(<UserFooter />)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('should render navigation element', () => {
      render(<UserFooter />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('Legal Links (RGPD Art. 13/14)', () => {
    it('should render Privacy Policy link', () => {
      render(<UserFooter />)
      const link = screen.getByRole('link', { name: USER_FOOTER_LABELS.PRIVACY })
      expect(link).toHaveAttribute('href', LEGAL_ROUTES.PRIVACY_POLICY)
    })

    it('should render Terms of Service link', () => {
      render(<UserFooter />)
      const link = screen.getByRole('link', { name: USER_FOOTER_LABELS.TERMS })
      expect(link).toHaveAttribute('href', LEGAL_ROUTES.TERMS_OF_SERVICE)
    })

    it('should render RGPD Info link', () => {
      render(<UserFooter />)
      const link = screen.getByRole('link', { name: USER_FOOTER_LABELS.RGPD_INFO })
      expect(link).toHaveAttribute('href', LEGAL_ROUTES.RGPD_INFO)
    })
  })

  describe('Cookie Management (Art. 7, ePrivacy)', () => {
    it('should render Manage Cookies button', () => {
      render(<UserFooter />)
      expect(screen.getByRole('button', { name: new RegExp(USER_FOOTER_LABELS.MANAGE_COOKIES) })).toBeInTheDocument()
    })

    it('should call openBanner(true) when Manage Cookies is clicked', () => {
      render(<UserFooter />)
      const button = screen.getByRole('button', { name: new RegExp(USER_FOOTER_LABELS.MANAGE_COOKIES) })

      fireEvent.click(button)

      expect(mockOpenBanner).toHaveBeenCalledWith(true)
    })

    it('should open banner with settings panel (withSettings=true)', () => {
      render(<UserFooter />)
      const button = screen.getByRole('button', { name: new RegExp(USER_FOOTER_LABELS.MANAGE_COOKIES) })

      fireEvent.click(button)

      // First argument should be true to show settings directly
      expect(mockOpenBanner).toHaveBeenCalledTimes(1)
      expect(mockOpenBanner.mock.calls[0][0]).toBe(true)
    })
  })

  describe('Copyright', () => {
    it('should render copyright notice', () => {
      render(<UserFooter />)
      expect(screen.getByText(USER_FOOTER_LABELS.COPYRIGHT)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have all legal links accessible via keyboard navigation', () => {
      render(<UserFooter />)

      const privacyLink = screen.getByRole('link', { name: USER_FOOTER_LABELS.PRIVACY })
      const termsLink = screen.getByRole('link', { name: USER_FOOTER_LABELS.TERMS })
      const rgpdLink = screen.getByRole('link', { name: USER_FOOTER_LABELS.RGPD_INFO })
      const cookieButton = screen.getByRole('button', { name: new RegExp(USER_FOOTER_LABELS.MANAGE_COOKIES) })

      // All elements should be focusable
      expect(privacyLink).not.toHaveAttribute('tabindex', '-1')
      expect(termsLink).not.toHaveAttribute('tabindex', '-1')
      expect(rgpdLink).not.toHaveAttribute('tabindex', '-1')
      expect(cookieButton).not.toHaveAttribute('tabindex', '-1')
    })
  })
})
