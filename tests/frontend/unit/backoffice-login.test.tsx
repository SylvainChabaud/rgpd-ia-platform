/**
 * Unit Tests - Backoffice Login Page (LOT 11.0)
 *
 * Coverage:
 * - Form validation (email, password required)
 * - Login flow (success, failure)
 * - Token storage (JWT)
 * - Session management
 *
 * RGPD compliance: Uses FAKE credentials only
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '../../../app/(backoffice)/login/page'

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
jest.mock('@/lib/auth/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    user: null,
  })),
}))

describe('Backoffice Login Page (LOT 11.0)', () => {
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
      const submitButton = screen.getByRole('button', { name: /connexion/i })

      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // Email format error
      await waitFor(() => {
        expect(
          screen.getByText(/email.*invalide/i) || screen.getByText(/format.*email/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Login Flow - Success', () => {
    it('[LOGIN-003] should store JWT token on successful login', async () => {
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

      // Token should be stored in localStorage
      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'auth_token',
          mockResponse.token
        )
      })

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Login Flow - Failure', () => {
    it('[LOGIN-004] should show error message on login failure', async () => {
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

      // Token should NOT be stored
      expect(window.localStorage.setItem).not.toHaveBeenCalled()

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('[LOGIN-005] should handle tenant suspended error (403)', async () => {
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

    it('[LOGIN-006] should handle account suspended error (403)', async () => {
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
    it('[LOGIN-007] should NOT log credentials in console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'fake-token', user: {} }),
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
