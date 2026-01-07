import { useAuthStore } from '@/lib/auth/authStore'

/**
 * Custom API Error class
 * Includes HTTP status code and error details
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * API Client - Centralized fetch wrapper
 *
 * Features:
 * - Auto-attach JWT token from sessionStorage
 * - Auto-logout on 401 (unauthorized)
 * - Typed responses
 * - Centralized error handling
 * - RGPD-compliant error messages (no sensitive data exposed)
 *
 * Security:
 * - Same-origin requests (/api) - no CORS issues
 * - JWT token from sessionStorage (not localStorage)
 * - Auto-redirect to login on authentication failure
 *
 * @param endpoint - API endpoint (e.g., "/tenants", "/users/123")
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Typed response data
 * @throws ApiError on failure
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get JWT token from sessionStorage (client-side only)
  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null

  // Build headers with JWT token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  }

  try {
    // Make request to backend API (same origin, no CORS)
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    })

    // Handle 401 Unauthorized: Auto logout and redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout()
        window.location.href = '/backoffice/login'
      }
      throw new ApiError(401, 'Non authentifié')
    }

    // Handle other errors
    if (!response.ok) {
      // Try to parse error body
      const errorBody = await response.json().catch(() => ({}))

      // RGPD-compliant error messages (no sensitive data)
      throw new ApiError(
        response.status,
        errorBody.message || 'Erreur serveur',
        errorBody.details
      )
    }

    // Parse and return JSON response
    return response.json()
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }

    // Wrap network errors
    if (error instanceof Error) {
      throw new ApiError(0, error.message)
    }

    // Unknown error
    throw new ApiError(0, 'Erreur inconnue')
  }
}
