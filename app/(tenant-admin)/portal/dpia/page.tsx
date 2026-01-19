'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileCheck,
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { DpiaStatusBadge, RiskLevelBadge } from '@/components/ui/rgpd-badges';
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard';
import { useDpiaList, downloadDpiaPdf } from '@/lib/api/hooks/useDpia';
import { useAuthStore } from '@/lib/auth/authStore';
import { toast } from 'sonner';
import { DPIA_STATUS } from '@/lib/constants/dpia';
import { TOAST_MESSAGES, LOADING_MESSAGES, ERROR_STATES, EMPTY_STATES, FALLBACK_TEXT } from '@/lib/constants/ui/messages';
import { PORTAL_ROUTES } from '@/lib/constants/routes';
import { DEFAULT_LOCALE } from '@/shared/locale';

/**
 * DPIA List Page - LOT 12.4
 *
 * RGPD Compliance:
 * - Art. 35: DPIA management
 * - Art. 38.3: DPO access required
 * - P1 aggregated data only
 * - Tenant isolation enforced (API backend)
 */
export default function DpiaListPage() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const { data, isLoading, error } = useDpiaList();

  const handleExportPdf = async (dpiaId: string) => {
    if (!tenantId) return;
    try {
      await downloadDpiaPdf(tenantId, dpiaId);
      toast.success(TOAST_MESSAGES.PDF_DOWNLOAD_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.PDF_DOWNLOAD_ERROR);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">{LOADING_MESSAGES.DPIA_LIST}</p>
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
                <h3 className="font-semibold text-lg">{ERROR_STATES.LOADING_ERROR.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {ERROR_STATES.LOADING_ERROR.dpia}
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                {ERROR_STATES.RETRY_BUTTON}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dpias = data?.dpias || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href={PORTAL_ROUTES.DASHBOARD}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileCheck className="h-8 w-8" />
            Analyses d&apos;Impact (DPIA)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des analyses d&apos;impact sur la protection des donnees
          </p>
        </div>
      </div>

      {/* RGPD Compliance Card */}
      <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.DPIA} />

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">DPIA créées</p>
          </CardContent>
        </Card>

        {/* Pending KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">À valider</p>
          </CardContent>
        </Card>

        {/* Approved KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Approuvées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
            <p className="text-xs text-muted-foreground">Validées</p>
          </CardContent>
        </Card>

        {/* Rejected KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejetées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">À réviser</p>
          </CardContent>
        </Card>
      </div>

      {/* DPIA List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des DPIA</CardTitle>
          <CardDescription>
            Analyses d&apos;impact pour les traitements à risque élevé
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dpias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{EMPTY_STATES.DPIA_LIST.title}</p>
              <p className="text-sm mt-2">
                {EMPTY_STATES.DPIA_LIST.description}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Finalité</TableHead>
                  <TableHead>Risque</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dpias.map((dpia) => (
                  <TableRow key={dpia.id}>
                    <TableCell className="font-medium">{dpia.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {dpia.purposeLabel || FALLBACK_TEXT.NOT_AVAILABLE}
                        {dpia.purposeIsActive === false && (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RiskLevelBadge level={dpia.overallRiskLevel} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DpiaStatusBadge status={dpia.status} />
                        {dpia.revisionRequestedAt && dpia.status === DPIA_STATUS.PENDING && (
                          <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Révision
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(dpia.createdAt).toLocaleDateString(DEFAULT_LOCALE)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={PORTAL_ROUTES.DPIA_DETAIL(dpia.id)}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </Link>
                        {dpia.status === DPIA_STATUS.APPROVED && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPdf(dpia.id)}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Risk Level Summary */}
      {stats && (stats.byRiskLevel.high > 0 || stats.byRiskLevel.critical > 0) && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alertes risques élevés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-2xl font-bold text-orange-600">{stats.byRiskLevel.high}</span>
                <span className="text-sm text-muted-foreground ml-2">risque élevé</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-600">{stats.byRiskLevel.critical}</span>
                <span className="text-sm text-muted-foreground ml-2">risque critique</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Ces DPIA nécessitent une attention particulière conformément à l&apos;Art. 35 RGPD.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
