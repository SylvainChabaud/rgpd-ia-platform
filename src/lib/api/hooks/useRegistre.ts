'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, apiBlobClient, downloadBlob } from '../apiClient';
import { useAuthStore } from '@/lib/auth/authStore';
import type { DpiaRiskLevel, DataClassification } from '@/domain/dpia';
import {
  REGISTRE_STALE_TIME_MS,
  REGISTRE_CSV_FILENAME,
  REGISTRE_PDF_FILENAME,
  REGISTRE_LAWFUL_BASIS_LABELS,
  REGISTRE_CATEGORY_LABELS,
} from '@/lib/constants/registre';
import { DPIA_RISK_LABELS, DPIA_RISK_BADGE_STYLES } from '@/lib/constants/dpia';

// ============================================
// Types
// ============================================

export interface RegistreEntry {
  id: string;
  purposeId: string;
  purposeName: string;
  purposeDescription: string;
  category: string;
  dataSubjectCategories: string[];
  dataCategories: string[];
  dataClassification: DataClassification;
  recipientCategories: string[];
  transfersOutsideEU: boolean;
  retentionPeriod: string;
  retentionDescription: string;
  securityMeasures: string[];
  lawfulBasis: string;
  riskLevel: DpiaRiskLevel;
  requiresDpia: boolean;
  dpiaId?: string;
  dpiaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistreStats {
  total: number;
  active: number;
  inactive: number;
  requiresDpia: number;
  dpiaApproved: number;
  dpiaPending: number;
  byCategory: {
    ai_processing: number;
    data_analysis: number;
    marketing: number;
    security: number;
    other: number;
  };
  byLawfulBasis: {
    consent: number;
    contract: number;
    legitimate_interest: number;
    legal_obligation: number;
  };
}

export interface RegistreListResponse {
  entries: RegistreEntry[];
  stats: RegistreStats;
  total: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Get Registre Art. 30 entries
 * LOT 12.4 - DPO functionality
 *
 * RGPD Compliance:
 * - Art. 30: Registre des activites de traitement
 * - Tenant-scoped queries only
 */
export function useRegistre() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['registre', tenantId],
    queryFn: () =>
      apiClient<RegistreListResponse>(`/tenants/${tenantId}/registre`),
    enabled: !!tenantId,
    staleTime: REGISTRE_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get Registre stats for KPI widgets
 * LOT 12.4 - DPO dashboard
 */
export function useRegistreStats() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: ['registre', 'stats', tenantId],
    queryFn: async () => {
      const response = await apiClient<RegistreListResponse>(`/tenants/${tenantId}/registre`);
      return response.stats;
    },
    enabled: !!tenantId,
    staleTime: REGISTRE_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// Export Helpers
// ============================================

/**
 * Download Registre as CSV
 * LOT 12.4 - Documentation for CNIL
 *
 * Uses centralized apiBlobClient for consistent auth handling
 */
export async function downloadRegistreCsv(tenantId: string): Promise<void> {
  const { blob, filename } = await apiBlobClient(
    `/tenants/${tenantId}/registre/export?format=csv`,
    REGISTRE_CSV_FILENAME
  );
  downloadBlob(blob, filename);
}

/**
 * Download Registre as PDF (HTML format)
 * LOT 12.4 - Documentation for CNIL
 *
 * Uses centralized apiBlobClient for consistent auth handling
 */
export async function downloadRegistrePdf(tenantId: string): Promise<void> {
  const { blob, filename } = await apiBlobClient(
    `/tenants/${tenantId}/registre/export?format=pdf`,
    REGISTRE_PDF_FILENAME
  );
  downloadBlob(blob, filename);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get lawful basis label in French
 * @deprecated Use REGISTRE_LAWFUL_BASIS_LABELS from @/lib/constants/registre instead
 */
export function getLawfulBasisLabel(basis: string): string {
  return REGISTRE_LAWFUL_BASIS_LABELS[basis] || basis;
}

/**
 * Get category label in French
 * @deprecated Use REGISTRE_CATEGORY_LABELS from @/lib/constants/registre instead
 */
export function getCategoryLabel(category: string): string {
  return REGISTRE_CATEGORY_LABELS[category] || category;
}

/**
 * Get risk level badge color
 * @deprecated Use DPIA_RISK_BADGE_STYLES from @/lib/constants/dpia instead
 */
export function getRiskLevelColor(riskLevel: DpiaRiskLevel): string {
  return DPIA_RISK_BADGE_STYLES[riskLevel] || 'bg-gray-100 text-gray-800';
}

/**
 * Get risk level label in French
 * @deprecated Use DPIA_RISK_LABELS from @/lib/constants/dpia instead
 */
export function getRiskLevelLabel(riskLevel: DpiaRiskLevel): string {
  return DPIA_RISK_LABELS[riskLevel] || riskLevel;
}
