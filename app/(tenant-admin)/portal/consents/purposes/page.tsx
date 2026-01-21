'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePurposes, useDeletePurpose, type Purpose } from '@/lib/api/hooks/useConsents'
import { useRequestDpiaReview } from '@/lib/api/hooks/useDpia'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  FileCheck,
  AlertTriangle,
  Building2,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react'
import {
  RISK_LEVEL,
  RISK_BADGE_STYLES,
  RISK_LEVEL_LABELS,
  LAWFUL_BASIS_LABELS,
  LAWFUL_BASIS_DESCRIPTIONS,
  CATEGORY_LABELS,
} from '@/lib/constants/rgpd'
import { toast } from 'sonner'

/**
 * Purposes List Page - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - List all configured purposes for the tenant
 * - Tabs: "Templates" | "Personnalisées" | "Toutes"
 * - RGPD badges: base légale, niveau de risque
 * - Create new purpose (custom or from template)
 * - Edit existing purpose
 * - Delete purpose (with warning if has consents)
 *
 * RGPD Compliance:
 * - Tenant isolation enforced (API backend)
 * - Base légale (Art. 6) displayed
 * - DPIA warning for high-risk purposes
 */

// Tab filter constants (local to this page)
const TAB_FILTER = {
  ALL: 'all',
  TEMPLATES: 'templates',
  CUSTOM: 'custom',
} as const;

type TabFilter = (typeof TAB_FILTER)[keyof typeof TAB_FILTER];

