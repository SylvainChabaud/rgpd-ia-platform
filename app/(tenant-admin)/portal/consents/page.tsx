'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ShieldCheck, ArrowLeft, Construction } from 'lucide-react'

/**
 * Consents Management Page - Placeholder
 * LOT 12.2 - To be implemented
 *
 * This page will include:
 * - Consent purposes configuration
 * - User consent matrix (users x purposes)
 * - Consent history tracking
 * - CSV export
 */
export default function ConsentsPage() {
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

      {/* Placeholder Card */}
      <Card className="max-w-2xl mx-auto mt-12">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Construction className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Fonctionnalité en cours de développement</CardTitle>
          <CardDescription className="text-base mt-2">
            La gestion des consentements sera disponible dans le LOT 12.2
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Cette section permettra de :</p>
            <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-1">
              <li>Configurer les finalités de traitement (purposes)</li>
              <li>Visualiser la matrice des consentements (utilisateurs × finalités)</li>
              <li>Suivre l&apos;historique des consentements par utilisateur</li>
              <li>Exporter les données de consentement (CSV)</li>
            </ul>
          </div>
          <div className="pt-4">
            <Link href="/portal/users">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voir la gestion des utilisateurs
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
