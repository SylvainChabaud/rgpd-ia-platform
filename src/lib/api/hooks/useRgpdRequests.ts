'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../apiClient';
import { useAuthStore } from '@/lib/auth/authStore';
import type {
  RgpdExportsListResponse,
  RgpdDeletionsListResponse,
  RgpdStatsResponse,
  RgpdRequestParams,
  RgpdSuspensionListItem,
  RgpdOppositionListItem,
  RgpdContestListItem,
} from '@/types/api';

// ============================================
// Export Stats & Purge Types (RGPD Compliance)
// ============================================

export interface ExportStatsResponse {
  totalExports: number;
  expiredExports: number;
  oldestExportAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
  retentionDays: number;
}

export interface ExportPurgeResponse {
  success: boolean;
  purgedCount: number;
  filesCleanedUp: number;
  retentionDays: number;
  message: string;
}

/**
 * TanStack Query hooks for RGPD Request Management
 * LOT 12.3 - Tenant Admin RGPD Management
 *
 * RGPD Compliance:
 * - Tenant-scoped endpoints only
 * - NO email displayed (P2 data) - only userId (UUID)
 * - All queries require tenantId from auth store
 */

// ============================================
// Export Requests (Art. 15, 20)
// ============================================

/**
 * List export requests for tenant
 */
export function useRgpdExports(params?: RgpdRequestParams) {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'exports', tenantId, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.offset) queryParams.append('offset', String(params.offset));
      if (params?.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const endpoint = `/tenants/${tenantId}/rgpd/exports${queryString ? `?${queryString}` : ''}`;

      return apiClient<RgpdExportsListResponse>(endpoint);
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Get export statistics for RGPD compliance monitoring
 * LOT 12.3 - Art. 5.1.e (Storage limitation)
 */
export function useRgpdExportStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'exports', 'stats', tenantId],
    queryFn: () =>
      apiClient<ExportStatsResponse>(`/tenants/${tenantId}/rgpd/exports/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Purge expired exports (RGPD compliance)
 * LOT 12.3 - Art. 5.1.e (Storage limitation)
 *
 * Mutation that:
 * 1. Deletes expired export records from DB
 * 2. Cleans up orphaned files
 * 3. Invalidates export stats and list queries
 */
export function useRgpdPurgeExpiredExports() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const response = await fetch(`/api/tenants/${tenantId}/rgpd/exports/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purge failed');
      }

      return response.json() as Promise<ExportPurgeResponse>;
    },
    onSuccess: () => {
      // Invalidate export stats and list queries
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'exports', 'stats', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'exports', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'stats', tenantId] });
    },
  });
}

// ============================================
// Deletion Requests (Art. 17)
// ============================================

export interface DeletionStatsResponse {
  totalDeletions: number;
  completedDeletions: number;
  expiredDeletions: number;
  oldestCompletedAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
  retentionDays: number;
}

export interface DeletionPurgeResponse {
  success: boolean;
  purgedCount: number;
  retentionDays: number;
  message: string;
}

/**
 * List deletion requests for tenant
 */
export function useRgpdDeletions(params?: RgpdRequestParams) {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'deletions', tenantId, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.offset) queryParams.append('offset', String(params.offset));
      if (params?.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const endpoint = `/tenants/${tenantId}/rgpd/deletions${queryString ? `?${queryString}` : ''}`;

      return apiClient<RgpdDeletionsListResponse>(endpoint);
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get deletion statistics for RGPD compliance monitoring
 * LOT 12.3 - Art. 17 (Right to erasure)
 */
export function useRgpdDeletionStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'deletions', 'stats', tenantId],
    queryFn: () =>
      apiClient<DeletionStatsResponse>(`/tenants/${tenantId}/rgpd/deletions/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Purge expired deletion requests (RGPD compliance)
 * LOT 12.3 - Art. 17 (Right to erasure)
 *
 * Purges COMPLETED deletion requests older than 30 days.
 * PENDING requests are NEVER deleted.
 */
export function useRgpdPurgeExpiredDeletions() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const response = await fetch(`/api/tenants/${tenantId}/rgpd/deletions/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purge failed');
      }

      return response.json() as Promise<DeletionPurgeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'deletions', 'stats', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'deletions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'stats', tenantId] });
    },
  });
}

// ============================================
// Suspensions (Art. 18)
// ============================================

export interface SuspensionStatsResponse {
  totalSuspensions: number;
  activeSuspensions: number;
  liftedSuspensions: number;
  expiredSuspensions: number;
  oldestLiftedAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
  retentionDays: number;
}

export interface SuspensionPurgeResponse {
  success: boolean;
  purgedCount: number;
  retentionDays: number;
  message: string;
}

interface SuspensionsResponse {
  suspensions: RgpdSuspensionListItem[];
}

/**
 * List suspensions for tenant
 */
