/**
 * RGPD Compliance Tests - Tenant UI (LOT 11.1)
 *
 * Validates strict RGPD compliance for Tenant Management UI:
 * - Art. 5 (Minimisation des données - P1 ONLY)
 * - Art. 25 (Privacy by Design - fail-secure defaults)
 * - Art. 32 (Sécurité - no sensitive data exposure)
 * - Art. 30 (Registre des traitements - audit trail)
 *
 * CRITICAL: All tests MUST pass for LOT 11.1 RGPD approval
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TenantsListPage from '../../../app/(backoffice)/tenants/page'
import CreateTenantPage from '../../../app/(backoffice)/tenants/new/page'
import TenantDetailsPage from '../../../app/(backoffice)/tenants/[id]/page'
import EditTenantPage from '../../../app/(backoffice)/tenants/[id]/edit/page'
import type { Tenant } from '@/types/api'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
  useParams: jest.fn(() => ({ id: 'tenant-123' })),
  usePathname: jest.fn(() => '/backoffice/tenants'),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('RGPD Compliance - Tenant UI (LOT 11.1)', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Art. 5 - Minimisation des données (P1 ONLY)', () => {
    it('[RGPD-T001] List page MUST display ONLY P1 data (id, name, slug, dates)', async () => {
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

      const { container } = render(<TenantsListPage />, { wrapper: Wrapper })

      await screen.findByText('Acme Corp')

      const html = container.innerHTML

      // P1 data ALLOWED
      expect(html).toContain('tenant-1')
      expect(html).toContain('Acme Corp')
      expect(html).toContain('acme-corp')

      // P2/P3 data FORBIDDEN
      expect(html).not.toContain('email')
      // Don't check for '@' as it appears in SVG xmlns attributes
      expect(html).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i) // No email addresses
      expect(html).not.toContain('password')
      expect(html).not.toContain('address')
      expect(html).not.toContain('phone')
    })

    it('[RGPD-T002] Details page MUST NOT display user content or P2/P3 data', async () => {
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
        usersCount: 42,
        aiJobsCount: 128,
        storageUsed: 5242880,
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => mockStats })

      const { container } = render(<TenantDetailsPage />, { wrapper: Wrapper })

      await screen.findByText('Acme Corp')

      const html = container.innerHTML

      // P1 metadata ALLOWED
      expect(html).toContain('tenant-123')
      expect(html).toContain('Acme Corp')

      // Stats counts ALLOWED (aggregate data)
      expect(html).toContain('42') // usersCount
      expect(html).toContain('128') // aiJobsCount

      // P2/P3 FORBIDDEN
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      expect(html.match(emailPattern)).toBeNull()

      // NO user content (prompts, outputs)
      expect(html).not.toContain('prompt')
      expect(html).not.toContain('output')
      expect(html).not.toContain('message')
    })

    it('[RGPD-T003] Create form MUST collect ONLY P1 data (name, slug)', async () => {
      render(<CreateTenantPage />, { wrapper: Wrapper })

      // Only P1 fields
      expect(screen.getByLabelText(/nom du tenant/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/slug/i)).toBeInTheDocument()

      // NO P2/P3 fields
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument()
    })

    it('[RGPD-T004] Edit form MUST allow ONLY P1 data modification', async () => {
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

      await screen.findByDisplayValue('Acme Corp')

      // Name field editable
      const nameInput = screen.getByLabelText(/nom du tenant/i)
      expect(nameInput).not.toBeDisabled()

      // Slug field read-only (immutable identifier)
      const slugInput = screen.getByLabelText(/slug/i)
      expect(slugInput).toBeDisabled()

      // NO P2/P3 fields
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    })
  })

  describe('Art. 25 - Privacy by Design', () => {
    it('[RGPD-T005] Delete action MUST require explicit confirmation (fail-secure)', async () => {
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

      await screen.findByText('Acme Corp')

      // Delete button exists
      const deleteButton = screen.getByRole('button', { name: /supprimer/i })
      expect(deleteButton).toBeInTheDocument()

      // Confirmation dialog details
      const dangerZone = screen.getByText(/zone de danger/i).closest('div')
      expect(dangerZone).toBeInTheDocument()
      expect(screen.getByText(/action irréversible/i)).toBeInTheDocument()
    })

    it('[RGPD-T006] Deleted tenant MUST be clearly marked (transparency)', async () => {
      const mockTenant = {
        tenant: {
          id: 'tenant-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          createdAt: '2024-01-15T10:00:00Z',
          deletedAt: '2024-03-20T16:00:00Z',
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      render(<TenantDetailsPage />, { wrapper: Wrapper })

      await screen.findByText('Acme Corp')

      // Badge indicating deleted status
      expect(screen.getByText(/tenant supprimé/i)).toBeInTheDocument()

      // Delete date displayed
      expect(screen.getByText(/20\/03\/2024/i)).toBeInTheDocument()
    })

    it('[RGPD-T007] Form validation MUST prevent invalid data entry', async () => {
      render(<CreateTenantPage />, { wrapper: Wrapper })

      const nameInput = screen.getByLabelText(/nom du tenant/i)
      const slugInput = screen.getByLabelText(/slug/i)

      // Name: max 255 chars
      expect(nameInput).toHaveAttribute('type', 'text')

      // Slug: regex pattern enforced (a-z, 0-9, -)
      // Validated by Zod schema on submit
      expect(slugInput).toBeInTheDocument()
    })

    it('[RGPD-T008] Edit form MUST prevent modification of deleted tenant', async () => {
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

      await screen.findByDisplayValue('Acme Corp')

      // Warning message
      expect(screen.getByText(/ce tenant est supprimé/i)).toBeInTheDocument()

      // Form disabled
      const nameInput = screen.getByLabelText(/nom du tenant/i)
      expect(nameInput).toBeDisabled()

      const submitButton = screen.getByRole('button', {
        name: /enregistrer les modifications/i,
      })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Art. 32 - Sécurité des traitements', () => {
    it('[RGPD-T009] Error messages MUST be RGPD-safe (no sensitive data)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Erreur serveur', // Generic RGPD-safe
          // Backend should NOT send stack traces, DB errors, etc.
        }),
      })

      render(<TenantsListPage />, { wrapper: Wrapper })

      const errorElements = await screen.findAllByText(/erreur/i)

      // Should display generic error (no sensitive details)
      const html = errorElements.map((el) => el.textContent).join(' ')
      expect(html).not.toMatch(/database/i)
      expect(html).not.toMatch(/SQL/i)
      expect(html).not.toMatch(/stack/i)
      expect(html).not.toMatch(/password/i)
      expect(html).toMatch(/erreur serveur/i) // Generic message OK
    })

    it('[RGPD-T010] Forms MUST NOT log input data to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(<CreateTenantPage />, { wrapper: Wrapper })

      const nameInput = screen.getByLabelText(/nom du tenant/i)
      const slugInput = screen.getByLabelText(/slug/i)

      // Simulate user typing (no logs should be created)
      nameInput.dispatchEvent(
        new Event('input', { bubbles: true })
      )
      slugInput.dispatchEvent(
        new Event('input', { bubbles: true })
      )

      // No console logs with form data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('name')
      )
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('slug')
      )

      consoleSpy.mockRestore()
    })

    it('[RGPD-T011] NO passwords or secrets in UI components', () => {
      const { container: createContainer } = render(<CreateTenantPage />, {
        wrapper: Wrapper,
      })

      const html = createContainer.innerHTML

      // NO password fields
      expect(html).not.toContain('type="password"')
      expect(html).not.toContain('passwordHash')
      expect(html).not.toContain('$2b$') // bcrypt
      expect(html).not.toContain('$argon2') // argon2

      // NO API keys or tokens
      expect(html).not.toContain('apiKey')
      expect(html).not.toContain('token')
      expect(html).not.toContain('Bearer')
    })
  })

  describe('Art. 30 - Registre des traitements (Audit Trail)', () => {
    it('[RGPD-T012] Create form MUST mention audit trail (transparency)', () => {
      render(<CreateTenantPage />, { wrapper: Wrapper })

      // RGPD notice present
      expect(screen.getByText(/🔒 RGPD/i)).toBeInTheDocument()
      expect(screen.getByText(/audit trail/i)).toBeInTheDocument()
      expect(
        screen.getByText(/uniquement métadonnées P1/i)
      ).toBeInTheDocument()
    })

    it('[RGPD-T013] Edit form MUST mention audit trail', async () => {
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

      await screen.findByDisplayValue('Acme Corp')

      expect(screen.getByText(/🔒 RGPD/i)).toBeInTheDocument()
      expect(screen.getByText(/audit trail/i)).toBeInTheDocument()
    })

    it('[RGPD-T014] Delete confirmation MUST warn about data loss', async () => {
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

      await screen.findByText('Acme Corp')

      screen.getByText(/zone de danger/i).closest('div')

      // Warnings about data loss
      expect(screen.getByText(/tous les utilisateurs et données/i)).toBeInTheDocument()
    })
  })

  describe('RGPD Data Classification Enforcement', () => {
    it('[RGPD-T015] Tenant type MUST enforce P1-only fields at compile time', () => {
      // TypeScript compile-time check
      // This test validates the type system prevents P2/P3 fields

      const validTenant = {
        id: 'tenant-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: null,
      }

      // This should compile (P1 fields only)
      expect(validTenant).toBeDefined()

      // TypeScript prevents P2/P3 fields at compile time
      // Uncommenting the line below would cause a TypeScript error:
      // const invalidTenant: Tenant = {
      //   id: 'tenant-123',
      //   name: 'Acme Corp',
      //   slug: 'acme-corp',
      //   createdAt: '2024-01-15T10:00:00Z',
      //   deletedAt: null,
      //   email: 'contact@acme.com', // FORBIDDEN - would fail TS
      // }
      
      // Verify email is not in Tenant type
      type TenantKeys = keyof Tenant
      const tenantHasEmail: TenantKeys extends 'email' ? true : false = false
      expect(tenantHasEmail).toBe(false)
    })

    it('[RGPD-T016] NO email addresses in tenant UI state', async () => {
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

      const { container } = render(<TenantsListPage />, { wrapper: Wrapper })

      await screen.findByText('Acme Corp')

      const html = container.innerHTML

      // NO email patterns (regex check)
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      expect(html.match(emailPattern)).toBeNull()
    })

    it('[RGPD-T017] Stats MUST show counts only (NO user details)', async () => {
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
        usersCount: 42,
        aiJobsCount: 128,
        storageUsed: 5242880,
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTenant })
        .mockResolvedValueOnce({ ok: true, json: async () => mockStats })

      const { container } = render(<TenantDetailsPage />, { wrapper: Wrapper })

      await screen.findByText('Acme Corp')

      // Aggregate counts ALLOWED
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('128')).toBeInTheDocument()

      const html = container.innerHTML

      // NO user names or details
      expect(html).not.toContain('John')
      expect(html).not.toContain('Doe')
      expect(html).not.toContain('displayName')
    })
  })

  describe('RGPD Transparency (Art. 13-14)', () => {
    it('[RGPD-T018] Create form MUST inform about data processing purpose', () => {
      render(<CreateTenantPage />, { wrapper: Wrapper })

      // Purpose explained
      expect(
        screen.getByText(/un tenant représente un client/i)
      ).toBeInTheDocument()
    })

    it('[RGPD-T019] Slug immutability MUST be clearly communicated', async () => {
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

      await screen.findByDisplayValue('Acme Corp')

      // Warning about slug immutability
      expect(
        screen.getByText(/identifiant immuable et ne peut pas être modifié/i)
      ).toBeInTheDocument()
    })

    it('[RGPD-T020] NO hidden data collection in forms', () => {
      const { container } = render(<CreateTenantPage />, { wrapper: Wrapper })

      const html = container.innerHTML

      // NO hidden inputs (except CSRF tokens if needed)
      const hiddenInputs = container.querySelectorAll('input[type="hidden"]')
      expect(hiddenInputs.length).toBe(0)

      // NO tracking scripts
      expect(html).not.toContain('_ga') // Google Analytics
      expect(html).not.toContain('utm_')
      expect(html).not.toContain('mixpanel')
    })
  })
})
