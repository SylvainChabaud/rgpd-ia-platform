/**
 * TenantUserDetailPage Component Tests - LOT 12.1
 * Tests for Tenant Admin user detail page
 *
 * RGPD Compliance:
 * - P1 data only (displayName, role, status, dates)
 * - NO email displayed (P2 data)
 * - NO prompt/output content (P3 data)
 * - Tenant isolation enforced by backend
 */

import { Suspense } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the auth store
const mockUser = {
  id: 'admin-123',
  displayName: 'Test Admin',
  tenantId: 'tenant-abc-123',
  scope: 'TENANT',
  role: 'TENANT_ADMIN',
}

jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser; isAuthenticated: boolean }) => unknown) =>
    selector({ user: mockUser, isAuthenticated: true }),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/portal/users/user-001',
}))

// Mock hooks
const mockUseUserDetail = jest.fn()
const mockUseUserStats = jest.fn()
const mockUseUserJobs = jest.fn()
const mockUseUserConsents = jest.fn()
const mockUseUserAuditEvents = jest.fn()
const mockUseSuspendTenantUser = jest.fn()
const mockUseReactivateTenantUser = jest.fn()
const mockUseDeleteTenantUser = jest.fn()

jest.mock('@/lib/api/hooks/useTenantUsers', () => ({
  useUserDetail: (userId: string) => mockUseUserDetail(userId),
  useUserStats: (userId: string) => mockUseUserStats(userId),
  useUserJobs: (userId: string, params: object) => mockUseUserJobs(userId, params),
  useUserConsents: (userId: string) => mockUseUserConsents(userId),
  useUserAuditEvents: (userId: string, params: object) => mockUseUserAuditEvents(userId, params),
  useSuspendTenantUser: (userId: string) => mockUseSuspendTenantUser(userId),
  useReactivateTenantUser: (userId: string) => mockUseReactivateTenantUser(userId),
  useDeleteTenantUser: (userId: string) => mockUseDeleteTenantUser(userId),
}))

// Import AFTER mocks
import UserDetailPage from '@app/(tenant-admin)/portal/users/[id]/page'

// =============================================================================
// HELPERS
// =============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(component: React.ReactElement) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        {component}
      </Suspense>
    </QueryClientProvider>
  )
}

const mockUserData = {
  user: {
    id: 'user-001',
    displayName: 'John Doe',
    role: 'MEMBER',
    scope: 'TENANT',
    tenantId: 'tenant-abc-123',
    createdAt: '2026-01-01T10:00:00Z',
    dataSuspended: false,
    dataSuspendedAt: null,
  },
}

const mockStatsData = {
  stats: {
    jobs: { success: 25, failed: 3, total: 28 },
    consents: { granted: 5, revoked: 1, total: 6 },
    auditEvents: { total: 150 },
  },
}

const mockJobsData = {
  jobs: [
    {
      id: 'job-001',
      purpose: 'text_analysis',
      model: 'gpt-4',
      status: 'COMPLETED',
      latencyMs: 1500,
      createdAt: '2026-01-10T10:00:00Z',
      completedAt: '2026-01-10T10:00:02Z',
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
}

const mockConsentsData = {
  consents: [
    {
      id: 'consent-001',
      purposeId: 'purpose-001',
      purposeLabel: 'AI Analytics',
      purposeDescription: 'Use data for AI analytics',
      granted: true,
      grantedAt: '2026-01-01T10:00:00Z',
      revokedAt: null,
      createdAt: '2026-01-01T10:00:00Z',
      status: 'granted',
    },
  ],
  total: 1,
}

const mockAuditData = {
  events: [
    {
      id: 'event-001',
      type: 'user.created',
      actorId: 'admin-123',
      targetId: 'user-001',
      createdAt: '2026-01-01T10:00:00Z',
      isActor: false,
      isTarget: true,
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
}

function setupDefaultMocks() {
  mockUseUserDetail.mockReturnValue({
    data: mockUserData,
    isLoading: false,
    error: null,
  })

  mockUseUserStats.mockReturnValue({
    data: mockStatsData,
    isLoading: false,
    error: null,
  })

  mockUseUserJobs.mockReturnValue({
    data: mockJobsData,
    isLoading: false,
    error: null,
  })

  mockUseUserConsents.mockReturnValue({
    data: mockConsentsData,
    isLoading: false,
    error: null,
  })

  mockUseUserAuditEvents.mockReturnValue({
    data: mockAuditData,
    isLoading: false,
    error: null,
  })

  mockUseSuspendTenantUser.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  })

  mockUseReactivateTenantUser.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  })

  mockUseDeleteTenantUser.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  })
}

// =============================================================================
// TESTS
// =============================================================================

