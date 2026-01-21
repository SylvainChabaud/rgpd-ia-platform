'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  History,
  AlertCircle,
} from 'lucide-react';
import { DpiaHistoryTimeline } from '@/components/dpia/DpiaHistoryTimeline';
import { useTenantById } from '@/lib/api/hooks/useTenants';

/**
 * DPIA List for Tenant - PLATFORM Admin (SUPERADMIN)
 * LOT 12.4 - Audit des DPIA par tenant
 *
 * RGPD Compliance:
 * - Art. 35: DPIA audit access for platform admin
 * - Art. 5.2: Accountability - all decisions traceable
 * - Cross-tenant access for compliance audits
 */

interface DpiaListItem {
  id: string;
  purposeId: string;
  title: string;
  description: string;
  overallRiskLevel: string;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  purposeLabel?: string;
}

interface DpiaListResponse {
  dpias: DpiaListItem[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeClass: string }> = {
  PENDING: {
    label: 'En attente',
    icon: Clock,
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Approuvée',
    icon: CheckCircle,
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    label: 'Rejetée',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default function TenantDpiaListPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const [selectedDpiaId, setSelectedDpiaId] = useState<string | null>(null);

  const { data: tenantData, isLoading: tenantLoading } = useTenantById(tenantId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'dpias'],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/dpia`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch DPIAs');
      }

      return response.json() as Promise<DpiaListResponse>;
    },
    enabled: !!tenantId,
  });

  if (isLoading || tenantLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des DPIA...</p>
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
                <h3 className="font-semibold text-lg">Erreur</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Impossible de charger les DPIA
                </p>
              </div>
              <Link href={`/admin/tenants/${tenantId}`}>
                <Button variant="outline">Retour au tenant</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = tenantData?.tenant;
  const dpias = data?.dpias || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href={`/admin/tenants/${tenantId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tenant
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileCheck className="h-8 w-8" />
          DPIA - {tenant?.name || 'Tenant'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Liste des analyses d&apos;impact et historique des échanges
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{dpias.length}</div>
            <p className="text-xs text-muted-foreground">Total DPIA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {dpias.filter((d) => d.status === 'PENDING').length}
            </div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {dpias.filter((d) => d.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-muted-foreground">Approuvées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {dpias.filter((d) => d.status === 'REJECTED').length}
            </div>
            <p className="text-xs text-muted-foreground">Rejetées</p>
          </CardContent>
        </Card>
      </div>

      {/* DPIA List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des DPIA</CardTitle>
          <CardDescription>
            Cliquez sur &quot;Historique&quot; pour voir les échanges DPO/Tenant Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dpias.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune DPIA pour ce tenant
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Finalité</TableHead>
                  <TableHead>Risque</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dpias.map((dpia) => {
                  const statusConfig = STATUS_CONFIG[dpia.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={dpia.id}>
                      <TableCell className="font-medium">{dpia.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dpia.purposeLabel || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={RISK_COLORS[dpia.overallRiskLevel] || 'bg-gray-100'}>
                          {dpia.overallRiskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.badgeClass}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(dpia.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDpiaId(dpia.id)}
                        >
                          <History className="h-4 w-4 mr-1" />
                          Historique
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={!!selectedDpiaId} onOpenChange={() => setSelectedDpiaId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des échanges
            </DialogTitle>
          </DialogHeader>
          {selectedDpiaId && (
            <DpiaHistoryTimeline dpiaId={selectedDpiaId} tenantId={tenantId} className="border-0 shadow-none" showEmptyState hideHeader />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
