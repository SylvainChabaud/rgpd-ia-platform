/**
 * Page: Conditions Générales d'Utilisation (CGU/CGV) - SSG
 *
 * RGPD: Art. 7 (Consentement), Art. 13-14 (Information)
 * Classification: Public (P0 - accessible sans authentification)
 *
 * LOT 10.1 — CGU/CGV
 * - Page statique générée (SSG - Static Site Generation)
 * - Accessible publiquement via footer + /cgu
 * - Contenu markdown converti en HTML avec marked
 * - Workflow acceptation via API /api/legal/cgu (POST)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import Link from 'next/link';

export const metadata = {
  title: 'Conditions Générales d\'Utilisation (CGU) - Plateforme IA RGPD',
  description: 'Conditions générales d\'utilisation et de vente de notre plateforme d\'intelligence artificielle conforme RGPD',
};

export default async function CguPage() {
  // Charger le contenu markdown depuis docs/legal/
  const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
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
              Conditions Générales d&apos;Utilisation (CGU)
            </h1>
            <span className="text-sm text-gray-500">
              Version 1.0 - 05/01/2026
            </span>
          </div>
          <p className="text-gray-600">
            Conditions régissant l&apos;utilisation de notre plateforme d&apos;intelligence artificielle
          </p>
        </div>

        {/* Alerte acceptation obligatoire */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Acceptation obligatoire :</strong> L&apos;utilisation de la plateforme nécessite l&apos;acceptation préalable des présentes CGU conformément à l&apos;Art. 7 RGPD.
              </p>
            </div>
          </div>
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

        {/* Footer Links */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Documents connexes
          </h3>
          <div className="flex flex-col gap-2">
            <a
              href="/legal/privacy-policy"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              → Politique de Confidentialité (RGPD)
            </a>
            <a
              href="/legal/rgpd-info"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              → Informations RGPD et exercice des droits
            </a>
            <a
              href="mailto:dpo@votre-plateforme.fr"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              → Contacter le DPO
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
