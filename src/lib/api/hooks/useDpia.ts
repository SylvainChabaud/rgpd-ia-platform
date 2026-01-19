'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiBlobClient, downloadBlob } from '../apiClient';
import { useAuthStore } from '@/lib/auth/authStore';
import type {
  DpiaStatus,
  DpiaRiskLevel,
} from '@/domain/dpia';
import {
  DPIA_STALE_TIME_MS,
  DPIA_STATS_STALE_TIME_MS,
  DPIA_STATUS_LABELS,
  DPIA_STATUS_BADGE_STYLES,
  DPIA_RISK_BADGE_STYLES,
} from '@/lib/constants/dpia';
import { API_ERROR_MESSAGES } from '@/lib/constants/ui/messages';

// ============================================
// Types
// ============================================

export interface DpiaRisk {
  id: string;
  dpiaId: string;
  riskName: string;
  description: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
  sortOrder: number;
}

export interface DpiaListItem {
  id: string;
  purposeId: string;
  title: string;
  description: string;
  overallRiskLevel: DpiaRiskLevel;
  dataClassification: string;
  dataProcessed: string[];
  securityMeasures: string[];
  status: DpiaStatus;
  dpoComments: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Revision request fields (LOT 12.4)
  revisionRequestedAt: string | null;
  revisionRequestedBy: string | null;
  revisionComments: string | null;
  purposeLabel?: string;
  purposeIsActive?: boolean;
  risks?: DpiaRisk[];
}

export interface DpiaStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface DpiaListResponse {
  dpias: DpiaListItem[];
  stats: DpiaStats;
  total: number;
}

export interface DpiaDetailResponse {
  dpia: DpiaListItem;
}

export interface DpiaListParams {
  status?: DpiaStatus;
  riskLevel?: DpiaRiskLevel;
  limit?: number;
  offset?: number;
}

export interface CreateDpiaInput {
  purposeId: string;
  title: string;
  description: string;
  overallRiskLevel?: DpiaRiskLevel;
  dataProcessed?: string[];
  dataClassification?: string;
  securityMeasures?: string[];
}

export interface ValidateDpiaInput {
  status: 'APPROVED' | 'REJECTED';
  dpoComments?: string;
  rejectionReason?: string;
}

export interface UpdateDpiaInput {
  title?: string;
  description?: string;
  dpoComments?: string;
  securityMeasures?: string[];
}

// ============================================
// Hooks
// ============================================

/**
 * List DPIAs for tenant
 * LOT 12.4 - DPO functionality
 *
 * RGPD Compliance:
 * - Art. 35: DPIA management
 * - Tenant-scoped queries only
 */
export function useDpiaList(params?: DpiaListParams) {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['dpia', 'list', tenantId, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.riskLevel) queryParams.append('riskLevel', params.riskLevel);
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.offset) queryParams.append('offset', String(params.offset));

      const queryString = queryParams.toString();
      const endpoint = `/tenants/${tenantId}/dpia${queryString ? `?${queryString}` : ''}`;

      return apiClient<DpiaListResponse>(endpoint);
    },
    enabled: !!tenantId,
    staleTime: DPIA_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get DPIA detail with risks
 * LOT 12.4 - DPO functionality
 */
export function useDpiaDetail(dpiaId: string | null) {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['dpia', 'detail', tenantId, dpiaId],
    queryFn: () =>
      apiClient<DpiaDetailResponse>(`/tenants/${tenantId}/dpia/${dpiaId}`),
    enabled: !!tenantId && !!dpiaId,
    staleTime: DPIA_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get DPIA stats for KPI widgets
 * LOT 12.4 - DPO dashboard
 */
export function useDpiaStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['dpia', 'stats', tenantId],
    queryFn: async () => {
      const response = await apiClient<DpiaListResponse>(`/tenants/${tenantId}/dpia`);
      return response.stats;
    },
    enabled: !!tenantId,
    staleTime: DPIA_STATS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Create new DPIA
 * LOT 12.4 - Triggered by HIGH/CRITICAL purpose activation
 */
export function useCreateDpia() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDpiaInput) => {
      if (!tenantId) {
        throw new Error(API_ERROR_MESSAGES.TENANT_REQUIRED);
      }

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

      const response = await fetch(`/api/tenants/${tenantId}/dpia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || API_ERROR_MESSAGES.DPIA_CREATE_FAILED);
      }

      return response.json() as Promise<DpiaDetailResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpia', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'stats', tenantId] });
    },
  });
}

/**
 * Validate DPIA (approve/reject)
 * LOT 12.4 - DPO only
 *
 * RGPD Compliance:
 * - Art. 35: DPIA validation workflow
 * - Art. 38.3: Only DPO can validate
 */
export function useValidateDpia() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dpiaId, input }: { dpiaId: string; input: ValidateDpiaInput }) => {
      if (!tenantId) {
        throw new Error(API_ERROR_MESSAGES.TENANT_REQUIRED);
      }

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

      const response = await fetch(`/api/tenants/${tenantId}/dpia/${dpiaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || API_ERROR_MESSAGES.DPIA_VALIDATE_FAILED);
      }

      return response.json() as Promise<DpiaDetailResponse>;
    },
    onSuccess: (_, { dpiaId }) => {
      queryClient.invalidateQueries({ queryKey: ['dpia', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'detail', tenantId, dpiaId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'stats', tenantId] });
    },
  });
}

