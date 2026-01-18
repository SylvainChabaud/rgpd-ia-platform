/**
 * Integration Tests: Tenant CRUD Operations (LOT 11.1)
 *
 * Coverage:
 * - Tenant list page rendering and navigation
 * - Tenant creation form (validation + submission)
 * - Tenant details page (metadata + stats)
 * - Tenant edit form (pre-fill + update)
 * - Suspend/Reactivate/Delete actions
 * - RGPD compliance (P1 data only)
 *
 * CRITICAL: All tests MUST pass for LOT 11.1 approval
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import TenantsListPage from '../../../app/(platform-admin)/admin/tenants/page'
import CreateTenantPage from '../../../app/(platform-admin)/admin/tenants/new/page'
import TenantDetailsPage from '../../../app/(platform-admin)/admin/tenants/[id]/page'
import EditTenantPage from '../../../app/(platform-admin)/admin/tenants/[id]/edit/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  usePathname: jest.fn(() => '/admin/tenants'),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Create query client for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

// Wrapper component with providers
function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('Integration Tests - Tenant CRUD (LOT 11.1)', () => {
  let mockPush: jest.Mock
  let mockBack: jest.Mock

  beforeEach(() => {
    mockPush = jest.fn()
    mockBack = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
      replace: jest.fn(),
    })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Tenants List Page', () => {
    it('[INT-001] should render tenants list with correct columns', async () => {
      const mockTenants = {
        tenants: [
          {
            id: 'tenant-1',
            name: 'Acme Corp',
            slug: 'acme-corp',
            createdAt: '2024-01-15T10:00:00Z',
            deletedAt: null,
          },
          {
            id: 'tenant-2',
            name: 'Globex Inc',
            slug: 'globex-inc',
            createdAt: '2024-02-20T14:30:00Z',
            deletedAt: null,
          },
        ],
        total: 2,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTenants,
      })

      render(<TenantsListPage />, { wrapper: Wrapper })

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })

      // Verify columns
      expect(screen.getByText('acme-corp')).toBeInTheDocument()
      expect(screen.getByText('Globex Inc')).toBeInTheDocument()
      expect(screen.getByText('globex-inc')).toBeInTheDocument()

      // Verify dates are formatted (French locale)
      expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument()
      expect(screen.getByText(/20\/02\/2024/)).toBeInTheDocument()
    })

    it('[INT-002] should navigate to create page when clicking "Créer Tenant"', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenants: [], total: 0 }),
      })

      render(<TenantsListPage />, { wrapper: Wrapper })

      // Button is inside a link, so we find the link by its href
      const createLink = await screen.findByRole('link', { name: /créer un tenant/i })
      expect(createLink).toHaveAttribute('href', '/admin/tenants/new')
    })

    it('[INT-003] should navigate to details page when clicking tenant row', async () => {
      const mockTenants = {
        tenants: [
          {
            id: 'tenant-1',
            name: 'Acme Corp',
            slug: 'acme-corp',
            createdAt: '2024-01-15T10:00:00Z',
            deletedAt: null,
          },
        ],
        total: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTenants,
      })

      render(<TenantsListPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })

      const detailsLink = screen.getByRole('link', { name: /détails/i })
      expect(detailsLink).toHaveAttribute('href', '/admin/tenants/tenant-1')
    })

    it('[INT-004] should display loading state while fetching', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<TenantsListPage />, { wrapper: Wrapper })

      expect(screen.getByText(/chargement/i)).toBeInTheDocument()
    })

    it('[INT-005] should handle empty state', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenants: [], total: 0 }),
      })

      render(<TenantsListPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText(/aucun tenant/i)).toBeInTheDocument()
      })
    })
  })

  describe('Create Tenant Form', () => {
    it('[INT-006] should validate required fields', async () => {
      const user = userEvent.setup()

      render(<CreateTenantPage />, { wrapper: Wrapper })

      const submitButton = screen.getByRole('button', { name: /créer le tenant/i })
      await user.click(submitButton)

      // Validation errors should appear
      await waitFor(() => {
        expect(screen.getByText(/le nom est requis/i)).toBeInTheDocument()
      })
    })

    it('[INT-007] should validate slug format', async () => {
      const user = userEvent.setup()

      render(<CreateTenantPage />, { wrapper: Wrapper })

      const slugInput = screen.getByLabelText(/slug/i)
      await user.type(slugInput, 'Invalid Slug!')

      const submitButton = screen.getByRole('button', { name: /créer le tenant/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Error message is "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
        expect(
          screen.getByText(/slug ne peut contenir que/i)
        ).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('[INT-008] should auto-generate slug from name', async () => {
      const user = userEvent.setup()

      render(<CreateTenantPage />, { wrapper: Wrapper })

      const nameInput = screen.getByLabelText(/nom du tenant/i)
      await user.type(nameInput, 'Acme Corporation')

      const generateButton = screen.getByRole('button', {
        name: /générer depuis le nom/i,
      })
      await user.click(generateButton)

      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
      expect(slugInput.value).toBe('acme-corporation')
    })

    it('[INT-009] should create tenant successfully', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenantId: 'new-tenant-123' }),
      })

      render(<CreateTenantPage />, { wrapper: Wrapper })

      await user.type(screen.getByLabelText(/nom du tenant/i), 'Test Corp')
      await user.type(screen.getByLabelText(/slug/i), 'test-corp')

      const submitButton = screen.getByRole('button', { name: /créer le tenant/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tenants',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'Test Corp', slug: 'test-corp' }),
          })
        )
      })

      // Should redirect to tenants list
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/tenants')
      })
    })

    it('[INT-010] should handle duplicate slug error', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          message: 'Slug already exists',
          details: { field: 'slug' },
        }),
      })

      render(<CreateTenantPage />, { wrapper: Wrapper })

      await user.type(screen.getByLabelText(/nom du tenant/i), 'Test Corp')
      await user.type(screen.getByLabelText(/slug/i), 'existing-slug')

      const submitButton = screen.getByRole('button', { name: /créer le tenant/i })
      await user.click(submitButton)

      // Should display error toast (mocked)
      await waitFor(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const toast = require('sonner').toast
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Slug already exists'))
      })
    })
  })

  describe('Tenant Details Page', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useParams } = require('next/navigation')
      useParams.mockReturnValue({ id: 'tenant-123' })
    })

    it('[INT-011] should display tenant metadata (P1 data only)', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      const mockStats = {
        stats: {
          users: { total: 42, active: 35 },
          aiJobs: { total: 128, success: 100 },
          storage: { usedBytes: 5242880 }, // 5 MB
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => mockStats })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })

      // Metadata (P1 only)
      expect(screen.getByText('tenant-123')).toBeInTheDocument()
      // 'acme-corp' appears multiple times (breadcrumb + content), so use getAllByText
      expect(screen.getAllByText('acme-corp')[0]).toBeInTheDocument()

      // Stats
      expect(screen.getByText('42')).toBeInTheDocument() // usersCount
      expect(screen.getByText('128')).toBeInTheDocument() // aiJobsCount
      expect(screen.getByText(/5\.00 MB/i)).toBeInTheDocument() // storage
    })

    it('[INT-012] should show edit and suspend buttons for active tenant', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /modifier/i })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /suspendre/i })).toBeInTheDocument()
    })

    it('[INT-013] should show reactivate button for suspended tenant', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
          suspendedAt: '2024-03-20T16:00:00Z',
          suspensionReason: 'Impayé',
          suspendedBy: 'admin-123',
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /réactiver/i })).toBeInTheDocument()
      })

      // Edit button should be hidden for suspended tenant
      expect(screen.queryByRole('link', { name: /modifier/i })).not.toBeInTheDocument()

      // Suspend button should be hidden for suspended tenant
      expect(screen.queryByRole('button', { name: /suspendre/i })).not.toBeInTheDocument()

      // Should show suspension badge
      expect(screen.getByText('Tenant Suspendu')).toBeInTheDocument()
      expect(screen.getByText(/Raison:/i)).toBeInTheDocument()
      expect(screen.getByText('Impayé')).toBeInTheDocument()
    })

    it('[INT-014] should handle delete action with confirmation', async () => {
      const user = userEvent.setup()

      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Deleted' }) })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument()
      })

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /supprimer/i })
      await user.click(deleteButton)

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/confirmer la suppression/i)).toBeInTheDocument()
      })

      // Confirm deletion
      const confirmButton = screen.getByRole('button', {
        name: /supprimer définitivement/i,
      })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tenants/tenant-123',
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      // Should redirect to tenants list
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/tenants')
      })
    })
  })

  describe('Edit Tenant Form', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useParams } = require('next/navigation')
      useParams.mockReturnValue({ id: 'tenant-123' })
    })

    it('[INT-015] should pre-fill form with existing data', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTenant,
      })

      render(<EditTenantPage />, { wrapper: Wrapper })

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/nom du tenant/i) as HTMLInputElement
        expect(nameInput.value).toBe('Acme Corp')
      })

      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
      expect(slugInput.value).toBe('acme-corp')
      expect(slugInput).toBeDisabled() // Slug is read-only
    })

    it('[INT-016] should update tenant name successfully', async () => {
      const user = userEvent.setup()

      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tenant: { ...mockTenant.tenant, name: 'Acme Corporation' } }),
        })

      render(<EditTenantPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/nom du tenant/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Acme Corporation')

      const submitButton = screen.getByRole('button', {
        name: /enregistrer les modifications/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tenants/tenant-123',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ name: 'Acme Corporation' }),
          })
        )
      })

      // Should redirect to details
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/tenants/tenant-123')
      })
    })

    it('[INT-017] should disable form for deleted tenant', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: '2024-03-20T16:00:00Z',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTenant,
      })

      render(<EditTenantPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText(/ce tenant est supprimé/i)).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/nom du tenant/i)
      expect(nameInput).toBeDisabled()

      const submitButton = screen.getByRole('button', {
        name: /enregistrer les modifications/i,
      })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('RGPD Compliance - Tenant UI', () => {
    it('[INT-018] should display ONLY P1 data (no email, no passwords)', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
          // Backend should NOT send P2/P3 data
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      const { container } = render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })

      // Verify NO P2/P3 data in DOM
      const html = container.innerHTML

      // NO email patterns
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      expect(html.match(emailPattern)).toBeNull()

      // NO password fields or hashes
      expect(html).not.toContain('password')
      expect(html).not.toContain('$2b$') // bcrypt
      expect(html).not.toContain('$argon2') // argon2
    })

    it('[INT-019] should show RGPD notices on create/edit forms', async () => {
      render(<CreateTenantPage />, { wrapper: Wrapper })

      expect(screen.getByText(/🔒 RGPD/i)).toBeInTheDocument()
      expect(screen.getByText(/audit trail/i)).toBeInTheDocument()
    })

    it('[INT-020] should NOT log sensitive data in browser console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: null,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      })

      // Verify NO logs with tenant data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('tenant-123')
      )

      consoleSpy.mockRestore()
    })
  })
})
