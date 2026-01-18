'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  FileText,
  ArrowLeft,
  Download,
  Trash2,
  ShieldOff,
  Ban,
  Scale,
  FileDown,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useRgpdStats, downloadRgpdCsv } from '@/lib/api/hooks/useRgpdRequests';
import { useAuthStore } from '@/lib/auth/authStore';
import { toast } from 'sonner';

/**
 * RGPD Requests Management Hub - LOT 12.3
 *
 * Central hub for all RGPD rights management:
 * - Export requests (Art. 15, 20 - Right of access & Portability)
 * - Deletion requests (Art. 17 - Right to erasure)
 * - Suspensions (Art. 18 - Right to restriction)
 * - Oppositions (Art. 21 - Right to object)
 * - Contests (Art. 22 - Automated decision-making)
 *
 * RGPD Compliance:
 * - P1 aggregated data only (counts)
 * - Tenant isolation enforced (API backend)
 */
export default function RgpdHubPage() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const { data: statsData, isLoading, error } = useRgpdStats();

  const handleCsvDownload = async () => {
    if (!tenantId) return;
    try {
      await downloadRgpdCsv(tenantId);
      toast.success('Export CSV en cours de téléchargement');
    } catch {
      toast.error('Erreur lors du téléchargement du CSV');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des statistiques RGPD...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Erreur de chargement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Impossible de charger les statistiques RGPD.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Gestion RGPD
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivi des demandes d&apos;exercice des droits RGPD
            </p>
          </div>
        </div>
        <Button onClick={handleCsvDownload} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Exports KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-500" />
              Exports
            </CardTitle>
            <CardDescription>Art. 15 & 20</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats?.exports.pending || 0}</span>
              <span className="text-sm text-muted-foreground">en attente</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.exports.completed || 0} complété(s)
            </p>
          </CardContent>
        </Card>

        {/* Deletions KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              Effacements
            </CardTitle>
            <CardDescription>Art. 17</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats?.deletions.pending || 0}</span>
              <span className="text-sm text-muted-foreground">en attente</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.deletions.completed || 0} complété(s)
            </p>
          </CardContent>
        </Card>

        {/* Suspensions KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldOff className="h-4 w-4 text-orange-500" />
              Suspensions
            </CardTitle>
            <CardDescription>Art. 18</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats?.suspensions.active || 0}</span>
              <span className="text-sm text-muted-foreground">active(s)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.suspensions.total || 0} total
            </p>
          </CardContent>
        </Card>

        {/* Oppositions KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-yellow-500" />
              Oppositions
            </CardTitle>
            <CardDescription>Art. 21</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats?.oppositions.pending || 0}</span>
              <span className="text-sm text-muted-foreground">en attente</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.oppositions.reviewed || 0} traitée(s)
            </p>
          </CardContent>
        </Card>

        {/* Contests KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-purple-500" />
              Contestations
            </CardTitle>
            <CardDescription>Art. 22</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats?.contests.pending || 0}</span>
              <span className="text-sm text-muted-foreground">en attente</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.contests.resolved || 0} résolue(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Exports Card */}
        <Link href="/portal/rgpd/exports">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                Demandes d&apos;export
              </CardTitle>
              <CardDescription>
                Art. 15 (Droit d&apos;accès) & Art. 20 (Portabilité)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consultez les demandes d&apos;export de données de vos utilisateurs.
                Les exports sont chiffrés et disponibles 7 jours.
              </p>
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="text-sm font-medium">Voir les demandes</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Deletions Card */}
        <Link href="/portal/rgpd/deletions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Demandes d&apos;effacement
              </CardTitle>
              <CardDescription>
                Art. 17 (Droit à l&apos;oubli)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Suivez les demandes de suppression de données. Les données sont
                d&apos;abord marquées puis purgées après 30 jours.
              </p>
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="text-sm font-medium">Voir les demandes</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Suspensions Card */}
        <Link href="/portal/rgpd/suspensions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-orange-500" />
                Suspensions de traitement
              </CardTitle>
              <CardDescription>
                Art. 18 (Droit à la limitation)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gérez les demandes de limitation du traitement des données.
                Les données suspendues ne sont plus traitées par l&apos;IA.
              </p>
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="text-sm font-medium">Voir les suspensions</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Oppositions Card */}
        <Link href="/portal/rgpd/oppositions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-yellow-500" />
                Oppositions au traitement
              </CardTitle>
              <CardDescription>
                Art. 21 (Droit d&apos;opposition)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consultez et traitez les demandes d&apos;opposition à certains
                types de traitement de données.
              </p>
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="text-sm font-medium">Voir les oppositions</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Contests Card */}
        <Link href="/portal/rgpd/contests">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-purple-500" />
                Contestations IA
              </CardTitle>
              <CardDescription>
                Art. 22 (Décisions automatisées)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gérez les contestations des décisions prises par l&apos;IA.
                Les utilisateurs peuvent demander une révision humaine.
              </p>
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="text-sm font-medium">Voir les contestations</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