/**
 * Update DPIA (editable fields only)
 * LOT 12.4 - DPO can add comments
 */
export function useUpdateDpia() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dpiaId, input }: { dpiaId: string; input: UpdateDpiaInput }) => {
      if (!tenantId) {
        throw new Error(API_ERROR_MESSAGES.TENANT_REQUIRED);
      }

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

      const response = await fetch(`/api/tenants/${tenantId}/dpia/${dpiaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || API_ERROR_MESSAGES.DPIA_UPDATE_FAILED);
      }

      return response.json() as Promise<DpiaDetailResponse>;
    },
    onSuccess: (_, { dpiaId }) => {
      queryClient.invalidateQueries({ queryKey: ['dpia', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'detail', tenantId, dpiaId] });
    },
  });
}

/**
 * Request revision of rejected DPIA
 * LOT 12.4 - Tenant Admin functionality
 *
 * RGPD Compliance:
 * - Art. 35.11: Revision workflow
 * - Only Tenant Admin can request revision
 * - Only rejected DPIAs can be revised
 */
export function useRequestDpiaReview() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dpiaId, revisionComments }: { dpiaId: string; revisionComments: string }) => {
      if (!tenantId) {
        throw new Error(API_ERROR_MESSAGES.TENANT_REQUIRED);
      }

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

      const response = await fetch(`/api/tenants/${tenantId}/dpia/${dpiaId}/request-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ revisionComments }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || API_ERROR_MESSAGES.DPIA_UPDATE_FAILED);
      }

      return response.json() as Promise<DpiaDetailResponse>;
    },
    onSuccess: (_, { dpiaId }) => {
      queryClient.invalidateQueries({ queryKey: ['dpia', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'detail', tenantId, dpiaId] });
      queryClient.invalidateQueries({ queryKey: ['dpia', 'stats', tenantId] });
      // Also invalidate purposes since DPIA status affects purpose display
      queryClient.invalidateQueries({ queryKey: ['purposes', tenantId] });
    },
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get DPIA status label in French
 * @deprecated Use DPIA_STATUS_LABELS from @/lib/constants/dpia instead
 */
export function getDpiaStatusLabel(status: string): string {
  return DPIA_STATUS_LABELS[status as keyof typeof DPIA_STATUS_LABELS] || status;
}

/**
 * Get DPIA status badge color
 * @deprecated Use DPIA_STATUS_BADGE_STYLES from @/lib/constants/dpia instead
 */
export function getDpiaStatusColor(status: string): string {
  return DPIA_STATUS_BADGE_STYLES[status as keyof typeof DPIA_STATUS_BADGE_STYLES] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get risk level badge color
 * @deprecated Use DPIA_RISK_BADGE_STYLES from @/lib/constants/dpia instead
 */
export function getRiskLevelBadgeColor(riskLevel: string): string {
  return DPIA_RISK_BADGE_STYLES[riskLevel] || 'bg-gray-100 text-gray-800';
}

// ============================================
// Export Helper
// ============================================

/**
 * Download DPIA as PDF
 * LOT 12.4 - Documentation for CNIL
 *
 * Uses centralized apiBlobClient for consistent auth handling
 */
export async function downloadDpiaPdf(tenantId: string, dpiaId: string): Promise<void> {
  const { blob, filename } = await apiBlobClient(
    `/tenants/${tenantId}/dpia/${dpiaId}/export`,
    `dpia-${dpiaId}.html`
  );
  downloadBlob(blob, filename);
}
