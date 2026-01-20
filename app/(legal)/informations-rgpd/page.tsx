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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg rounded-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">
              Vos Droits RGPD
            </h1>
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-blue-100 text-lg">
            Exercez facilement vos droits garantis par le RGPD (Règlement UE 2016/679)
          </p>
        </div>

        {/* Quick Actions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Accès</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Obtenez une copie de toutes vos données personnelles
            </p>
            <a
              href="#droit-acces"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              En savoir plus →
            </a>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Effacement</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Supprimez définitivement vos données (droit à l&apos;oubli)
            </p>
            <a
              href="#droit-effacement"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              En savoir plus →
            </a>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Opposition</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Opposez-vous à certains traitements de vos données
            </p>
            <a
              href="#droit-opposition"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              En savoir plus →
            </a>
          </div>
        </div>

        {/* Contenu markdown */}
        <div className="bg-white shadow-sm rounded-lg p-8 mb-8">
          <div
            id="rgpd-content"
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
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

        {/* Formulaire Contact DPO (Client Component) */}
        <div id="formulaire-dpo" className="bg-white shadow-sm rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            📝 Formulaire de Contact DPO
          </h2>
          <p className="text-gray-600 mb-6">
            Utilisez ce formulaire pour exercer vos droits RGPD ou poser une question à notre Délégué à la Protection des Données.
          </p>
          <DpoContactForm />
        </div>

        {/* Footer Actions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Documents connexes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/legal/privacy-policy"
              className="flex items-center p-3 bg-white rounded-md hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-800 font-medium">Politique de Confidentialité</span>
            </a>
            <a
              href="/legal/terms-of-service"
              className="flex items-center p-3 bg-white rounded-md hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-800 font-medium">CGU / CGV</span>
            </a>
          </div>
        </div>

        {/* Retour */}
        <div className="text-center">
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
