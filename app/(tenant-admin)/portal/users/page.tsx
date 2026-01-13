'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ACTOR_ROLE } from '@/shared/actorRole'

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

const SORT_FIELD = {
  NAME: 'name',
  CREATED_AT: 'createdAt',
  ROLE: 'role',
} as const;
type SortField = (typeof SORT_FIELD)[keyof typeof SORT_FIELD];

const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

const DEFAULT_SORT_FIELD = SORT_FIELD.CREATED_AT;
const DEFAULT_SORT_ORDER = SORT_ORDER.DESC;
import {
  useTenantUsers,
  useBulkSuspendTenantUsers,
  useBulkReactivateTenantUsers,
  type TenantUsersParams,
} from '@/lib/api/hooks/useTenantUsers'
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
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Eye, Users, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

/**
 * Users List Page - TENANT Admin (LOT 12.1)
 *
 * Features:
 * - List users in current tenant only (tenant isolation)
 * - Filters: role, status, search
 * - Pagination (50 per page)
 * - Sorting by name, createdAt, role
 * - Bulk actions: suspend/reactivate multiple users
 * - Create new user
 * - View user details
 *
 * RGPD Compliance:
 * - Only P1 data displayed (displayName, id, role)
 * - Email NOT displayed (P2 data)
 * - Tenant isolation enforced (API backend)
 * - Audit trail logged backend
 */
export default function TenantUsersPage() {
  const [page, setPage] = useState(0)
  const [roleFilter, setRoleFilter] = useState<string>(FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState<string>(USER_STATUS_FILTER.ALL)
  const [searchQuery, setSearchQuery] = useState<string>(FILTER_ALL)
  const [searchInput, setSearchInput] = useState<string>(FILTER_ALL)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT_FIELD)
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkSuspendDialog, setShowBulkSuspendDialog] = useState(false)
  const [showBulkReactivateDialog, setShowBulkReactivateDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const limit = 50

  const queryParams = useMemo<TenantUsersParams>(() => ({
    limit,
    offset: page * limit,
    role: roleFilter || undefined,
    status: statusFilter as 'active' | 'suspended' | undefined,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
  }), [page, roleFilter, statusFilter, searchQuery, sortBy, sortOrder])

  const { data, isLoading, error } = useTenantUsers(queryParams)
  const bulkSuspend = useBulkSuspendTenantUsers()
  const bulkReactivate = useBulkReactivateTenantUsers()

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages - 1
  const hasPreviousPage = page > 0
  const allSelected = users.length > 0 && selectedUsers.length === users.length

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSort = (column: SortField) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC)
    } else {
      setSortBy(column)
      setSortOrder(DEFAULT_SORT_ORDER)
    }
    setPage(0)
  }

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
    if (!suspendReason.trim()) {
      return
    }
    bulkSuspend.mutate(
      {
        userIds: selectedUsers,
        reason: suspendReason,
      },
      {
        onSuccess: () => {
          setSelectedUsers([])
          setShowBulkSuspendDialog(false)
          setSuspendReason('')
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

  const resetFilters = () => {
    setRoleFilter(FILTER_ALL)
    setStatusFilter(USER_STATUS_FILTER.ALL)
    setSearchQuery(FILTER_ALL)
    setSearchInput(FILTER_ALL)
    setSortBy(DEFAULT_SORT_FIELD)
    setSortOrder(DEFAULT_SORT_ORDER)
    setPage(0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des utilisateurs...</p>
        </div>
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
                  Impossible de charger la liste des utilisateurs.
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            {total} utilisateur(s) dans votre organisation
          </p>
        </div>
        <Link href="/portal/users/new">
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
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rechercher</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nom..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={FILTER_ALL}>Tous les rôles</option>
                <option value={ACTOR_ROLE.TENANT_ADMIN}>Administrateur</option>
                <option value={ACTOR_ROLE.MEMBER}>Membre</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as UserStatusFilter)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={USER_STATUS_FILTER.ALL}>Tous les statuts</option>
                <option value={USER_STATUS_FILTER.ACTIVE}>Actif</option>
                <option value={USER_STATUS_FILTER.SUSPENDED}>Suspendu</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              <Button onClick={resetFilters} variant="outline" className="w-full md:w-auto">
                Réinitialiser
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
                  Suspendre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkReactivateDialog(true)}
                  disabled={bulkReactivate.isPending}
                >
                  Réactiver
                </Button>
                <Button variant="ghost" onClick={() => setSelectedUsers([])}>
                  Désélectionner
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
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
              <Link href="/portal/users/new" className="mt-4 inline-block">
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
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(SORT_FIELD.NAME)}
                    >
                      Nom {sortBy === SORT_FIELD.NAME && (sortOrder === SORT_ORDER.ASC ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(SORT_FIELD.ROLE)}
                    >
                      Rôle {sortBy === SORT_FIELD.ROLE && (sortOrder === SORT_ORDER.ASC ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(SORT_FIELD.CREATED_AT)}
                    >
                      Créé le {sortBy === SORT_FIELD.CREATED_AT && (sortOrder === SORT_ORDER.ASC ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
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
                        {user.role === ACTOR_ROLE.TENANT_ADMIN ? (
                          <Badge variant="default">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">{user.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.dataSuspended ? 'destructive' : 'default'}>
                          {user.dataSuspended ? 'Suspendu' : 'Actif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/portal/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Détails
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPreviousPage}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} sur {totalPages || 1}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                >
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
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
              Cette action va suspendre le traitement des données pour les utilisateurs sélectionnés.
              Ils ne pourront plus utiliser les services IA jusqu&apos;à réactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Raison de la suspension *</label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Ex: Départ de l'entreprise, incident sécurité..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuspendReason('')}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkSuspend}
              disabled={bulkSuspend.isPending || !suspendReason.trim()}
            >
              {bulkSuspend.isPending ? 'Suspension...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reactivate Confirmation Dialog */}
      <AlertDialog open={showBulkReactivateDialog} onOpenChange={setShowBulkReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver {selectedUsers.length} utilisateur(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va réactiver les utilisateurs sélectionnés. Ils pourront à nouveau
              utiliser les services IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkReactivate} disabled={bulkReactivate.isPending}>
              {bulkReactivate.isPending ? 'Réactivation...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
