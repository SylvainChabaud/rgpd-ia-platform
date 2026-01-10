'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/apiClient'
import { FileText, CheckCircle2, Calendar, UserCheck, BookOpen, Download, AlertTriangle, Shield } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Registre des Traitements Page (Art. 30 RGPD)
 * LOT 11.3 - LOT 10.4 Integration
 *
 * RGPD: Art. 30 (mandatory registry)
 * Access: SUPER_ADMIN, DPO only
 *
 * TODO: AMÉLIORATION MAJEURE NÉCESSAIRE
 * =====================================
 *
 * 1. ÉDITION DU REGISTRE:
 *    - Actuellement: fichier markdown statique (docs/rgpd/registre-traitements.md)
 *    - Cible: Permettre l'édition directe depuis l'UI ou via base de données
 *    - Options possibles:
 *      a) Éditeur markdown intégré (quick win, garde le format markdown)
 *      b) Formulaire structuré avec stockage en BDD (solution robuste)
 *      c) Système hybride: BDD + export markdown pour versioning Git
 *
 * 2. AFFICHAGE ET MISE EN FORME:
 *    - Problème actuel: Le rendu HTML du markdown reste visuellement peu satisfaisant
 *    - Le contenu apparaît encore en "blocs" sans formatage optimal
 *    - Solutions à explorer:
 *      a) Remplacer `marked` + dangerouslySetInnerHTML par `react-markdown`
 *         (meilleur contrôle du rendu, composants React natifs)
 *      b) Post-traiter le HTML généré pour ajouter des wrappers structurants
 *      c) Refondre complètement l'affichage avec une structure de données typée
 *         (abandonner le markdown au profit d'une interface de composants dédiés)
 *
 * 3. ARCHITECTURE RECOMMANDÉE (moyen terme):
 *    - Table `processing_activities` en BDD avec champs structurés:
 *      * name, purpose, legal_basis, data_categories, recipients, retention, etc.
 *    - UI d'édition CRUD pour chaque traitement
 *    - Génération automatique du document markdown pour export/versioning
 *    - Affichage via composants React typés (plus de parsing markdown côté client)
 *
 * 4. CONFORMITÉ RGPD:
 *    - Garder l'audit trail sur toute modification du registre
 *    - Export PDF doit rester fonctionnel (obligation CNIL)
 *    - Versioning recommandé pour traçabilité des modifications
 *
 * PRIORITÉ: Moyenne-Haute (impact UX et conformité)
 * EFFORT ESTIMÉ: 3-5 jours selon option choisie
 */
export default function RegistryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['docs', 'registre'],
    queryFn: () =>
      apiClient<{
        title: string
        content: string
        lastModified: string | null
        validatedBy: string | null
        treatmentsCount: number
      }>('/docs/registre'),
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

      const response = await fetch('/api/docs/registre/export', {
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
      a.download = `registre-traitements-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export PDF')
    }
  }

  // Calculate next review date (quarterly - every 3 months)
  const getNextReviewDate = (lastModified: string | null): string => {
    const baseDate = lastModified ? new Date(lastModified) : new Date()
    const nextReview = addMonths(baseDate, 3)
    return format(nextReview, 'dd MMMM yyyy', { locale: fr })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Registre des Traitements</h1>
            <p className="text-muted-foreground">Art. 30 RGPD - Document obligatoire</p>
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
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Statut de Conformité RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Treatments Count */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Traitements recensés</p>
                  <p className="text-2xl font-bold">{data.treatmentsCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {data.treatmentsCount >= 5 ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">Conforme</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-600">À compléter</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Update */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dernière mise à jour</p>
                  <p className="text-lg font-semibold">
                    {data.lastModified || 'Non renseignée'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Art. 30.4 - Mise à jour continue
                  </p>
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
                  {!data.validatedBy && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-600">Signature requise</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Review */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prochaine revue</p>
                  <p className="text-base font-semibold leading-tight">
                    {getNextReviewDate(data.lastModified)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Révision trimestrielle
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance Notes */}
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Conformité Art. 30 RGPD :</span> Le registre des activités de traitement doit être{' '}
                  <span className="font-medium">tenu à jour en permanence</span> et être{' '}
                  <span className="font-medium">disponible sur demande</span> de la CNIL (Art. 30.4).
                  Une révision trimestrielle est recommandée par les autorités de contrôle.
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
              {data?.lastModified && <span>Dernière MAJ : {data.lastModified}</span>}
              {data?.validatedBy && <span>Validé par : {data.validatedBy}</span>}
              {data?.treatmentsCount && <span>{data.treatmentsCount} traitements</span>}
            </div>
          </CardHeader>
          <CardContent className="max-w-none">
            <style jsx global>{`
              .registre-content {
                line-height: 1.8;
              }
              .registre-content h1 {
                font-size: 2.5rem;
                font-weight: bold;
                margin-top: 2rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #93c5fd;
                color: #1e40af;
              }
              .registre-content h2 {
                font-size: 2rem;
                font-weight: bold;
                margin-top: 3rem;
                margin-bottom: 1.5rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #dbeafe;
                color: #1d4ed8;
              }
              .registre-content h3 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-top: 2rem;
                margin-bottom: 1rem;
                color: #1e293b;
              }
              .registre-content h4 {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                color: #334155;
              }
              .registre-content p {
                margin-top: 1rem;
                margin-bottom: 1rem;
                color: #475569;
              }
              .registre-content ul, .registre-content ol {
                margin-top: 1.25rem;
                margin-bottom: 1.25rem;
                padding-left: 2rem;
              }
              .registre-content li {
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                line-height: 1.75;
              }
              .registre-content ul {
                list-style-type: disc;
              }
              .registre-content ol {
                list-style-type: decimal;
              }
              .registre-content li::marker {
                color: #2563eb;
              }
              .registre-content table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .registre-content thead {
                background-color: #2563eb;
              }
              .registre-content th {
                padding: 1rem;
                text-align: left;
                font-weight: bold;
                color: white;
                border: 1px solid #1d4ed8;
              }
              .registre-content td {
                padding: 1rem;
                border: 1px solid #e2e8f0;
                color: #475569;
              }
              .registre-content tbody tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .registre-content blockquote {
                border-left: 4px solid #3b82f6;
                padding-left: 1.5rem;
                padding-right: 1rem;
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
                margin-top: 1.5rem;
                margin-bottom: 1.5rem;
                font-style: italic;
                background-color: #eff6ff;
                border-radius: 0 0.5rem 0.5rem 0;
              }
              .registre-content strong {
                font-weight: bold;
                color: #0f172a;
              }
              .registre-content code {
                background-color: #dbeafe;
                color: #1e40af;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: monospace;
                font-size: 0.9em;
              }
              .registre-content hr {
                margin-top: 3rem;
                margin-bottom: 3rem;
                border: none;
                border-top: 1px solid #cbd5e1;
              }
              .registre-content a {
                color: #2563eb;
                text-decoration: underline;
                font-weight: 500;
              }
              .registre-content a:hover {
                color: #1d4ed8;
              }
            `}</style>
            <div
              className="registre-content"
              dangerouslySetInnerHTML={{ __html: data?.content || '' }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
