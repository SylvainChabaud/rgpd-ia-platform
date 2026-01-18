
'use client'
import { ACTOR_ROLE } from '@/shared/actorRole'

import { useState, useMemo } from 'react'

// =========================
// Filter Constants
// =========================

const FILTER_ALL = '' as const;

const USER_STATUS_FILTER = {
  ALL: FILTER_ALL,
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;
type UserStatusFilter = (typeof USER_STATUS_FILTER)[keyof typeof USER_STATUS_FILTER];
import Link from 'next/link'
import { useListUsers, useListTenants } from '@/lib/api/hooks/useUsers'
import { useBulkSuspendUsers, useBulkReactivateUsers } from '@/lib/api/hooks/useUsers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Note: Using native HTML select and checkbox (consistent with tenants pages)
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
import { Plus, Eye, Users } from 'lucide-react'

/**
 * Users List Page - PLATFORM Admin (LOT 11.2)
 *
 * Features:
 * - List all users (cross-tenant view)
 * - Filters: tenant, role, status
 * - Pagination (100 per page)
 * - Bulk actions: suspend/reactivate multiple users
 * - Create new user
 * - View user details
 *
 * RGPD Compliance:
 * - Only P1 data displayed (displayName, id, role, tenant, scope)
 * - Email NOT displayed (stored as hash - irreversible)
 * - No sensitive data (P2/P3) exposed
 * - Audit trail logged backend
 */
export default function UsersPage() {
  const [page, setPage] = useState(0)
  const [tenantFilter, setTenantFilter] = useState<string>(FILTER_ALL)
  const [roleFilter, setRoleFilter] = useState<string>(FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState<string>(USER_STATUS_FILTER.ALL)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkSuspendDialog, setShowBulkSuspendDialog] = useState(false)
  const [showBulkReactivateDialog, setShowBulkReactivateDialog] = useState(false)

  const limit = 100

  const userListParams = useMemo(() => ({
    limit,
    offset: page * limit,
    tenantId: tenantFilter || undefined,
    role: roleFilter || undefined,
    status: statusFilter as 'active' | 'suspended' | undefined,
  }), [limit, page, tenantFilter, roleFilter, statusFilter])

  const { data, isLoading, error } = useListUsers(userListParams)

  const { data: tenantsData } = useListTenants({ limit: 100 })
  const bulkSuspend = useBulkSuspendUsers()
  const bulkReactivate = useBulkReactivateUsers()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((u) => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    }
  }

  const handleBulkSuspend = () => {
    bulkSuspend.mutate(
      {
        userIds: selectedUsers,
        reason: 'Suspension en masse par Super Admin',
      },
      {
        onSuccess: () => {
          setSelectedUsers([])
          setShowBulkSuspendDialog(false)
        },
      }
    )
  }

  const handleBulkReactivate = () => {
    bulkReactivate.mutate(
      {
        userIds: selectedUsers,
      },
      {
        onSuccess: () => {
          setSelectedUsers([])
          setShowBulkReactivateDialog(false)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des utilisateurs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Erreur lors du chargement des utilisateurs</p>
          <p className="text-sm text-muted-foreground mt-2">
            Veuillez réessayer plus tard ou contacter le support.
          </p>
        </div>
      </div>
    )
  }

  const users = data?.users || []
  const tenants = tenantsData?.tenants || []
  const hasNextPage = users.length === limit
  const hasPreviousPage = page > 0
  const allSelected = users.length > 0 && selectedUsers.length === users.length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            Vue cross-tenant - {users.length} utilisateur(s) affiché(s)
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un Utilisateur
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tenant Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant</label>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={FILTER_ALL}>Tous les tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={FILTER_ALL}>Tous les rôles</option>
                <option value={ACTOR_ROLE.SUPERADMIN}>Super Admin</option>
                <option value={ACTOR_ROLE.TENANT_ADMIN}>Administrateur</option>
                <option value={ACTOR_ROLE.MEMBER}>Membre</option>
                <option value={ACTOR_ROLE.DPO}>DPO</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={USER_STATUS_FILTER.ALL}>Tous les statuts</option>
                <option value={USER_STATUS_FILTER.ACTIVE}>Actif</option>
                <option value={USER_STATUS_FILTER.SUSPENDED}>Suspendu</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setTenantFilter(FILTER_ALL)
                  setRoleFilter(FILTER_ALL)
                  setStatusFilter(USER_STATUS_FILTER.ALL)
                  setPage(0)
                }}
                variant="outline"
                className="w-full md:w-auto"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{selectedUsers.length} utilisateur(s) sélectionné(s)</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkSuspendDialog(true)}
                  disabled={bulkSuspend.isPending}
                >
                  Suspendre la sélection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkReactivateDialog(true)}
                  disabled={bulkReactivate.isPending}
                >
                  Réactiver la sélection
                </Button>
                <Button variant="ghost" onClick={() => setSelectedUsers([])}>
                  Désélectionner tout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
              <Link href="/admin/users/new" className="mt-4 inline-block">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer le premier utilisateur
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Sélectionner tout"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const tenant = tenants.find((t) => t.id === user.tenantId)

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                            aria-label={`Sélectionner ${user.displayName}`}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.displayName}</TableCell>
                        <TableCell>
                          {tenant ? (
                            <Badge variant="outline">{tenant.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* Badge avec couleur différente par rôle */}
                          {user.role === ACTOR_ROLE.SUPERADMIN ? (
                            <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                              🔐 {user.role}
                            </Badge>
                          ) : user.role === ACTOR_ROLE.TENANT_ADMIN ? (
                            <Badge variant="default">
                              {user.role}
                            </Badge>
                          ) : user.role === ACTOR_ROLE.DPO ? (
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                              {user.role}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {user.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {tenant?.suspendedAt ? (
                            <Badge className="bg-orange-600 hover:bg-orange-700">
                              Bloqué (Tenant suspendu)
                            </Badge>
                          ) : (
                            <Badge
                              variant={user.dataSuspended ? 'destructive' : 'default'}
                            >
                              {user.dataSuspended ? 'Suspendu' : 'Actif'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              Détails
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPreviousPage}
                >
                  Précédent
                </Button>
                <p className="text-sm text-muted-foreground">Page {page + 1}</p>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                >
                  Suivant
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Suspend Confirmation Dialog */}
      <AlertDialog open={showBulkSuspendDialog} onOpenChange={setShowBulkSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre {selectedUsers.length} utilisateur(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va suspendre le traitement des données pour {selectedUsers.length}{' '}
              utilisateur(s) sélectionné(s). Les utilisateurs suspendus ne pourront plus utiliser les
              services IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSuspend} disabled={bulkSuspend.isPending}>
              {bulkSuspend.isPending ? 'Suspension en cours...' : 'Confirmer la suspension'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reactivate Confirmation Dialog */}
      <AlertDialog
        open={showBulkReactivateDialog}
        onOpenChange={setShowBulkReactivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver {selectedUsers.length} utilisateur(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va réactiver le traitement des données pour {selectedUsers.length}{' '}
              utilisateur(s) sélectionné(s). Les utilisateurs pourront à nouveau utiliser les services
              IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkReactivate} disabled={bulkReactivate.isPending}>
              {bulkReactivate.isPending ? 'Réactivation en cours...' : 'Confirmer la réactivation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
