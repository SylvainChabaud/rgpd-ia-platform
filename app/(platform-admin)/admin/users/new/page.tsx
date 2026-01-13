'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useCreateUser, useListTenants } from '@/lib/api/hooks/useUsers'
import { createUserSchema, type CreateUserFormData } from '@/lib/validation/userSchemas'
import { ACTOR_ROLE } from '@/shared/actorRole'

// =========================
// Constants
// =========================

const PLACEHOLDER_VALUE = '' as const;
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Eye, EyeOff, Key } from 'lucide-react'
import Link from 'next/link'

/**
 * Create User Page - PLATFORM Admin (LOT 11.2)
 *
 * Features:
 * - Form with validation (React Hook Form + Zod)
 * - Tenant dropdown (cross-tenant selection)
 * - Email validation (unique per tenant - backend check)
 * - Password strength validation + generator
 * - Role selection (TENANT_ADMIN/MEMBER)
 * - Success → redirect to users list
 * - Error handling with RGPD-safe messages
 *
 * RGPD Compliance:
 * - Email stored as SHA-256 hash backend
 * - Password never logged (P3 data)
 * - DisplayName only (P1 data)
 * - Audit trail logged backend (POST /api/tenants/:id/users)
 */
export default function CreateUserPage() {
  const router = useRouter()
  const { mutate: createUser, isPending } = useCreateUser()
  const { data: tenantsData, isLoading: tenantsLoading } = useListTenants({ limit: 100 })

  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<number>(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      displayName: '',
      tenantId: '',
      role: ACTOR_ROLE.MEMBER,
      password: '',
    },
  })

  const tenants = tenantsData?.tenants || []
  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch('password')

  // Calculate password strength (0-4)
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0

    let strength = 0
    if (password.length >= 12) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    return strength
  }

  // Update password strength on change
  if (passwordValue) {
    const strength = calculatePasswordStrength(passwordValue)
    if (strength !== passwordStrength) {
      setPasswordStrength(strength)
    }
  }

  // Generate secure password
  const handleGeneratePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const digits = '0123456789'
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?'
    const all = uppercase + lowercase + digits + special

    // Ensure at least one of each required character type
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += digits[Math.floor(Math.random() * digits.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill remaining characters (total 16 chars)
    for (let i = 0; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)]
    }

    // Shuffle password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')

    setValue('password', password)
    setPasswordStrength(5)
  }

  const onSubmit = (data: CreateUserFormData) => {
    createUser(data, {
      onSuccess: () => {
        router.push('/admin/users')
      },
    })
  }

  const getStrengthColor = (strength: number): string => {
    if (strength <= 1) return 'bg-destructive'
    if (strength <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = (strength: number): string => {
    if (strength === 0) return 'Aucun'
    if (strength <= 1) return 'Très faible'
    if (strength <= 3) return 'Moyen'
    if (strength === 4) return 'Fort'
    return 'Très fort'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouvel Utilisateur</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créer un utilisateur (admin ou membre) pour un tenant existant.
          </p>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">Chargement des tenants...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Tenant Dropdown */}
              <div className="space-y-2">
                <label htmlFor="tenantId" className="text-sm font-medium">
                  Tenant <span className="text-destructive">*</span>
                </label>
                <select
                  id="tenantId"
                  {...register('tenantId')}
                  disabled={isPending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value={PLACEHOLDER_VALUE}>Sélectionner un tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
                {errors.tenantId && (
                  <p className="text-sm text-destructive">{errors.tenantId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tenant auquel l&apos;utilisateur sera associé
                </p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: john.doe@example.com"
                  {...register('email')}
                  disabled={isPending}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  🔒 L&apos;email sera haché (SHA-256) avant stockage
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

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Mot de passe <span className="text-destructive">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    disabled={isPending}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Générer
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="12+ caractères, majuscule, chiffre, spécial"
                    {...register('password')}
                    disabled={isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}

                {/* Password Strength Indicator */}
                {passwordValue && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Force du mot de passe:</p>
                      <Badge
                        variant={passwordStrength >= 4 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {getStrengthLabel(passwordStrength)}
                      </Badge>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Requis: 12+ chars, majuscule, minuscule, chiffre, caractère spécial
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Création en cours...' : 'Créer l\'Utilisateur'}
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
          )}
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>🔒 RGPD (Art. 5, 25, 32):</strong> L&apos;email est stocké sous forme de
            hash SHA-256. Le mot de passe est haché avec bcrypt (12 rounds). Aucune donnée
            sensible n&apos;est loggée. La création est tracée dans l&apos;audit trail.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
