'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  DPIA_STATUS,
  DPIA_STATUS_LABELS,
  DPIA_STATUS_BADGE_STYLES,
  DPIA_RISK_LABELS,
  DPIA_RISK_FULL_LABELS,
  DPIA_RISK_BADGE_STYLES,
  DPIA_LIKELIHOOD_LABELS,
  DPIA_LIKELIHOOD_BADGE_STYLES,
  DPIA_IMPACT_LABELS,
  DPIA_IMPACT_BADGE_STYLES,
  DPIA_DATA_CLASS_LABELS,
  DPIA_DATA_CLASS_BADGE_STYLES,
  DPIA_ACTIVE_STATUS_LABELS,
} from '@/lib/constants/dpia';
import { FALLBACK_TEXT } from '@/lib/constants/ui/messages';

/**
 * RGPD Badge Components - LOT 12.4
 *
 * Shared badge components for DPIA, Registre, and other RGPD features.
 * Extracts duplicate code from portal pages.
 * Uses centralized constants for labels and styles.
 */

// =============================================================================
// DPIA Status Badge
// =============================================================================

export interface DpiaStatusBadgeProps {
  status: string;
  showIcon?: boolean;
}

/**
 * Badge for DPIA status display
 * Used in: DPIA list, DPIA detail, Registre
 *
 * Note: When status is empty/null but DPIA is required, it means
 * the DPIA hasn't been created yet - show as "En attente" (pending)
 */
export function DpiaStatusBadge({ status, showIcon = true }: DpiaStatusBadgeProps) {
  // Normalize empty/null status to PENDING (DPIA required but not created)
  const normalizedStatus = status || DPIA_STATUS.PENDING;

  const statusIcons: Record<string, React.ReactNode> = {
    [DPIA_STATUS.PENDING]: <Clock className="h-3 w-3 mr-1" />,
    [DPIA_STATUS.APPROVED]: <CheckCircle className="h-3 w-3 mr-1" />,
    [DPIA_STATUS.REJECTED]: <XCircle className="h-3 w-3 mr-1" />,
  };

  const badgeStyle = DPIA_STATUS_BADGE_STYLES[normalizedStatus as keyof typeof DPIA_STATUS_BADGE_STYLES];
  const label = DPIA_STATUS_LABELS[normalizedStatus as keyof typeof DPIA_STATUS_LABELS];

  if (badgeStyle && label) {
    return (
      <Badge variant="outline" className={badgeStyle}>
        {showIcon && statusIcons[normalizedStatus]}
        {label}
      </Badge>
    );
  }

  // Fallback for truly unknown status (not just empty)
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {showIcon && <AlertCircle className="h-3 w-3 mr-1" />}
      {FALLBACK_TEXT.UNKNOWN}
    </Badge>
  );
}

// =============================================================================
// Risk Level Badge
// =============================================================================

export interface RiskLevelBadgeProps {
  level: string;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

/**
 * Badge for risk level display (LOW, MEDIUM, HIGH, CRITICAL)
 * Used in: DPIA list, DPIA detail, Registre
 */
export function RiskLevelBadge({ level, size = 'default', showLabel = true }: RiskLevelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: '',
    lg: 'text-sm px-3 py-1',
  };

  const badgeStyle = DPIA_RISK_BADGE_STYLES[level] || 'bg-gray-100 text-gray-800';
  const label = DPIA_RISK_LABELS[level] || level;

  return (
    <Badge
      variant="outline"
      className={`${badgeStyle} ${sizeClasses[size]}`}
    >
      {showLabel ? label : level}
    </Badge>
  );
}

/**
 * Full risk level badge with "Risque" prefix
 * Used in: DPIA detail header
 */
export function RiskLevelBadgeFull({ level }: { level: string }) {
  const badgeStyle = DPIA_RISK_BADGE_STYLES[level] || 'bg-gray-100 text-gray-800';
  const label = DPIA_RISK_FULL_LABELS[level] || level;

  return (
    <Badge className={badgeStyle}>
      {label}
    </Badge>
  );
}

// =============================================================================
// Likelihood / Impact Badges
// =============================================================================

export interface LikelihoodImpactBadgeProps {
  level: string;
}

/**
 * Badge for likelihood display
 * Used in: DPIA risk table
 */
export function LikelihoodBadge({ level }: LikelihoodImpactBadgeProps) {
  const colorClass = DPIA_LIKELIHOOD_BADGE_STYLES[level] || '';
  const label = DPIA_LIKELIHOOD_LABELS[level] || level;

  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  );
}

/**
 * Badge for impact display
 * Used in: DPIA risk table
 */
export function ImpactBadge({ level }: LikelihoodImpactBadgeProps) {
  const colorClass = DPIA_IMPACT_BADGE_STYLES[level] || '';
  const label = DPIA_IMPACT_LABELS[level] || level;

  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  );
}

// =============================================================================
// Data Classification Badge
// =============================================================================

export interface DataClassificationBadgeProps {
  classification: string;
}

/**
 * Badge for data classification (P0-P3)
 * Used in: DPIA detail, Registre
 */
export function DataClassificationBadge({ classification }: DataClassificationBadgeProps) {
  const badgeStyle = DPIA_DATA_CLASS_BADGE_STYLES[classification] || '';
  const label = DPIA_DATA_CLASS_LABELS[classification] || classification;

  return (
    <Badge variant="outline" className={badgeStyle}>
      {label}
    </Badge>
  );
}

// =============================================================================
// Active Status Badge
// =============================================================================

export interface ActiveStatusBadgeProps {
  isActive: boolean;
}

/**
 * Badge for active/inactive status
 * Used in: Registre
 */
export function ActiveStatusBadge({ isActive }: ActiveStatusBadgeProps) {
  if (isActive) {
    return <Badge className="bg-green-100 text-green-800">{DPIA_ACTIVE_STATUS_LABELS.ACTIVE}</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {DPIA_ACTIVE_STATUS_LABELS.INACTIVE}
    </Badge>
  );
}
