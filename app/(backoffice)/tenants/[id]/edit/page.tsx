'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useRouter } from 'next/navigation'
import { useTenantById, useUpdateTenant } from '@/lib/api/hooks/useTenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Tenant Edit Form Validation Schema
 *
 * RGPD: Only P1 metadata (name, slug)
 * Note: Slug cannot be changed (immutable identifier)
 */
const updateTenantSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(255, 'Le nom ne peut pas dépasser 255 caractères'),
  slug: z
    .string()
    .min(3, 'Le slug doit contenir au moins 3 caractères')
    .max(64, 'Le slug ne peut pas dépasser 64 caractères')
    .regex(
      /^[a-z0-9-]+$/,
      'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
    ),
})

type UpdateTenantFormData = z.infer<typeof updateTenantSchema>

/**
 * Edit Tenant Page - PLATFORM Admin
 *
 * Features:
 * - Pre-filled form with existing tenant data
 * - Name can be updated, slug is read-only (immutable)
 * - Form validation (React Hook Form + Zod)
 * - Success → redirect to tenant details
 * - Error handling with RGPD-safe messages
 *
 * RGPD Compliance:
 * - Only P1 data (name, slug)
 * - No sensitive data in form
 * - Audit trail logged backend (PATCH /api/tenants/[id])
 */
export default function EditTenantPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const { data: tenantData, isLoading: isLoadingTenant, error } = useTenantById(tenantId)
  const { mutate: updateTenant, isPending } = useUpdateTenant(tenantId)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateTenantFormData>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  // Pre-fill form when data loads
  useEffect(() => {
    if (tenantData?.tenant) {
      reset({
        name: tenantData.tenant.name,
        slug: tenantData.tenant.slug,
      })
    }
  }, [tenantData, reset])

  const onSubmit = (data: UpdateTenantFormData) => {
    updateTenant(
      { name: data.name }, // Only send name (slug is immutable)
      {
        onSuccess: () => {
          router.push(`/backoffice/tenants/${tenantId}`)
        },
      }
    )
  }

  if (isLoadingTenant) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !tenantData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Tenant introuvable</p>
          <Link href="/backoffice/tenants" className="mt-4 inline-block">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tenant = tenantData.tenant
  const isDeleted = !!tenant.deletedAt

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href={`/backoffice/tenants/${tenantId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux détails
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Modifier le Tenant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mise à jour des informations du tenant {tenant.name}
          </p>
        </CardHeader>
        <CardContent>
          {isDeleted && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Ce tenant est supprimé. Réactivez-le avant de pouvoir modifier ses informations.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nom du Tenant <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Acme Corporation"
                {...register('name')}
                disabled={isPending || isDeleted}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Nom complet de l&apos;entreprise (affiché dans l&apos;interface)
              </p>
            </div>

            {/* Slug Field (Read-only) */}
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="slug"
                type="text"
                {...register('slug')}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Le slug est un identifiant immuable et ne peut pas être modifié après création.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isPending || isDeleted}>
                {isPending ? 'Mise à jour...' : 'Enregistrer les modifications'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/backoffice/tenants/${tenantId}`)}
                disabled={isPending}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>🔒 RGPD:</strong> La modification d&apos;un tenant est tracée dans l&apos;audit
            trail. Seules les métadonnées P1 peuvent être modifiées (nom). Le slug est
            immuable pour préserver l&apos;intégrité des références.
          </p>
        </ CardContent>
      </Card>
    </div>
  )
}
