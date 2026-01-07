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
import { ArrowLeft, Edit, Pause, Play, Trash2, Users, Activity } from 'lucide-react'
import { useState } from 'react'

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
          <Link href="/tenants" className="mt-4 inline-block">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tenant = tenantData.tenant
  const isDeleted = !!tenant.deletedAt

  const handleDelete = () => {
    deleteTenant(undefined, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        router.push('/tenants')
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/tenants">
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
          {!isDeleted && (
            <>
              <Link href={`/tenants/${tenantId}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => suspend()}
                disabled={isSuspending}
              >
                <Pause className="mr-2 h-4 w-4" />
                {isSuspending ? 'Suspension...' : 'Suspendre'}
              </Button>
            </>
          )}
          {isDeleted && (
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

      {/* Status Badge */}
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
              <Badge variant={isDeleted ? 'destructive' : 'default'}>
                {isDeleted ? 'Supprimé' : 'Actif'}
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
              <div className="text-2xl font-bold">{stats.usersCount ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs IA</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aiJobsCount ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stockage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.storageUsed / 1024 / 1024).toFixed(2)} MB
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
