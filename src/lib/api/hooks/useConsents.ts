'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, apiBlobClient, downloadBlob } from '../apiClient'
import { toast } from 'sonner'
import type {
  LawfulBasis,
  PurposeCategory,
  RiskLevel,
  DataClass,
  ValidationStatus,
} from '@/app/ports/PurposeTemplateRepo'

/**
 * TanStack Query hooks for Consent Management
 * LOT 12.2 - Gestion Consentements (Purposes + Tracking)
 *
 * RGPD Compliance:
 * - Tenant-scoped endpoints only
 * - NO email displayed (P2 data) - only displayName (P1)
 * - Toast notifications RGPD-safe
 */

// ============================================
// Types
// ============================================

export interface Purpose {
  id: string
  label: string
  description: string
  isRequired: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  consentCount?: number
  // RGPD fields (LOT 12.2)
  templateId?: string | null
  lawfulBasis?: LawfulBasis
  category?: PurposeCategory
  riskLevel?: RiskLevel
  maxDataClass?: DataClass
  requiresDpia?: boolean
  isFromTemplate?: boolean
  isSystem?: boolean
  validationStatus?: ValidationStatus
  // DPIA status (LOT 12.4)
  dpiaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  dpiaId?: string | null
}

export interface PurposeListResponse {
  purposes: Purpose[]
  total: number
}

export interface CreatePurposeInput {
  label: string
  description: string
  isRequired?: boolean
  isActive?: boolean
}

export interface UpdatePurposeInput {
  label?: string
  description?: string
  isRequired?: boolean
  isActive?: boolean
}

export interface ConsentCell {
  purposeId: string
  status: 'granted' | 'revoked' | 'pending'
  grantedAt: string | null
  revokedAt: string | null
}

export interface MatrixRow {
  userId: string
  displayName: string
  consents: ConsentCell[]
}

export interface ConsentMatrixResponse {
  purposes: Purpose[]
  matrix: MatrixRow[]
  total: number
  limit: number
  offset: number
}

export interface ConsentMatrixParams {
  limit?: number
  offset?: number
  search?: string
  purposeId?: string
  status?: 'granted' | 'revoked' | 'pending' | 'all'
}

export interface ConsentHistoryEntry {
  id: string
  purposeId: string
  purposeLabel: string
  action: 'granted' | 'revoked'
  timestamp: string
  source: 'user' | 'admin' | 'system'
}

export interface ConsentHistoryResponse {
  user: {
    id: string
    displayName: string
  }
  history: ConsentHistoryEntry[]
  total: number
  limit: number
  offset: number
}

export interface ConsentHistoryParams {
  limit?: number
  offset?: number
  purposeId?: string
  startDate?: string
  endDate?: string
}

// ============================================
// Purpose Hooks
// ============================================

/**
 * List purposes for tenant
 */
export function usePurposes(includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['purposes', includeInactive],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (includeInactive) {
        queryParams.append('includeInactive', 'true')
      }
      const queryString = queryParams.toString()
      const endpoint = queryString ? `/purposes?${queryString}` : '/purposes'
      return apiClient<PurposeListResponse>(endpoint)
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  })
}

/**
 * Get purpose by ID
 */
export function usePurpose(purposeId: string | null | undefined) {
  return useQuery({
    queryKey: ['purposes', purposeId],
    queryFn: () => apiClient<{ purpose: Purpose }>(`/purposes/${purposeId}`),
    enabled: !!purposeId,
    staleTime: 60 * 1000,
  })
}

/**
 * Create purpose
 */
export function useCreatePurpose() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePurposeInput) =>
      apiClient<{ purpose: Purpose }>('/purposes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purposes'] })
      toast.success('Finalité créée avec succès')
    },
    onError: (error: Error) => {
      if (error.message.includes('already exists')) {
        toast.error('Une finalité avec ce nom existe déjà')
      } else {
        toast.error(error.message || 'Erreur lors de la création')
      }
    },
  })
}

/**
 * Update purpose
 */
export function useUpdatePurpose(purposeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdatePurposeInput) =>
      apiClient<{ purpose: Purpose }>(`/purposes/${purposeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purposes', purposeId] })
      queryClient.invalidateQueries({ queryKey: ['purposes'] })
      queryClient.invalidateQueries({ queryKey: ['consent-matrix'] })
      toast.success('Finalité mise à jour')
    },
    onError: (error: Error) => {
      if (error.message.includes('already exists')) {
        toast.error('Une finalité avec ce nom existe déjà')
      } else {
        toast.error(error.message || 'Erreur lors de la mise à jour')
      }
    },
  })
}

/**
 * Delete purpose (soft delete)
 */
export function useDeletePurpose() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (purposeId: string) =>
      apiClient<{ message: string; purposeId: string; consentCount: number }>(
        `/purposes/${purposeId}`,
        { method: 'DELETE' }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purposes'] })
      queryClient.invalidateQueries({ queryKey: ['consent-matrix'] })
      if (data.consentCount > 0) {
        toast.success(`Finalité supprimée (${data.consentCount} consentement(s) associé(s))`)
      } else {
        toast.success('Finalité supprimée')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}

// ============================================
// Consent Matrix Hooks
// ============================================

/**
 * Get consent matrix (users x purposes)
 */
export function useConsentMatrix(params?: ConsentMatrixParams) {
  return useQuery({
    queryKey: ['consent-matrix', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.search) queryParams.append('search', params.search)
      if (params?.purposeId) queryParams.append('purposeId', params.purposeId)
      if (params?.status) queryParams.append('status', params.status)

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/consents/matrix?${queryString}` : '/consents/matrix'

      return apiClient<ConsentMatrixResponse>(endpoint)
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

// ============================================
// Consent History Hooks
// ============================================

/**
 * Get consent history for a user
 */
export function useConsentHistory(userId: string | null | undefined, params?: ConsentHistoryParams) {
  return useQuery({
    queryKey: ['consent-history', userId, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.purposeId) queryParams.append('purposeId', params.purposeId)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const endpoint = queryString
        ? `/consents/history/${userId}?${queryString}`
        : `/consents/history/${userId}`

      return apiClient<ConsentHistoryResponse>(endpoint)
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

// ============================================
// Export Hook
// ============================================

/**
 * Export consent matrix to CSV
 * Returns a function that triggers the download
 *
 * Uses centralized apiBlobClient for consistent auth handling.
 */
export function useExportConsents() {
  return useMutation({
    mutationFn: async () => {
      // Use centralized blob client with auto-auth handling
      const defaultFilename = `consents-export-${new Date().toISOString().split('T')[0]}.csv`
      const { blob, filename } = await apiBlobClient('/consents/export', defaultFilename)

      // Trigger browser download
      downloadBlob(blob, filename)

      return { success: true }
    },
    onSuccess: () => {
      toast.success('Export CSV téléchargé')
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'export")
    },
  })
}
