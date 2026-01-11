'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useListAuditEvents } from '@/lib/api/hooks/useAudit'
import { FileDown } from 'lucide-react'
import { format } from 'date-fns'

/**
 * Audit Trail Page - Super Admin
 * LOT 11.3 - Audit & Monitoring
 *
 * Features:
 * - List audit events with pagination
 * - Filters (eventType, date range)
 * - Export to CSV (RGPD-safe)
 *
 * RGPD Compliance:
 * - P1 data only (IDs, event types, timestamps)
 * - No sensitive metadata content
 * - CSV export with UTF-8 BOM (Excel-compatible)
 */
export default function AuditTrailPage() {
  const [filters, setFilters] = useState({
    eventType: 'all',
    limit: 50,
    offset: 0,
  })

  const { data, isLoading } = useListAuditEvents({
    ...filters,
    eventType: filters.eventType === 'all' ? '' : filters.eventType,
  })

  const handleExport = async () => {
    try {
      // Build query params
      const queryParams = new URLSearchParams()
      if (filters.eventType && filters.eventType !== 'all') {
        queryParams.append('eventType', filters.eventType)
      }

      // Get token from sessionStorage
      const token = sessionStorage.getItem('auth_token')
      if (!token) {
        alert('Session expirée. Veuillez vous reconnecter.')
        return
      }

      // Fetch CSV with authentication
      const response = await fetch(`/api/audit/export?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erreur lors de l\'export' }))
        alert(error.message || 'Erreur lors de l\'export')
        return
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export du fichier CSV')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">
            Événements système (P1 uniquement, RGPD-safe)
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">Rétention :</span> 12 mois (conforme CNIL) •
            Purge automatique des événements &gt; 12 mois
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Type d&apos;événement</label>
              <Select
                value={filters.eventType}
                onValueChange={(value) => setFilters({ ...filters, eventType: value, offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="auth.login.success">auth.login.success</SelectItem>
                  <SelectItem value="data.suspension.activated">data.suspension.activated</SelectItem>
                  <SelectItem value="data.suspension.deactivated">data.suspension.deactivated</SelectItem>
                  <SelectItem value="platform.superadmin.created">platform.superadmin.created</SelectItem>
                  <SelectItem value="tenant.admin.created">tenant.admin.created</SelectItem>
                  <SelectItem value="tenant.created">tenant.created</SelectItem>
                  <SelectItem value="tenant.deleted">tenant.deleted</SelectItem>
                  <SelectItem value="tenant.suspended">tenant.suspended</SelectItem>
                  <SelectItem value="tenant.unsuspended">tenant.unsuspended</SelectItem>
                  <SelectItem value="tenant.updated">tenant.updated</SelectItem>
                  <SelectItem value="tenant.user.created">tenant.user.created</SelectItem>
                  <SelectItem value="user.deleted">user.deleted</SelectItem>
                  <SelectItem value="user.updated">user.updated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Résultats par page</label>
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
                onClick={() => setFilters({ eventType: 'all', limit: 50, offset: 0 })}
                variant="outline"
                className="w-full md:w-auto"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Événements ({data?.events.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : data?.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun événement trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Actor ID</th>
                    <th className="pb-2 font-medium">Tenant ID</th>
                    <th className="pb-2 font-medium">Target ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.events.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/50">
                      <td className="py-2">{format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="py-2 font-mono text-xs">{event.eventType}</td>
                      <td className="py-2 font-mono text-xs truncate max-w-[100px]">
                        {event.actorId || '-'}
                      </td>
                      <td className="py-2 font-mono text-xs truncate max-w-[100px]">
                        {event.tenantId || '-'}
                      </td>
                      <td className="py-2 font-mono text-xs truncate max-w-[100px]">
                        {event.targetId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.events.length > 0 && (
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
                Affichage {filters.offset + 1} - {filters.offset + data.events.length}
              </span>
              <Button
                onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                disabled={data.events.length < filters.limit}
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
