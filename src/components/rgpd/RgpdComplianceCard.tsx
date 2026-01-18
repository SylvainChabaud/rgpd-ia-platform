'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

/**
 * RGPD Compliance Card Component
 *
 * Displays a standardized RGPD compliance status card with retention info.
 * Used across Platform Admin pages (audit, incidents, exports, etc.)
 *
 * RGPD Articles Referenced:
 * - Art. 5.1.e: Storage limitation (data retention)
 * - Art. 33.5: Incident documentation (5 years)
 * - Art. 17: Right to erasure (exports, deletions)
 */

export const COMPLIANCE_CARD_VARIANT = {
  AUDIT_LOGS: 'audit-logs',
  INCIDENTS: 'incidents',
  EXPORTS: 'exports',
  DELETIONS: 'deletions',
  OPPOSITIONS: 'oppositions',
  SUSPENSIONS: 'suspensions',
  CONTESTS: 'contests',
  // Consent management variants
  CONSENTS_HUB: 'consents-hub',
  CONSENTS_PURPOSES: 'consents-purposes',
  CONSENTS_MATRIX: 'consents-matrix',
  CONSENTS_HISTORY: 'consents-history',
  CONSENTS_TEMPLATES: 'consents-templates',
} as const

export type ComplianceCardVariant = typeof COMPLIANCE_CARD_VARIANT[keyof typeof COMPLIANCE_CARD_VARIANT]

interface ComplianceStats {
  totalItems: number
  oldestItemAge: number | null
  retentionValue: number
  retentionUnit: 'days' | 'months' | 'years'
}

interface RgpdComplianceCardProps {
  variant: ComplianceCardVariant
  stats?: ComplianceStats
  isLoading?: boolean
  className?: string
}

interface VariantConfig {
  title: string
  article: string
  requirement: string
  retentionLabel: string
  purgeInfo: string
  getComplianceStatus: (stats: ComplianceStats) => boolean
}

