'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Textarea fallback (shadcn component to be added)
const Textarea = 'textarea' as const
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api/apiClient'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Create Security Incident (Violation) Page
 * LOT 11.3 - EPIC 9.0 Integration
 *
 * RGPD: Art. 33.5 (Registre des violations)
 * Access: SUPER_ADMIN, DPO only
 */
export default function NewViolationPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    type: 'OTHER' as string,
    title: '',
    description: '',
    dataCategories: [] as string[],
    usersAffected: '',
    recordsAffected: '',
    riskLevel: 'UNKNOWN' as 'UNKNOWN' | 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await apiClient('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          severity: formData.severity,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          dataCategories: formData.dataCategories.length > 0 ? formData.dataCategories : undefined,
          usersAffected: formData.usersAffected ? parseInt(formData.usersAffected) : undefined,
          recordsAffected: formData.recordsAffected ? parseInt(formData.recordsAffected) : undefined,
          riskLevel: formData.riskLevel,
        }),
      })

      router.push('/audit/violations')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/audit/violations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold">Nouvelle Violation</h1>
            <p className="text-muted-foreground">
              Enregistrement manuel d&apos;un incident de sécurité (Art. 33.5 RGPD)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations de l&apos;incident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">Sévérité *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: typeof formData.severity) => setFormData({ ...formData, severity: value })}
                required
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type d&apos;incident *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNAUTHORIZED_ACCESS">Accès non autorisé</SelectItem>
                  <SelectItem value="CROSS_TENANT_ACCESS">Accès cross-tenant</SelectItem>
                  <SelectItem value="DATA_LEAK">Fuite de données</SelectItem>
                  <SelectItem value="PII_IN_LOGS">PII dans les logs</SelectItem>
                  <SelectItem value="DATA_LOSS">Perte de données</SelectItem>
                  <SelectItem value="SERVICE_UNAVAILABLE">Service indisponible</SelectItem>
                  <SelectItem value="MALWARE">Malware</SelectItem>
                  <SelectItem value="VULNERABILITY_EXPLOITED">Vulnérabilité exploitée</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Bref résumé de l'incident"
                required
                maxLength={500}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description complète de l'incident, circonstances, actions prises..."
                required
                rows={6}
                maxLength={5000}
              />
            </div>

            {/* Users Affected */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="usersAffected">Utilisateurs affectés</Label>
                <Input
                  id="usersAffected"
                  type="number"
                  value={formData.usersAffected}
                  onChange={(e) => setFormData({ ...formData, usersAffected: e.target.value })}
                  placeholder="Nombre d'utilisateurs"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recordsAffected">Enregistrements affectés</Label>
                <Input
                  id="recordsAffected"
                  type="number"
                  value={formData.recordsAffected}
                  onChange={(e) => setFormData({ ...formData, recordsAffected: e.target.value })}
                  placeholder="Nombre d'enregistrements"
                  min="0"
                />
              </div>
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Niveau de risque RGPD</Label>
              <Select
                value={formData.riskLevel}
                onValueChange={(value: typeof formData.riskLevel) => setFormData({ ...formData, riskLevel: value })}
              >
                <SelectTrigger id="riskLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">Non évalué</SelectItem>
                  <SelectItem value="NONE">Aucun risque</SelectItem>
                  <SelectItem value="LOW">Risque faible</SelectItem>
                  <SelectItem value="MEDIUM">Risque moyen</SelectItem>
                  <SelectItem value="HIGH">Risque élevé</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Risque élevé → notification CNIL obligatoire (Art. 33)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/audit/violations">
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer la violation'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
