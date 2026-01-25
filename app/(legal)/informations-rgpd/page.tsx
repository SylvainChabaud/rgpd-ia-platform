/**
 * Page: Informations RGPD et Exercice des Droits (SSG + Client Components)
 *
 * RGPD: Art. 12-22 (Droits des personnes concernées)
 * Classification: Public (P0 - accessible sans authentification)
 *
 * LOT 10.2 — Page Informations RGPD
 * - Page accessible publiquement via footer + /informations-rgpd
 * - Contenu markdown converti en HTML
 * - Formulaire contact DPO (Client Component)
 * - Liens vers actions RGPD (si authentifié)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import Link from 'next/link';
import DpoContactForm from './DpoContactForm';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Trash2, Ban, Download, Mail } from 'lucide-react';
import { BackButton } from '../_components/BackButton';
import { LegalContentRenderer } from '@/components/legal/LegalContentRenderer';

export const metadata = {
  title: 'Informations RGPD - Exercez vos Droits - Plateforme IA RGPD',
  description: 'Découvrez et exercez vos droits RGPD : accès, rectification, effacement, limitation, portabilité, opposition, révision humaine',
};

export default async function InformationsRgpdPage() {
  // Charger le contenu markdown depuis docs/legal/
  const filePath = join(process.cwd(), 'docs', 'legal', 'informations-rgpd.md');
  const markdown = await readFile(filePath, 'utf-8');

  // Convertir en HTML avec marked et sanitizer pour prévenir XSS
  const rawHtml = await marked(markdown);
  const html = sanitizeHtml(rawHtml);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Vos Droits RGPD</h1>
              <p className="text-green-100 mt-1">
                Exercez facilement vos droits garantis par le RGPD (Règlement UE 2016/679)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-green-200">
            <span>Art. 12-22 RGPD</span>
            <span>•</span>
            <span>Délai de réponse : 1 mois</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Quick Actions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Download className="h-5 w-5" />
                Droit d&apos;accès
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Obtenez une copie de toutes vos données personnelles
              </p>
              <a href="#formulaire-dpo" className="text-sm text-primary hover:underline">
                Faire une demande →
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-red-200 bg-red-50/30 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
                Droit à l&apos;effacement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Supprimez définitivement vos données (droit à l&apos;oubli)
              </p>
              <a href="#formulaire-dpo" className="text-sm text-primary hover:underline">
                Faire une demande →
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <Ban className="h-5 w-5" />
                Droit d&apos;opposition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Opposez-vous à certains traitements de vos données
              </p>
              <a href="#formulaire-dpo" className="text-sm text-primary hover:underline">
                Faire une demande →
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-10 px-6 lg:px-10">
            <LegalContentRenderer html={html} theme="green" />
          </CardContent>
        </Card>

        {/* Formulaire Contact DPO (Client Component) */}
        <Card className="mb-8" id="formulaire-dpo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Formulaire de Contact DPO
            </CardTitle>
            <CardDescription>
              Utilisez ce formulaire pour exercer vos droits RGPD ou poser une question à notre Délégué à la Protection des Données.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DpoContactForm />
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