export function useRgpdSuspensions() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'suspensions', tenantId],
    queryFn: () =>
      apiClient<SuspensionsResponse>(`/tenants/${tenantId}/rgpd/suspensions`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get suspension statistics for RGPD compliance monitoring
 * LOT 12.3 - Art. 18 (Right to restriction)
 */
export function useRgpdSuspensionStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'suspensions', 'stats', tenantId],
    queryFn: () =>
      apiClient<SuspensionStatsResponse>(`/tenants/${tenantId}/rgpd/suspensions/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Purge expired suspensions (RGPD compliance)
 * LOT 12.3 - Art. 18 (Right to restriction)
 *
 * Purges LIFTED suspensions older than 3 years.
 * ACTIVE suspensions are NEVER deleted.
 */
export function useRgpdPurgeExpiredSuspensions() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const response = await fetch(`/api/tenants/${tenantId}/rgpd/suspensions/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purge failed');
      }

      return response.json() as Promise<SuspensionPurgeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'suspensions', 'stats', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'suspensions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'stats', tenantId] });
    },
  });
}

// ============================================
// Oppositions (Art. 21)
// ============================================

export interface OppositionStatsResponse {
  totalOppositions: number;
  processedOppositions: number;
  expiredOppositions: number;
  oldestProcessedAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
  retentionDays: number;
}

export interface OppositionPurgeResponse {
  success: boolean;
  purgedCount: number;
  retentionDays: number;
  message: string;
}

interface OppositionsResponse {
  oppositions: RgpdOppositionListItem[];
}

/**
 * List oppositions for tenant
 */
export function useRgpdOppositions() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'oppositions', tenantId],
    queryFn: () =>
      apiClient<OppositionsResponse>(`/tenants/${tenantId}/rgpd/oppositions`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get opposition statistics for RGPD compliance monitoring
 * LOT 12.3 - Art. 21 (Right to object)
 */
export function useRgpdOppositionStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'oppositions', 'stats', tenantId],
    queryFn: () =>
      apiClient<OppositionStatsResponse>(`/tenants/${tenantId}/rgpd/oppositions/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Purge expired oppositions (RGPD compliance)
 * LOT 12.3 - Art. 21 (Right to object)
 *
 * Purges ACCEPTED/REJECTED oppositions older than 3 years.
 * PENDING oppositions are NEVER deleted.
 */
export function useRgpdPurgeExpiredOppositions() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const response = await fetch(`/api/tenants/${tenantId}/rgpd/oppositions/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purge failed');
      }

      return response.json() as Promise<OppositionPurgeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'oppositions', 'stats', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'oppositions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'stats', tenantId] });
    },
  });
}

// ============================================
// Contests/Disputes (Art. 22)
// ============================================

export interface ContestStatsResponse {
  totalContests: number;
  resolvedContests: number;
  expiredContests: number;
  oldestResolvedAge: number | null;
  rgpdCompliant: boolean;
  warning: string | null;
  retentionDays: number;
}

export interface ContestPurgeResponse {
  success: boolean;
  purgedCount: number;
  retentionDays: number;
  message: string;
}

interface ContestsResponse {
  contests: RgpdContestListItem[];
}

/**
 * List contests for tenant
 */
export function useRgpdContests() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'contests', tenantId],
    queryFn: () =>
      apiClient<ContestsResponse>(`/tenants/${tenantId}/rgpd/contests`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get contest statistics for RGPD compliance monitoring
 * LOT 12.3 - Art. 22 (Automated decision-making)
 */
export function useRgpdContestStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'contests', 'stats', tenantId],
    queryFn: () =>
      apiClient<ContestStatsResponse>(`/tenants/${tenantId}/rgpd/contests/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Purge expired contests (RGPD compliance)
 * LOT 12.3 - Art. 22 (Automated decision-making)
 *
 * Purges RESOLVED/REJECTED contests older than 90 days.
 * PENDING/IN_REVIEW contests are NEVER deleted.
 */
export function useRgpdPurgeExpiredContests() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const response = await fetch(`/api/tenants/${tenantId}/rgpd/contests/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purge failed');
      }

      return response.json() as Promise<ContestPurgeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'contests', 'stats', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'contests', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rgpd', 'stats', tenantId] });
    },
  });
}

// ============================================
// Stats (for KPI widgets)
// ============================================

/**
 * Get RGPD stats for tenant (KPI widgets)
 */
export function useRgpdStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['rgpd', 'stats', tenantId],
    queryFn: () =>
      apiClient<RgpdStatsResponse>(`/tenants/${tenantId}/rgpd/stats`),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute (stats don't need to be real-time)
    refetchOnWindowFocus: true,
  });
}

// ============================================
// CSV Export Helper
// ============================================

/**
 * Download RGPD requests as CSV
 *
 * This function triggers a file download, not a React Query hook
 */
export async function downloadRgpdCsv(
  tenantId: string,
  type?: 'exports' | 'deletions'
): Promise<void> {
  const queryParams = new URLSearchParams();
  if (type) queryParams.append('type', type);

  const queryString = queryParams.toString();
  const endpoint = `/tenants/${tenantId}/rgpd/csv${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(`/api${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to download CSV');
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
  const filename = filenameMatch?.[1] || 'rgpd-requests.csv';

  // Trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
