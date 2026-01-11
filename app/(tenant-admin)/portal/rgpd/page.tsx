'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { FileText, ArrowLeft, Construction } from 'lucide-react'

/**
 * RGPD Requests Management Page - Placeholder
 * LOT 12.3 - To be implemented
 *
 * This page will include:
 * - Data export requests (Art. 20 - Portability)
 * - Data deletion requests (Art. 17 - Right to erasure)
 * - Request status tracking
 * - Request history
 */
export default function RgpdPage() {
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
            <FileText className="h-8 w-8" />
            Demandes RGPD
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des demandes d&apos;export et d&apos;effacement
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
            La gestion des demandes RGPD sera disponible dans le LOT 12.3
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Cette section permettra de :</p>
            <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-1">
              <li>Traiter les demandes d&apos;export de données (Art. 20 - Portabilité)</li>
              <li>Traiter les demandes d&apos;effacement (Art. 17 - Droit à l&apos;oubli)</li>
              <li>Suivre le statut des demandes en cours</li>
              <li>Consulter l&apos;historique des demandes traitées</li>
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
