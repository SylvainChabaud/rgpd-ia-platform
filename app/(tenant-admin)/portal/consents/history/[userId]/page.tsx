'use client'

import { useState, useMemo, use } from 'react'
import Link from 'next/link'
import { useConsentHistory, usePurposes, type ConsentHistoryParams } from '@/lib/api/hooks/useConsents'

// =========================
// Constants
// =========================

const FILTER_ALL = '';

const CONSENT_SOURCE = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert as _Alert, AlertDescription as _AlertDescription } from '@/components/ui/alert'
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard'
import {
  ArrowLeft,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Info as _Info,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Consent History Page - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - Timeline view of consent changes for a specific user
 * - Filters: by purpose, by date range
 * - Pagination
 *
 * RGPD Compliance:
 * - Tenant isolation enforced (API backend)
 * - NO email displayed (P2) - only displayName (P1)
 * - Full audit trail for RGPD accountability
 */

interface ConsentHistoryPageProps {
  params: Promise<{ userId: string }>
}

export default function ConsentHistoryPage({ params }: ConsentHistoryPageProps) {
  const { userId } = use(params)

  const [page, setPage] = useState(0)
  const [purposeFilter, setPurposeFilter] = useState(FILTER_ALL)
  const [startDate, setStartDate] = useState(FILTER_ALL)
  const [endDate, setEndDate] = useState(FILTER_ALL)

  const limit = 50

  const queryParams = useMemo<ConsentHistoryParams>(() => ({
    limit,
    offset: page * limit,
    purposeId: purposeFilter || undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  }), [page, purposeFilter, startDate, endDate])

  const { data, isLoading, error } = useConsentHistory(userId, queryParams)
  const { data: purposesData } = usePurposes(true)

  const user = data?.user
  const history = data?.history || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages - 1
  const hasPreviousPage = page > 0
  const purposes = purposesData?.purposes || []

  const resetFilters = () => {
    setPurposeFilter(FILTER_ALL)
    setStartDate(FILTER_ALL)
    setEndDate(FILTER_ALL)
    setPage(0)
  }

  const getActionIcon = (action: 'granted' | 'revoked') => {
    switch (action) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'revoked':
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getActionLabel = (action: 'granted' | 'revoked') => {
    switch (action) {
      case 'granted':
        return 'Consentement accordé'
      case 'revoked':
        return 'Consentement révoqué'
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

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Utilisateur introuvable</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  L&apos;utilisateur demandé n&apos;existe pas ou vous n&apos;y avez pas accès.
                </p>
              </div>
              <Link href="/portal/consents/matrix">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la matrice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/consents/matrix">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="h-8 w-8" />
            Historique des consentements
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.displayName}</span>
          </div>
        </div>
      </div>

      {/* RGPD Compliance Card */}
      <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.CONSENTS_HISTORY} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Purpose Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Finalité</label>
              <select
                value={purposeFilter}
                onChange={(e) => {
                  setPurposeFilter(e.target.value)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={FILTER_ALL}>Toutes les finalités</option>
                {purposes.map((purpose) => (
                  <option key={purpose.id} value={purpose.id}>
                    {purpose.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(0)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
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

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chronologie des consentements</CardTitle>
          <CardDescription>
            {total} événement(s) enregistré(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun historique de consentement</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Finalité</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={`${entry.id}-${entry.action}-${entry.timestamp}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.timestamp), { locale: fr, addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.purposeLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          <span>{getActionLabel(entry.action)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {entry.source === CONSENT_SOURCE.USER ? 'Utilisateur' : entry.source === CONSENT_SOURCE.ADMIN ? 'Admin' : 'Système'}
                        </Badge>
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
    </div>
  )
}
