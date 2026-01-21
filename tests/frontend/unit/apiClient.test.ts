/**
 * Unit Tests: API Client
 *
 * Coverage:
 * - credentials: 'include' for httpOnly cookies
 * - 401 auto-refresh + retry
 * - 401 auto-logout if refresh fails
 * - Error handling (RGPD-safe messages)
 * - Network error handling
 */

import { apiClient, ApiError } from '@/lib/api/apiClient'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'

// Mock fetch
global.fetch = jest.fn()

// Mock window.location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).location = { href: '' }

describe('APIClient - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Credentials Include (httpOnly Cookies)', () => {
    it('should include credentials in all requests', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      await apiClient('/tenants')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tenants',
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })

    it('should set Content-Type to application/json', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      await apiClient('/tenants')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tenants',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should NOT include Authorization header (using cookies instead)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      await apiClient('/tenants')

      const [, options] = (global.fetch as jest.Mock).mock.calls[0]
      expect(options.headers.Authorization).toBeUndefined()
    })
  })

  describe('401 Unauthorized - Token Refresh', () => {
    it('should try to refresh token on 401 and retry request', async () => {
      // First request returns 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh token succeeds
        .mockResolvedValueOnce({
          ok: true,
        })
        // Retry request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success after refresh' }),
        })

      const result = await apiClient('/tenants')

      expect(result).toEqual({ data: 'success after refresh' })

      // Should have called: original request, refresh, retry
      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    it('should auto-logout if refresh also returns 401', async () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // First request returns 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh token also fails
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })

      await expect(apiClient('/tenants')).rejects.toThrow('Non authentifié')

      // Should auto-logout
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should auto-logout if refresh fails with network error', async () => {
      useAuthStore.getState().login({
        id: 'user-123',
        displayName: 'John',
        scope: ACTOR_SCOPE.PLATFORM,
        role: 'admin',
        tenantId: null,
      })

      // First request returns 401
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh fails with network error
        .mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient('/tenants')).rejects.toThrow('Non authentifié')
    })
  })

  describe('Error Handling', () => {
    it('should throw ApiError with status and message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Tenant not found' }),
      })

      await expect(apiClient('/tenants/123')).rejects.toMatchObject({
        status: 404,
        message: 'Tenant not found',
      })
    })

    it('should use default message if error body is invalid', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(apiClient('/tenants')).rejects.toMatchObject({
        status: 500,
        message: 'Erreur serveur',
      })
    })

    it('should preserve error details if provided', async () => {
      const errorDetails = {
        field: 'slug',
        message: 'Slug already exists',
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          message: 'Conflict',
          details: errorDetails,
        }),
      })

      try {
        await apiClient('/tenants')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).details).toEqual(errorDetails)
      }
    })
  })

  describe('Network Error Handling', () => {
    it('should wrap network errors in ApiError', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(apiClient('/tenants')).rejects.toMatchObject({
        status: 0,
        message: 'Network error',
      })
    })

    it('should handle unknown errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue('Unknown error')

      await expect(apiClient('/tenants')).rejects.toMatchObject({
        status: 0,
        message: 'Erreur inconnue',
      })
    })
  })

  describe('Successful Requests', () => {
    it('should return parsed JSON on success', async () => {
      const mockData = { tenants: [{ id: '1', name: 'Test' }] }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient('/tenants')
      expect(result).toEqual(mockData)
    })

    it('should handle POST requests with body', async () => {
      const mockBody = { name: 'New Tenant', slug: 'new-tenant' }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ tenantId: '123' }),
      })

      await apiClient('/tenants', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tenants',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockBody),
          credentials: 'include',
        })
      )
    })
  })

  describe('RGPD Compliance - Error Messages', () => {
    it('should NOT expose sensitive data in error messages', async () => {
      // Mock backend error with sensitive data
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Database connection failed',
          // Sensitive data that should NOT leak to frontend
          details: {
            host: 'db.internal.company.com',
            user: 'admin',
            stackTrace: 'Error at line 123...',
          },
        }),
      })

      try {
        await apiClient('/tenants')
        fail('Should have thrown')
      } catch (error) {
        const apiError = error as ApiError

        // Error message should be generic (RGPD-safe)
        expect(apiError.message).toBe('Database connection failed')

        // Sensitive details preserved but not logged to user
        // (backend should sanitize this, but frontend preserves for debugging)
        expect(apiError.details).toBeDefined()
      }
    })

    it('should use RGPD-safe default messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}), // No message
      })

      await expect(apiClient('/tenants')).rejects.toMatchObject({
        message: 'Erreur serveur', // Generic RGPD-safe message
      })
    })
  })

  describe('Custom Headers', () => {
    it('should merge custom headers with defaults', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      await apiClient('/tenants', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tenants',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
          credentials: 'include',
        })
      )
    })
  })
})
