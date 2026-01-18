'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useCreateTenant } from '@/lib/api/hooks/useTenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RgpdNotice, RGPD_NOTICE_VARIANT } from '@/components/rgpd/RgpdNotice'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Tenant Creation Form Validation Schema
 *
 * RGPD: Only P1 metadata (name, slug)
 */
const createTenantSchema = z.object({
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

type CreateTenantFormData = z.infer<typeof createTenantSchema>

/**
 * Create Tenant Page - PLATFORM Admin
 *
 * Features:
 * - Form with validation (React Hook Form + Zod)
 * - Real-time slug validation
 * - Success → redirect to tenants list
 * - Error handling with RGPD-safe messages
 *
 * RGPD Compliance:
 * - Only P1 data (name, slug)
 * - No sensitive data in form
 * - Audit trail logged backend (POST /api/tenants)
 */
export default function CreateTenantPage() {
  const router = useRouter()
  const { mutate: createTenant, isPending } = useCreateTenant()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  // Auto-generate slug from name (optional UX enhancement)
  // eslint-disable-next-line react-hooks/incompatible-library
  const nameValue = watch('name')

  const handleGenerateSlug = () => {
    const slug = nameValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Update slug field
    const form = document.querySelector('input[name="slug"]') as HTMLInputElement
    if (form) {
      form.value = slug
      form.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  const onSubmit = (data: CreateTenantFormData) => {
    createTenant(data, {
      onSuccess: () => {
        router.push('/admin/tenants')
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouveau Tenant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Un tenant représente un client (entreprise) utilisant la plateforme.
          </p>
        </CardHeader>
        <CardContent>
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
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Nom complet de l&apos;entreprise (affiché dans l&apos;interface)
              </p>
            </div>

            {/* Slug Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="slug" className="text-sm font-medium">
                  Slug <span className="text-destructive">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSlug}
                  disabled={!nameValue || isPending}
                >
                  Générer depuis le nom
                </Button>
              </div>
              <Input
                id="slug"
                type="text"
                placeholder="Ex: acme-corporation"
                {...register('slug')}
                disabled={isPending}
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Identifiant unique (a-z, 0-9, -). Utilisé dans les URLs et l&apos;API.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Création en cours...' : 'Créer le Tenant'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <RgpdNotice variant={RGPD_NOTICE_VARIANT.TENANT_CREATE} />
    </div>
  )
}
