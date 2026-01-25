'use client';

/**
 * CGU Acceptance Section - Client Component
 *
 * RGPD: Art. 7 (Conditions for consent)
 *
 * Displays acceptance status and action button based on user authentication
 * and CGU acceptance state.
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle, Shield, FileText, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CguAcceptanceSectionProps {
  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean;
  /**
   * CGU version ID (null if no active version)
   */
  cguVersionId: string | null;
  /**
   * Whether user has accepted the active CGU version
   */
  hasAccepted: boolean;
}

export function CguAcceptanceSection({
  isAuthenticated,
  cguVersionId,
  hasAccepted,
}: CguAcceptanceSectionProps) {
  const searchParams = useSearchParams();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect path from query params
  const redirectPath = searchParams.get('redirect') ?? '/app';

  // If already accepted, show success and redirect options
  if (hasAccepted) {
    return (
      <>
        {/* Success Alert */}
        <Alert className="mb-6 border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>CGU acceptées :</strong> Vous avez accepté les présentes Conditions Générales d&apos;Utilisation.
          </AlertDescription>
        </Alert>

        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                Contacter le DPO
              </CardTitle>
              <CardDescription>
                Pour toute question relative aux CGU
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:dpo@votre-plateforme.fr">
                <Button className="w-full">
                  dpo@votre-plateforme.fr
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Shield className="h-5 w-5" />
                Protection des données
              </CardTitle>
              <CardDescription>
                Découvrez notre politique de confidentialité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/politique-confidentialite">
                <Button variant="outline" className="w-full">
                  Voir la politique
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Related Links */}
        <Card>
          <CardHeader>
            <CardTitle>Documents associés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/politique-confidentialite">
                <Button variant="link" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Politique de Confidentialité
                </Button>
              </Link>
              <Link href="/informations-rgpd">
                <Button variant="link" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Informations RGPD
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Not authenticated - public view with info alert
  if (!isAuthenticated) {
    return (
      <>
        {/* Info Alert */}
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            <strong>Acceptation obligatoire :</strong> L&apos;utilisation de la plateforme nécessite l&apos;acceptation préalable des présentes CGU conformément à l&apos;Art. 7 RGPD.
          </AlertDescription>
        </Alert>

        {/* Action Cards - Disabled Links */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                Contacter le DPO
              </CardTitle>
              <CardDescription>
                Pour toute question relative aux CGU
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:dpo@votre-plateforme.fr">
                <Button className="w-full">
                  dpo@votre-plateforme.fr
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="border-muted bg-muted/30 opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                Protection des données
              </CardTitle>
              <CardDescription>
                Connectez-vous pour accéder à ce contenu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Voir la politique
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Related Links - Disabled */}
        <Card>
          <CardHeader>
            <CardTitle>Documents associés</CardTitle>
            <CardDescription>
              Connectez-vous et acceptez les CGU pour accéder aux documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="link" className="gap-2" disabled>
                <Shield className="h-4 w-4" />
                Politique de Confidentialité
              </Button>
              <Button variant="link" className="gap-2" disabled>
                <FileText className="h-4 w-4" />
                Informations RGPD
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // Authenticated but not accepted - show acceptance form
  const handleAccept = async () => {
    if (!cguVersionId) {
      setError('Aucune version des CGU disponible');
      return;
    }

    if (!isChecked) {
      setError('Veuillez cocher la case pour accepter les CGU');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/legal/cgu/accept', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent and received
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cguVersionId,
          acceptanceMethod: 'checkbox',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Erreur lors de l\'acceptation des CGU');
      }

      // Force full page reload to ensure new cookie is used by middleware
      // Using window.location ensures the browser uses the newly set cookie
      window.location.href = redirectPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Warning Alert - Acceptance Required */}
      <Alert className="mb-6 border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700 dark:text-orange-400">
          <strong>Action requise :</strong> Vous devez accepter les CGU pour accéder à la plateforme. Veuillez lire les conditions ci-dessous puis cocher la case d&apos;acceptation.
        </AlertDescription>
      </Alert>

      {/* Acceptance Form */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Acceptation des CGU
          </CardTitle>
          <CardDescription>
            Conformément à l&apos;Art. 7 RGPD, votre acceptation explicite est requise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="accept-cgu"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              disabled={isSubmitting}
            />
            <label
              htmlFor="accept-cgu"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              J&apos;ai lu et j&apos;accepte les Conditions Générales d&apos;Utilisation
            </label>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleAccept}
            disabled={!isChecked || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Acceptation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accepter les CGU
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Action Cards - Disabled until acceptance */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Mail className="h-5 w-5" />
              Contacter le DPO
            </CardTitle>
            <CardDescription>
              Pour toute question relative aux CGU
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="mailto:dpo@votre-plateforme.fr">
              <Button className="w-full">
                dpo@votre-plateforme.fr
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="border-muted bg-muted/30 opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5" />
              Protection des données
            </CardTitle>
            <CardDescription>
              Acceptez les CGU pour accéder à ce contenu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Voir la politique
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Related Links - Disabled */}
      <Card>
        <CardHeader>
          <CardTitle>Documents associés</CardTitle>
          <CardDescription>
            Acceptez les CGU pour accéder aux documents associés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="link" className="gap-2" disabled>
              <Shield className="h-4 w-4" />
              Politique de Confidentialité
            </Button>
            <Button variant="link" className="gap-2" disabled>
              <FileText className="h-4 w-4" />
              Informations RGPD
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
