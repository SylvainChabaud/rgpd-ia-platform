'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../apiClient'
import type {
  ListAuditEventsResponse,
  GlobalStats,
  PaginationParams,
} from '@/types/api'

/**
 * TanStack Query hooks for Audit API
 *
 * RGPD Compliance:
 * - Audit events contain only P1 metadata (IDs, event types, timestamps)
 * - NO user content (prompts, outputs)
 * - Cross-tenant access for PLATFORM admin only
 */

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * List audit events with filters
 */
export function useListAuditEvents(
  params?: PaginationParams & {
    eventType?: string
    tenantId?: string
    userId?: string
    startDate?: string
    endDate?: string
  }
) {
  return useQuery({
    queryKey: ['audit', 'events', params],
    queryFn: () => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append('limit', String(params.limit))
      if (params?.offset) queryParams.append('offset', String(params.offset))
      if (params?.eventType) queryParams.append('eventType', params.eventType)
      if (params?.tenantId) queryParams.append('tenantId', params.tenantId)
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/audit/events?${queryString}` : '/audit/events'

      return apiClient<ListAuditEventsResponse>(endpoint)
    },
    // Fresh data on audit pages (30s cache)
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Get global platform stats
 */
export function useGlobalStats() {
  return useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => apiClient<GlobalStats>('/stats/global'),
    // Refresh every 30 seconds (admin dashboard needs fresh data)
    staleTime: 30 * 1000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Refetch on mount (when navigating to dashboard)
    refetchOnMount: true,
  })
}

/**
 * Get audit stats for dashboard
 */
export function useAuditStats() {
  return useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () =>
      apiClient<{
        totalEvents: number
        eventsByType: Array<{ type: string; count: number }>
        eventsOverTime: Array<{ date: string; count: number }>
      }>('/audit/stats'),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Get AI jobs stats (time series for charts)
 */
export function useAIJobsStats(days: number = 30) {
  return useQuery({
    queryKey: ['stats', 'ai-jobs', days],
    queryFn: () =>
      apiClient<{
        stats: Array<{ date: string; success: number; failed: number; total: number }>
        days: number
      }>(`/stats/ai-jobs?days=${days}`),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Get RGPD stats (time series for charts)
 */
export function useRGPDStats(days: number = 30) {
  return useQuery({
    queryKey: ['stats', 'rgpd', days],
    queryFn: () =>
      apiClient<{
        stats: {
          exports: Array<{ date: string; count: number }>
          deletions: Array<{ date: string; count: number }>
          contests: Array<{ date: string; count: number }>
          oppositions: Array<{ date: string; count: number }>
          suspensions: Array<{ date: string; count: number }>
        }
        days: number
      }>(`/stats/rgpd?days=${days}`),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Export audit events to CSV
 * This returns a URL for download, not a query hook
 */
export function getAuditExportUrl(params?: {
  eventType?: string
  tenantId?: string
  startDate?: string
  endDate?: string
}): string {
  const queryParams = new URLSearchParams()
  queryParams.append('format', 'csv')
  if (params?.eventType) queryParams.append('eventType', params.eventType)
  if (params?.tenantId) queryParams.append('tenantId', params.tenantId)
  if (params?.startDate) queryParams.append('startDate', params.startDate)
  if (params?.endDate) queryParams.append('endDate', params.endDate)

  return `/api/audit/export?${queryParams.toString()}`
}
