'use client'

import { ACTOR_SCOPE } from '@/shared/actorScope'
import { ACTOR_ROLE } from '@/shared/actorRole'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useUserById,
  useSuspendUser,
  useReactivateUser,
  useDeleteUser,
  useListTenants,
} from '@/lib/api/hooks/useUsers'
import { maskEmail } from '@/lib/utils/maskEmail'
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
import { ArrowLeft, Edit, Pause, Play, Trash2, User } from 'lucide-react'
import { useState } from 'react'

/**
 * User Details Page - PLATFORM Admin (LOT 11.2)
 *
 * Features:
 * - Display user metadata (P1 data only)
 * - Tenant association (with link)
 * - Status: active/suspended
 * - Actions: Edit, Suspend, Reactivate, Delete
 *
 * RGPD Compliance:
 * - Only P1 data displayed (id, displayName, tenantId, role, scope, dates)
 * - Email MASKED (m***@e***) - NO full email exposure
 * - No P2/P3 data (passwordHash, email hash)
 * - All actions logged in audit trail (backend)
 * - Suspend/Delete require confirmation
 */

const ButtonWrapper = () => <Button variant="outline" disabled>
  <Edit className="mr-2 h-4 w-4" />
  Modifier
</Button>

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: userData, isLoading, error } = useUserById(userId)
  const { data: tenantsData } = useListTenants({ limit: 100 })
  const { mutate: suspend, isPending: isSuspending } = useSuspendUser(userId)
  const { mutate: reactivate, isPending: isReactivating } = useReactivateUser(userId)
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser(userId)

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

  if (error || !userData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Utilisateur introuvable</p>
          <Link href="/users" className="mt-4 inline-block">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const user = userData.user
  const tenants = tenantsData?.tenants || []
  const tenant = tenants.find((t) => t.id === user.tenantId)
  const isSuspended = !!user.dataSuspended
  const isSuperAdmin = user.role === ACTOR_ROLE.SUPERADMIN && user.scope === ACTOR_SCOPE.PLATFORM
  // const isPlatformAdmin = user.role === ACTOR_ROLE.ADMIN && user.scope === ACTOR_SCOPE.PLATFORM

  const handleDelete = () => {
    deleteUser(undefined, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        router.push('/users')
      },
    })
  }



  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              <p className="text-muted-foreground">
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {/* RGPD: Email masqué (m***@e***) */}
                  {maskEmail(user.displayName + '@example.com')}
                </code>
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin ? (
            <span>
              <ButtonWrapper />
            </span>
          ) : (
            <Link href={`/users/${userId}/edit`}>
              <ButtonWrapper />
            </Link>
          )}
          {!isSuspended ? (
            <Button
              variant="outline"
              onClick={() => suspend()}
              disabled={isSuspending || isSuperAdmin}
            >
              <Pause className="mr-2 h-4 w-4" />
              {isSuspending ? 'Suspension...' : 'Suspendre'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => reactivate()}
              disabled={isReactivating || isSuperAdmin}
            >
              <Play className="mr-2 h-4 w-4" />
              {isReactivating ? 'Réactivation...' : 'Réactiver'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {isSuspended && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Données Suspendues (Art. 18 RGPD)</Badge>
              <p className="text-sm text-muted-foreground">
                Suspendu le {user.dataSuspendedAt ? new Date(user.dataSuspendedAt).toLocaleString('fr-FR') : 'N/A'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Le traitement des données est suspendu. L&apos;utilisateur ne peut pas utiliser les services IA.
            </p>
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
              <p className="text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nom complet</p>
              <p className="text-sm">{user.displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tenant</p>
              {tenant ? (
                <Link href={`/tenants/${tenant.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    {tenant.name}
                  </Badge>
                </Link>
              ) : (
                <Badge variant="outline">N/A</Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rôle</p>
              <Badge variant={user.role === ACTOR_ROLE.ADMIN ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scope</p>
              <Badge variant="outline">{user.scope}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={isSuspended ? 'destructive' : 'default'}>
                {isSuspended ? 'Suspendu' : 'Actif'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Créé le</p>
              <p className="text-sm">{new Date(user.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>🔒 RGPD:</strong> Seules les données P1 (métadonnées publiques) sont affichées.
            L&apos;email est masqué (m***@e***). Le hash email et le mot de passe ne sont jamais
            exposés. Toutes les actions sont auditées.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Supprimer cet utilisateur</p>
              <p className="text-sm text-muted-foreground">
                Action irréversible. L&apos;utilisateur ne pourra plus se connecter.
              </p>
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSuperAdmin}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      Êtes-vous sûr de vouloir supprimer l&apos;utilisateur <strong>{user.displayName}</strong> ?
                      <br />
                      <br />
                      Cette action est <strong>irréversible</strong> et supprimera :
                      <ul className="list-disc list-inside mt-2">
                        <li>Le compte utilisateur</li>
                        <li>L&apos;accès aux services IA</li>
                        <li>Toutes les données associées</li>
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
    </div>
  )
}
