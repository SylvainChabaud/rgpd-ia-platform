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
 * - Audit event émis lors de la consultation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialité - Plateforme IA RGPD',
  description: 'Découvrez comment nous protégeons vos données personnelles conformément au RGPD (Règlement UE 2016/679)',
};

export default async function PolitiqueConfidentialitePage() {
  // Charger le contenu markdown depuis docs/legal/
  const filePath = join(process.cwd(), 'docs', 'legal', 'politique-confidentialite.md');
  const markdown = await readFile(filePath, 'utf-8');

  // Convertir en HTML avec marked
  const html = await marked(markdown);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Politique de Confidentialité
            </h1>
            <span className="text-sm text-gray-500">
              Version 1.0 - 05/01/2026
            </span>
          </div>
          <p className="text-gray-600">
            Notre engagement pour la protection de vos données personnelles conformément au RGPD
          </p>
        </div>

        {/* Contenu markdown */}
        <div className="bg-white shadow-sm rounded-lg p-8">
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:hover:text-blue-800
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-ul:list-disc prose-ul:ml-6
              prose-ol:list-decimal prose-ol:ml-6
              prose-li:text-gray-700
              prose-table:border-collapse prose-table:w-full
              prose-th:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2
              prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2
              prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Besoin d&apos;aide ?
          </h3>
          <p className="text-blue-800 mb-4">
            Pour toute question relative à la protection de vos données personnelles
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:dpo@votre-plateforme.fr"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Contacter le DPO
            </a>
            <a
              href="/legal/rgpd-info"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Exercer mes droits RGPD
            </a>
          </div>
        </div>

        {/* Retour */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
