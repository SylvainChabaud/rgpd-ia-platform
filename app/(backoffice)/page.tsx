'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useGlobalStats } from '@/lib/api/hooks/useAudit'
import { Building2, Users, Activity } from 'lucide-react'

/**
 * Dashboard Landing Page - Super Admin Overview
 *
 * Features:
 * - Global platform statistics
 * - Quick stats cards (tenants, users, AI jobs)
 * - Links to main sections
 *
 * RGPD Compliance:
 * - Only P1 aggregated data (counts, no individual records)
 * - No sensitive user data displayed
 */
export default function DashboardPage() {
  const { data: stats, isLoading } = useGlobalStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Super Admin</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de la plateforme RGPD-IA
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants ?? 0}</div>
            <p className="text-xs text-muted-foreground">Clients actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Cross-tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs IA actifs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeJobs ?? 0}</div>
            <p className="text-xs text-muted-foreground">En cours d&apos;exécution</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Gestion</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <a href="/backoffice/tenants" className="text-primary hover:underline">
                    → Gérer les tenants
                  </a>
                </li>
                <li>
                  <a href="/backoffice/users" className="text-primary hover:underline">
                    → Gérer les utilisateurs
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Conformité RGPD</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <a href="/backoffice/audit" className="text-primary hover:underline">
                    → Audit trail
                  </a>
                </li>
                <li>
                  <a href="/backoffice/audit/violations" className="text-primary hover:underline">
                    → Registre des violations
                  </a>
                </li>
                <li>
                  <a href="/backoffice/audit/registre" className="text-primary hover:underline">
                    → Registre des traitements
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
