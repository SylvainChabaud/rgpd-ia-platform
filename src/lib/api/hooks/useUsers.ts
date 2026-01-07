'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import { toast } from 'sonner'
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  ListUsersResponse,
  PaginationParams,
} from '@/types/api'

/**
 * TanStack Query hooks for Users API
 *
 * RGPD Compliance:
 * - NO email displayed (P2 data) - only displayName (P1)
 * - Cross-tenant access for PLATFORM admin only
 * - Toast notifications RGPD-safe
 */

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * List all users (cross-tenant for PLATFORM admin)
 */
export function useListUsers(params?: PaginationParams & { tenantId?: string; role?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.tenantId) queryParams.append('tenantId', params.tenantId)
      if (params?.role) queryParams.append('role', params.role)

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/users?${queryString}` : '/users'

      return apiClient<ListUsersResponse>(endpoint)
    },
  })
}

/**
 * Get user by ID
 */
export function useUserById(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiClient<{ user: User }>(`/users/${id}`),
    enabled: !!id,
  })
}

// ============================================
// Mutation Hooks (WRITE operations)
// ============================================

/**
 * Create new user (tenant admin)
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      apiClient<{ userId: string }>(`/tenants/${data.tenantId}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur créé avec succès')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création')
    },
  })
}

/**
 * Update user (displayName, role)
 */
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserInput) =>
      apiClient<{ user: User }>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur mis à jour')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour')
    },
  })
}

/**
 * Suspend user (Art. 18 RGPD - Data suspension)
 */
export function useSuspendUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/users/${id}/suspend`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur suspendu')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suspension')
    },
  })
}

/**
 * Reactivate suspended user
 */
export function useReactivateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/users/${id}/reactivate`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur réactivé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la réactivation')
    },
  })
}

/**
 * Delete user (soft delete)
 */
export function useDeleteUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur supprimé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}
