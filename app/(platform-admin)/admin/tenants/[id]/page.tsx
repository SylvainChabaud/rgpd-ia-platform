'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useTenantById,
  useTenantStats,
  useSuspendTenant,
  useReactivateTenant,
  useDeleteTenant,
} from '@/lib/api/hooks/useTenants'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit, Pause, Play, Trash2, Users, Activity, FileCheck, History } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Tenant Details Page - PLATFORM Admin
 *
 * Features:
 * - Display tenant metadata (P1 data only)
 * - Stats (users count, AI jobs count)
 * - Actions: Edit, Suspend, Reactivate, Delete
 *
 * RGPD Compliance:
 * - Only P1 data displayed (id, name, slug, dates)
 * - No user content or P2/P3 data
 * - All actions logged in audit trail (backend)
 * - Suspend/Delete require confirmation (prevent accidental data loss)
 */
export default function TenantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const { data: tenantData, isLoading, error } = useTenantById(tenantId)
  const { data: stats, isLoading: statsLoading } = useTenantStats(tenantId)
  const { mutate: suspend, isPending: isSuspending } = useSuspendTenant(tenantId)
  const { mutate: reactivate, isPending: isReactivating } = useReactivateTenant(tenantId)
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant(tenantId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !tenantData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Tenant introuvable</p>
          <Link href="/admin/tenants" className="mt-4 inline-block">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tenant = tenantData.tenant
  const isDeleted = !!tenant.deletedAt
  const isSuspended = !!tenant.suspendedAt

  const handleDelete = () => {
    deleteTenant(undefined, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        router.push('/admin/tenants')
      },
    })
  }

  const handleSuspend = () => {
    if (!suspendReason || suspendReason.length < 3) {
      return
    }
    suspend({ reason: suspendReason }, {
      onSuccess: () => {
        setShowSuspendDialog(false)
        setSuspendReason('')
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">
            <code className="text-sm bg-muted px-2 py-1 rounded">{tenant.slug}</code>
          </p>
        </div>
        <div className="flex gap-2">
          {!isDeleted && !isSuspended && (
            <>
              <Link href={`/admin/tenants/${tenantId}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
              <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Pause className="mr-2 h-4 w-4" />
                    Suspendre
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspendre le tenant</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          Cette action bloquera tous les utilisateurs du tenant <strong>{tenant.name}</strong>.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="suspend-reason">
                            Raison de la suspension <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="suspend-reason"
                            placeholder="Ex: Impayé, non conforme, fraude..."
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            maxLength={500}
                            disabled={isSuspending}
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum 3 caractères (requis pour conformité RGPD)
                          </p>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSuspending}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSuspend}
                      disabled={isSuspending || !suspendReason || suspendReason.length < 3}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isSuspending ? 'Suspension...' : 'Suspendre le tenant'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isSuspended && !isDeleted && (
            <Button
              variant="outline"
              onClick={() => reactivate()}
              disabled={isReactivating}
            >
              <Play className="mr-2 h-4 w-4" />
              {isReactivating ? 'Réactivation...' : 'Réactiver'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Badges */}
      {isSuspended && !isDeleted && (
        <Card className="border-orange-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-600 hover:bg-orange-700">Tenant Suspendu</Badge>
                <p className="text-sm text-muted-foreground">
                  Suspendu le {new Date(tenant.suspendedAt!).toLocaleString('fr-FR')}
                </p>
              </div>
              {tenant.suspensionReason && (
                <p className="text-sm">
                  <span className="font-medium">Raison:</span> {tenant.suspensionReason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {isDeleted && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Tenant Supprimé</Badge>
              <p className="text-sm text-muted-foreground">
                Supprimé le {new Date(tenant.deletedAt!).toLocaleString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="text-sm font-mono">{tenant.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="text-sm font-mono">{tenant.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Créé le</p>
              <p className="text-sm">{new Date(tenant.createdAt).toLocaleString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge
                variant={isDeleted ? 'destructive' : 'default'}
                className={isSuspended ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                {isDeleted ? 'Supprimé' : isSuspended ? 'Suspendu' : 'Actif'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.users?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.stats?.users?.active ?? 0} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs IA (ce mois)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stats?.aiJobs?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.stats?.aiJobs?.success ?? 0} réussis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stockage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.stats?.storage?.usedBytes ?? 0) / 1024 / 1024).toFixed(2)} MB
              </div>
              <p className="text-xs text-muted-foreground">
                estimé
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DPIA Section - Link to tenant's DPIAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Analyses d&apos;Impact (DPIA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Consulter les DPIA et l&apos;historique des échanges DPO/Tenant Admin
              </p>
            </div>
            <Link href={`/admin/tenants/${tenantId}/dpia`}>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                Voir les DPIA
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {!isDeleted && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Supprimer ce tenant</p>
                <p className="text-sm text-muted-foreground">
                  Action irréversible. Tous les utilisateurs et données associés seront supprimés.
                </p>
              </div>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        Êtes-vous sûr de vouloir supprimer le tenant <strong>{tenant.name}</strong> ?
                        <br />
                        <br />
                        Cette action est <strong>irréversible</strong> et supprimera :
                        <ul className="list-disc list-inside mt-2">
                          <li>Tous les utilisateurs du tenant</li>
                          <li>Toutes les données associées</li>
                          <li>L&apos;historique complet</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
