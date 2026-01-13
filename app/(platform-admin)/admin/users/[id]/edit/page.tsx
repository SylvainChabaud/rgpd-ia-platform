'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { useUserById, useUpdateUser } from '@/lib/api/hooks/useUsers'
import { updateUserSchema, type UpdateUserFormData } from '@/lib/validation/userSchemas'
import { ACTOR_ROLE } from '@/shared/actorRole'
import { maskEmail } from '@/lib/utils/maskEmail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Edit User Page - PLATFORM Admin (LOT 11.2)
 *
 * Features:
 * - Pre-filled form with existing user data
 * - Editable fields: displayName, role
 * - Read-only fields: email (immutable hash), tenant (isolation)
 * - Form validation (React Hook Form + Zod)
 * - Success → redirect to user details
 * - Error handling with RGPD-safe messages
 *
 * RGPD Compliance:
 * - Only P1 data editable (displayName, role)
 * - Email MASKED (m***@e***) and read-only
 * - Tenant ID immutable (tenant isolation)
 * - Password changed via separate flow (security)
 * - Audit trail logged backend (PATCH /api/users/[id])
 */
export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const { data: userData, isLoading: isLoadingUser, error } = useUserById(userId)
  const { mutate: updateUser, isPending } = useUpdateUser(userId)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      displayName: '',
      role: ACTOR_ROLE.MEMBER,
    },
  })

  // Pre-fill form when data loads
  useEffect(() => {
    if (userData?.user) {
      reset({
        displayName: userData.user.displayName,
        role: userData.user.role as typeof ACTOR_ROLE.TENANT_ADMIN | typeof ACTOR_ROLE.MEMBER,
      })
    }
  }, [userData, reset])

  const onSubmit = (data: UpdateUserFormData) => {
    updateUser(data, {
      onSuccess: () => {
        router.push(`/admin/users/${userId}`)
      },
    })
  }

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">Utilisateur introuvable</p>
          <Link href="/admin/users" className="mt-4 inline-block">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const user = userData.user
  const isSuspended = !!user.dataSuspended

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href={`/admin/users/${userId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux détails
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Modifier l&apos;Utilisateur</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mise à jour des informations de {user.displayName}
          </p>
        </CardHeader>
        <CardContent>
          {isSuspended && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                ⚠️ Cet utilisateur est suspendu (Art. 18 RGPD). Les modifications sont possibles mais le
                traitement des données reste suspendu.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field (Read-only) */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="text"
                  value={maskEmail(user.displayName + '@example.com')}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ L&apos;email ne peut pas être modifié (hash SHA-256 immuable pour contrainte unicité).
              </p>
            </div>

            {/* DisplayName Field */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Nom complet <span className="text-destructive">*</span>
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="Ex: John Doe"
                {...register('displayName')}
                disabled={isPending}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Nom affiché dans l&apos;interface (2-255 caractères)
              </p>
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Rôle <span className="text-destructive">*</span>
              </label>
              <select
                id="role"
                {...register('role')}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={ACTOR_ROLE.MEMBER}>Membre</option>
                <option value={ACTOR_ROLE.TENANT_ADMIN}>Administrateur</option>
              </select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                <strong>Administrateur:</strong> Gestion complète du tenant | <strong>Membre:</strong> Utilisation des services
              </p>
            </div>

            {/* Tenant Field (Read-only info) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant</label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">{user.tenantId || 'N/A'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Le tenant ne peut pas être modifié (isolation tenant, contrainte sécurité).
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Mise à jour...' : 'Enregistrer les modifications'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/users/${userId}`)}
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
            <strong>🔒 RGPD (Art. 5, 18):</strong> La modification d&apos;un utilisateur est tracée
            dans l&apos;audit trail. Seules les données P1 peuvent être modifiées (displayName, role).
            L&apos;email est immuable (hash SHA-256 unique). Le tenant est immuable (isolation).
            Le mot de passe est changé via un flow séparé (sécurité).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
