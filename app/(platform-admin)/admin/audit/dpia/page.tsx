'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/apiClient'
import { Shield, CheckCircle2, Calendar, UserCheck, AlertTriangle, Download, AlertCircle, TrendingUp } from 'lucide-react'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * DPIA Gateway LLM Page (Art. 35 RGPD)
 * LOT 11.3 - LOT 10.5 Integration
 *
 * RGPD: Art. 35 (Data Protection Impact Assessment)
 * Access: SUPERADMIN, DPO only
 *
 * TODO: AMÉLIORATION RECOMMANDÉE - ÉDITION DPIA
 * ============================================
 *
 * 1. ÉDITION DE LA DPIA:
 *    - Actuellement: fichier markdown statique (docs/rgpd/dpia.md)
 *    - Cible: Permettre la mise à jour depuis l'UI (DPO uniquement)
 *    - Cas d'usage critiques:
 *      a) Validation DPO (signature électronique du champ "Validé par")
 *      b) Ajout de nouveaux risques identifiés
 *      c) Mise à jour des mesures d'atténuation (statut implémentation)
 *      d) Révision annuelle ou suite à modification majeure (Art. 35.11)
 *
 * 2. ARCHITECTURE RECOMMANDÉE:
 *    - Deux approches possibles:
 *
 *      **Option A - Éditeur markdown (Quick Win, 2-3 jours)**
 *        - Avantages: Garde le format markdown, versioning Git facile
 *        - UI: Monaco Editor ou CodeMirror avec preview live
 *        - Validation: Parser markdown pour extraire métadonnées (risques, dates)
 *        - Audit: Event `dpia.updated` avec diff des changements
 *
 *      **Option B - Formulaire structuré + BDD (Robuste, 5-7 jours)**
 *        - Table `dpia_versions` avec champs:
 *          * id, version, date_realized, validated_by, risk_level
 *          * created_by, created_at, approved_by, approved_at
 *        - Table `dpia_risks` avec champs:
 *          * id, dpia_version_id, risk_name, impact, likelihood
 *          * mitigation_measures, residual_risk, status
 *        - UI: Formulaire pas à pas (wizard) pour chaque section
 *        - Export: Génération automatique markdown + PDF
 *        - Workflow: Brouillon → Validation DPO → Approuvé
 *
 * 3. FONCTIONNALITÉS CRITIQUES:
 *    - ✅ Signature électronique DPO (champ "Validé par" + timestamp)
 *    - ✅ Versioning complet (traçabilité révisions Art. 35.11)
 *    - ✅ Workflow d'approbation (brouillon → validé)
 *    - ✅ Comparaison versions (diff entre révisions)
 *    - ✅ Notification auto avant échéance révision annuelle
 *    - ✅ Export PDF inchangé (obligation CNIL)
 *
 * 4. CONFORMITÉ RGPD:
 *    - Art. 35.2: Consultation DPO → Workflow approbation
 *    - Art. 35.7: Contenu obligatoire → Validation schéma strict
 *    - Art. 35.10: Secret professionnel → RBAC strict (DPO + SUPERADMIN)
 *    - Art. 35.11: Révision si changement → Système de versioning
 *    - Audit trail: Qui a modifié quoi, quand (event `dpia.updated`)
 *
 * 5. DÉCLENCHEURS DE RÉVISION (automatisation recommandée):
 *    - Nouveau modèle IA déployé (détection via config LLM)
 *    - Nouvelle finalité (purpose) ajoutée
 *    - Incident RGPD majeur (Art. 33)
 *    - Échéance annuelle (notification 30j avant)
 *
 * PRIORITÉ: Moyenne (vs. Haute pour registre)
 * EFFORT ESTIMÉ: Option A = 2-3 jours, Option B = 5-7 jours
 * RECOMMANDATION: Commencer par Option A, migrer vers Option B si besoin
 */
