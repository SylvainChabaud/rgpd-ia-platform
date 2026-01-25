/**
 * Page: Conditions Générales d'Utilisation (CGU/CGV) - Dynamic
 *
 * RGPD: Art. 7 (Consentement), Art. 13-14 (Information)
 * Classification: Public (P0 - accessible sans authentification)
 *
 * LOT 10.1 & 13.0 — CGU/CGV with acceptance workflow
 * - Dynamic page (checks auth and acceptance status)
 * - Accessible publicly via footer + /cgu
 * - Markdown content from file (single source of truth)
 * - Acceptance workflow for authenticated users
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import { cookies } from 'next/headers';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { BackButton } from '../_components/BackButton';
import { LegalContentRenderer } from '@/components/legal/LegalContentRenderer';
import { CguAcceptanceSection } from './CguAcceptanceSection';
import { verifyAccessToken } from '@/infrastructure/auth/tokens';
import { PgCguRepo } from '@/infrastructure/repositories/PgCguRepo';
import { AUTH_COOKIES } from '@/shared/auth/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conditions Générales d\'Utilisation (CGU) - Plateforme IA RGPD',
  description: 'Conditions générales d\'utilisation et de vente de notre plateforme d\'intelligence artificielle conforme RGPD',
};

export default async function CguPage() {
  // Load markdown content from file (single source of truth)
  const filePath = join(process.cwd(), 'docs', 'legal', 'cgu-cgv.md');
  const markdown = await readFile(filePath, 'utf-8');

  // Convert to HTML with marked and sanitize for XSS prevention
  const rawHtml = await marked(markdown);
  const html = sanitizeHtml(rawHtml);

  // Check authentication status
  let isAuthenticated = false;
  let hasAccepted = false;
  let cguVersionId: string | null = null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;

  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      if (payload && payload.userId && payload.tenantId) {
        isAuthenticated = true;

        // Check CGU acceptance status
        const cguRepo = new PgCguRepo();
        const activeVersion = await cguRepo.findActiveVersion();

        if (activeVersion) {
          cguVersionId = activeVersion.id;
          hasAccepted = await cguRepo.hasUserAcceptedActiveVersion(
            payload.tenantId,
            payload.userId
          );
        } else {
          // No active CGU version = no acceptance required
          hasAccepted = true;
        }
      }
    } catch {
      // Token invalid - treat as unauthenticated
      isAuthenticated = false;
    }
  }

  // Extract version info from markdown (for display)
  const versionMatch = markdown.match(/\*\*Version\*\*\s*:\s*(\d+\.\d+)/);
  const dateMatch = markdown.match(/\*\*Date d'entrée en vigueur\*\*\s*:\s*([^\n]+)/);
  const version = versionMatch?.[1] ?? '1.0';
  const date = dateMatch?.[1]?.trim() ?? '2026-01-05';

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Conditions Générales d&apos;Utilisation</h1>
              <p className="text-slate-300 mt-1">
                Conditions régissant l&apos;utilisation de notre plateforme
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Version {version}</span>
            <span>•</span>
            <span>Mise à jour : {date}</span>
            <span>•</span>
            <span>RGPD Art. 7</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Main Content Card - First like other legal pages */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-10 px-6 lg:px-10">
            <LegalContentRenderer html={html} theme="slate" />
          </CardContent>
        </Card>

        {/* Acceptance Section (Alert + Actions) - Client Component */}
        <CguAcceptanceSection
          isAuthenticated={isAuthenticated}
          cguVersionId={cguVersionId}
          hasAccepted={hasAccepted}
        />
      </div>
    </div>
  );
}
