'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import type {
  TenantStatsResponse,
  TenantActivityResponse,
  TenantAIJobsStatsResponse,
} from '@/types/api'

/**
 * TanStack Query hooks for Tenant Dashboard API
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * RGPD Compliance:
 * - All data is P1 (aggregates, event types, IDs)
 * - NO user content (prompts, outputs)
 * - Tenant isolation enforced by backend
 */

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * Get tenant dashboard stats
 * Stats include: users, AI jobs, consents, RGPD requests
 *
 * @param tenantId - Tenant ID to fetch stats for
 */
export function useTenantStats(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'stats'],
    queryFn: () => apiClient<TenantStatsResponse>(`/tenants/${tenantId}/stats`),
    // Enabled only when tenantId is available
    enabled: !!tenantId,
    // Fresh data for admin dashboard (30s cache)
    staleTime: 30 * 1000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Refetch on mount (when navigating to dashboard)
    refetchOnMount: true,
  })
}

/**
 * Get tenant activity feed
 * Returns last N audit events for the tenant
 *
 * @param tenantId - Tenant ID to fetch activity for
 * @param limit - Max events to return (default: 50, max: 100)
 */
export function useTenantActivity(tenantId: string | null | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'activity', limit],
    queryFn: () =>
      apiClient<TenantActivityResponse>(`/tenants/${tenantId}/activity?limit=${limit}`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Get tenant AI jobs stats (time series for charts)
 * Returns success/failed/total per day
 *
 * @param tenantId - Tenant ID
 * @param days - Number of days to fetch (default: 30, max: 90)
 */
export function useTenantAIJobsStats(tenantId: string | null | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'stats', 'ai-jobs', days],
    queryFn: () =>
      apiClient<TenantAIJobsStatsResponse>(`/tenants/${tenantId}/stats/ai-jobs?days=${days}`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}
