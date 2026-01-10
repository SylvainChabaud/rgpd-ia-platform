'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/apiClient'
import { AlertCircle, FileDown, Plus } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

/**
 * Security Incidents (Violations Registry) Page
 * LOT 11.3 - EPIC 9.0 Integration
 *
 * RGPD: Art. 33.5 (mandatory violations registry)
 * Access: SUPER_ADMIN, DPO only
 */
export default function ViolationsPage() {
  const [filters, setFilters] = useState({
    severity: 'all',
    resolved: 'all',
    limit: 50,
    offset: 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity)
      if (filters.resolved && filters.resolved !== 'all') params.append('resolved', filters.resolved)
      params.append('limit', String(filters.limit))
      params.append('offset', String(filters.offset))

      return apiClient<{
        incidents: Array<{
          id: string
          severity: string
          type: string
          title: string
          usersAffected: number | null
          cnilNotified: boolean
          resolvedAt: string | null
          detectedAt: string
        }>
        pagination: { total: number; limit: number; offset: number }
      }>(`/incidents?${params.toString()}`)
    },
  })

  const handleExport = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams()
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity)
      if (filters.resolved && filters.resolved !== 'all') params.append('resolved', filters.resolved)

      // Get authentication token from sessionStorage (same as apiClient)
      const token = sessionStorage.getItem('auth_token')

      if (!token) {
        alert('Session expirée. Veuillez vous reconnecter.')
        window.location.href = '/login'
        return
      }

      const response = await fetch(`/api/incidents/export?${params.toString()}`, {
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

      // Get CSV content and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registre-violations-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export CSV')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold">Registre des Violations</h1>
            <p className="text-muted-foreground">Art. 33.5 RGPD - Obligatoire</p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Rétention :</span> 5 ans minimum (Art. 33.5) •
              Conservation permanente pour preuve conformité
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Link href="/audit/violations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle violation
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sévérité</label>
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters({ ...filters, severity: value, offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <Select
                value={filters.resolved}
                onValueChange={(value) => setFilters({ ...filters, resolved: value, offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="false">Non résolus</SelectItem>
                  <SelectItem value="true">Résolus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Par page</label>
              <Select
                value={String(filters.limit)}
                onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value), offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setFilters({ severity: 'all', resolved: 'all', limit: 50, offset: 0 })}
                variant="outline"
                className="w-full md:w-auto"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {data && data.incidents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.pagination.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Non Résolues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {data.incidents.filter((i) => !i.resolvedAt).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CNIL Notifiée</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {data.incidents.filter((i) => i.cnilNotified).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data.incidents.filter((i) => i.severity === 'CRITICAL').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Violations ({data?.pagination.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : data?.incidents.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">
                  Aucune violation enregistrée
                </p>
              </div>
              <div className="max-w-2xl mx-auto text-sm text-muted-foreground space-y-2">
                <p>
                  Le registre des violations est actuellement vide, ce qui indique qu&apos;aucun incident
                  de sécurité n&apos;a été détecté ou signalé.
                </p>
                <p className="pt-2">
                  <span className="font-medium">Rappel :</span> Toute violation de données personnelles
                  doit être documentée ici conformément à l&apos;Art. 33.5 du RGPD, qu&apos;elle soit ou non
                  notifiée à la CNIL.
                </p>
                <div className="pt-4">
                  <Link href="/audit/violations/new">
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Déclarer une violation manuellement
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Sévérité</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Titre</th>
                    <th className="pb-2 font-medium">Users</th>
                    <th className="pb-2 font-medium">CNIL</th>
                    <th className="pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-muted/50">
                      <td className="py-2">{format(new Date(incident.detectedAt), 'dd/MM/yyyy')}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : incident.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{incident.type}</td>
                      <td className="py-2 max-w-[200px] truncate">{incident.title}</td>
                      <td className="py-2">{incident.usersAffected ?? '-'}</td>
                      <td className="py-2">
                        {incident.cnilNotified ? (
                          <span className="text-green-600">✓ Oui</span>
                        ) : (
                          <span className="text-muted-foreground">Non</span>
                        )}
                      </td>
                      <td className="py-2">
                        {incident.resolvedAt ? (
                          <span className="text-green-600">Résolu</span>
                        ) : (
                          <span className="text-yellow-600">En cours</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.incidents.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                disabled={filters.offset === 0}
                variant="outline"
                size="sm"
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                {filters.offset + 1} - {Math.min(filters.offset + filters.limit, data.pagination.total)} sur {data.pagination.total}
              </span>
              <Button
                onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                disabled={filters.offset + filters.limit >= data.pagination.total}
                variant="outline"
                size="sm"
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
