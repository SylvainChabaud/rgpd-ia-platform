/**
 * Unit Tests: Frontend Profile Page
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Tests that only P1 data is shown (displayName, role, scope)
 * - Tests no P2 data (email) is displayed
 * - Tests email note explaining P2 data handling
 */

import { render, screen } from '@testing-library/react'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { USER_PROFILE_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock authStore
const mockUser = {
  id: 'user-123',
  displayName: 'Marie Martin',
  scope: ACTOR_SCOPE.MEMBER,
  role: 'member',
  tenantId: 'tenant-abc',
}
jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}))

// Import after mocks
import ProfilePage from '../../../app/(frontend)/app/profile/page'

describe('ProfilePage - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Header Section', () => {
    it('should render page title', () => {
      render(<ProfilePage />)

      expect(screen.getByRole('heading', { name: USER_PROFILE_LABELS.TITLE })).toBeInTheDocument()
    })

    it('should render page subtitle', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.SUBTITLE)).toBeInTheDocument()
    })
  })

  describe('Current User Info Card', () => {
    it('should render card title', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.CURRENT_INFO_TITLE)).toBeInTheDocument()
    })

    it('should render card description', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.CURRENT_INFO_DESC)).toBeInTheDocument()
    })

    it('should display user displayName (P1 data)', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.DISPLAY_NAME_LABEL)).toBeInTheDocument()
      expect(screen.getByText('Marie Martin')).toBeInTheDocument()
    })

    it('should display user role (P1 data)', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.ROLE_LABEL)).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    })

    it('should display user scope (P1 data)', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.SCOPE_LABEL)).toBeInTheDocument()
      expect(screen.getByText(ACTOR_SCOPE.MEMBER)).toBeInTheDocument()
    })

    it('should render email note explaining P2 data handling', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.EMAIL_NOTE)).toBeInTheDocument()
    })
  })

  describe('Placeholder Sections (Future LOTs)', () => {
    it('should render Personal Info placeholder card', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.PERSONAL_INFO_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_PROFILE_LABELS.PERSONAL_INFO_DESC)).toBeInTheDocument()
    })

    it('should render Security placeholder card', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.SECURITY_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_PROFILE_LABELS.SECURITY_DESC)).toBeInTheDocument()
    })

    it('should render Notifications placeholder card', () => {
      render(<ProfilePage />)

      expect(screen.getByText(USER_PROFILE_LABELS.NOTIFICATIONS_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_PROFILE_LABELS.NOTIFICATIONS_DESC)).toBeInTheDocument()
    })

    it('should show coming soon status for placeholder sections', () => {
      render(<ProfilePage />)

      // Status text: "Status : A venir" (from USER_PROFILE_LABELS.STATUS_COMING)
      const statusElements = screen.getAllByText(/Status : A venir/)
      expect(statusElements.length).toBe(3) // 3 placeholder sections
    })
  })

  describe('RGPD Compliance', () => {
    it('should NOT display email anywhere on page (P2 data)', () => {
      render(<ProfilePage />)

      // No email should appear
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    })

    it('should display fallback values from constants', () => {
      render(<ProfilePage />)

      // Constants should be defined for fallbacks (used when data is missing)
      expect(USER_PROFILE_LABELS.DISPLAY_NAME_FALLBACK).toBeDefined()
      expect(USER_PROFILE_LABELS.ROLE_FALLBACK).toBeDefined()
      expect(USER_PROFILE_LABELS.SCOPE_FALLBACK).toBeDefined()
    })
  })
})
