'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/authStore'
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
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis').min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * Shared Login Page - Scope-based Redirection
 *
 * This is the unified login page that redirects users to their
 * appropriate interface based on their scope:
 * - PLATFORM → /admin (Super Admin)
 * - TENANT → /portal (Tenant Admin)
 * - MEMBER → /app (End User)
 *
 * Security:
 * - JWT token stored in sessionStorage (auto-cleared on browser close)
 * - No credentials stored in state or localStorage
 * - Scope-based routing enforced
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

  /**
   * Get redirect path based on user scope
   */
  const getRedirectPath = (scope: string): string => {
    switch (scope) {
      case ACTOR_SCOPE.PLATFORM:
        return '/admin'
      case ACTOR_SCOPE.TENANT:
        return '/portal'
      default:
        return '/app'
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Display the server error message (RGPD-safe - server controls content)
        toast.error(errorData.message || 'Email ou mot de passe incorrect')
        return
      }

      const result = (await response.json()) as LoginResponse

      // Store JWT and user info
      login(result.token, result.user)

      // Redirect based on scope
      const redirectPath = getRedirectPath(result.user.scope)
      router.push(redirectPath)
    } catch {
      // RGPD-safe error message (no error logging)
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à la plateforme RGPD-IA
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
                placeholder="votre@email.com"
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
              {isSubmitting ? 'Connexion en cours...' : 'Connexion'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
