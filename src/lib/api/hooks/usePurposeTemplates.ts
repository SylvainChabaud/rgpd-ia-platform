/**
 * Purpose Templates Hooks
 * LOT 12.2 - Purpose Templates System (RGPD-Compliant)
 *
 * React Query hooks for purpose templates management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../apiClient';
import { toast } from 'sonner';
import {
  LAWFUL_BASIS,
  PURPOSE_CATEGORY,
  RISK_LEVEL,
  DATA_CLASS,
  PROCESSING_TYPE,
  SECTOR,
  type LawfulBasis,
  type PurposeCategory,
  type RiskLevel,
  type DataClass,
  type ProcessingType,
  type Sector,
  // Labels from shared constants
  LAWFUL_BASIS_LABELS,
  LAWFUL_BASIS_DESCRIPTIONS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  CATEGORY_LABELS,
  DATA_CLASS_LABELS,
  DATA_CLASS_DESCRIPTIONS,
  PROCESSING_TYPE_LABELS,
  PROCESSING_TYPE_DESCRIPTIONS,
  SECTOR_LABELS,
  SECTOR_DESCRIPTIONS,
} from '@/lib/constants/rgpd';

// =========================
// Types
// =========================

export interface PurposeTemplate {
  id: string;
  code: string;
  name: string;
  description: string;
  lawfulBasis: LawfulBasis;
  lawfulBasisLabel?: string;
  lawfulBasisDescription?: string;
  category: PurposeCategory;
  categoryLabel?: string;
  riskLevel: RiskLevel;
  riskLevelLabel?: string;
  riskLevelColor?: string;
  sector: Sector;
  sectorLabel?: string;
  sectorDescription?: string;
  defaultRetentionDays: number;
  requiresDpia: boolean;
  maxDataClass: DataClass;
  maxDataClassLabel?: string;
  maxDataClassDescription?: string;
  isAiPurpose: boolean;
  cnilReference: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateAdoption {
  isAdopted: boolean;
  totalAdoptions: number;
}

export interface TemplateFilters {
  category?: PurposeCategory;
  riskLevel?: RiskLevel;
  sector?: Sector;
  aiOnly?: boolean;
}

export interface AdoptTemplateInput {
  templateCode: string;
  label?: string;
  description?: string;
  isRequired?: boolean;
}

export interface ValidateCustomPurposeInput {
  label: string;
  description: string;
  dataClassInvolved: DataClass[];
  processingTypes: string[];
  automaticDecision: boolean;
  highRisk?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  suggestedLawfulBasis: LawfulBasis;
  suggestedLawfulBasisLabel: string;
  suggestedLawfulBasisDescription: string;
  suggestedRiskLevel: RiskLevel;
  suggestedRiskLevelLabel: string;
  suggestedRiskLevelColor: string;
  warnings: string[];
  errors: string[];
  requiresDpia: boolean;
  canProceed: boolean;
}

export interface LawfulBasisOption {
  value: LawfulBasis;
  label: string;
  description: string;
  isRecommended: boolean;
}

export interface CreateCustomPurposeInput {
  label: string;
  description: string;
  lawfulBasis: LawfulBasis;
  category?: PurposeCategory;
  riskLevel?: RiskLevel;
  maxDataClass?: DataClass;
  isRequired?: boolean;
  acknowledgeDpiaWarning?: boolean;
}

// =========================
// API Functions
// =========================

async function fetchTemplates(filters?: TemplateFilters): Promise<{
  templates: PurposeTemplate[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters?.sector) params.set('sector', filters.sector);
  if (filters?.aiOnly) params.set('aiOnly', 'true');

  const queryString = params.toString();
  const endpoint = queryString ? `/purposes/templates?${queryString}` : '/purposes/templates';

  return apiClient<{ templates: PurposeTemplate[]; total: number }>(endpoint);
}

async function fetchTemplateByCode(code: string): Promise<{
  template: PurposeTemplate;
  adoption: TemplateAdoption;
}> {
  return apiClient<{ template: PurposeTemplate; adoption: TemplateAdoption }>(
    `/purposes/templates/${code}`
  );
}

async function adoptTemplate(input: AdoptTemplateInput): Promise<{ purpose: unknown }> {
  return apiClient<{ purpose: unknown }>('/purposes/adopt', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function validateCustomPurpose(input: ValidateCustomPurposeInput): Promise<{
  validation: ValidationResult;
  lawfulBasisOptions: LawfulBasisOption[];
}> {
  return apiClient<{ validation: ValidationResult; lawfulBasisOptions: LawfulBasisOption[] }>(
    '/purposes/custom/validate',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

async function createCustomPurpose(input: CreateCustomPurposeInput): Promise<{
  purpose: unknown;
  warnings: string[];
}> {
  return apiClient<{ purpose: unknown; warnings: string[] }>('/purposes/custom', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// =========================
// Hooks
// =========================

/**
 * Hook to list purpose templates
 *
 * @param filters - Optional filters (category, riskLevel, aiOnly)
 */
