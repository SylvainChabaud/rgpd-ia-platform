'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ACTOR_ROLE } from '@/shared/actorRole'
import { useCreateTenantUser } from '@/lib/api/hooks/useTenantUsers'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { RgpdNotice, RGPD_NOTICE_VARIANT } from '@/components/rgpd/RgpdNotice'
import { z } from 'zod'

/**
 * Create User Form - TENANT Admin (LOT 12.1)
 *
 * Features:
 * - Create new user in current tenant
 * - Form fields: email, displayName, role, password
 * - Client-side validation with Zod
 * - Password visibility toggle
 * - Generate random password option
 *
 * RGPD Compliance:
 * - Email transmitted only to backend (hashed before storage)
 * - No email displayed after creation
 * - Audit event logged backend
 */

// Validation schema
const CreateUserFormSchema = z.object({
  email: z.string().email('Email invalide'),
  displayName: z.string().min(2, 'Nom trop court (min 2 caractères)').max(100, 'Nom trop long (max 100 caractères)'),
  role: z.enum([ACTOR_ROLE.TENANT_ADMIN, ACTOR_ROLE.MEMBER]),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
})

type FormData = z.infer<typeof CreateUserFormSchema>

export default function CreateUserPage() {
  const router = useRouter()
  const createUser = useCreateTenantUser()

  const [formData, setFormData] = useState<FormData>({
    email: '',
    displayName: '',
    role: ACTOR_ROLE.MEMBER,
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [showPassword, setShowPassword] = useState(false)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
    setShowPassword(true)
  }

  const validateForm = (): boolean => {
    try {
      CreateUserFormSchema.parse(formData)
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

    createUser.mutate(formData, {
      onSuccess: () => {
        router.push('/portal/users')
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
        <Link href="/portal/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Créer un Utilisateur</h1>
          <p className="text-muted-foreground">
            Ajouter un nouvel utilisateur à votre organisation
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Informations de l&apos;utilisateur
          </CardTitle>
          <CardDescription>
            Tous les champs sont obligatoires. L&apos;utilisateur recevra ses identifiants par email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe (min 8 caractères)"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Générer
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* API Error */}
            {createUser.error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{createUser.error.message || 'Une erreur est survenue'}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href="/portal/users">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Création...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer l&apos;utilisateur
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <RgpdNotice variant={RGPD_NOTICE_VARIANT.USER_CREATE} />
    </div>
  )
}
