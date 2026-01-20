import { Card, CardContent } from '@/components/ui/card'

/**
 * RGPD Notice Component
 *
 * Displays a standardized RGPD compliance notice for admin pages.
 * Used in Platform Admin and Tenant Admin edit user pages.
 *
 * RGPD Articles Referenced:
 * - Art. 5: Principles (accountability, traceability)
 * - Art. 15: Right of access (user can access own data)
 * - Art. 18: Right to restriction (data suspension)
 * - Art. 34: Communication of breach (DPO access)
 */

export const RGPD_NOTICE_VARIANT = {
  USER_EDIT: 'user-edit',
  USER_CREATE: 'user-create',
  USER_DETAIL: 'user-detail',
  TENANT_EDIT: 'tenant-edit',
  TENANT_CREATE: 'tenant-create',
  DATA_EXPORT: 'data-export',
  DATA_DELETION: 'data-deletion',
  DATA_SUSPENSION: 'data-suspension',
  DATA_OPPOSITION: 'data-opposition',
  DATA_CONTEST: 'data-contest',
  // Consent management variants
  PURPOSE_CREATE: 'purpose-create',
  PURPOSE_EDIT: 'purpose-edit',
} as const

export type RgpdNoticeVariant = typeof RGPD_NOTICE_VARIANT[keyof typeof RGPD_NOTICE_VARIANT]

interface RgpdNoticeProps {
  variant?: RgpdNoticeVariant
  className?: string
}

const NOTICE_CONTENT: Record<RgpdNoticeVariant, string> = {
  [RGPD_NOTICE_VARIANT.USER_EDIT]: `La modification d'un utilisateur est tracée dans l'audit trail. Seules les données P1 peuvent être modifiées (displayName, role). L'email n'est pas accessible (Art. 15, 34 - seuls User, DPO et Système y ont accès).`,
  [RGPD_NOTICE_VARIANT.USER_CREATE]: `La création d'un utilisateur est tracée dans l'audit trail. Le mot de passe est haché avec bcrypt (12 rounds). L'email est chiffré AES-256-GCM.`,
  [RGPD_NOTICE_VARIANT.USER_DETAIL]: `Seules les données P1 (métadonnées publiques) sont affichées. L'email n'est pas accessible (Art. 15, 34 - seuls User, DPO et Système y ont accès). Le hash email et le mot de passe ne sont jamais exposés. Toutes les actions sont auditées.`,
  [RGPD_NOTICE_VARIANT.TENANT_EDIT]: `La modification d'un tenant est tracée dans l'audit trail. Le slug est immuable (identifiant unique).`,
  [RGPD_NOTICE_VARIANT.TENANT_CREATE]: `La création d'un tenant est tracée dans l'audit trail. Aucune donnée sensible n'est stockée à cette étape (uniquement métadonnées P1).`,
  [RGPD_NOTICE_VARIANT.DATA_EXPORT]: `Les exports de données sont chiffrés (AES-256) et disponibles pendant 7 jours après génération. Seul l'utilisateur concerné peut télécharger son export (maximum 3 téléchargements). L'administrateur peut uniquement consulter le statut des demandes. Politique de rétention (Art. 5.1.e) : Les exports de plus de 7 jours doivent être purgés pour garantir la conformité RGPD.`,
  [RGPD_NOTICE_VARIANT.DATA_DELETION]: `Lorsqu'un utilisateur demande la suppression de ses données (Art. 17), les données sont d'abord marquées comme supprimées (soft delete) et deviennent inaccessibles. Après une période de rétention de 30 jours, les données sont définitivement purgées (hard delete) et deviennent irrécupérables.`,
  [RGPD_NOTICE_VARIANT.DATA_SUSPENSION]: `Les utilisateurs peuvent demander la limitation du traitement de leurs données dans certains cas (contestation de l'exactitude, traitement illicite, etc.). Pendant cette période, les données ne peuvent plus être traitées par l'IA mais restent stockées.`,
  [RGPD_NOTICE_VARIANT.DATA_OPPOSITION]: `Les utilisateurs peuvent s'opposer à certains types de traitement de leurs données (prospection, profilage, etc.). L'opposition doit être traitée dans un délai raisonnable. En cas de refus, une justification doit être fournie.`,
  [RGPD_NOTICE_VARIANT.DATA_CONTEST]: `Les utilisateurs ont le droit de contester les décisions prises exclusivement par des traitements automatisés (IA) lorsqu'elles ont un effet juridique ou significatif. Ils peuvent demander une intervention humaine pour réexaminer la décision.`,
  // Consent management
  [RGPD_NOTICE_VARIANT.PURPOSE_CREATE]: `La création d'une finalité de traitement est tracée dans l'audit trail. Chaque finalité doit avoir une base légale (Art. 6) et un niveau de risque définis. Les traitements à haut risque nécessitent une DPIA (Art. 35).`,
  [RGPD_NOTICE_VARIANT.PURPOSE_EDIT]: `La modification d'une finalité est tracée dans l'audit trail. Toute modification substantielle doit rester compatible avec l'objectif initial (Art. 5.1.b). Les utilisateurs ayant consenti seront notifiés si nécessaire.`,
}

export function RgpdNotice({ variant = RGPD_NOTICE_VARIANT.USER_EDIT, className }: RgpdNoticeProps) {
  return (
    <Card className={`bg-muted/40 ${className || ''}`}>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">
          <strong>🔒 RGPD (Art. 5, 18):</strong> {NOTICE_CONTENT[variant]}
        </p>
      </CardContent>
    </Card>
  )
}
