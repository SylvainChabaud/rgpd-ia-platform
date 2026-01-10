'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useGlobalStats, useAIJobsStats, useRGPDStats } from '@/lib/api/hooks/useAudit'
import { StatsWidget } from '@/components/backoffice/dashboard/StatsWidget'
import { ActivityChart } from '@/components/backoffice/dashboard/ActivityChart'
import {
  Building2,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react'

/**
 * Enhanced Dashboard Landing Page - Super Admin Overview
 * LOT 11.3 - Audit & Monitoring Dashboard
 *
 * Features:
 * - Global platform statistics (KPI widgets)
 * - Activity charts (AI jobs, RGPD requests)
 * - Quick access to audit sections
 *
 * RGPD Compliance:
 * - Only P1 aggregated data (counts, no individual records)
 * - No sensitive user data displayed
 * - Time-series data for last 30 days
 */
export default function DashboardPage() {
  const { data: globalStats, isLoading: isLoadingGlobal } = useGlobalStats()
  const { data: aiJobsData, isLoading: isLoadingAI } = useAIJobsStats(30)
  const { data: rgpdData, isLoading: isLoadingRGPD } = useRGPDStats(30)

  const stats = globalStats?.stats

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Super Admin</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de la plateforme RGPD-IA
        </p>
      </div>

      {/* Global Stats - Top Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatsWidget
          title="Tenants Actifs"
          value={stats?.tenants.active ?? 0}
          subtitle={`${stats?.tenants.total ?? 0} total`}
          icon={Building2}
          variant="success"
          isLoading={isLoadingGlobal}
        />

        <StatsWidget
          title="Tenants Suspendus"
          value={stats?.tenants.suspended ?? 0}
          icon={Building2}
          variant={stats?.tenants.suspended && stats.tenants.suspended > 0 ? 'warning' : 'default'}
          isLoading={isLoadingGlobal}
        />

        <StatsWidget
          title="Utilisateurs Actifs"
          value={stats?.users.active ?? 0}
          subtitle={`${stats?.users.total ?? 0} total`}
          icon={Users}
          isLoading={isLoadingGlobal}
        />

        <StatsWidget
          title="Jobs IA (ce mois)"
          value={stats?.aiJobs.total ?? 0}
          subtitle={`${stats?.aiJobs.success ?? 0} réussis`}
          icon={Activity}
          variant="success"
          isLoading={isLoadingGlobal}
        />

        <StatsWidget
          title="Exports RGPD"
          value={stats?.rgpd.exports.pending ?? 0}
          subtitle="En attente"
          icon={FileText}
          variant={stats?.rgpd.exports.pending && stats.rgpd.exports.pending > 0 ? 'warning' : 'default'}
          isLoading={isLoadingGlobal}
        />

        <StatsWidget
          title="Incidents"
          value={stats?.incidents.unresolved ?? 0}
          subtitle="Non résolus"
          icon={AlertCircle}
          variant={stats?.incidents.unresolved && stats.incidents.unresolved > 0 ? 'danger' : 'success'}
          isLoading={isLoadingGlobal}
        />
      </div>

      {/* Charts Row 1: AI Jobs Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityChart
          title="Activité IA (30 derniers jours)"
          subtitle="Jobs IA exécutés par jour"
          data={aiJobsData?.stats ?? []}
          dataKeys={[
            { key: 'success', label: 'Réussis', color: '#10b981' },
            { key: 'failed', label: 'Échecs', color: '#ef4444' },
          ]}
          xAxisKey="date"
          type="area"
          isLoading={isLoadingAI}
          height={300}
        />

        <ActivityChart
          title="Jobs IA (succès vs échecs)"
          subtitle="Comparaison quotidienne"
          data={aiJobsData?.stats ?? []}
          dataKeys={[
            { key: 'total', label: 'Total', color: '#3b82f6' },
          ]}
          xAxisKey="date"
          type="line"
          isLoading={isLoadingAI}
          height={300}
        />
      </div>

      {/* Charts Row 2: RGPD Requests */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityChart
          title="Requêtes RGPD (30 derniers jours)"
          subtitle="Exports et effacements"
          data={
            rgpdData?.stats.exports.map((item, index) => ({
              date: item.date,
              exports: item.count,
              deletions: rgpdData.stats.deletions[index]?.count ?? 0,
            })) ?? []
          }
          dataKeys={[
            { key: 'exports', label: 'Exports', color: '#8b5cf6' },
            { key: 'deletions', label: 'Effacements', color: '#ef4444' },
          ]}
          xAxisKey="date"
          type="bar"
          isLoading={isLoadingRGPD}
          height={300}
        />

        <ActivityChart
          title="Droits RGPD exercés (Art. 18-22)"
          subtitle="Suspensions, oppositions, contestations"
          data={
            rgpdData?.stats.contests.map((item, index) => ({
              date: item.date,
              contests: item.count,
              oppositions: rgpdData.stats.oppositions[index]?.count ?? 0,
              suspensions: rgpdData.stats.suspensions[index]?.count ?? 0,
            })) ?? []
          }
          dataKeys={[
            { key: 'contests', label: 'Contestations (Art. 22)', color: '#f59e0b' },
            { key: 'oppositions', label: 'Oppositions (Art. 21)', color: '#06b6d4' },
            { key: 'suspensions', label: 'Suspensions (Art. 18)', color: '#6366f1' },
          ]}
          xAxisKey="date"
          type="line"
          isLoading={isLoadingRGPD}
          height={300}
        />
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gestion */}
        <Card>
          <CardHeader>
            <CardTitle>Gestion Plateforme</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/tenants" className="flex items-center gap-2 text-primary hover:underline">
                  <Building2 className="h-4 w-4" />
                  Gérer les tenants
                </Link>
              </li>
              <li>
                <Link href="/users" className="flex items-center gap-2 text-primary hover:underline">
                  <Users className="h-4 w-4" />
                  Gérer les utilisateurs
                </Link>
              </li>
              <li>
                <Link href="/audit/logs" className="flex items-center gap-2 text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  Logs système
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Conformité RGPD */}
        <Card>
          <CardHeader>
            <CardTitle>Conformité RGPD</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/audit" className="flex items-center gap-2 text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  Audit trail (événements)
                </Link>
              </li>
              <li>
                <Link href="/audit/violations" className="flex items-center gap-2 text-primary hover:underline">
                  <AlertCircle className="h-4 w-4" />
                  Registre des violations (Art. 33)
                </Link>
              </li>
              <li>
                <Link href="/audit/registry" className="flex items-center gap-2 text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  Registre des traitements (Art. 30)
                </Link>
              </li>
              <li>
                <Link href="/audit/dpia" className="flex items-center gap-2 text-primary hover:underline">
                  <CheckCircle className="h-4 w-4" />
                  DPIA Gateway LLM (Art. 35)
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section (if any critical alerts) */}
      {stats && (stats.incidents.unresolved > 0 || stats.tenants.suspended > 0) && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              Alertes requérant votre attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {stats.incidents.unresolved > 0 && (
                <li>
                  <Link
                    href="/audit/violations"
                    className="text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    ⚠️ {stats.incidents.unresolved} incident(s) de sécurité non résolu(s)
                  </Link>
                </li>
              )}
              {stats.tenants.suspended > 0 && (
                <li>
                  <Link
                    href="/tenants"
                    className="text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    ⚠️ {stats.tenants.suspended} tenant(s) suspendu(s)
                  </Link>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
