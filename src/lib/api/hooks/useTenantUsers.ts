'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth/authStore'
import type { User, CreateUserInput, UpdateUserInput } from '@/types/api'
import type { UserDataStatus } from '@/app/ports/UserRepo'

/**
 * TanStack Query hooks for Tenant User Management
 * LOT 12.1 - Tenant User Management
 *
 * RGPD Compliance:
 * - Tenant-scoped endpoints only (/api/users/*)
 * - NO email displayed (P2 data) - only displayName (P1)
 * - Toast notifications RGPD-safe
 * - All queries require tenantId from auth store
 */

// ============================================
// Types
// ============================================

export interface TenantUsersParams {
  limit?: number
  offset?: number
  role?: string
  status?: UserDataStatus
  search?: string
  sortBy?: 'name' | 'createdAt' | 'role'
  sortOrder?: 'asc' | 'desc'
}

export interface TenantUsersResponse {
  users: User[]
  total: number
  limit: number
  offset: number
}

export interface UserStats {
  jobs: {
    success: number
    failed: number
    pending: number
    running: number
    total: number
  }
  consents: {
    granted: number
    revoked: number
    total: number
  }
  auditEvents: {
    total: number
  }
}

export interface UserJob {
  id: string
  purpose: string
  model: string
  status: string
  latencyMs: number | null
  createdAt: string | null
  completedAt: string | null
}

export interface UserConsent {
  id: string
  purposeId: string
  purposeLabel: string
  purposeDescription: string
  granted: boolean
  grantedAt: string | null
  revokedAt: string | null
  createdAt: string | null
  status: 'granted' | 'revoked' | 'pending'
}

export interface UserAuditEvent {
  id: string
  type: string
  actorId: string | null
  targetId: string | null
  createdAt: string | null
  isActor: boolean
  isTarget: boolean
}

export interface BulkActionResult {
  message: string
  action: 'suspend' | 'reactivate'
  results: Array<{ userId: string; success: boolean; error?: string }>
  summary: {
    total: number
    success: number
    errors: number
  }
}

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * List tenant users with filters
 *
 * @param params - Pagination + filters (role, status, search, sorting)
 */
export function useTenantUsers(params?: TenantUsersParams) {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['tenant-users', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.role) queryParams.append('role', params.role)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.search) queryParams.append('search', params.search)
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/users?${queryString}` : '/users'

      return apiClient<TenantUsersResponse>(endpoint)
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

/**
 * Get user by ID with full details
 */
export function useUserDetail(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant-users', userId],
    queryFn: () => apiClient<{ user: User }>(`/users/${userId}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/**
 * Get user statistics (jobs count, consents count)
 */
export function useUserStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant-users', userId, 'stats'],
    queryFn: () => apiClient<{ stats: UserStats }>(`/users/${userId}/stats`),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - aligned with other queries
  })
}

/**
 * Get user AI jobs history (paginated)
 */
export function useUserJobs(userId: string | null | undefined, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['tenant-users', userId, 'jobs', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/users/${userId}/jobs?${queryString}` : `/users/${userId}/jobs`

      return apiClient<{ jobs: UserJob[]; total: number; limit: number; offset: number }>(endpoint)
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/**
 * Get user consents list
 */
export function useUserConsents(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant-users', userId, 'consents'],
    queryFn: () => apiClient<{ consents: UserConsent[]; total: number }>(`/users/${userId}/consents`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/**
 * Get user audit events (paginated)
 */
export function useUserAuditEvents(userId: string | null | undefined, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['tenant-users', userId, 'audit', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/users/${userId}/audit?${queryString}` : `/users/${userId}/audit`

      return apiClient<{ events: UserAuditEvent[]; total: number; limit: number; offset: number }>(endpoint)
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

// ============================================
// Mutation Hooks (WRITE operations)
// ============================================

/**
 * Create new user in tenant
 */
export function useCreateTenantUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CreateUserInput, 'tenantId'>) =>
      apiClient<{ userId: string; displayName: string; role: string }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
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
export function useUpdateTenantUser(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserInput) =>
      apiClient<{ user: User }>(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', userId] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      toast.success('Utilisateur mis à jour')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour')
    },
  })
}

/**
 * Suspend user with reason (Art. 5 Accountability)
 */
export function useSuspendTenantUser(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { reason: string }) =>
      apiClient<{ message: string; user: User }>(`/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', userId] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
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
export function useReactivateTenantUser(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string; user: User }>(`/users/${userId}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', userId] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
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
export function useDeleteTenantUser(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>(`/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      toast.success('Utilisateur supprimé')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Bulk suspend multiple users with reason
 */
export function useBulkSuspendTenantUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { userIds: string[]; reason: string }) =>
      apiClient<BulkActionResult>('/users/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'suspend', ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      toast.success(`${data.summary.success} utilisateur(s) suspendu(s)`)
      if (data.summary.errors > 0) {
        toast.warning(`${data.summary.errors} erreur(s) lors de la suspension`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suspension multiple')
    },
  })
}

/**
 * Bulk reactivate multiple users
 */
export function useBulkReactivateTenantUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { userIds: string[] }) =>
      apiClient<BulkActionResult>('/users/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'reactivate', ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      toast.success(`${data.summary.success} utilisateur(s) réactivé(s)`)
      if (data.summary.errors > 0) {
        toast.warning(`${data.summary.errors} erreur(s) lors de la réactivation`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la réactivation multiple')
    },
  })
}