export default function DPIAPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['docs', 'dpia'],
    queryFn: () =>
      apiClient<{
        title: string
        content: string
        dateRealized: string | null
        validatedBy: string | null
        nextRevision: string | null
        riskLevel: string
        risksCount: number
      }>('/docs/dpia'),
  })

  const handleDownloadPDF = async () => {
    try {
      // Get authentication token from sessionStorage
      const token = sessionStorage.getItem('auth_token')

      if (!token) {
        alert('Session expirée. Veuillez vous reconnecter.')
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/docs/dpia/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expirée. Veuillez vous reconnecter.')
          window.location.href = '/login'
          return
        }
        throw new Error('Export failed')
      }

      // Get PDF content and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dpia-gateway-llm-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export PDF')
    }
  }

  // Calculate next review date (annual - every 12 months)
  const getNextReviewDate = (dateRealized: string | null): string => {
    const baseDate = dateRealized ? new Date(dateRealized) : new Date()
    const nextReview = addYears(baseDate, 1)
    return format(nextReview, 'dd MMMM yyyy', { locale: fr })
  }

  // Map risk level to display props
  const getRiskLevelProps = (riskLevel: string) => {
    const normalized = riskLevel.toUpperCase()
    if (normalized.includes('MOYEN') || normalized.includes('MEDIUM')) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        icon: AlertTriangle,
        label: 'MOYEN',
        badge: 'Acceptable avec mesures'
      }
    }
    if (normalized.includes('FAIBLE') || normalized.includes('LOW') || normalized.includes('ACCEPTABLE')) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        icon: CheckCircle2,
        label: 'FAIBLE',
        badge: 'Conforme'
      }
    }
    if (normalized.includes('ELEVE') || normalized.includes('HIGH') || normalized.includes('ÉLEVÉ')) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        icon: AlertCircle,
        label: 'ÉLEVÉ',
        badge: 'Action requise'
      }
    }
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-500',
      icon: AlertCircle,
      label: riskLevel,
      badge: 'À évaluer'
    }
  }

  const riskProps = data ? getRiskLevelProps(data.riskLevel) : getRiskLevelProps('UNKNOWN')
  const RiskIcon = riskProps.icon

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold">DPIA Gateway LLM</h1>
            <p className="text-muted-foreground">Art. 35 RGPD - Analyse d&apos;Impact relative à la Protection des Données</p>
          </div>
        </div>
        {!isLoading && data && (
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
        )}
      </div>

      {/* Compliance Status Card */}
      {!isLoading && data && (
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Statut de Conformité RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date Realized */}
              <div className="flex items-start gap-3">
                <div className={`p-2 ${riskProps.bgColor} rounded-lg`}>
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date de réalisation</p>
                  <p className="text-lg font-semibold">
                    {data.dateRealized || 'Non renseignée'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Art. 35.1 - DPIA obligatoire
                  </p>
                </div>
              </div>

              {/* Risk Level */}
              <div className="flex items-start gap-3">
                <div className={`p-2 ${riskProps.bgColor} rounded-lg`}>
                  <RiskIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risque résiduel</p>
                  <p className={`text-2xl font-bold ${riskProps.color}`}>
                    {riskProps.label}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">{riskProps.badge}</span>
                  </div>
                </div>
              </div>

              {/* Validated By */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Validé par</p>
                  <p className="text-lg font-semibold truncate">
                    {data.validatedBy || 'En attente DPO'}
                  </p>
                  {!data.validatedBy ? (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-600">Signature requise</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Art. 35.2 - Consultation DPO
                    </p>
                  )}
                </div>
              </div>

              {/* Risks Count & Next Review */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risques évalués</p>
                  <p className="text-2xl font-bold">{data.risksCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Révision annuelle requise
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance Notes */}
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Conformité Art. 35 RGPD :</span> L&apos;analyse d&apos;impact est{' '}
                  <span className="font-medium">obligatoire pour tout traitement susceptible d&apos;engendrer un risque élevé</span> pour les droits et libertés des personnes.
                  La DPIA doit être{' '}
                  <span className="font-medium">révisée annuellement</span> ou en cas de modification majeure du traitement.
                  Prochaine révision : <span className="font-medium">{data.nextRevision || getNextReviewDate(data.dateRealized)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Section */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{data?.title}</CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {data?.dateRealized && <span>Réalisée le : {data.dateRealized}</span>}
              {data?.validatedBy && <span>Validé par : {data.validatedBy}</span>}
              {data?.risksCount && <span>{data.risksCount} risques évalués</span>}
            </div>
          </CardHeader>
          <CardContent className="max-w-none">
            <style jsx global>{`
              .dpia-content {
                line-height: 1.8;
              }
              .dpia-content h1 {
                font-size: 2.5rem;
                font-weight: bold;
                margin-top: 2rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #c084fc;
                color: #7c3aed;
              }
              .dpia-content h2 {
                font-size: 2rem;
                font-weight: bold;
                margin-top: 3rem;
                margin-bottom: 1.5rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #e9d5ff;
                color: #8b5cf6;
              }
              .dpia-content h3 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-top: 2rem;
                margin-bottom: 1rem;
                color: #1e293b;
              }
              .dpia-content h4 {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                color: #334155;
              }
              .dpia-content p {
                margin-top: 1rem;
                margin-bottom: 1rem;
                color: #475569;
              }
              .dpia-content ul, .dpia-content ol {
                margin-top: 1.25rem;
                margin-bottom: 1.25rem;
                padding-left: 2rem;
              }
              .dpia-content li {
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                line-height: 1.75;
              }
              .dpia-content ul {
                list-style-type: disc;
              }
              .dpia-content ol {
                list-style-type: decimal;
              }
              .dpia-content li::marker {
                color: #8b5cf6;
              }
              .dpia-content table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .dpia-content thead {
                background-color: #8b5cf6;
              }
              .dpia-content th {
                padding: 1rem;
                text-align: left;
                font-weight: bold;
                color: white;
                border: 1px solid #7c3aed;
              }
              .dpia-content td {
                padding: 1rem;
                border: 1px solid #e2e8f0;
                color: #475569;
              }
              .dpia-content tbody tr:nth-child(even) {
                background-color: #faf5ff;
              }
              .dpia-content blockquote {
                border-left: 4px solid #a855f7;
                padding-left: 1.5rem;
                padding-right: 1rem;
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
                margin-top: 1.5rem;
                margin-bottom: 1.5rem;
                font-style: italic;
                background-color: #faf5ff;
                border-radius: 0 0.5rem 0.5rem 0;
              }
              .dpia-content strong {
                font-weight: bold;
                color: #0f172a;
              }
              .dpia-content code {
                background-color: #e9d5ff;
                color: #7c3aed;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: monospace;
                font-size: 0.9em;
              }
              .dpia-content hr {
                margin-top: 3rem;
                margin-bottom: 3rem;
                border: none;
                border-top: 1px solid #cbd5e1;
              }
              .dpia-content a {
                color: #8b5cf6;
                text-decoration: underline;
                font-weight: 500;
              }
              .dpia-content a:hover {
                color: #7c3aed;
              }
            `}</style>
            <div
              className="dpia-content"
              dangerouslySetInnerHTML={{ __html: data?.content || '' }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
