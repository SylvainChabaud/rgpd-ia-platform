'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import {
  COMPLIANCE_CARD_VARIANT,
  VARIANT_CONFIG,
  formatRetention,
  formatAge,
  type ComplianceCardVariant,
  type ComplianceStats,
} from '@/lib/constants/ui/compliance-variants'

/**
 * RGPD Compliance Card Component
 *
 * Displays a standardized RGPD compliance status card with retention info.
 * Used across Platform Admin pages (audit, incidents, exports, etc.)
 *
 * Configuration is centralized in @/lib/constants/ui/compliance-variants.ts
 */

// Re-export for backward compatibility
export { COMPLIANCE_CARD_VARIANT, type ComplianceCardVariant }

interface RgpdComplianceCardProps {
  variant: ComplianceCardVariant
  stats?: ComplianceStats
  isLoading?: boolean
  className?: string
}

export function RgpdComplianceCard({
  variant,
  stats,
  isLoading = false,
  className,
}: RgpdComplianceCardProps) {
  const config = VARIANT_CONFIG[variant]

  const isCompliant = stats ? config.getComplianceStatus(stats) : true

  return (
    <Card className={`border-green-500/50 ${className || ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 flex-wrap">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : (
            <>
              {/* Compliance Badge */}
              <div className="flex flex-col gap-1">
                {isCompliant ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conforme RGPD
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Non conforme
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {config.article} - {config.requirement}
                </span>
              </div>

              {/* Stats Details */}
              {stats && (
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Total elements :</span>{' '}
                    <span className="font-medium">{stats.totalItems}</span>
                  </p>
                  {stats.oldestItemAge !== null && (
                    <p>
                      <span className="text-muted-foreground">Age du plus ancien :</span>{' '}
                      <span className="font-medium">{formatAge(stats.oldestItemAge)}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">{config.retentionLabel} :</span>{' '}
                    <span className="font-medium">
                      {formatRetention(stats.retentionValue, stats.retentionUnit)}
                    </span>
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="text-sm text-muted-foreground border-l pl-4 ml-4">
                {config.purgeInfo}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
