'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import { toast } from 'sonner'
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  ListTenantsResponse,
  PaginationParams,
  TenantStatsResponse,
} from '@/types/api'

/**
 * TanStack Query hooks for Tenants API
 *
 * RGPD Compliance:
 * - All data displayed is P1 (public metadata)
 * - Toast notifications are RGPD-safe (no sensitive data)
 * - Auto-invalidate queries to keep data fresh
 */

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * List all tenants (PLATFORM admin only)
 */
export function useListTenants(params?: PaginationParams) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/tenants?${queryString}` : '/tenants'

      return apiClient<ListTenantsResponse>(endpoint)
    },
  })
}

/**
 * Get tenant by ID
 */
export function useTenantById(id: string) {
  return useQuery({
    queryKey: ['tenants', id],
    queryFn: () => apiClient<{ tenant: Tenant }>(`/tenants/${id}`),
    enabled: !!id,
  })
}

/**
 * Get tenant stats (users count, AI jobs count, storage, etc.)
 */
export function useTenantStats(id: string) {
  return useQuery({
    queryKey: ['tenants', id, 'stats'],
    queryFn: () => apiClient<TenantStatsResponse>(`/tenants/${id}/stats`),
    enabled: !!id,
  })
}

// ============================================
// Mutation Hooks (WRITE operations)
// ============================================

/**
 * Create new tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTenantInput) =>
      apiClient<{ tenantId: string }>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate tenants list to refetch
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      // RGPD-safe success message
      toast.success('Tenant créé avec succès')
    },
    onError: (error: Error) => {
      // RGPD-safe error message (no sensitive data)
      toast.error(error.message || 'Erreur lors de la création du tenant')
    },
  })
}

/**
 * Update tenant (name only, slug is immutable)
 */
export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTenantInput) =>
      apiClient<{ tenant: Tenant }>(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate tenant details and list
      queryClient.invalidateQueries({ queryKey: ['tenants', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant mis à jour')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour')
    },
  })
}

/**
 * Suspend tenant
 * Blocks all user logins and AI operations
 * Requires a reason (RGPD compliance - traçabilité)
 */
export function useSuspendTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { reason: string }) =>
      apiClient<{ message: string }>(`/tenants/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant suspendu')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suspension')
    },
  })
}

/**
 * Reactivate suspended tenant
 */
export function useReactivateTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/tenants/${id}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant réactivé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la réactivation')
    },
  })
}

/**
 * Delete tenant (soft delete)
 * Cascades to users
 */
export function useDeleteTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/tenants/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant supprimé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}
