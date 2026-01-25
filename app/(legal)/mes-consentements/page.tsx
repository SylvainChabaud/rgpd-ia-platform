/**
 * Page: Gestion des Consentements (SSG + Client Components)
 *
 * RGPD: Art. 7 (Consentement), ePrivacy Art. 5.3 (Cookies)
 * Classification: Public (P0 - accessible sans authentification)
 *
 * LOT 10.3 — Page Mes Consentements
 * - Page accessible publiquement via /mes-consentements
 * - Contenu markdown converti en HTML
 * - Bouton pour ouvrir le banner cookies
 * - Lien vers espace connecté pour gestion complète
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, LogIn, Shield, FileText, Cookie } from 'lucide-react';
import { BackButton } from '../_components/BackButton';
import { LegalContentRenderer } from '@/components/legal/LegalContentRenderer';
import { ManageCookiesButton } from './ManageCookiesButton';

export const metadata = {
  title: 'Gestion de Mes Consentements - Plateforme IA RGPD',
  description: 'Gérez vos consentements RGPD : cookies, CGU, traitements de données. Conformité Art. 7 RGPD et ePrivacy.',
};

export default async function MesConsentsPage() {
  // Charger le contenu markdown depuis docs/legal/
  const filePath = join(process.cwd(), 'docs', 'legal', 'mes-consentements.md');
  const markdown = await readFile(filePath, 'utf-8');

  // Convertir en HTML avec marked et sanitizer pour prévenir XSS
  const rawHtml = await marked(markdown);
  const html = sanitizeHtml(rawHtml);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <Settings className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Gestion de Mes Consentements</h1>
              <p className="text-purple-100 mt-1">
                Contrôlez vos préférences de confidentialité
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-purple-200">
            <span>Art. 7 RGPD</span>
            <span>•</span>
            <span>ePrivacy Art. 5.3</span>
            <span>•</span>
            <span>Retrait possible à tout moment</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Quick Actions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow border-purple-200 bg-purple-50/30 dark:bg-purple-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Cookie className="h-5 w-5" />
                Cookies
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de cookies (analytiques, marketing)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManageCookiesButton />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <LogIn className="h-5 w-5" />
                Espace Personnel
              </CardTitle>
              <CardDescription>
                Accédez à la gestion complète de vos consentements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-10 px-6 lg:px-10">
            <LegalContentRenderer html={html} theme="blue" />
          </CardContent>
        </Card>

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
              <Link href="/cgu">
                <Button variant="link" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Conditions Générales d&apos;Utilisation
                </Button>
              </Link>
              <Link href="/informations-rgpd">
                <Button variant="link" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Informations RGPD
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
