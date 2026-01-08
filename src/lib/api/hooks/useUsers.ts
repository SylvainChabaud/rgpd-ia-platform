'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth/authStore'
import { ACTOR_SCOPE } from '@/shared/actorScope'
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
 *
 * Smart endpoint selection:
 * - PLATFORM scope → /api/platform/users (cross-tenant)
 * - TENANT scope → /api/users (tenant-scoped)
 */

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * List users with smart endpoint selection
 *
 * Automatically detects user scope and calls the appropriate endpoint:
 * - PLATFORM admin → /api/platform/users (cross-tenant access)
 * - TENANT admin → /api/users (tenant-scoped access)
 *
 * @param params - Pagination + filtres (tenantId, role, status)
 */
export function useListUsers(params?: PaginationParams & {
  tenantId?: string
  role?: string
  status?: 'active' | 'suspended'
}) {
  // Get current user scope to determine which endpoint to use
  const user = useAuthStore((state) => state.user)
  const isPlatformAdmin = user?.scope === ACTOR_SCOPE.PLATFORM

  return useQuery({
    queryKey: ['users', params, isPlatformAdmin],
    queryFn: () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.tenantId) queryParams.append('tenantId', params.tenantId)
      if (params?.role) queryParams.append('role', params.role)
      if (params?.status) queryParams.append('status', params.status)

      const queryString = queryParams.toString()

      // Smart endpoint selection based on user scope
      const baseEndpoint = isPlatformAdmin ? '/platform/users' : '/users'
      const endpoint = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint

      return apiClient<ListUsersResponse>(endpoint)
    },
    // Only enable query if user is loaded (avoid calling with null scope)
    enabled: !!user,
  })
}

/**
 * Get user by ID
 * 
 * SMART ENDPOINT SELECTION:
 * - PLATFORM admin → /api/platform/users/:id (cross-tenant)
 * - TENANT admin → /api/users/:id (tenant-scoped)
 */
export function useUserById(id: string) {
  const user = useAuthStore((state) => state.user)
  
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => {
      const endpoint = user?.scope === ACTOR_SCOPE.PLATFORM
        ? `/platform/users/${id}`
        : `/users/${id}`
      return apiClient<{ user: User }>(endpoint)
    },
    enabled: !!id && !!user,
  })
}

// ============================================
// Mutation Hooks (WRITE operations)
// ============================================

/**
 * Create new user with smart endpoint selection
 *
 * - PLATFORM admin → POST /api/platform/users (can create in any tenant)
 * - TENANT admin → POST /api/users (creates in their own tenant)
 */
export function useCreateUser() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isPlatformAdmin = user?.scope === ACTOR_SCOPE.PLATFORM

  return useMutation({
    mutationFn: (data: CreateUserInput) => {
      // Smart endpoint selection
      const endpoint = isPlatformAdmin ? '/platform/users' : '/users'

      return apiClient<{ userId: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
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
 * 
 * SMART ENDPOINT SELECTION:
 * - PLATFORM admin → /api/platform/users/:id (cross-tenant)
 * - TENANT admin → /api/users/:id (tenant-scoped)
 */
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: (data: UpdateUserInput) => {
      const endpoint = user?.scope === ACTOR_SCOPE.PLATFORM
        ? `/platform/users/${id}`
        : `/users/${id}`
      return apiClient<{ user: User }>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
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
 * 
 * SMART ENDPOINT SELECTION:
 * - PLATFORM admin → /api/platform/users/:id/suspend (cross-tenant)
 * - TENANT admin → /api/users/:id/suspend (tenant-scoped)
 */
export function useSuspendUser(id: string) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: () => {
      const endpoint = user?.scope === ACTOR_SCOPE.PLATFORM
        ? `/platform/users/${id}/suspend`
        : `/users/${id}/suspend`
      return apiClient<{ message: string }>(endpoint, {
        method: 'PATCH',
      })
    },
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
 * 
 * SMART ENDPOINT SELECTION:
 * - PLATFORM admin → /api/platform/users/:id/reactivate (cross-tenant)
 * - TENANT admin → /api/users/:id/reactivate (tenant-scoped)
 */
export function useReactivateUser(id: string) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: () => {
      const endpoint = user?.scope === ACTOR_SCOPE.PLATFORM
        ? `/platform/users/${id}/reactivate`
        : `/users/${id}/reactivate`
      return apiClient<{ message: string }>(endpoint, {
        method: 'PATCH',
      })
    },
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
 * 
 * SMART ENDPOINT SELECTION:
 * - PLATFORM admin → /api/platform/users/:id (cross-tenant)
 * - TENANT admin → /api/users/:id (tenant-scoped)
 */
export function useDeleteUser(id: string) {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: () => {
      const endpoint = user?.scope === ACTOR_SCOPE.PLATFORM
        ? `/platform/users/${id}`
        : `/users/${id}`
      return apiClient<{ message: string }>(endpoint, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur supprimé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}

// ============================================
// Bulk Operations (NEW for LOT 11.2)
// ============================================

/**
 * Bulk suspend multiple users
 * Allows Super Admin to suspend multiple users at once
 */
export function useBulkSuspendUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { userIds: string[]; reason: string }) =>
      apiClient<{ message: string; count: number }>('/rgpd/bulk-suspend', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${data.count} utilisateur(s) suspendu(s)`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suspension multiple')
    },
  })
}

/**
 * Bulk reactivate multiple users
 */
export function useBulkReactivateUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { userIds: string[] }) =>
      apiClient<{ message: string; count: number }>('/rgpd/bulk-reactivate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${data.count} utilisateur(s) réactivé(s)`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la réactivation multiple')
    },
  })
}

// ============================================
// Helper - Re-export useListTenants for dropdown
// ============================================

export { useListTenants } from './useTenants'
