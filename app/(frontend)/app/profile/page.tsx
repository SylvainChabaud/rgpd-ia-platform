'use client'

import { useAuthStore } from '@/lib/auth/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Lock, Bell } from 'lucide-react'
import { USER_PROFILE_LABELS } from '@/lib/constants/ui/ui-labels'

/**
 * Frontend User Profile Page - Placeholder
 * LOT 13.0 - Authentification & Layout User
 *
 * Routes: /app/profile → User Profile
 *
 * RGPD Compliance:
 * - User-scoped, requires MEMBER scope
 * - Only P1 data (displayName) shown
 * - No email displayed (P2 - hashé côté backend)
 *
 * Full implementation in LOT 13.4 (My Data)
 * This placeholder shows the structure for profile management.
 */
export default function ProfilePage() {
  const { user } = useAuthStore()

  const profileSections = [
    {
      icon: User,
      title: USER_PROFILE_LABELS.PERSONAL_INFO_TITLE,
      description: USER_PROFILE_LABELS.PERSONAL_INFO_DESC,
      status: USER_PROFILE_LABELS.STATUS_COMING,
    },
    {
      icon: Lock,
      title: USER_PROFILE_LABELS.SECURITY_TITLE,
      description: USER_PROFILE_LABELS.SECURITY_DESC,
      status: USER_PROFILE_LABELS.STATUS_COMING,
    },
    {
      icon: Bell,
      title: USER_PROFILE_LABELS.NOTIFICATIONS_TITLE,
      description: USER_PROFILE_LABELS.NOTIFICATIONS_DESC,
      status: USER_PROFILE_LABELS.STATUS_COMING,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{USER_PROFILE_LABELS.TITLE}</h1>
        <p className="text-muted-foreground">
          {USER_PROFILE_LABELS.SUBTITLE}
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle>{USER_PROFILE_LABELS.CURRENT_INFO_TITLE}</CardTitle>
          <CardDescription>
            {USER_PROFILE_LABELS.CURRENT_INFO_DESC}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {USER_PROFILE_LABELS.DISPLAY_NAME_LABEL}
              </dt>
              <dd className="text-lg">
                {user?.displayName || USER_PROFILE_LABELS.DISPLAY_NAME_FALLBACK}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {USER_PROFILE_LABELS.ROLE_LABEL}
              </dt>
              <dd className="text-lg">
                {user?.role || USER_PROFILE_LABELS.ROLE_FALLBACK}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {USER_PROFILE_LABELS.SCOPE_LABEL}
              </dt>
              <dd className="text-lg">
                {user?.scope || USER_PROFILE_LABELS.SCOPE_FALLBACK}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {USER_PROFILE_LABELS.EMAIL_NOTE}
          </p>
        </CardContent>
      </Card>

      {/* Placeholder Sections */}
      <div className="grid gap-4 md:grid-cols-3">
        {profileSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="opacity-60">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
                <p className="mt-2 text-xs text-muted-foreground">
                  Status : {section.status}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
