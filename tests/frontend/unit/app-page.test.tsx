/**
 * Unit Tests: Frontend Home Page (Dashboard)
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Tests that only P1 data (displayName) is shown
 * - Tests no P2 data (email) is displayed
 * - Tests placeholder features for future LOTs
 */

import { render, screen } from '@testing-library/react'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { USER_DASHBOARD_LABELS } from '@/lib/constants/ui/ui-labels'

// Mock authStore
const mockUser = {
  id: 'user-123',
  displayName: 'Jean Dupont',
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
import FrontendHomePage from '../../../app/(frontend)/app/page'

describe('FrontendHomePage - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Welcome Section', () => {
    it('should render welcome message with user displayName', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(/Bienvenue.*Jean Dupont/)).toBeInTheDocument()
    })

    it('should render welcome prefix from constants', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(new RegExp(USER_DASHBOARD_LABELS.WELCOME_PREFIX))).toBeInTheDocument()
    })

    it('should render subtitle from constants', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.SUBTITLE)).toBeInTheDocument()
    })
  })

  describe('Pending Features Cards', () => {
    it('should render AI Tools placeholder card', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.AI_TOOLS_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.AI_TOOLS_DESC)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.AI_TOOLS_LOT)).toBeInTheDocument()
    })

    it('should render History placeholder card', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.HISTORY_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.HISTORY_DESC)).toBeInTheDocument()
    })

    it('should render Consents placeholder card', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.CONSENTS_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.CONSENTS_DESC)).toBeInTheDocument()
    })

    it('should render My Data placeholder card', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.MY_DATA_TITLE)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.MY_DATA_DESC)).toBeInTheDocument()
    })

    it('should show "coming soon" indicator for all placeholder cards', () => {
      render(<FrontendHomePage />)

      const comingSoonText = screen.getAllByText(USER_DASHBOARD_LABELS.FEATURE_COMING_SOON)
      expect(comingSoonText.length).toBe(4) // 4 placeholder cards
    })
  })

  describe('About Section', () => {
    it('should render about section title', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_TITLE)).toBeInTheDocument()
    })

    it('should render about intro text', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_INTRO)).toBeInTheDocument()
    })

    it('should render all about list items', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_ITEM_1)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_ITEM_2)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_ITEM_3)).toBeInTheDocument()
      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_ITEM_4)).toBeInTheDocument()
    })

    it('should render about footer text', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(USER_DASHBOARD_LABELS.ABOUT_FOOTER)).toBeInTheDocument()
    })
  })

  describe('RGPD Compliance (P1 Data Only)', () => {
    it('should display user displayName (P1 data)', () => {
      render(<FrontendHomePage />)

      expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
    })

    it('should NOT display email (P2 data not in AuthUser)', () => {
      render(<FrontendHomePage />)

      // Email should never appear
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    })

    it('should render welcome section with or without displayName', () => {
      render(<FrontendHomePage />)

      // Should render welcome prefix
      expect(screen.getByText(new RegExp(USER_DASHBOARD_LABELS.WELCOME_PREFIX))).toBeInTheDocument()
      // Should render welcome suffix
      expect(screen.getByText(new RegExp(USER_DASHBOARD_LABELS.WELCOME_SUFFIX))).toBeInTheDocument()
    })
  })
})