export function usePurposeTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['purpose-templates', filters],
    queryFn: () => fetchTemplates(filters),
  });
}

/**
 * Hook to get a single template by code
 *
 * @param code - Template code (e.g., 'AI_SUMMARIZATION')
 */
export function usePurposeTemplate(code: string) {
  return useQuery({
    queryKey: ['purpose-template', code],
    queryFn: () => fetchTemplateByCode(code),
    enabled: !!code,
  });
}

/**
 * Hook to adopt a template
 */
export function useAdoptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adoptTemplate,
    onSuccess: () => {
      // Invalidate purposes list to refresh
      queryClient.invalidateQueries({ queryKey: ['purposes'] });
      queryClient.invalidateQueries({ queryKey: ['purpose-templates'] });
      toast.success('Template adopté avec succès');
    },
    onError: (error: unknown) => {
      // Handle 409 Conflict - template already adopted
      const apiError = error as ApiError;
      if (apiError?.status === 409) {
        toast.error('Ce template est déjà adopté pour votre organisation');
      } else {
        const message = apiError?.message || (error instanceof Error ? error.message : "Erreur lors de l'adoption du template");
        toast.error(message);
      }
    },
  });
}

/**
 * Hook to validate a custom purpose before creation
 */
export function useValidateCustomPurpose() {
  return useMutation({
    mutationFn: validateCustomPurpose,
  });
}

/**
 * Hook to create a custom purpose
 */
export function useCreateCustomPurpose() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomPurpose,
    onSuccess: () => {
      // Invalidate purposes list to refresh
      queryClient.invalidateQueries({ queryKey: ['purposes'] });
    },
  });
}

// =========================
// Constants for UI (derived from shared constants)
// =========================

export const LAWFUL_BASIS_OPTIONS: Array<{
  value: LawfulBasis;
  label: string;
  description: string;
}> = Object.values(LAWFUL_BASIS).map((value) => ({
  value,
  label: LAWFUL_BASIS_LABELS[value],
  description: LAWFUL_BASIS_DESCRIPTIONS[value],
}));

export const RISK_LEVEL_OPTIONS: Array<{
  value: RiskLevel;
  label: string;
  color: string;
}> = Object.values(RISK_LEVEL).map((value) => ({
  value,
  label: RISK_LEVEL_LABELS[value],
  color: RISK_LEVEL_COLORS[value],
}));

export const CATEGORY_OPTIONS: Array<{
  value: PurposeCategory;
  label: string;
}> = Object.values(PURPOSE_CATEGORY).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const DATA_CLASS_OPTIONS: Array<{
  value: DataClass;
  label: string;
  description: string;
}> = Object.values(DATA_CLASS).map((value) => ({
  value,
  label: `${value} - ${DATA_CLASS_LABELS[value]}`,
  description: DATA_CLASS_DESCRIPTIONS[value],
}));

export const PROCESSING_TYPE_OPTIONS: Array<{
  value: ProcessingType;
  label: string;
  description: string;
}> = Object.values(PROCESSING_TYPE).map((value) => ({
  value,
  label: PROCESSING_TYPE_LABELS[value],
  description: PROCESSING_TYPE_DESCRIPTIONS[value],
}));

export const SECTOR_OPTIONS: Array<{
  value: Sector;
  label: string;
  description: string;
}> = Object.values(SECTOR).map((value) => ({
  value,
  label: SECTOR_LABELS[value],
  description: SECTOR_DESCRIPTIONS[value],
}));
