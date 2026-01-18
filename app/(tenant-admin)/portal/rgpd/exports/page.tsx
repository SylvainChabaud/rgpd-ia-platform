'use client';

import { useState, useMemo } from 'react';
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
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  useRgpdExports,
  useRgpdExportStats,
  useRgpdPurgeExpiredExports,
} from '@/lib/api/hooks/useRgpdRequests';
import type { RgpdRequestParams, RgpdRequestStatus } from '@/types/api';
import { RgpdNotice, RGPD_NOTICE_VARIANT } from '@/components/rgpd/RgpdNotice';

/**
 * RGPD Exports List Page - LOT 12.3
 *
 * Lists export requests (Art. 15, 20) for tenant admin.
 *
 * RGPD Compliance:
 * - P1 data only (IDs, dates, status - NO email)
 * - Tenant isolation enforced (API backend)
 * - Admin CANNOT download user exports (security)
 * - Art. 5.1.e: Storage limitation monitoring & purge
 */

const STATUS_LABELS: Record<RgpdRequestStatus, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const STATUS_VARIANTS: Record<RgpdRequestStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export default function RgpdExportsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<RgpdRequestStatus | ''>('');
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const limit = 50;

  const queryParams = useMemo<RgpdRequestParams>(() => ({
    limit,
    offset: page * limit,
    status: statusFilter || undefined,
  }), [page, statusFilter]);

  const { data, isLoading, error } = useRgpdExports(queryParams);
  const { data: stats, isLoading: statsLoading } = useRgpdExportStats();
  const purgeMutation = useRgpdPurgeExpiredExports();

  const exports = data?.exports || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages - 1;
  const hasPreviousPage = page > 0;

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

  const handlePurge = async () => {
    setPurgeMessage(null);
    try {
      const result = await purgeMutation.mutateAsync();
      setPurgeMessage(result.message);
    } catch {
      setPurgeMessage('Erreur lors de la purge. Veuillez réessayer.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des demandes d&apos;export...</p>
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
                  Impossible de charger les demandes d&apos;export.
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
            <Download className="h-8 w-8 text-blue-500" />
            Demandes d&apos;export
          </h1>
          <p className="text-muted-foreground mt-1">
            Art. 15 (Droit d&apos;accès) & Art. 20 (Portabilité) - {total} demande(s)
          </p>
        </div>
      </div>

      {/* RGPD Compliance Card */}
      <Card className={stats?.rgpdCompliant ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conformité RGPD - Rétention des exports
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
                    {stats?.rgpdCompliant ? (
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
                      <span className="text-muted-foreground">Total exports :</span>{' '}
                      <span className="font-medium">{stats?.totalExports ?? 0}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Expirés ({stats?.retentionDays ?? 7}j+) :</span>{' '}
                      <span className={`font-medium ${(stats?.expiredExports ?? 0) > 0 ? 'text-orange-500' : ''}`}>
                        {stats?.expiredExports ?? 0}
                      </span>
                    </p>
                    {stats?.oldestExportAge !== null && (
                      <p>
                        <span className="text-muted-foreground">Plus ancien :</span>{' '}
                        <span className="font-medium">{stats?.oldestExportAge} jour(s)</span>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Purge Button */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <Button
                variant={stats?.rgpdCompliant ? 'outline' : 'destructive'}
                onClick={handlePurge}
                disabled={purgeMutation.isPending || (stats?.expiredExports ?? 0) === 0}
              >
                {purgeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Purger les exports expirés
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as RgpdRequestStatus | '');
                  setPage(0);
                }}
                className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="COMPLETED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setPage(0);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes</CardTitle>
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune demande d&apos;export trouvée</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Complété le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">
                        {exp.userDisplayName || truncateId(exp.userId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[exp.status as RgpdRequestStatus]}>
                          {STATUS_LABELS[exp.status as RgpdRequestStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(exp.createdAt)}</TableCell>
                      <TableCell>{formatDate(exp.completedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPreviousPage}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} sur {totalPages || 1}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                >
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <RgpdNotice variant={RGPD_NOTICE_VARIANT.DATA_EXPORT} />
    </div>
  );
}
