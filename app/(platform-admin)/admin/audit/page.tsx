'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useListAuditEvents, useAuditRetentionStats } from '@/lib/api/hooks/useAudit'
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard'
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

// =========================
// Filter Constants
// =========================

const FILTER_ALL = 'all';

const AUDIT_EVENT_TYPE = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  DATA_SUSPENSION_ACTIVATED: 'data.suspension.activated',
  DATA_SUSPENSION_DEACTIVATED: 'data.suspension.deactivated',
  PLATFORM_SUPERADMIN_CREATED: 'platform.superadmin.created',
  TENANT_ADMIN_CREATED: 'tenant.admin.created',
  TENANT_CREATED: 'tenant.created',
  TENANT_DELETED: 'tenant.deleted',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_UNSUSPENDED: 'tenant.unsuspended',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_USER_CREATED: 'tenant.user.created',
  USER_DELETED: 'user.deleted',
  USER_UPDATED: 'user.updated',
} as const;

const PAGE_SIZE = {
  SMALL: 25,
  MEDIUM: 50,
  LARGE: 100,
} as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE.MEDIUM;

/**
 * Format actor/tenant display: shows name only
 * If name is available: "Jean Dupont"
 * If no name but ID exists: "Supprimé" (user/tenant was deleted)
 * If no ID: "-"
 */
const formatName = (name: string | null | undefined, id: string | null | undefined): string => {
  if (!id) return '-';
  return name || 'Supprimé';
};

export default function AuditTrailPage() {
  const [filters, setFilters] = useState<{
    eventType: string
    limit: number
    offset: number
  }>({
    eventType: FILTER_ALL,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  })

  const { data, isLoading } = useListAuditEvents({
    ...filters,
    eventType: filters.eventType === FILTER_ALL ? '' : filters.eventType,
  })

  const { data: retentionStats, isLoading: statsLoading } = useAuditRetentionStats()

  const handleExport = async () => {
    try {
      // Build query params
      const queryParams = new URLSearchParams()
      if (filters.eventType && filters.eventType !== FILTER_ALL) {
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
        </div>
        <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* RGPD Compliance Card */}
      <RgpdComplianceCard
        variant={COMPLIANCE_CARD_VARIANT.AUDIT_LOGS}
        isLoading={statsLoading}
        stats={retentionStats ? {
          totalItems: retentionStats.totalEvents,
          oldestItemAge: retentionStats.oldestEventAge,
          retentionValue: retentionStats.retentionMonths,
          retentionUnit: 'months',
        } : undefined}
      />

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
                  <SelectItem value={FILTER_ALL}>Tous les types</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.AUTH_LOGIN_SUCCESS}>{AUDIT_EVENT_TYPE.AUTH_LOGIN_SUCCESS}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.DATA_SUSPENSION_ACTIVATED}>{AUDIT_EVENT_TYPE.DATA_SUSPENSION_ACTIVATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.DATA_SUSPENSION_DEACTIVATED}>{AUDIT_EVENT_TYPE.DATA_SUSPENSION_DEACTIVATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.PLATFORM_SUPERADMIN_CREATED}>{AUDIT_EVENT_TYPE.PLATFORM_SUPERADMIN_CREATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_ADMIN_CREATED}>{AUDIT_EVENT_TYPE.TENANT_ADMIN_CREATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_CREATED}>{AUDIT_EVENT_TYPE.TENANT_CREATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_DELETED}>{AUDIT_EVENT_TYPE.TENANT_DELETED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_SUSPENDED}>{AUDIT_EVENT_TYPE.TENANT_SUSPENDED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_UNSUSPENDED}>{AUDIT_EVENT_TYPE.TENANT_UNSUSPENDED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_UPDATED}>{AUDIT_EVENT_TYPE.TENANT_UPDATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.TENANT_USER_CREATED}>{AUDIT_EVENT_TYPE.TENANT_USER_CREATED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.USER_DELETED}>{AUDIT_EVENT_TYPE.USER_DELETED}</SelectItem>
                  <SelectItem value={AUDIT_EVENT_TYPE.USER_UPDATED}>{AUDIT_EVENT_TYPE.USER_UPDATED}</SelectItem>
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
                  <SelectItem value={String(PAGE_SIZE.SMALL)}>{PAGE_SIZE.SMALL}</SelectItem>
                  <SelectItem value={String(PAGE_SIZE.MEDIUM)}>{PAGE_SIZE.MEDIUM}</SelectItem>
                  <SelectItem value={String(PAGE_SIZE.LARGE)}>{PAGE_SIZE.LARGE}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setFilters({ eventType: FILTER_ALL, limit: DEFAULT_PAGE_SIZE, offset: 0 })}
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
                    <th className="pb-2 font-medium">Acteur</th>
                    <th className="pb-2 font-medium">Tenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.events.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/50">
                      <td className="py-2">{format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="py-2 font-mono text-xs">{event.eventType}</td>
                      <td className="py-2 text-sm">
                        {formatName(event.actorDisplayName, event.actorId)}
                      </td>
                      <td className="py-2 text-sm">
                        {formatName(event.tenantName, event.tenantId)}
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
