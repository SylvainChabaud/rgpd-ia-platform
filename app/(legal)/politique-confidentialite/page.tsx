/**
 * Page: Politique de Confidentialité (SSG)
 *
 * RGPD: Art. 13-14 (Information des personnes concernées)
 * Classification: Public (P0 - accessible sans authentification)
 *
 * LOT 10.0 — Politique de Confidentialité
 * - Page statique générée (SSG - Static Site Generation)
 * - Accessible publiquement via footer + /politique-confidentialite
 * - Contenu markdown converti en HTML avec marked
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail, FileText } from 'lucide-react';
import { BackButton } from '../_components/BackButton';
import { LegalContentRenderer } from '@/components/legal/LegalContentRenderer';

export const metadata = {
  title: 'Politique de Confidentialité - Plateforme IA RGPD',
  description: 'Découvrez comment nous protégeons vos données personnelles conformément au RGPD (Règlement UE 2016/679)',
};

export default async function PolitiqueConfidentialitePage() {
  // Charger le contenu markdown depuis docs/legal/
  const filePath = join(process.cwd(), 'docs', 'legal', 'politique-confidentialite.md');
  const markdown = await readFile(filePath, 'utf-8');

  // Convertir en HTML avec marked et sanitizer pour prévenir XSS
  const rawHtml = await marked(markdown);
  const html = sanitizeHtml(rawHtml);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
              <p className="text-blue-100 mt-1">
                Notre engagement pour la protection de vos données personnelles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-200">
            <span>Version 1.0</span>
            <span>•</span>
            <span>Mise à jour : 05/01/2026</span>
            <span>•</span>
            <span>RGPD Art. 13-14</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Main Content Card */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-10 px-6 lg:px-10">
            <LegalContentRenderer html={html} theme="blue" />
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                Contacter le DPO
              </CardTitle>
              <CardDescription>
                Pour toute question relative à vos données personnelles
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

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <FileText className="h-5 w-5" />
                Exercer vos droits RGPD
              </CardTitle>
              <CardDescription>
                Accès, rectification, effacement, portabilité...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/informations-rgpd">
                <Button variant="outline" className="w-full">
                  Voir mes droits
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
