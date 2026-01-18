'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShieldOff,
  ArrowLeft,
  AlertCircle,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  useRgpdSuspensions,
  useRgpdSuspensionStats,
  useRgpdPurgeExpiredSuspensions,
} from '@/lib/api/hooks/useRgpdRequests';
import { RgpdNotice, RGPD_NOTICE_VARIANT } from '@/components/rgpd/RgpdNotice';

/**
 * RGPD Suspensions List Page - LOT 12.3
 *
 * Lists data processing suspensions (Art. 18 - Right to restriction) for tenant admin.
 *
 * RGPD Compliance:
 * - P1 data only (IDs, dates, status)
 * - Tenant isolation enforced (API backend)
 */

export default function RgpdSuspensionsPage() {
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const { data, isLoading, error } = useRgpdSuspensions();
  const { data: stats, isLoading: statsLoading } = useRgpdSuspensionStats();
  const purgeMutation = useRgpdPurgeExpiredSuspensions();

  const suspensions = data?.suspensions || [];

  const handlePurge = async () => {
    setPurgeMessage(null);
    try {
      const result = await purgeMutation.mutateAsync();
      setPurgeMessage(result.message);
    } catch {
      setPurgeMessage('Erreur lors de la purge. Veuillez réessayer.');
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateId = (id: string) => id.slice(0, 8) + '...';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des suspensions...</p>
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
                  Impossible de charger les suspensions.
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/rgpd">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldOff className="h-8 w-8 text-orange-500" />
            Suspensions de traitement
          </h1>
          <p className="text-muted-foreground mt-1">
            Art. 18 (Droit à la limitation) - {suspensions.length} suspension(s)
          </p>
        </div>
      </div>

      {/* RGPD Compliance Card */}
      <Card className={stats?.rgpdCompliant !== false ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conformité RGPD - Rétention des suspensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <>
                  {/* Compliance Badge */}
                  <div className="flex items-center gap-2">
                    {stats?.rgpdCompliant !== false ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conforme
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Non conforme
                      </Badge>
                    )}
                  </div>

                  {/* Stats Details */}
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Total suspensions :</span>{' '}
                      <span className="font-medium">{stats?.totalSuspensions ?? 0}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Actives :</span>{' '}
                      <span className="font-medium">{stats?.activeSuspensions ?? 0}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Levées :</span>{' '}
                      <span className="font-medium">{stats?.liftedSuspensions ?? 0}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Expirées (3 ans+) :</span>{' '}
                      <span className={`font-medium ${(stats?.expiredSuspensions ?? 0) > 0 ? 'text-orange-500' : ''}`}>
                        {stats?.expiredSuspensions ?? 0}
                      </span>
                    </p>
                    {stats?.oldestLiftedAge != null && stats.oldestLiftedAge > 0 && (
                      <p>
                        <span className="text-muted-foreground">Plus ancienne levée :</span>{' '}
                        <span className="font-medium">{stats.oldestLiftedAge} jour(s)</span>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Purge Button */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <Button
                variant={stats?.rgpdCompliant !== false ? 'outline' : 'destructive'}
                onClick={handlePurge}
                disabled={purgeMutation.isPending || (stats?.expiredSuspensions ?? 0) === 0}
              >
                {purgeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Purger les suspensions expirées
              </Button>
              {purgeMessage && (
                <p className={`text-sm ${purgeMutation.isSuccess ? 'text-green-600' : 'text-destructive'}`}>
                  {purgeMessage}
                </p>
              )}
            </div>
          </div>

          {/* Warning Message */}
          {stats?.warning && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-md">
              <p className="text-sm text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {stats.warning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des suspensions</CardTitle>
        </CardHeader>
        <CardContent>
          {suspensions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune suspension trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Levée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspensions.map((susp) => (
                  <TableRow key={susp.id}>
                    <TableCell className="font-medium">
                      {susp.userDisplayName || truncateId(susp.userId)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {susp.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={susp.status === 'ACTIVE' ? 'destructive' : 'default'}>
                        {susp.status === 'ACTIVE' ? 'Active' : 'Levée'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(susp.createdAt)}</TableCell>
                    <TableCell>{formatDate(susp.liftedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <RgpdNotice variant={RGPD_NOTICE_VARIANT.DATA_SUSPENSION} />
    </div>
  );
}
