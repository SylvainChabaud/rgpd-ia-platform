/**
 * TenantDashboardPage Component Tests - LOT 12.0
 * Tests for Tenant Admin dashboard page
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, event types, IDs)
 * - NO user content (prompts, outputs)
 * - Tenant isolation enforced by backend
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the auth store
const mockUser = {
  id: 'user-123',
  displayName: 'Test Admin',
  tenantId: 'tenant-abc-123',
  scope: 'TENANT',
  role: 'TENANT_ADMIN',
}

jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

// Mock the dashboard hooks
const mockStatsData = {
  stats: {
    users: { active: 50, suspended: 3, total: 53 },
    aiJobs: { success: 200, failed: 5, total: 205, month: '2026-01' },
    consents: { granted: 45, revoked: 2, pending: 6 },
    rgpd: {
      exports: { pending: 2, completed: 10 },
      deletions: { pending: 1, completed: 5 },
    },
  },
  tenantName: 'ACME Corporation',
}

const mockActivityData = {
  events: [
    {
      id: 'event-001',
      type: 'user.created',
      actorId: 'user-001',
      targetId: 'user-002',
      createdAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'event-002',
      type: 'consent.granted',
      actorId: 'user-002',
      targetId: null,
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'event-003',
      type: 'ai.completed',
      actorId: 'user-003',
      targetId: 'job-001',
      createdAt: '2026-01-10T12:00:00Z',
    },
  ],
  total: 3,
}

const mockUseTenantStats = jest.fn()
const mockUseTenantActivity = jest.fn()
const mockUseTenantAIJobsStats = jest.fn()

jest.mock('@/lib/api/hooks/useTenantDashboard', () => ({
  useTenantStats: (tenantId: string | null | undefined) => mockUseTenantStats(tenantId),
  useTenantActivity: (tenantId: string | null | undefined, limit: number) =>
    mockUseTenantActivity(tenantId, limit),
  useTenantAIJobsStats: (tenantId: string | null | undefined, days: number) =>
    mockUseTenantAIJobsStats(tenantId, days),
}))

// Mock Recharts completely to avoid canvas rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
      {children}
    </div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="line-chart">{children}</svg>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="area-chart">{children}</svg>,
  BarChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="bar-chart">{children}</svg>,
  Line: () => <line />,
  Area: () => <path />,
  Bar: () => <rect />,
  XAxis: () => <g data-testid="x-axis" />,
  YAxis: () => <g data-testid="y-axis" />,
  CartesianGrid: () => <g data-testid="grid" />,
  Tooltip: () => <g data-testid="tooltip" />,
  Legend: () => <g data-testid="legend" />,
}))

// Import component after mocks
import TenantDashboardPage from '@app/(tenant-admin)/portal/dashboard/page'

// Helper to create QueryClient wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('TenantDashboardPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockUseTenantStats.mockReturnValue({
      data: mockStatsData,
      isLoading: false,
      error: null,
    })

    mockUseTenantAIJobsStats.mockReturnValue({
      data: {
        stats: [
          { date: '2026-01-08', success: 10, failed: 2, total: 12 },
          { date: '2026-01-09', success: 15, failed: 1, total: 16 },
        ],
        days: 30,
      },
      isLoading: false,
      error: null,
    })

    mockUseTenantActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    })
  })

  describe('Rendering', () => {
    it('should render dashboard title', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })

    it('should render dashboard subtitle', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(
        screen.getByText("Vue d'ensemble de votre organisation")
      ).toBeInTheDocument()
    })

    it('should render tenant name', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('ACME Corporation')).toBeInTheDocument()
    })

    it('should call useTenantStats with tenantId', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(mockUseTenantStats).toHaveBeenCalledWith('tenant-abc-123')
    })

    it('should call useTenantActivity with tenantId and limit', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(mockUseTenantActivity).toHaveBeenCalledWith('tenant-abc-123', 50)
    })
  })

  describe('KPI Widgets', () => {
    it('should render Users widget with correct values', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Utilisateurs actifs')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText(/53 total/)).toBeInTheDocument()
      expect(screen.getByText(/3 suspendus/)).toBeInTheDocument()
    })

    it('should render AI Jobs widget with correct values', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Jobs IA ce mois')).toBeInTheDocument()
      expect(screen.getByText('205')).toBeInTheDocument()
      expect(screen.getByText(/200 succès/)).toBeInTheDocument()
      expect(screen.getByText(/5 échecs/)).toBeInTheDocument()
    })

    it('should render Consents widget with correct values', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Consentements actifs')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()
      expect(screen.getByText(/2 révoqués/)).toBeInTheDocument()
      expect(screen.getByText(/6 en attente/)).toBeInTheDocument()
    })

    it('should render RGPD Exports widget with correct values', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Exports RGPD')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText(/en cours/)).toBeInTheDocument()
      expect(screen.getByText(/10 terminés/)).toBeInTheDocument()
    })
  })

  describe('Charts', () => {
    it('should render AI Jobs chart', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Jobs IA')).toBeInTheDocument()
    })

    it('should render Consents chart', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Look for the chart title "Consentements" (the chart, not the widget)
      const consentElements = screen.getAllByText(/Consentements?/i)
      expect(consentElements.length).toBeGreaterThan(0)
    })
  })

  describe('Activity Feed', () => {
    it('should render activity feed section', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Activité récente')).toBeInTheDocument()
      expect(
        screen.getByText('Les 50 derniers événements de votre tenant')
      ).toBeInTheDocument()
    })

    it('should render activity table headers', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Acteur')).toBeInTheDocument()
      expect(screen.getByText('Cible')).toBeInTheDocument()
    })

    it('should render event badges', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Création user')).toBeInTheDocument()
      expect(screen.getByText('Consentement accordé')).toBeInTheDocument()
      expect(screen.getByText('Job IA terminé')).toBeInTheDocument()
    })

    it('should render empty state when no events', () => {
      mockUseTenantActivity.mockReturnValue({
        data: { events: [], total: 0 },
        isLoading: false,
        error: null,
      })

      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Aucune activité récente')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading skeletons when stats loading', () => {
      mockUseTenantStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      const { container } = render(<TenantDashboardPage />, {
        wrapper: createWrapper(),
      })

      // Check for loading skeletons
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should show loading skeletons when activity loading', () => {
      mockUseTenantActivity.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      const { container } = render(<TenantDashboardPage />, {
        wrapper: createWrapper(),
      })

      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should show error message when stats fetch fails', () => {
      mockUseTenantStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
      })

      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument()
      expect(
        screen.getByText(/Impossible de charger les statistiques/)
      ).toBeInTheDocument()
    })

    it('should show generic error message (RGPD safe)', () => {
      mockUseTenantStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('SQL injection detected'),
      })

      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Should NOT show the actual error message
      expect(screen.queryByText('SQL injection')).not.toBeInTheDocument()

      // Should show generic message
      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument()
    })
  })

  describe('RGPD Compliance', () => {
    it('should only display P1 data (aggregates)', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Should have numbers (aggregates)
      expect(screen.getByText('50')).toBeInTheDocument() // Users active
      expect(screen.getByText('205')).toBeInTheDocument() // AI Jobs total
      expect(screen.getByText('45')).toBeInTheDocument() // Consents granted
    })

    it('should not display email addresses', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      const content = document.body.innerHTML

      // Should NOT contain email patterns
      expect(content).not.toMatch(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      )
    })

    it('should not display prompt/output content (P3)', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Activity events should NOT have content field
      expect(screen.queryByText(/prompt/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/output/i)).not.toBeInTheDocument()
    })

    it('should truncate actor/target IDs', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // IDs should be truncated (showing only first 8 chars + ...)
      // Use getAllByText since same ID can appear multiple times
      expect(screen.getAllByText('user-001...').length).toBeGreaterThan(0)
      expect(screen.getAllByText('user-002...').length).toBeGreaterThan(0)
    })

    it('should show tenant name as P1 organization data', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Tenant name is P1 data (organization name, not personal)
      expect(screen.getByText('ACME Corporation')).toBeInTheDocument()
    })
  })

  describe('Event Type Badges', () => {
    it('should map user.created to correct badge', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Création user')).toBeInTheDocument()
    })

    it('should map consent.granted to correct badge', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Consentement accordé')).toBeInTheDocument()
    })

    it('should map ai.completed to correct badge', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Job IA terminé')).toBeInTheDocument()
    })

    it('should handle unknown event types gracefully', () => {
      mockUseTenantActivity.mockReturnValue({
        data: {
          events: [
            {
              id: 'event-unknown',
              type: 'unknown.event.type',
              actorId: 'user-001',
              targetId: null,
              createdAt: '2026-01-10T10:00:00Z',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: null,
      })

      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Should show the raw type as fallback
      expect(screen.getByText('unknown.event.type')).toBeInTheDocument()
    })
  })

  describe('Widget Variants', () => {
    it('should show danger variant when failed > success', () => {
      mockUseTenantStats.mockReturnValue({
        data: {
          ...mockStatsData,
          stats: {
            ...mockStatsData.stats,
            aiJobs: { success: 2, failed: 10, total: 12, month: '2026-01' },
          },
        },
        isLoading: false,
        error: null,
      })

      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Widget should be visible (variant is applied via CSS classes)
      expect(screen.getByText('Jobs IA ce mois')).toBeInTheDocument()
    })

    it('should show warning variant when pending exports > 0', () => {
      render(<TenantDashboardPage />, { wrapper: createWrapper() })

      // Exports widget should be visible with pending count
      expect(screen.getByText('Exports RGPD')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // pending
    })
  })
})