describe('UserDetailPage', () => {
  // Create shared promise - React caches the result after first resolution
  const mockParams = Promise.resolve({ id: 'user-001' })

  // Force promise resolution before any test runs
  // This is needed because React 19's use() caches Promise results
  beforeAll(async () => {
    await mockParams
  })

  beforeEach(() => {
    jest.clearAllMocks()
    setupDefaultMocks()
  })

  // =====================
  // Warmup: force React to cache the Promise result
  // =====================
  describe('Warmup', () => {
    it('forces promise caching', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)
      // Just wait long enough for the component to attempt rendering
      await waitFor(() => expect(true).toBe(true), { timeout: 100 })
    })
  })

  // =====================
  // Rendering Tests
  // =====================
  describe('Rendering', () => {
    it('[DETAIL-001] renders user name', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('[DETAIL-002] renders user role badge', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('MEMBER')).toBeInTheDocument()
      })
    })

    it('[DETAIL-003] renders user status badge', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Actif')).toBeInTheDocument()
      })
    })

    it('[DETAIL-004] renders loading state', async () => {
      mockUseUserDetail.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      renderWithProviders(<UserDetailPage params={mockParams} />)

      // Should show skeleton loading
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('[DETAIL-005] renders error state when user not found', async () => {
      mockUseUserDetail.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      })

      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Utilisateur introuvable')).toBeInTheDocument()
      })
    })

    it('[DETAIL-006] does NOT display email (RGPD compliance)', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.queryByText('@')).not.toBeInTheDocument()
        expect(screen.queryByText('email')).not.toBeInTheDocument()
      })
    })
  })

  // =====================
  // Stats Cards Tests
  // =====================
  describe('Stats Cards', () => {
    it('[DETAIL-010] displays creation date', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Membre depuis')).toBeInTheDocument()
        expect(screen.getByText('01/01/2026')).toBeInTheDocument()
      })
    })

    it('[DETAIL-011] displays jobs count', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Jobs IA')).toBeInTheDocument()
        expect(screen.getByText('28')).toBeInTheDocument()
        expect(screen.getByText(/25 succès/)).toBeInTheDocument()
      })
    })

    it('[DETAIL-012] displays consents count', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Consentements')).toBeInTheDocument()
        expect(screen.getByText('6')).toBeInTheDocument()
      })
    })

    it('[DETAIL-013] displays audit events count', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Événements audit')).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()
      })
    })
  })

  // =====================
  // Tabs Tests
  // =====================
  describe('Tabs', () => {
    it('[DETAIL-020] renders jobs tab', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Jobs IA \(1\)/)).toBeInTheDocument()
      })
    })

    it('[DETAIL-021] renders consents tab', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Consentements \(1\)/)).toBeInTheDocument()
      })
    })

    it('[DETAIL-022] renders audit tab', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Audit \(1\)/)).toBeInTheDocument()
      })
    })

    it('[DETAIL-023] shows jobs history table', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('text_analysis')).toBeInTheDocument()
        expect(screen.getByText('gpt-4')).toBeInTheDocument()
        expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      })
    })

    it('[DETAIL-024] does NOT show job content (P3 - RGPD compliance)', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        // Should not show any prompt or output content
        expect(screen.queryByText('prompt')).not.toBeInTheDocument()
        expect(screen.queryByText('output')).not.toBeInTheDocument()
      })
    })
  })

  // =====================
  // Action Buttons Tests
  // =====================
  describe('Action Buttons', () => {
    it('[DETAIL-030] renders edit button', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Modifier')).toBeInTheDocument()
      })
    })

    it('[DETAIL-031] renders suspend button for active user', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Suspendre')).toBeInTheDocument()
      })
    })

    it('[DETAIL-032] renders reactivate button for suspended user', async () => {
      mockUseUserDetail.mockReturnValue({
        data: {
          user: {
            ...mockUserData.user,
            dataSuspended: true,
            dataSuspendedAt: '2026-01-11T10:00:00Z',
          },
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Réactiver')).toBeInTheDocument()
      })
    })

    it('[DETAIL-033] renders delete button', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText('Supprimer')).toBeInTheDocument()
      })
    })
  })

  // =====================
  // Dialog Tests
  // =====================
  describe('Dialogs', () => {
    it('[DETAIL-040] opens suspend dialog on suspend click', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Suspendre'))
      })

      expect(screen.getByText('Suspendre John Doe ?')).toBeInTheDocument()
      expect(screen.getByText('Raison de la suspension *')).toBeInTheDocument()
    })

    it('[DETAIL-041] opens delete dialog on delete click', async () => {
      renderWithProviders(<UserDetailPage params={mockParams} />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Supprimer'))
      })

      expect(screen.getByText('Supprimer John Doe ?')).toBeInTheDocument()
    })
  })
})
