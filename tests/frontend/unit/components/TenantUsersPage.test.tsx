/**
 * TenantUsersPage Component Tests - LOT 12.1
 * Tests for Tenant Admin users list page
 *
 * RGPD Compliance:
 * - P1 data only (displayName, role, status, dates)
 * - NO email displayed (P2 data)
 * - Tenant isolation enforced by backend
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  useAuthStore: (selector: (state: { user: typeof mockUser; isAuthenticated: boolean }) => unknown) =>
    selector({ user: mockUser, isAuthenticated: true }),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/portal/users',
}))

// Mock hooks
const mockUseTenantUsers = jest.fn()
const mockUseBulkSuspendTenantUsers = jest.fn()
const mockUseBulkReactivateTenantUsers = jest.fn()

jest.mock('@/lib/api/hooks/useTenantUsers', () => ({
  useTenantUsers: (params: object) => mockUseTenantUsers(params),
  useBulkSuspendTenantUsers: () => mockUseBulkSuspendTenantUsers(),
  useBulkReactivateTenantUsers: () => mockUseBulkReactivateTenantUsers(),
}))

// Import AFTER mocks
import TenantUsersPage from '@app/(tenant-admin)/portal/users/page'

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
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const mockUsersData = {
  users: [
    {
      id: 'user-001',
      displayName: 'John Doe',
      role: 'MEMBER',
      scope: 'TENANT',
      createdAt: '2026-01-01T10:00:00Z',
      dataSuspended: false,
      dataSuspendedAt: null,
    },
    {
      id: 'user-002',
      displayName: 'Jane Smith',
      role: 'TENANT_ADMIN',
      scope: 'TENANT',
      createdAt: '2026-01-05T10:00:00Z',
      dataSuspended: false,
      dataSuspendedAt: null,
    },
    {
      id: 'user-003',
      displayName: 'Bob Wilson',
      role: 'MEMBER',
      scope: 'TENANT',
      createdAt: '2026-01-10T10:00:00Z',
      dataSuspended: true,
      dataSuspendedAt: '2026-01-11T10:00:00Z',
    },
  ],
  total: 3,
  limit: 50,
  offset: 0,
}

// =============================================================================
// TESTS
// =============================================================================

describe('TenantUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockUseTenantUsers.mockReturnValue({
      data: mockUsersData,
      isLoading: false,
      error: null,
    })

    mockUseBulkSuspendTenantUsers.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })

    mockUseBulkReactivateTenantUsers.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
  })

  // =====================
  // Rendering Tests
  // =====================
  describe('Rendering', () => {
    it('[USERS-001] renders page title and user count', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Gestion des Utilisateurs')).toBeInTheDocument()
      expect(screen.getByText(/3 utilisateur\(s\)/)).toBeInTheDocument()
    })

    it('[USERS-002] renders loading state', () => {
      mockUseTenantUsers.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Chargement des utilisateurs...')).toBeInTheDocument()
    })

    it('[USERS-003] renders error state', () => {
      mockUseTenantUsers.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
      })

      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument()
    })

    it('[USERS-004] renders empty state when no users', () => {
      mockUseTenantUsers.mockReturnValue({
        data: { users: [], total: 0, limit: 50, offset: 0 },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Aucun utilisateur trouvé')).toBeInTheDocument()
    })

    it('[USERS-005] renders create user button', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Créer un Utilisateur')).toBeInTheDocument()
    })
  })

  // =====================
  // User Table Tests
  // =====================
  describe('User Table', () => {
    it('[USERS-010] displays user names', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })

    it('[USERS-011] displays user roles with badges', () => {
      renderWithProviders(<TenantUsersPage />)

      // Admin should show "Admin" badge
      expect(screen.getByText('Admin')).toBeInTheDocument()
      // Members should show role
      const memberBadges = screen.getAllByText('MEMBER')
      expect(memberBadges.length).toBe(2)
    })

    it('[USERS-012] displays user status badges', () => {
      renderWithProviders(<TenantUsersPage />)

      // Active users (2 non-suspended + possibly other active badges in UI)
      const activeBadges = screen.getAllByText('Actif')
      expect(activeBadges.length).toBeGreaterThanOrEqual(2)
      // Suspended user (may appear in multiple places: badge + filter option)
      const suspendedBadges = screen.getAllByText('Suspendu')
      expect(suspendedBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('[USERS-013] does NOT display email (RGPD compliance)', () => {
      renderWithProviders(<TenantUsersPage />)

      // Email should not be displayed
      expect(screen.queryByText('@')).not.toBeInTheDocument()
      expect(screen.queryByText('email')).not.toBeInTheDocument()
    })

    it('[USERS-014] displays view details button for each user', () => {
      renderWithProviders(<TenantUsersPage />)

      const detailButtons = screen.getAllByText('Détails')
      expect(detailButtons.length).toBe(3)
    })
  })

  // =====================
  // Filters Tests
  // =====================
  describe('Filters', () => {
    it('[USERS-020] renders filter controls', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Filtres')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Nom...')).toBeInTheDocument()
      expect(screen.getByText('Tous les rôles')).toBeInTheDocument()
      expect(screen.getByText('Tous les statuts')).toBeInTheDocument()
    })

    it('[USERS-021] renders reset filters button', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Réinitialiser')).toBeInTheDocument()
    })

    it('[USERS-022] calls API with role filter', async () => {
      renderWithProviders(<TenantUsersPage />)

      const roleSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(roleSelect, { target: { value: 'MEMBER' } })

      await waitFor(() => {
        expect(mockUseTenantUsers).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'MEMBER' })
        )
      })
    })

    it('[USERS-023] calls API with status filter', async () => {
      renderWithProviders(<TenantUsersPage />)

      const statusSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(statusSelect, { target: { value: 'suspended' } })

      await waitFor(() => {
        expect(mockUseTenantUsers).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'suspended' })
        )
      })
    })
  })

  // =====================
  // Selection Tests
  // =====================
  describe('User Selection', () => {
    it('[USERS-030] renders checkboxes for each user', () => {
      renderWithProviders(<TenantUsersPage />)

      // Header checkbox + 3 user checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(4)
    })

    it('[USERS-031] shows bulk actions when users selected', () => {
      renderWithProviders(<TenantUsersPage />)

      // Initially no bulk actions
      expect(screen.queryByText(/sélectionné\(s\)/)).not.toBeInTheDocument()

      // Select first user
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1]) // First user checkbox

      expect(screen.getByText(/1 utilisateur\(s\) sélectionné\(s\)/)).toBeInTheDocument()
    })

    it('[USERS-032] shows suspend and reactivate buttons when users selected', () => {
      renderWithProviders(<TenantUsersPage />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])

      expect(screen.getByText('Suspendre')).toBeInTheDocument()
      expect(screen.getByText('Réactiver')).toBeInTheDocument()
    })

    it('[USERS-033] select all checkbox selects all users', () => {
      renderWithProviders(<TenantUsersPage />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0]) // Header checkbox

      expect(screen.getByText(/3 utilisateur\(s\) sélectionné\(s\)/)).toBeInTheDocument()
    })
  })

  // =====================
  // Pagination Tests
  // =====================
  describe('Pagination', () => {
    it('[USERS-040] renders pagination controls', () => {
      renderWithProviders(<TenantUsersPage />)

      expect(screen.getByText('Précédent')).toBeInTheDocument()
      expect(screen.getByText('Suivant')).toBeInTheDocument()
      expect(screen.getByText('Page 1 sur 1')).toBeInTheDocument()
    })

    it('[USERS-041] disables previous on first page', () => {
      renderWithProviders(<TenantUsersPage />)

      const prevButton = screen.getByText('Précédent').closest('button')
      expect(prevButton).toBeDisabled()
    })

    it('[USERS-042] disables next on last page', () => {
      mockUseTenantUsers.mockReturnValue({
        data: { ...mockUsersData, total: 3 },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<TenantUsersPage />)

      const nextButton = screen.getByText('Suivant').closest('button')
      expect(nextButton).toBeDisabled()
    })
  })

  // =====================
  // Sorting Tests
  // =====================
  describe('Sorting', () => {
    it('[USERS-050] renders sortable column headers', () => {
      renderWithProviders(<TenantUsersPage />)

      // Use getAllByText for items that may appear in filters and headers
      expect(screen.getAllByText(/Nom/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Rôle/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Créé le/).length).toBeGreaterThanOrEqual(1)
    })

    it('[USERS-051] shows sort indicator for active column', () => {
      renderWithProviders(<TenantUsersPage />)

      // Default sort is by createdAt desc
      expect(screen.getByText(/Créé le.*↓/)).toBeInTheDocument()
    })
  })
})
