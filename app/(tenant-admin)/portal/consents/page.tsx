'use client'

// =========================
// Constants
// =========================

const CONSENT_STATUS = {
  GRANTED: 'granted',
  REVOKED: 'revoked',
} as const;

import Link from 'next/link'
import { usePurposes, useConsentMatrix } from '@/lib/api/hooks/useConsents'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  ShieldCheck,
  Grid3X3,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'

/**
 * Consents Management Hub - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - Overview of consent statistics
 * - Quick navigation to:
 *   - Purposes configuration
 *   - Consent matrix
 * - Summary cards with key metrics
 *
 * RGPD Compliance:
 * - Tenant isolation enforced (API backend)
 * - Only P1 metadata displayed
 */
export default function ConsentsPage() {
  const { data: purposesData, isLoading: purposesLoading } = usePurposes(true)
  const { data: matrixData, isLoading: matrixLoading } = useConsentMatrix({ limit: 1000 })

  const purposes = purposesData?.purposes || []
  const matrix = matrixData?.matrix || []

  // Calculate statistics
  const activePurposes = purposes.filter(p => p.isActive).length
  const requiredPurposes = purposes.filter(p => p.isRequired).length

  // Count consent statuses across all users
  let grantedCount = 0
  let revokedCount = 0
  let pendingCount = 0

  for (const row of matrix) {
    for (const consent of row.consents) {
      if (consent.status === CONSENT_STATUS.GRANTED) grantedCount++
      else if (consent.status === CONSENT_STATUS.REVOKED) revokedCount++
      else pendingCount++
    }
  }

  const totalConsents = grantedCount + revokedCount + pendingCount
  const grantedPercent = totalConsents > 0 ? Math.round((grantedCount / totalConsents) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8" />
            Gestion des Consentements
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuration et suivi des consentements RGPD
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Purposes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalités configurées</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {purposesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{purposes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activePurposes} actives, {requiredPurposes} obligatoires
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Granted Consents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consentements accordés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {matrixLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{grantedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {grantedPercent}% du total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revoked Consents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consentements révoqués</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {matrixLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{revokedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {totalConsents > 0 ? Math.round((revokedCount / totalConsents) * 100) : 0}% du total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Consents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {matrixLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">
                  {totalConsents > 0 ? Math.round((pendingCount / totalConsents) * 100) : 0}% du total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Purposes Configuration */}
        <Link href="/portal/consents/purposes">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Finalités de traitement</CardTitle>
                    <CardDescription>
                      Configurer les finalités IA disponibles
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Créer et gérer les finalités de traitement</li>
                <li>• Définir les consentements obligatoires/optionnels</li>
                <li>• Activer/désactiver des finalités</li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        {/* Consent Matrix */}
        <Link href="/portal/consents/matrix">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Grid3X3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Matrice des consentements</CardTitle>
                    <CardDescription>
                      Vue d&apos;ensemble utilisateurs × finalités
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visualiser l&apos;état des consentements</li>
                <li>• Filtrer par utilisateur ou par finalité</li>
                <li>• Exporter en CSV (RGPD-safe)</li>
                <li>• Accéder à l&apos;historique par utilisateur</li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Conformité RGPD</CardTitle>
          <CardDescription>
            Bonnes pratiques pour la gestion des consentements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Consentement explicite</h4>
                <p className="text-sm text-muted-foreground">
                  Les utilisateurs doivent activement donner leur consentement (opt-in)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Révocation facile</h4>
                <p className="text-sm text-muted-foreground">
                  Le retrait du consentement doit être aussi simple que son octroi
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Traçabilité</h4>
                <p className="text-sm text-muted-foreground">
                  L&apos;historique des consentements est conservé pour l&apos;audit
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