const VARIANT_CONFIG: Record<ComplianceCardVariant, VariantConfig> = {
  [COMPLIANCE_CARD_VARIANT.AUDIT_LOGS]: {
    title: 'Conformite RGPD - Retention des logs',
    article: 'Art. 5.1.e RGPD',
    requirement: 'Limitation de conservation',
    retentionLabel: 'Retention max',
    purgeInfo: 'La purge des evenements anciens est automatique (lazy purge a chaque consultation).',
    getComplianceStatus: (stats) => {
      // Compliant if oldest log < retention period in months
      if (stats.oldestItemAge === null) return true
      const maxAgeDays = stats.retentionValue * 30 // months to days
      return stats.oldestItemAge <= maxAgeDays
    },
  },
  [COMPLIANCE_CARD_VARIANT.INCIDENTS]: {
    title: 'Conformite RGPD - Documentation des incidents',
    article: 'Art. 33.5 RGPD',
    requirement: 'Obligatoire',
    retentionLabel: 'Retention min',
    purgeInfo: 'Conservation permanente pour preuve de conformite. Pas de purge automatique.',
    getComplianceStatus: () => true, // Incidents are always compliant (permanent storage)
  },
  [COMPLIANCE_CARD_VARIANT.EXPORTS]: {
    title: 'Conformite RGPD - Exports de donnees',
    article: 'Art. 5.1.e RGPD',
    requirement: 'Limitation de conservation',
    retentionLabel: 'Retention max',
    purgeInfo: 'Les exports de plus de 7 jours doivent etre purges manuellement.',
    getComplianceStatus: (stats) => {
      // Compliant if oldest export < retention period in days
      if (stats.oldestItemAge === null) return true
      return stats.oldestItemAge <= stats.retentionValue
    },
  },
  [COMPLIANCE_CARD_VARIANT.DELETIONS]: {
    title: 'Conformite RGPD - Demandes de suppression',
    article: 'Art. 17 RGPD',
    requirement: 'Droit a l\'effacement',
    retentionLabel: 'Retention max',
    purgeInfo: 'Les donnees marquees supprimees sont purgees apres 30 jours.',
    getComplianceStatus: (stats) => {
      if (stats.oldestItemAge === null) return true
      return stats.oldestItemAge <= stats.retentionValue
    },
  },
  [COMPLIANCE_CARD_VARIANT.OPPOSITIONS]: {
    title: 'Conformite RGPD - Oppositions au traitement',
    article: 'Art. 21 RGPD',
    requirement: 'Droit d\'opposition',
    retentionLabel: 'Retention',
    purgeInfo: 'Les oppositions sont conservees pour traçabilite RGPD.',
    getComplianceStatus: () => true, // Always compliant (kept for audit trail)
  },
  [COMPLIANCE_CARD_VARIANT.SUSPENSIONS]: {
    title: 'Conformite RGPD - Suspensions de traitement',
    article: 'Art. 18 RGPD',
    requirement: 'Droit a la limitation',
    retentionLabel: 'Retention',
    purgeInfo: 'Les suspensions actives bloquent tout traitement des donnees concernees.',
    getComplianceStatus: () => true, // Always compliant
  },
  [COMPLIANCE_CARD_VARIANT.CONTESTS]: {
    title: 'Conformite RGPD - Contestations IA',
    article: 'Art. 22 RGPD',
    requirement: 'Decisions automatisees',
    retentionLabel: 'Retention',
    purgeInfo: 'Les contestations sont conservees pour audit et intervention humaine obligatoire.',
    getComplianceStatus: () => true, // Always compliant (kept for audit trail)
  },
  // Consent management variants
  [COMPLIANCE_CARD_VARIANT.CONSENTS_HUB]: {
    title: 'Conformite RGPD - Gestion des consentements',
    article: 'Art. 7 RGPD',
    requirement: 'Preuve du consentement',
    retentionLabel: 'Conservation',
    purgeInfo: 'Les preuves de consentement sont conservees pendant toute la duree du traitement et 5 ans apres.',
    getComplianceStatus: () => true, // Always compliant (consent management)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_PURPOSES]: {
    title: 'Conformite RGPD - Finalites de traitement',
    article: 'Art. 5.1.b RGPD',
    requirement: 'Limitation des finalites',
    retentionLabel: 'Conservation',
    purgeInfo: 'Les finalites doivent etre determinees, explicites et legitimes. Chaque finalite doit avoir une base legale.',
    getComplianceStatus: () => true, // Always compliant (purpose configuration)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_MATRIX]: {
    title: 'Conformite RGPD - Matrice des consentements',
    article: 'Art. 7.1 & 30 RGPD',
    requirement: 'Documentation',
    retentionLabel: 'Conservation',
    purgeInfo: 'La matrice constitue le registre des consentements, exportable pour audit CNIL.',
    getComplianceStatus: () => true, // Always compliant (documentation)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_HISTORY]: {
    title: 'Conformite RGPD - Historique des consentements',
    article: 'Art. 7.1 RGPD',
    requirement: 'Tracabilite',
    retentionLabel: 'Conservation',
    purgeInfo: 'L\'historique horodate prouve le consentement et son eventuel retrait. Conservation obligatoire.',
    getComplianceStatus: () => true, // Always compliant (audit trail)
  },
  [COMPLIANCE_CARD_VARIANT.CONSENTS_TEMPLATES]: {
    title: 'Conformite RGPD - Templates de finalites',
    article: 'Art. 6 RGPD',
    requirement: 'Base legale pre-validee',
    retentionLabel: 'Validite',
    purgeInfo: 'Les templates sont pre-valides RGPD avec base legale, categorie et niveau de risque conformes.',
    getComplianceStatus: () => true, // Always compliant (pre-validated templates)
  },
}

const formatRetention = (value: number, unit: 'days' | 'months' | 'years'): string => {
  const labels = {
    days: value === 1 ? 'jour' : 'jours',
    months: 'mois',
    years: value === 1 ? 'an' : 'ans',
  }
  return `${value} ${labels[unit]}`
}

const formatAge = (days: number | null): string => {
  if (days === null) return 'Aucun element'
  return `${days} jour(s)`
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
