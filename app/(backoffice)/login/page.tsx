'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
import { apiClient } from '@/lib/api/apiClient'
import { ACTOR_SCOPE } from '@/shared/actorScope'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { toast } from 'sonner'
import type { LoginResponse } from '@/types/api'

/**
 * Login form validation schema
 *
 * RGPD: Email validation only, no storage of credentials
 */
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * Login Page - Super Admin Authentication
 *
 * Security:
 * - PLATFORM scope required (checked after login)
 * - JWT token stored in sessionStorage (auto-cleared on browser close)
 * - No credentials stored in state or localStorage
 *
 * RGPD Compliance:
 * - No email/password logged or stored
 * - Error messages RGPD-safe (no sensitive data exposed)
 * - Only P1 user data (id, displayName, scope) persisted
 */
export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Call login API
      const response = await apiClient<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      // Check PLATFORM scope
      if (response.user.scope !== ACTOR_SCOPE.PLATFORM) {
        toast.error('Accès réservé aux administrateurs PLATFORM')
        return
      }

      // Store JWT and user info
      login(response.token, response.user)

      // Redirect to dashboard
      router.push('/backoffice')
    } catch {
      // RGPD-safe error message (no error logging)
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion Super Admin</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder au Back Office plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