export default function PurposesPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [purposeToDelete, setPurposeToDelete] = useState<Purpose | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [activeTab, setActiveTab] = useState<TabFilter>(TAB_FILTER.ALL)
  // Revision request modal state
  const [showRevisionDialog, setShowRevisionDialog] = useState(false)
  const [purposeForRevision, setPurposeForRevision] = useState<Purpose | null>(null)
  const [revisionComments, setRevisionComments] = useState('')

  const { data, isLoading, error, refetch } = usePurposes(showInactive)
  const deletePurpose = useDeletePurpose()
  const requestRevision = useRequestDpiaReview()

  const purposes = useMemo(() => data?.purposes || [], [data?.purposes])

  // Filter purposes based on active tab
  const filteredPurposes = useMemo(() => {
    switch (activeTab) {
      case TAB_FILTER.TEMPLATES:
        return purposes.filter((p: Purpose) => p.isFromTemplate)
      case TAB_FILTER.CUSTOM:
        return purposes.filter((p: Purpose) => !p.isFromTemplate)
      default:
        return purposes
    }
  }, [purposes, activeTab])

  // Count for tabs
  const templateCount = purposes.filter((p: Purpose) => p.isFromTemplate).length
  const customCount = purposes.filter((p: Purpose) => !p.isFromTemplate).length

  const handleDeleteClick = (purpose: Purpose) => {
    setPurposeToDelete(purpose)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (purposeToDelete) {
      deletePurpose.mutate(purposeToDelete.id, {
        onSuccess: () => {
          setShowDeleteDialog(false)
          setPurposeToDelete(null)
        },
      })
    }
  }

  // Revision request handlers
  const handleRevisionClick = (purpose: Purpose) => {
    setPurposeForRevision(purpose)
    setRevisionComments('')
    setShowRevisionDialog(true)
  }

  const handleConfirmRevision = () => {
    if (purposeForRevision && purposeForRevision.dpiaId && revisionComments.trim().length >= 10) {
      requestRevision.mutate(
        { dpiaId: purposeForRevision.dpiaId, revisionComments: revisionComments.trim() },
        {
          onSuccess: () => {
            toast.success('Demande de révision envoyée', {
              description: 'Le DPO va ré-examiner la DPIA avec vos commentaires.',
            })
            setShowRevisionDialog(false)
            setPurposeForRevision(null)
            setRevisionComments('')
            refetch()
          },
          onError: (error) => {
            toast.error('Erreur', {
              description: error.message || 'Impossible d\'envoyer la demande de révision.',
            })
          },
        }
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Erreur de chargement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Impossible de charger la liste des finalités.
                  Veuillez réessayer plus tard.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/portal/consents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShieldCheck className="h-8 w-8" />
                Finalités de traitement
              </h1>
              <p className="text-muted-foreground mt-1">
                Configurez les finalités de traitement IA disponibles pour vos utilisateurs
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/portal/consents/purposes/templates">
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Catalogue templates
              </Button>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled className="opacity-50 cursor-not-allowed">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle finalité
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm p-4">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Fonctionnalité réservée</p>
                  <p>
                    Les finalités personnalisées ne sont pas disponibles car elles doivent être
                    liées à des <strong>outils IA de la plateforme</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    Pour activer des finalités, utilisez le <strong>Catalogue templates</strong> qui contient
                    les finalités pré-validées correspondant aux outils IA disponibles.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* RGPD Compliance Card */}
        <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.CONSENTS_PURPOSES} />

        {/* Tabs & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
                <TabsList>
                  <TabsTrigger value={TAB_FILTER.ALL} className="gap-2">
                    Toutes
                    <Badge variant="secondary" className="ml-1">{purposes.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value={TAB_FILTER.TEMPLATES} className="gap-2">
                    <Shield className="h-4 w-4" />
                    Templates système
                    <Badge variant="secondary" className="ml-1">{templateCount}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value={TAB_FILTER.CUSTOM} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Personnalisées
                    <Badge variant="secondary" className="ml-1">{customCount}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Afficher les finalités inactives</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Purposes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des finalités</CardTitle>
            <CardDescription>
              {filteredPurposes.length} finalité(s) {activeTab === TAB_FILTER.TEMPLATES ? 'système' : activeTab === TAB_FILTER.CUSTOM ? 'personnalisée(s)' : 'configurée(s)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPurposes.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === TAB_FILTER.TEMPLATES
                    ? "Aucun template système adopté"
                    : activeTab === TAB_FILTER.CUSTOM
                    ? "Aucune finalité personnalisée"
                    : "Aucune finalité configurée"}
                </p>
                <Link href="/portal/consents/purposes/templates" className="mt-4 inline-block">
                  <Button variant="outline">
                    <Building2 className="mr-2 h-4 w-4" />
                    Parcourir le catalogue
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finalité</TableHead>
                    <TableHead>Base légale</TableHead>
                    <TableHead>Risque</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurposes.map((purpose: Purpose) => (
                    <TableRow key={purpose.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{purpose.label}</p>
                            {purpose.isRequired && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="destructive" className="text-xs">
                                    Requis
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Consentement obligatoire pour utiliser le service
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {purpose.requiresDpia && (
                              <Tooltip>
                                <TooltipTrigger>
                                  {purpose.dpiaStatus === 'APPROVED' ? (
                                    <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-600">
                                      <CheckCircle className="h-3 w-3" />
                                      DPIA
                                    </Badge>
                                  ) : purpose.dpiaStatus === 'REJECTED' ? (
                                    <Badge variant="outline" className="gap-1 text-xs border-red-500 text-red-600">
                                      <XCircle className="h-3 w-3" />
                                      DPIA
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-xs border-yellow-500 text-yellow-600">
                                      <Clock className="h-3 w-3" />
                                      DPIA
                                    </Badge>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {purpose.dpiaStatus === 'APPROVED'
                                    ? 'DPIA approuvée par le DPO'
                                    : purpose.dpiaStatus === 'REJECTED'
                                    ? 'DPIA rejetée - à réviser'
                                    : 'DPIA en attente de validation DPO'}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {purpose.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {purpose.category ? (CATEGORY_LABELS[purpose.category] || purpose.category) : 'Non défini'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="gap-1">
                              <Shield className="h-3 w-3" />
                              {purpose.lawfulBasis ? (LAWFUL_BASIS_LABELS[purpose.lawfulBasis] || purpose.lawfulBasis) : 'Non défini'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium">Art. 6 RGPD</p>
                            <p className="text-xs">
                              {purpose.lawfulBasis
                                ? LAWFUL_BASIS_DESCRIPTIONS[purpose.lawfulBasis] || 'Base légale définie selon le RGPD.'
                                : 'Base légale non définie.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${purpose.riskLevel ? (RISK_BADGE_STYLES[purpose.riskLevel] || '') : ''}`}
                        >
                          {purpose.riskLevel === RISK_LEVEL.HIGH || purpose.riskLevel === RISK_LEVEL.CRITICAL ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : null}
                          {purpose.riskLevel ? (RISK_LEVEL_LABELS[purpose.riskLevel] || purpose.riskLevel) : 'Non défini'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {purpose.isFromTemplate ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="default" className="gap-1 bg-blue-600">
                                <Building2 className="h-3 w-3" />
                                Système
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Template pré-validé RGPD
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                Personnalisée
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Finalité créée manuellement
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {purpose.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* View DPIA button for purposes with DPIA (Art. 35 - Accountability) */}
                          {purpose.requiresDpia && purpose.dpiaId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/portal/dpia/${purpose.dpiaId}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                  >
                                    <FileCheck className="h-4 w-4 mr-1" />
                                    DPIA
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                Voir la DPIA et l&apos;historique des échanges
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Revision request button for rejected DPIAs */}
                          {purpose.dpiaStatus === 'REJECTED' && purpose.dpiaId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRevisionClick(purpose)}
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Révision
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Demander au DPO de ré-examiner la DPIA
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/portal/consents/purposes/${purpose.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Modifier</TooltipContent>
                          </Tooltip>
                          {!purpose.isSystem && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(purpose)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer</TooltipContent>
                            </Tooltip>
                          )}
                          {purpose.isSystem && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="text-muted-foreground"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Les finalités système ne peuvent pas être supprimées
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* DPIA Warning if any pending/rejected DPIA */}
        {filteredPurposes.some((p: Purpose) => p.requiresDpia && p.dpiaStatus !== 'APPROVED') && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>DPIA non validée</strong> — {
                filteredPurposes.filter((p: Purpose) => p.dpiaStatus === 'PENDING').length > 0
                  ? `${filteredPurposes.filter((p: Purpose) => p.dpiaStatus === 'PENDING').length} DPIA en attente de validation DPO.`
                  : ''
              } {
                filteredPurposes.filter((p: Purpose) => p.dpiaStatus === 'REJECTED').length > 0
                  ? `${filteredPurposes.filter((p: Purpose) => p.dpiaStatus === 'REJECTED').length} DPIA rejetée(s) à réviser.`
                  : ''
              } Ces finalités ne doivent pas être utilisées en production.
            </AlertDescription>
          </Alert>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer &quot;{purposeToDelete?.label}&quot; ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action va désactiver cette finalité. Les consentements existants seront conservés
                mais cette finalité ne sera plus proposée aux nouveaux utilisateurs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPurposeToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deletePurpose.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePurpose.isPending ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revision Request Dialog */}
        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                Demander une révision DPIA
              </DialogTitle>
              <DialogDescription>
                Expliquez les corrections apportées pour que le DPO puisse ré-examiner la DPIA de la finalité
                &quot;{purposeForRevision?.label}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Raison du rejet par le DPO */}
              {purposeForRevision?.dpiaRejectionReason && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Raison du rejet par le DPO</AlertTitle>
                  <AlertDescription className="mt-2 text-sm whitespace-pre-wrap">
                    {purposeForRevision.dpiaRejectionReason}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="revisionComments">
                  Commentaires de révision <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="revisionComments"
                  value={revisionComments}
                  onChange={(e) => setRevisionComments(e.target.value)}
                  placeholder="Décrivez les corrections apportées et les mesures mises en place pour répondre aux remarques du DPO..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 caractères. {revisionComments.length}/10 minimum
                </p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Une fois envoyée, la DPIA passera en statut &quot;En attente&quot; et le DPO
                  pourra la ré-examiner avec vos commentaires.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevisionDialog(false)
                  setPurposeForRevision(null)
                  setRevisionComments('')
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmRevision}
                disabled={revisionComments.trim().length < 10 || requestRevision.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {requestRevision.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Demander révision
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
