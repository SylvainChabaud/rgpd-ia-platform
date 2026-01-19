'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
  BookOpen,
  ArrowLeft,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Shield,
} from 'lucide-react';
import {
  DpiaStatusBadge,
  RiskLevelBadge,
  ActiveStatusBadge,
} from '@/components/ui/rgpd-badges';
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard';
import {
  useRegistre,
  downloadRegistreCsv,
  downloadRegistrePdf,
} from '@/lib/api/hooks/useRegistre';
import { useAuthStore } from '@/lib/auth/authStore';
import { toast } from 'sonner';
import { TOAST_MESSAGES, LOADING_MESSAGES, ERROR_STATES, EMPTY_STATES } from '@/lib/constants/ui/messages';
import { PORTAL_ROUTES } from '@/lib/constants/routes';
import { REGISTRE_LAWFUL_BASIS_LABELS, REGISTRE_CATEGORY_LABELS } from '@/lib/constants/registre';

/**
 * Registre Art. 30 Page - LOT 12.4
 *
 * RGPD Compliance:
 * - Art. 30: Registre des activites de traitement
 * - Art. 38.3: DPO access required
 * - P1 aggregated data only
 * - Tenant isolation enforced (API backend)
 */
export default function RegistrePage() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const { data, isLoading, error } = useRegistre();

  const handleExportCsv = async () => {
    if (!tenantId) return;
    try {
      await downloadRegistreCsv(tenantId);
      toast.success(TOAST_MESSAGES.CSV_DOWNLOAD_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.CSV_DOWNLOAD_ERROR);
    }
  };

  const handleExportPdf = async () => {
    if (!tenantId) return;
    try {
      await downloadRegistrePdf(tenantId);
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
          <p className="text-sm text-muted-foreground">{LOADING_MESSAGES.REGISTRE}</p>
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
                  {ERROR_STATES.LOADING_ERROR.registre}
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

  const entries = data?.entries || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={PORTAL_ROUTES.DASHBOARD}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              Registre des Traitements
            </h1>
            <p className="text-muted-foreground mt-1">
              Documentation des activites de traitement de donnees personnelles
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* RGPD Compliance Card */}
      <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.REGISTRE} />

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">traitements</p>
          </CardContent>
        </Card>

        {/* Active KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">en production</p>
          </CardContent>
        </Card>

        {/* Requires DPIA KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              DPIA requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.requiresDpia || 0}</div>
            <p className="text-xs text-muted-foreground">traitements</p>
          </CardContent>
        </Card>

        {/* DPIA Approved KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              DPIA approuvées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dpiaApproved || 0}</div>
            <p className="text-xs text-muted-foreground">validées</p>
          </CardContent>
        </Card>

        {/* DPIA Pending KPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              DPIA en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dpiaPending || 0}</div>
            <p className="text-xs text-muted-foreground">a valider</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics by Category */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatBar
                  label="Traitement IA"
                  value={stats.byCategory.ai_processing}
                  total={stats.total}
                  color="bg-blue-500"
                />
                <StatBar
                  label="Analyse données"
                  value={stats.byCategory.data_analysis}
                  total={stats.total}
                  color="bg-purple-500"
                />
                <StatBar
                  label="Marketing"
                  value={stats.byCategory.marketing}
                  total={stats.total}
                  color="bg-pink-500"
                />
                <StatBar
                  label="Sécurité"
                  value={stats.byCategory.security}
                  total={stats.total}
                  color="bg-green-500"
                />
                <StatBar
                  label="Autre"
                  value={stats.byCategory.other}
                  total={stats.total}
                  color="bg-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par base légale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatBar
                  label="Consentement"
                  value={stats.byLawfulBasis.consent}
                  total={stats.total}
                  color="bg-blue-500"
                />
                <StatBar
                  label="Contrat"
                  value={stats.byLawfulBasis.contract}
                  total={stats.total}
                  color="bg-green-500"
                />
                <StatBar
                  label="Intérêt légitime"
                  value={stats.byLawfulBasis.legitimate_interest}
                  total={stats.total}
                  color="bg-orange-500"
                />
                <StatBar
                  label="Obligation légale"
                  value={stats.byLawfulBasis.legal_obligation}
                  total={stats.total}
                  color="bg-purple-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registre Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des traitements</CardTitle>
          <CardDescription>
            Documentation conforme a l&apos;article 30 du RGPD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{EMPTY_STATES.REGISTRE.title}</p>
              <p className="text-sm mt-2">
                {EMPTY_STATES.REGISTRE.description}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finalité</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Base légale</TableHead>
                    <TableHead>Données</TableHead>
                    <TableHead>Risque</TableHead>
                    <TableHead>DPIA</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.purposeName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {entry.purposeDescription}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {REGISTRE_CATEGORY_LABELS[entry.category] || entry.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {REGISTRE_LAWFUL_BASIS_LABELS[entry.lawfulBasis] || entry.lawfulBasis}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.dataClassification}</Badge>
                      </TableCell>
                      <TableCell>
                        <RiskLevelBadge level={entry.riskLevel} />
                      </TableCell>
                      <TableCell>
                        {entry.requiresDpia ? (
                          <DpiaStatusBadge status={entry.dpiaStatus || ''} />
                        ) : (
                          <span className="text-muted-foreground text-sm">Non requise</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActiveStatusBadge isActive={entry.isActive} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper components

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
