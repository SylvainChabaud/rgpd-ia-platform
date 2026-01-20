'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePurpose, useUpdatePurpose } from '@/lib/api/hooks/useConsents'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { RgpdNotice, RGPD_NOTICE_VARIANT } from '@/components/rgpd/RgpdNotice'
import { ArrowLeft, ShieldCheck, Save, AlertCircle, Lock } from 'lucide-react'
import { RISK_LEVEL, type RiskLevel } from '@/lib/constants/rgpd'

/**
 * Edit Purpose Page - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - Form to edit an existing purpose
 * - Validation (label min 2 chars, description min 10 chars)
 * - Toggle required/optional
 * - Toggle active/inactive
 *
 * RGPD Compliance:
 * - Tenant isolation enforced (API backend)
 * - Audit event emitted on update
 */

interface EditPurposePageProps {
  params: Promise<{ id: string }>
}

/**
 * Inner form component that receives the purpose data
 * Uses controlled components initialized with data values
 */
function EditPurposeForm({ purpose, purposeId }: {
  purpose: { label: string; description: string; isRequired: boolean; isActive: boolean; riskLevel?: RiskLevel }
  purposeId: string
}) {
  // RGPD Art. 22.2.c / Art. 35: HIGH/CRITICAL risk purposes require mandatory consent
  const isRequiredLocked = purpose.riskLevel === RISK_LEVEL.HIGH || purpose.riskLevel === RISK_LEVEL.CRITICAL
  const router = useRouter()
  const updatePurpose = useUpdatePurpose(purposeId)

  const [label, setLabel] = useState(purpose.label)
  const [description, setDescription] = useState(purpose.description)
  const [isRequired, setIsRequired] = useState(purpose.isRequired)
  const [isActive, setIsActive] = useState(purpose.isActive)
  const [errors, setErrors] = useState<{ label?: string; description?: string }>({})

  const validate = (): boolean => {
    const newErrors: { label?: string; description?: string } = {}

    if (label.length < 2) {
      newErrors.label = 'Le nom doit contenir au moins 2 caractères'
    } else if (label.length > 100) {
      newErrors.label = 'Le nom ne peut pas dépasser 100 caractères'
    }

    if (description.length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères'
    } else if (description.length > 500) {
      newErrors.description = 'La description ne peut pas dépasser 500 caractères'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    updatePurpose.mutate(
      {
        label: label.trim(),
        description: description.trim(),
        isRequired,
        isActive,
      },
      {
        onSuccess: () => {
          router.push('/portal/consents/purposes')
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">Nom de la finalité *</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Résumé de documents"
          className={errors.label ? 'border-destructive' : ''}
        />
        {errors.label && (
          <p className="text-sm text-destructive">{errors.label}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {label.length}/100 caractères
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Génération automatique de résumés de documents (contrats, emails, rapports)"
          rows={4}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {description.length}/500 caractères
        </p>
      </div>

      {/* Is Required */}
      <div className={`flex items-center justify-between rounded-lg border p-4 ${isRequiredLocked ? 'bg-muted/50' : ''}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="isRequired" className="text-base">Consentement obligatoire</Label>
            {isRequiredLocked && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isRequiredLocked
              ? 'Obligatoire pour les finalités à risque élevé (RGPD Art. 22.2.c / Art. 35)'
              : 'Si activé, les utilisateurs devront accepter cette finalité pour utiliser la plateforme'}
          </p>
        </div>
        <Switch
          id="isRequired"
          checked={isRequired}
          onCheckedChange={setIsRequired}
          disabled={isRequiredLocked}
        />
      </div>

      {/* Is Active */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isActive" className="text-base">Finalité active</Label>
          <p className="text-sm text-muted-foreground">
            Si désactivé, cette finalité ne sera pas proposée aux utilisateurs
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={updatePurpose.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updatePurpose.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        <Link href="/portal/consents/purposes">
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  )
}

export default function EditPurposePage({ params }: EditPurposePageProps) {
  const { id: purposeId } = use(params)

  const { data, isLoading, error } = usePurpose(purposeId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    )
  }

  if (error || !data?.purpose) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Finalité introuvable</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  La finalité demandée n&apos;existe pas ou vous n&apos;y avez pas accès.
                </p>
              </div>
              <Link href="/portal/consents/purposes">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la liste
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/consents/purposes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8" />
            Modifier la finalité
          </h1>
          <p className="text-muted-foreground mt-1">
            Modifiez les informations de cette finalité de traitement
          </p>
        </div>
      </div>

      {/* RGPD Notice */}
      <RgpdNotice variant={RGPD_NOTICE_VARIANT.PURPOSE_EDIT} className="max-w-2xl" />

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations de la finalité</CardTitle>
          <CardDescription>
            Modifiez le nom et la description de cette finalité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditPurposeForm purpose={data.purpose} purposeId={purposeId} />
        </CardContent>
      </Card>
    </div>
  )
}
