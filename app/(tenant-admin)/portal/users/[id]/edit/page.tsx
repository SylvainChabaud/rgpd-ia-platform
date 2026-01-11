'use client'

import { useState, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ACTOR_ROLE } from '@/shared/actorRole'
import { useUserDetail, useUpdateTenantUser } from '@/lib/api/hooks/useTenantUsers'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, AlertCircle, User } from 'lucide-react'
import { z } from 'zod'

/**
 * Edit User Form - TENANT Admin (LOT 12.1)
 *
 * Features:
 * - Edit displayName and role
 * - Client-side validation with Zod
 * - Load existing user data
 * - Redirect to detail page after save
 *
 * RGPD Compliance:
 * - Email NOT editable (P2 data)
 * - Only displayName and role modifiable
 * - Audit event logged backend
 */

interface EditUserPageProps {
  params: Promise<{ id: string }>
}

// Validation schema
const EditUserFormSchema = z.object({
  displayName: z.string().min(2, 'Nom trop court (min 2 caractères)').max(100, 'Nom trop long (max 100 caractères)'),
  role: z.enum([ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.MEMBER]),
})

type FormData = z.infer<typeof EditUserFormSchema>

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id: userId } = use(params)
  const router = useRouter()

  const { data: userData, isLoading, error } = useUserDetail(userId)
  const updateUser = useUpdateTenantUser(userId)

  // Show loading state while fetching user data
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Show error state if user not found
  if (error || !userData?.user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Utilisateur introuvable</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  L&apos;utilisateur demandé n&apos;existe pas ou vous n&apos;y avez pas accès.
                </p>
              </div>
              <Link href="/portal/users">
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

  // User data is loaded, render the form
  return (
    <EditUserForm
      userId={userId}
      user={userData.user}
      updateUser={updateUser}
      router={router}
    />
  )
}

/**
 * Edit User Form Component
 * Separated to ensure user data is available before initializing form state
 */
interface EditUserFormProps {
  userId: string
  user: {
    displayName: string
    role: string
  }
  updateUser: ReturnType<typeof useUpdateTenantUser>
  router: ReturnType<typeof useRouter>
}

function EditUserForm({ userId, user, updateUser, router }: EditUserFormProps) {
  // Initialize form with user data (guaranteed to be available)
  const [formData, setFormData] = useState<FormData>({
    displayName: user.displayName,
    role: user.role as typeof ACTOR_ROLE.TENANT_ADMIN | typeof ACTOR_ROLE.MEMBER,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  // Derive hasChanges from current form data vs original user data
  const hasChanges = useMemo(() => {
    return (
      formData.displayName !== user.displayName ||
      formData.role !== user.role
    )
  }, [formData, user])

  const validateForm = (): boolean => {
    try {
      EditUserFormSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof FormData, string>> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof FormData] = issue.message
          }
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    updateUser.mutate(formData, {
      onSuccess: () => {
        router.push(`/portal/users/${userId}`)
      },
    })
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href={`/portal/users/${userId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier l&apos;utilisateur</h1>
          <p className="text-muted-foreground">{user.displayName}</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations de l&apos;utilisateur
          </CardTitle>
          <CardDescription>
            Modifiez les informations de l&apos;utilisateur. L&apos;email ne peut pas être modifié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom complet</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Jean Dupont"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                className={errors.displayName ? 'border-destructive' : ''}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={ACTOR_ROLE.MEMBER}>Membre</option>
                <option value={ACTOR_ROLE.TENANT_ADMIN}>Administrateur</option>
              </select>
              <p className="text-sm text-muted-foreground">
                {formData.role === ACTOR_ROLE.TENANT_ADMIN
                  ? 'Accès complet à la gestion du tenant (utilisateurs, consentements, RGPD)'
                  : 'Accès aux fonctionnalités standards (utilisation IA, gestion de ses données)'
                }
              </p>
            </div>

            {/* API Error */}
            {updateUser.error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{updateUser.error.message || 'Une erreur est survenue'}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/portal/users/${userId}`}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={updateUser.isPending || !hasChanges}>
                {updateUser.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
