import { useAuthStore } from '@/lib/auth/authStore'
import { API_ERROR_MESSAGES } from '@/lib/constants/ui/messages'

/**
 * Default API timeout in milliseconds
 * 30 seconds is sufficient for most operations while preventing hung requests
 */
const DEFAULT_TIMEOUT_MS = 30_000

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
 * Response from blob download
 */
export interface BlobDownloadResult {
  blob: Blob
  filename: string
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
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 * @returns Typed response data
 * @throws ApiError on failure (including timeout)
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  // SECURITY NOTE: JWT stored in sessionStorage for CSRF protection.
  // sessionStorage is cleared on tab close (vs localStorage persistence).
  // Application uses strict CSP and React's automatic XSS escaping to mitigate risks.
  // Alternative: httpOnly cookies with SameSite=Strict for better XSS protection.
  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null

  // Build headers with JWT token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  }

  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Make request to backend API (same origin, no CORS)
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    // Handle 401 Unauthorized: Auto logout and redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
      throw new ApiError(401, API_ERROR_MESSAGES.UNAUTHENTICATED)
    }

    // Handle other errors
    if (!response.ok) {
      // Try to parse error body
      const errorBody = await response.json().catch(() => ({}))

      // RGPD-compliant error messages (no sensitive data)
      throw new ApiError(
        response.status,
        errorBody.message || API_ERROR_MESSAGES.SERVER_ERROR,
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

    // Handle timeout (AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, API_ERROR_MESSAGES.TIMEOUT)
    }

    // Wrap network errors
    if (error instanceof Error) {
      throw new ApiError(0, error.message)
    }

    // Unknown error
    throw new ApiError(0, API_ERROR_MESSAGES.UNKNOWN_ERROR)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * API Client for Blob downloads - Centralized fetch wrapper for file downloads
 *
 * Features:
 * - Auto-attach JWT token from sessionStorage
 * - Auto-logout on 401 (unauthorized)
 * - Returns blob with filename from Content-Disposition header
 * - Triggers browser download automatically
 *
 * @param endpoint - API endpoint (e.g., "/tenants/123/dpia/456/export")
 * @param defaultFilename - Default filename if not provided in response headers
 * @returns BlobDownloadResult with blob and filename
 * @throws ApiError on failure
 */
export async function apiBlobClient(
  endpoint: string,
  defaultFilename: string
): Promise<BlobDownloadResult> {
  // Get JWT token from sessionStorage (client-side only)
  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null

  // Build headers with JWT token (no Content-Type for blob requests)
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  try {
    const response = await fetch(`/api${endpoint}`, {
      method: 'GET',
      headers,
    })

    // Handle 401 Unauthorized: Auto logout and redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
      throw new ApiError(401, API_ERROR_MESSAGES.UNAUTHENTICATED)
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorBody.message || API_ERROR_MESSAGES.DOWNLOAD_ERROR,
        errorBody.details
      )
    }

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    const filenameMatch = contentDisposition?.match(/filename="(.+?)"/)
    const filename = filenameMatch?.[1] || defaultFilename

    // Get blob
    const blob = await response.blob()

    return { blob, filename }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof Error) {
      throw new ApiError(0, error.message)
    }

    throw new ApiError(0, API_ERROR_MESSAGES.UNKNOWN_ERROR)
  }
}

/**
 * Download blob as file - Triggers browser download
 *
 * @param blob - Blob to download
 * @param filename - Filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
