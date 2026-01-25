'use client'

import { useAuthStore } from '@/lib/auth/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, History, ShieldCheck, Database } from 'lucide-react'
import { USER_DASHBOARD_LABELS } from '@/lib/constants/ui/ui-labels'

/**
 * Frontend User Home - Dashboard Page
 * LOT 13.0 - Authentification & Layout User
 *
 * Routes: /app → Home User (Dashboard)
 *
 * RGPD Compliance:
 * - User-scoped, requires MEMBER scope
 * - Only P1 data (displayName) shown
 * - No email displayed (P2)
 *
 * This is a placeholder for the full dashboard (LOT 13.1-13.4).
 * Features will be added incrementally:
 * - LOT 13.1: AI Tools integration
 * - LOT 13.2: History page
 * - LOT 13.3: Consents management
 * - LOT 13.4: My Data (RGPD export/delete)
 */
export default function FrontendHomePage() {
  const { user } = useAuthStore()

  const pendingFeatures = [
    {
      icon: Sparkles,
      title: USER_DASHBOARD_LABELS.AI_TOOLS_TITLE,
      description: USER_DASHBOARD_LABELS.AI_TOOLS_DESC,
      lot: USER_DASHBOARD_LABELS.AI_TOOLS_LOT,
    },
    {
      icon: History,
      title: USER_DASHBOARD_LABELS.HISTORY_TITLE,
      description: USER_DASHBOARD_LABELS.HISTORY_DESC,
      lot: USER_DASHBOARD_LABELS.HISTORY_LOT,
    },
    {
      icon: ShieldCheck,
      title: USER_DASHBOARD_LABELS.CONSENTS_TITLE,
      description: USER_DASHBOARD_LABELS.CONSENTS_DESC,
      lot: USER_DASHBOARD_LABELS.CONSENTS_LOT,
    },
    {
      icon: Database,
      title: USER_DASHBOARD_LABELS.MY_DATA_TITLE,
      description: USER_DASHBOARD_LABELS.MY_DATA_DESC,
      lot: USER_DASHBOARD_LABELS.MY_DATA_LOT,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          {USER_DASHBOARD_LABELS.WELCOME_PREFIX}
          {user?.displayName ? `, ${user.displayName}` : ''}
          {` ${USER_DASHBOARD_LABELS.WELCOME_SUFFIX}`}
        </h1>
        <p className="text-muted-foreground">
          {USER_DASHBOARD_LABELS.SUBTITLE}
        </p>
      </div>

      {/* Placeholder Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {pendingFeatures.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.lot} className="opacity-60">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">{feature.lot}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
                <p className="mt-2 text-xs text-muted-foreground">
                  {USER_DASHBOARD_LABELS.FEATURE_COMING_SOON}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{USER_DASHBOARD_LABELS.ABOUT_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{USER_DASHBOARD_LABELS.ABOUT_INTRO}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{USER_DASHBOARD_LABELS.ABOUT_ITEM_1}</li>
            <li>{USER_DASHBOARD_LABELS.ABOUT_ITEM_2}</li>
            <li>{USER_DASHBOARD_LABELS.ABOUT_ITEM_3}</li>
            <li>{USER_DASHBOARD_LABELS.ABOUT_ITEM_4}</li>
          </ul>
          <p className="mt-2">{USER_DASHBOARD_LABELS.ABOUT_FOOTER}</p>
        </CardContent>
      </Card>
    </div>
  )
}
