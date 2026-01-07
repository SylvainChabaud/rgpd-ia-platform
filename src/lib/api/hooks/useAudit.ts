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
  })
}

/**
 * Get global platform stats
 */
export function useGlobalStats() {
  return useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => apiClient<GlobalStats>('/stats/global'),
    // Refresh every 5 minutes
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
