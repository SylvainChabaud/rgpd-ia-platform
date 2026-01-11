'use client'

import { useAuthStore } from '@/lib/auth/authStore'
import { useTenantStats, useTenantActivity, useTenantAIJobsStats } from '@/lib/api/hooks/useTenantDashboard'
import { StatsWidget } from '@/components/backoffice/dashboard/StatsWidget'
import { ActivityChart } from '@/components/backoffice/dashboard/ActivityChart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Cpu, ShieldCheck, FileText, AlertCircle, Building2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Event type to badge variant mapping
 */
const eventTypeBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'user.created': { label: 'Création user', variant: 'default' },
  'user.updated': { label: 'Modification user', variant: 'secondary' },
  'user.suspended': { label: 'Suspension user', variant: 'destructive' },
  'user.reactivated': { label: 'Réactivation user', variant: 'outline' },
  'consent.granted': { label: 'Consentement accordé', variant: 'default' },
  'consent.revoked': { label: 'Consentement révoqué', variant: 'destructive' },
  'ai.invoked': { label: 'Job IA', variant: 'secondary' },
  'ai.completed': { label: 'Job IA terminé', variant: 'default' },
  'ai.failed': { label: 'Job IA échoué', variant: 'destructive' },
  'rgpd.export.requested': { label: 'Export demandé', variant: 'outline' },
  'rgpd.export.completed': { label: 'Export terminé', variant: 'default' },
  'rgpd.delete.requested': { label: 'Effacement demandé', variant: 'destructive' },
  'rgpd.delete.completed': { label: 'Effacement terminé', variant: 'outline' },
}

/**
 * Get badge config for event type
 */
function getEventBadge(type: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  return eventTypeBadges[type] || { label: type, variant: 'secondary' }
}

/**
 * Tenant Dashboard Page
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, event types, IDs)
 * - NO user content (prompts, outputs)
 * - Tenant isolation enforced by backend
 *
 * Features:
 * - KPI Widgets: Users, AI Jobs, Consents, RGPD Exports
 * - Charts: AI Jobs over time, Consents distribution
 * - Activity Feed: Last 50 events
 */
export default function TenantDashboardPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenantId

  // Fetch stats, AI jobs time series, and activity
  const { data: statsData, isLoading: statsLoading, error: statsError } = useTenantStats(tenantId)
  const { data: aiJobsTimeSeriesData, isLoading: aiJobsLoading } = useTenantAIJobsStats(tenantId, 30)
  const { data: activityData, isLoading: activityLoading } = useTenantActivity(tenantId, 50)

  // Tenant name from stats API (P1 data - organization name, safe to display)
  const tenantName = statsData?.tenantName

  const stats = statsData?.stats

  // Prepare chart data for AI Jobs (real time series from API)
  const aiJobsChartData = aiJobsTimeSeriesData?.stats || []

  // Prepare chart data for Consents
  const consentsChartData = stats ? [
    { status: 'Accordés', count: stats.consents.granted },
    { status: 'Révoqués', count: stats.consents.revoked },
    { status: 'En attente', count: stats.consents.pending },
  ] : []

  // Error state
  if (statsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Vue d&apos;ensemble de votre organisation</p>
          </div>
          {tenantName && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{tenantName}</span>
            </div>
          )}
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <div>
                <p className="font-medium">Erreur de chargement</p>
                <p className="text-sm text-muted-foreground">
                  Impossible de charger les statistiques. Veuillez réessayer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Tenant Name */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de votre organisation</p>
        </div>
        {tenantName && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{tenantName}</span>
          </div>
        )}
      </div>

      {/* KPI Widgets Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsWidget
          title="Utilisateurs actifs"
          value={stats?.users.active || 0}
          subtitle={`${stats?.users.total || 0} total • ${stats?.users.suspended || 0} suspendus`}
          icon={Users}
          isLoading={statsLoading}
        />
        <StatsWidget
          title="Jobs IA ce mois"
          value={stats?.aiJobs.total || 0}
          subtitle={`${stats?.aiJobs.success || 0} succès • ${stats?.aiJobs.failed || 0} échecs`}
          icon={Cpu}
          variant={stats?.aiJobs.failed && stats.aiJobs.failed > stats.aiJobs.success ? 'danger' : 'success'}
          isLoading={statsLoading}
        />
        <StatsWidget
          title="Consentements actifs"
          value={stats?.consents.granted || 0}
          subtitle={`${stats?.consents.revoked || 0} révoqués • ${stats?.consents.pending || 0} en attente`}
          icon={ShieldCheck}
          isLoading={statsLoading}
        />
        <StatsWidget
          title="Exports RGPD"
          value={stats?.rgpd.exports.pending || 0}
          subtitle={`en cours • ${stats?.rgpd.exports.completed || 0} terminés`}
          icon={FileText}
          variant={stats?.rgpd.exports.pending && stats.rgpd.exports.pending > 0 ? 'warning' : 'default'}
          isLoading={statsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityChart
          title="Jobs IA"
          subtitle={`30 derniers jours`}
          data={aiJobsChartData}
          dataKeys={[
            { key: 'success', label: 'Succès', color: '#22c55e' },
            { key: 'failed', label: 'Échecs', color: '#ef4444' },
          ]}
          xAxisKey="date"
          type="line"
          height={250}
          isLoading={aiJobsLoading}
        />
        <ActivityChart
          title="Consentements"
          subtitle="Répartition actuelle"
          data={consentsChartData}
          dataKeys={[
            { key: 'count', label: 'Nombre', color: '#3b82f6' },
          ]}
          xAxisKey="status"
          type="bar"
          height={250}
          isLoading={statsLoading}
        />
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Les 50 derniers événements de votre tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : activityData?.events && activityData.events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead className="w-[200px]">Type</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityData.events.map((event) => {
                  const badge = getEventBadge(event.type)
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.actorId ? event.actorId.slice(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.targetId ? event.targetId.slice(0, 8) + '...' : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Aucune activité récente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
