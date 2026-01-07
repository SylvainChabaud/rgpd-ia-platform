/**
 * Tests Coverage - useTenants.ts (Branches 25% → 80%+)
 *
 * Lignes non couvertes: 117, 131-140, 153-162, 184
 * Focus: Error paths, mutations invalidations, edge cases
 *
 * RGPD: Toast messages RGPD-safe (pas de données sensibles)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useListTenants,
  useTenantById,
  useTenantStats,
  useCreateTenant,
  useUpdateTenant,
  useSuspendTenant,
  useReactivateTenant,
  useDeleteTenant,
} from '@/lib/api/hooks/useTenants'
import { apiClient } from '@/lib/api/apiClient'

// Mock dependencies
jest.mock('@/lib/api/apiClient')
jest.mock('sonner')

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>
const mockToast = toast as jest.Mocked<typeof toast>

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useTenants - Coverage Branches', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  // ========================================
  // Query Hooks - Edge Cases
  // ========================================

  test('COV-001: useListTenants with pagination params (limit + offset)', async () => {
    mockApiClient.mockResolvedValueOnce({
      tenants: [],
      total: 0,
      limit: 10,
      offset: 20,
    })

    const { result } = renderHook(() => useListTenants({ limit: 10, offset: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // API called with query params
    expect(mockApiClient).toHaveBeenCalledWith('/tenants?limit=10&offset=20')
  })

  test('COV-002: useListTenants without params (default)', async () => {
    mockApiClient.mockResolvedValueOnce({
      tenants: [],
      total: 0,
    })

    const { result } = renderHook(() => useListTenants(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // API called without query params
    expect(mockApiClient).toHaveBeenCalledWith('/tenants')
  })

  test('COV-003: useTenantById disabled when id is empty', () => {
    const { result } = renderHook(() => useTenantById(''), {
      wrapper: createWrapper(),
    })

    // Query should NOT run (enabled: false)
    expect(result.current.isFetching).toBe(false)
    expect(mockApiClient).not.toHaveBeenCalled()
  })

  test('COV-004: useTenantStats disabled when id is empty', () => {
    const { result } = renderHook(() => useTenantStats(''), {
      wrapper: createWrapper(),
    })

    // Query should NOT run (enabled: false)
    expect(result.current.isFetching).toBe(false)
    expect(mockApiClient).not.toHaveBeenCalled()
  })

  // ========================================
  // Mutation Hooks - Error Paths (LIGNE 117, 131-140, 153-162, 184)
  // ========================================

  test('COV-005: useUpdateTenant onError with custom message', async () => {
    const customError = new Error('Slug already exists')
    mockApiClient.mockRejectedValueOnce(customError)

    const { result } = renderHook(() => useUpdateTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate({ name: 'Updated Name' })

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with custom message (LIGNE 117)
    expect(mockToast.error).toHaveBeenCalledWith('Slug already exists')
  })

  test('COV-006: useUpdateTenant onError with fallback message', async () => {
    const errorWithoutMessage = new Error()
    errorWithoutMessage.message = '' // Empty message
    mockApiClient.mockRejectedValueOnce(errorWithoutMessage)

    const { result } = renderHook(() => useUpdateTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate({ name: 'Updated Name' })

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with fallback message (LIGNE 117)
    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la mise à jour')
  })

  test('COV-007: useSuspendTenant onError with custom message', async () => {
    const customError = new Error('Tenant already suspended')
    mockApiClient.mockRejectedValueOnce(customError)

    const { result } = renderHook(() => useSuspendTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with custom message (LIGNE 140)
    expect(mockToast.error).toHaveBeenCalledWith('Tenant already suspended')
  })

  test('COV-008: useSuspendTenant onError with fallback message', async () => {
    const errorWithoutMessage = new Error()
    errorWithoutMessage.message = ''
    mockApiClient.mockRejectedValueOnce(errorWithoutMessage)

    const { result } = renderHook(() => useSuspendTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with fallback message (LIGNE 140)
    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la suspension')
  })

  test('COV-009: useReactivateTenant onError with custom message', async () => {
    const customError = new Error('Tenant not suspended')
    mockApiClient.mockRejectedValueOnce(customError)

    const { result } = renderHook(() => useReactivateTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with custom message (LIGNE 162)
    expect(mockToast.error).toHaveBeenCalledWith('Tenant not suspended')
  })

  test('COV-010: useReactivateTenant onError with fallback message', async () => {
    const errorWithoutMessage = new Error()
    errorWithoutMessage.message = ''
    mockApiClient.mockRejectedValueOnce(errorWithoutMessage)

    const { result } = renderHook(() => useReactivateTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with fallback message (LIGNE 162)
    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la réactivation')
  })

  test('COV-011: useDeleteTenant onError with custom message', async () => {
    const customError = new Error('Tenant has active users')
    mockApiClient.mockRejectedValueOnce(customError)

    const { result } = renderHook(() => useDeleteTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with custom message (LIGNE 184)
    expect(mockToast.error).toHaveBeenCalledWith('Tenant has active users')
  })

  test('COV-012: useDeleteTenant onError with fallback message', async () => {
    const errorWithoutMessage = new Error()
    errorWithoutMessage.message = ''
    mockApiClient.mockRejectedValueOnce(errorWithoutMessage)

    const { result } = renderHook(() => useDeleteTenant('tenant-1'), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error called with fallback message (LIGNE 184)
    expect(mockToast.error).toHaveBeenCalledWith('Erreur lors de la suppression')
  })

  // ========================================
  // Mutations Success - Query Invalidations
  // ========================================

  test('COV-013: useCreateTenant invalidates queries on success', async () => {
    mockApiClient.mockResolvedValueOnce({ tenantId: 'tenant-new' })

    const queryClient = new QueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    // Trigger mutation
    result.current.mutate({ name: 'New Tenant', slug: 'new-tenant' })

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Queries invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants'] })
    expect(mockToast.success).toHaveBeenCalledWith('Tenant créé avec succès')
  })

  test('COV-014: useUpdateTenant invalidates multiple queries', async () => {
    mockApiClient.mockResolvedValueOnce({ tenant: { id: 'tenant-1', name: 'Updated' } })

    const queryClient = new QueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTenant('tenant-1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    // Trigger mutation
    result.current.mutate({ name: 'Updated Name' })

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Both queries invalidated (detail + list)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants', 'tenant-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants'] })
    expect(mockToast.success).toHaveBeenCalledWith('Tenant mis à jour')
  })

  test('COV-015: useSuspendTenant invalidates queries on success', async () => {
    mockApiClient.mockResolvedValueOnce({ message: 'Suspended' })

    const queryClient = new QueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSuspendTenant('tenant-1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Queries invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants', 'tenant-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants'] })
    expect(mockToast.success).toHaveBeenCalledWith('Tenant suspendu')
  })

  test('COV-016: useReactivateTenant invalidates queries on success', async () => {
    mockApiClient.mockResolvedValueOnce({ message: 'Reactivated' })

    const queryClient = new QueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReactivateTenant('tenant-1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Queries invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants', 'tenant-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants'] })
    expect(mockToast.success).toHaveBeenCalledWith('Tenant réactivé')
  })

  test('COV-017: useDeleteTenant invalidates list only (no detail)', async () => {
    mockApiClient.mockResolvedValueOnce({ message: 'Deleted' })

    const queryClient = new QueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteTenant('tenant-1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    // Trigger mutation
    result.current.mutate()

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Only list invalidated (detail not needed after delete)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tenants'] })
    expect(mockToast.success).toHaveBeenCalledWith('Tenant supprimé')
  })

  // ========================================
  // RGPD Compliance Tests
  // ========================================

  test('COV-018: Toast messages are RGPD-safe (no sensitive data)', async () => {
    const sensitiveData = {
      name: 'Tenant with Secret',
      slug: 'secret-tenant',
      adminEmail: 'admin@secret.com', // P2 data
      apiKey: 'sk_live_12345', // P3 data
    }

    mockApiClient.mockRejectedValueOnce(new Error('Validation error'))

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: createWrapper(),
    })

    // Trigger mutation with sensitive data
    result.current.mutate(sensitiveData as any)

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Toast error should NOT contain sensitive data
    const toastCalls = mockToast.error.mock.calls.flat().join(' ')
    expect(toastCalls).not.toContain('admin@secret.com')
    expect(toastCalls).not.toContain('sk_live_12345')
    expect(toastCalls).not.toContain('apiKey')
  })
})
