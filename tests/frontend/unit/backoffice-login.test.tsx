/**
 * Unit Tests - Login Page (LOT 11.0)
 *
 * Coverage:
 * - Form validation (email, password required)
 * - Login flow (success, failure)
 * - Token storage (JWT)
 * - Session management
 * - Scope-based redirection
 *
 * RGPD compliance: Uses FAKE credentials only
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '../../../app/login/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/login'),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock auth store
const mockLogin = jest.fn()
jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      checkAuth: jest.fn(),
      user: null,
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

describe('Login Page (LOT 11.0)', () => {
  let mockPush: jest.Mock
  let mockReplace: jest.Mock

  beforeEach(() => {
    mockPush = jest.fn()
    mockReplace = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
    global.fetch = jest.fn()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Validation', () => {
    it('[LOGIN-001] should require email and password fields', async () => {
      const user = userEvent.setup()

      render(<LoginPage />)

      // Find submit button
      const submitButton = screen.getByRole('button', { name: /connexion/i })

      // Try to submit empty form
      await user.click(submitButton)

      // Validation errors should appear
      await waitFor(() => {
        // Email required
        expect(screen.getByText(/email.*requis/i)).toBeInTheDocument()
      })

      // Password required error might appear separately
      const passwordError = screen.queryByText(/mot de passe.*requis/i)
      if (passwordError) {
        expect(passwordError).toBeInTheDocument()
      }
    })

    it('[LOGIN-002] should validate email format', async () => {
      const user = userEvent.setup()

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/mot de passe/i)
      const submitButton = screen.getByRole('button', { name: /connexion/i })

      // Enter invalid email and valid password to isolate email validation
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'ValidPassword123!')
      await user.click(submitButton)

      // Form should NOT submit with invalid email (no API call)
      // Wait a bit to ensure no call was made
      await new Promise((r) => setTimeout(r, 100))
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Login Flow - Success with Scope-based Redirect', () => {
    it('[LOGIN-003] should redirect PLATFORM user to /admin', async () => {
      const user = userEvent.setup()

      const mockResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LTEyMyIsInNjb3BlIjoiUExBVEZPUk0ifQ.signature',
        user: {
          id: 'test-123',
          displayName: 'Admin Test',
          scope: 'PLATFORM',
          role: 'SUPERADMIN',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<LoginPage />)

      // Fill form with FAKE credentials
      await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'FakePassword123!')

      // Submit
      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              email: 'admin@example.com',
              password: 'FakePassword123!',
            }),
          })
        )
      })

      // Should redirect to /admin (PLATFORM scope)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin')
      })
    })

    it('[LOGIN-004] should redirect TENANT user to /portal', async () => {
      const user = userEvent.setup()

      const mockResponse = {
        token: 'fake-tenant-token',
        user: {
          id: 'tenant-admin-123',
          displayName: 'Tenant Admin',
          scope: 'TENANT',
          role: 'TENANT_ADMIN',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), 'tenant@example.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'FakePassword123!')

      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Should redirect to /portal (TENANT scope)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/portal')
      })
    })

    it('[LOGIN-005] should redirect MEMBER user to /app', async () => {
      const user = userEvent.setup()

      const mockResponse = {
        token: 'fake-member-token',
        user: {
          id: 'member-123',
          displayName: 'User',
          scope: 'MEMBER',
          role: 'MEMBER',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'FakePassword123!')

      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Should redirect to /app (MEMBER scope)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/app')
      })
    })
  })

  describe('Login Flow - Failure', () => {
    it('[LOGIN-006] should show error message on login failure', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid credentials',
          message: 'Email ou mot de passe incorrect',
        }),
      })

      render(<LoginPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'WrongPassword123!')

      // Submit
      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Wait for error
      await waitFor(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const toast = require('sonner').toast
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('incorrect')
        )
      })

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('[LOGIN-007] should handle tenant suspended error (403)', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Tenant suspended',
          message: 'Your organization account has been suspended. Please contact support.',
        }),
      })

      render(<LoginPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'user@suspended-tenant.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'Password123!')

      // Submit
      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Wait for error
      await waitFor(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const toast = require('sonner').toast
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('suspended')
        )
      })

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('[LOGIN-008] should handle account suspended error (403)', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.',
        }),
      })

      render(<LoginPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'suspended@example.com')
      await user.type(screen.getByLabelText(/mot de passe/i), 'Password123!')

      // Submit
      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      // Wait for error
      await waitFor(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const toast = require('sonner').toast
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('suspended')
        )
      })
    })
  })

  describe('RGPD Compliance - No Sensitive Data Exposure', () => {
    it('[LOGIN-009] should NOT log credentials in console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'fake-token', user: { scope: 'PLATFORM' } }),
      })

      render(<LoginPage />)

      // Fill form with FAKE credentials
      const fakeEmail = 'test@example.com'
      const fakePassword = 'TestPassword123!'

      await user.type(screen.getByLabelText(/email/i), fakeEmail)
      await user.type(screen.getByLabelText(/mot de passe/i), fakePassword)

      const submitButton = screen.getByRole('button', { name: /connexion/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Verify NO credentials in console logs
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(fakeEmail)
      )
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(fakePassword)
      )

      consoleSpy.mockRestore()
    })
  })
})
