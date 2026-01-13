/**
 * Shared RGPD Constants
 * LOT 12.2 - Purpose Templates System
 *
 * This file re-exports RGPD constants from the backend ports for use across
 * the entire application (Server Components, Client Components, API routes).
 *
 * Best Practice (Next.js 15+):
 * - No 'use client' or 'use server' directive = shared module
 * - Can be imported anywhere without bundling issues
 * - Single source of truth for RGPD constants
 *
 * @see https://nextjs.org/docs/app/getting-started/server-and-client-components
 */

import {
  LAWFUL_BASIS as _LAWFUL_BASIS,
  PURPOSE_CATEGORY as _PURPOSE_CATEGORY,
  RISK_LEVEL as _RISK_LEVEL,
  DATA_CLASS as _DATA_CLASS,
  SECTOR as _SECTOR,
} from '@/app/ports/PurposeTemplateRepo';

// Re-export all constants from the authoritative source
export {
  // Enums
  LAWFUL_BASIS,
  PURPOSE_CATEGORY,
  RISK_LEVEL,
  DATA_CLASS,
  VALIDATION_STATUS,
  PROCESSING_TYPE,
  SECTOR,
  // Types
  type LawfulBasis,
  type PurposeCategory,
  type RiskLevel,
  type DataClass,
  type ValidationStatus,
  type ProcessingType,
  type Sector,
  // Labels (French)
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
} from '@/app/ports/PurposeTemplateRepo';

// =========================
// Filter Constants
// =========================

/**
 * Default value for "all" filter option
 * Used across all filter dropdowns to represent "no filter"
 */
export const FILTER_ALL = 'all' as const;

/**
 * Default sector value (GENERAL = all sectors)
 * SECTOR.GENERAL represents "Tous secteurs" in the database
 */
export const FILTER_SECTOR_ALL = _SECTOR.GENERAL;

// =========================
// UI-specific extensions
// =========================

/**
 * Risk level badge colors (Tailwind classes)
 * Extends RISK_LEVEL_COLORS with full Tailwind styling
 */
export const RISK_BADGE_STYLES: Record<string, string> = {
  [_RISK_LEVEL.LOW]: 'bg-green-100 text-green-800 border-green-200',
  [_RISK_LEVEL.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [_RISK_LEVEL.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [_RISK_LEVEL.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Lawful basis badge colors (Tailwind classes)
 */
export const LAWFUL_BASIS_BADGE_STYLES: Record<string, string> = {
  [_LAWFUL_BASIS.CONSENT]: 'bg-blue-100 text-blue-800 border-blue-200',
  [_LAWFUL_BASIS.CONTRACT]: 'bg-purple-100 text-purple-800 border-purple-200',
  [_LAWFUL_BASIS.LEGAL_OBLIGATION]: 'bg-gray-100 text-gray-800 border-gray-200',
  [_LAWFUL_BASIS.VITAL_INTEREST]: 'bg-red-100 text-red-800 border-red-200',
  [_LAWFUL_BASIS.PUBLIC_INTEREST]: 'bg-teal-100 text-teal-800 border-teal-200',
  [_LAWFUL_BASIS.LEGITIMATE_INTEREST]: 'bg-amber-100 text-amber-800 border-amber-200',
};

/**
 * Category badge colors (Tailwind classes)
 */
export const CATEGORY_BADGE_STYLES: Record<string, string> = {
  [_PURPOSE_CATEGORY.AI_PROCESSING]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [_PURPOSE_CATEGORY.ANALYTICS]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [_PURPOSE_CATEGORY.MARKETING]: 'bg-pink-100 text-pink-800 border-pink-200',
  [_PURPOSE_CATEGORY.ESSENTIAL]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [_PURPOSE_CATEGORY.PROFESSIONAL]: 'bg-violet-100 text-violet-800 border-violet-200',
};

/**
 * Sector badge colors (Tailwind classes)
 */
export const SECTOR_BADGE_STYLES: Record<string, string> = {
  [_SECTOR.GENERAL]: 'bg-slate-100 text-slate-800 border-slate-200',
  [_SECTOR.ACCOUNTING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [_SECTOR.LEGAL]: 'bg-purple-100 text-purple-800 border-purple-200',
  [_SECTOR.HEALTH]: 'bg-red-100 text-red-800 border-red-200',
  [_SECTOR.FINANCE]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [_SECTOR.HR]: 'bg-amber-100 text-amber-800 border-amber-200',
};

/**
 * Data class badge colors (Tailwind classes)
 */
export const DATA_CLASS_BADGE_STYLES: Record<string, string> = {
  [_DATA_CLASS.P0]: 'bg-slate-100 text-slate-800 border-slate-200',
  [_DATA_CLASS.P1]: 'bg-blue-100 text-blue-800 border-blue-200',
  [_DATA_CLASS.P2]: 'bg-orange-100 text-orange-800 border-orange-200',
  [_DATA_CLASS.P3]: 'bg-red-100 text-red-800 border-red-200',
};
