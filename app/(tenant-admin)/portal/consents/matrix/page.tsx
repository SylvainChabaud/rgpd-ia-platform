'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useConsentMatrix,
  useExportConsents,
  type ConsentMatrixParams,
} from '@/lib/api/hooks/useConsents'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard'
import {
  ArrowLeft,
  Search,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  Info,
} from 'lucide-react'

/**
 * Consent Matrix Page - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - Matrix view: users (rows) x purposes (columns)
 * - Cell states: granted (green), revoked (red), pending (gray)
 * - Filters: search by user name, filter by status
 * - Pagination
 * - Export to CSV
 * - Click on cell to view history
 *
 * RGPD Compliance:
 * - Tenant isolation enforced (API backend)
 * - NO email displayed (P2) - only displayName (P1)
 * - Export is RGPD-safe (P1/P2 only)
 */

// Status filter constants (local to this page)
const STATUS_FILTER = {
  ALL: 'all',
  GRANTED: 'granted',
  REVOKED: 'revoked',
  PENDING: 'pending',
} as const;

type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

export default function ConsentMatrixPage() {
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER.ALL)

  const limit = 20

  const queryParams = useMemo<ConsentMatrixParams>(() => ({
    limit,
    offset: page * limit,
    search: searchQuery || undefined,
    status: statusFilter,
  }), [page, searchQuery, statusFilter])

  const { data, isLoading, error } = useConsentMatrix(queryParams)
  const exportConsents = useExportConsents()

  const purposes = data?.purposes || []
  const matrix = data?.matrix || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages - 1
  const hasPreviousPage = page > 0

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter(STATUS_FILTER.ALL)
    setPage(0)
  }

  const getStatusIcon = (status: 'granted' | 'revoked' | 'pending') => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'revoked':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusLabel = (status: 'granted' | 'revoked' | 'pending') => {
    switch (status) {
      case 'granted':
        return 'Accordé'
      case 'revoked':
        return 'Révoqué'
      case 'pending':
        return 'En attente'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20" />
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
                  Impossible de charger la matrice des consentements.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal/consents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Grid3X3 className="h-8 w-8" />
              Matrice des consentements
            </h1>
            <p className="text-muted-foreground mt-1">
              Vue d&apos;ensemble des consentements utilisateurs × finalités
            </p>
          </div>
        </div>
        <Button
          onClick={() => exportConsents.mutate()}
          disabled={exportConsents.isPending}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportConsents.isPending ? 'Export...' : 'Exporter CSV'}
        </Button>
      </div>

      {/* RGPD Compliance Card */}
      <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.CONSENTS_MATRIX} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rechercher un utilisateur</label>
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

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={STATUS_FILTER.ALL}>Tous les statuts</option>
                <option value={STATUS_FILTER.GRANTED}>Accordé</option>
                <option value={STATUS_FILTER.REVOKED}>Révoqué</option>
                <option value={STATUS_FILTER.PENDING}>En attente</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button onClick={resetFilters} variant="outline" className="w-full md:w-auto">
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Accordé</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>Révoqué</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>En attente</span>
        </div>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matrice utilisateurs × finalités</CardTitle>
          <CardDescription>
            {total} utilisateur(s) • {purposes.length} finalité(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrix.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
            </div>
          ) : purposes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune finalité configurée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez d&apos;abord des finalités de traitement pour afficher la matrice.
              </p>
              <Link href="/portal/consents/purposes" className="mt-4 inline-block">
                <Button variant="outline">
                  Gérer les finalités
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                        Utilisateur
                      </TableHead>
                      {purposes.map((purpose) => (
                        <TableHead key={purpose.id} className="text-center min-w-[120px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex flex-col items-center">
                                  <span className="font-medium truncate max-w-[100px]">
                                    {purpose.label}
                                  </span>
                                  {purpose.isRequired && (
                                    <Badge variant="destructive" className="text-xs mt-1">
                                      Requis
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{purpose.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {row.displayName}
                        </TableCell>
                        {row.consents.map((consent) => (
                          <TableCell key={consent.purposeId} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex justify-center cursor-help">
                                    {getStatusIcon(consent.status)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <p className="font-medium">{getStatusLabel(consent.status)}</p>
                                    {consent.grantedAt && (
                                      <p className="text-xs text-muted-foreground">
                                        Accordé le {new Date(consent.grantedAt).toLocaleDateString('fr-FR')}
                                      </p>
                                    )}
                                    {consent.revokedAt && (
                                      <p className="text-xs text-muted-foreground">
                                        Révoqué le {new Date(consent.revokedAt).toLocaleDateString('fr-FR')}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Link href={`/portal/consents/history/${row.userId}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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
    </div>
  )
}
