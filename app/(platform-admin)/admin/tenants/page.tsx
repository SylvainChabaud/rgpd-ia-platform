'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useListTenants } from '@/lib/api/hooks/useTenants'
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
import { Plus, Eye } from 'lucide-react'

/**
 * Tenants List Page - PLATFORM Admin
 *
 * Features:
 * - List all tenants (cross-tenant view)
 * - Pagination (20 per page)
 * - Create new tenant
 * - View tenant details
 *
 * RGPD Compliance:
 * - Only P1 data displayed (id, name, slug, timestamps)
 * - No user content or sensitive data
 * - Audit trail logged backend
 */

// Status filter constants (local to this page)
const STATUS_FILTER = {
  ALL: '',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

export default function TenantsPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER.ALL)
  const limit = 100

  const { data, isLoading, error } = useListTenants({
    limit,
    offset: page * limit,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des tenants...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Erreur lors du chargement des tenants</p>
          <p className="text-sm text-muted-foreground mt-2">
            Veuillez réessayer plus tard ou contacter le support.
          </p>
        </div>
      </div>
    )
  }

  const allTenants = data?.tenants || []

  // Apply client-side filtering
  const tenants = allTenants.filter((tenant) => {
    if (statusFilter === STATUS_FILTER.ACTIVE) {
      return !tenant.suspendedAt && !tenant.deletedAt
    }
    if (statusFilter === STATUS_FILTER.SUSPENDED) {
      return tenant.suspendedAt && !tenant.deletedAt
    }
    if (statusFilter === STATUS_FILTER.DELETED) {
      return tenant.deletedAt
    }
    return true // STATUS_FILTER.ALL or no filter
  })

  const hasNextPage = allTenants.length === limit
  const hasPreviousPage = page > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Tenants</h1>
          <p className="text-muted-foreground">
            Vue cross-tenant - {tenants.length} tenant(s) affiché(s)
          </p>
        </div>
        <Link href="/admin/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un Tenant
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={STATUS_FILTER.ALL}>Tous les statuts</option>
                <option value={STATUS_FILTER.ACTIVE}>Actif</option>
                <option value={STATUS_FILTER.SUSPENDED}>Suspendu</option>
                <option value={STATUS_FILTER.DELETED}>Supprimé</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setStatusFilter(STATUS_FILTER.ALL)
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

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun tenant trouvé</p>
              <Link href="/admin/tenants/new" className="mt-4 inline-block">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer le premier tenant
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {tenant.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.deletedAt ? 'destructive' : 'default'}
                          className={tenant.suspendedAt && !tenant.deletedAt ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        >
                          {tenant.deletedAt ? 'Supprimé' : tenant.suspendedAt ? 'Suspendu' : 'Actif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(tenant.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/tenants/${tenant.id}`}>
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
                  Précédent
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page + 1}
                </p>
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
    </div>
  )
}
