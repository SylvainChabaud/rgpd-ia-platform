'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FileDown,
  Shield,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import {
  RiskLevelBadgeFull,
  LikelihoodBadge,
  ImpactBadge,
} from '@/components/ui/rgpd-badges';
import { useDpiaDetail, useValidateDpia, downloadDpiaPdf } from '@/lib/api/hooks/useDpia';
import { useAuthStore } from '@/lib/auth/authStore';
import { ACTOR_ROLE } from '@/shared/actorRole';
import { toast } from 'sonner';
import {
  DPIA_STATUS,
  DPIA_STATUS_FULL_LABELS,
  DPIA_STATUS_BORDER_COLORS,
  DPIA_MIN_REJECTION_REASON_LENGTH,
} from '@/lib/constants/dpia';
import { TOAST_MESSAGES, LOADING_MESSAGES, ERROR_STATES, FALLBACK_TEXT } from '@/lib/constants/ui/messages';
import { PORTAL_ROUTES } from '@/lib/constants/routes';
import { DEFAULT_LOCALE } from '@/shared/locale';

/**
 * DPIA Detail Page - LOT 12.4
 *
 * RGPD Compliance:
 * - Art. 35: DPIA consultation and validation
 * - Art. 38.3: Only DPO can validate
 * - Tenant isolation enforced (API backend)
 */
export default function DpiaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dpiaId = params.id as string;

  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;
  const isDpo = user?.role === ACTOR_ROLE.DPO;

  const { data, isLoading, error } = useDpiaDetail(dpiaId);
  const validateMutation = useValidateDpia();

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [dpoComments, setDpoComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleExportPdf = async () => {
    if (!tenantId || !dpiaId) return;
    try {
      await downloadDpiaPdf(tenantId, dpiaId);
      toast.success(TOAST_MESSAGES.PDF_DOWNLOAD_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.PDF_DOWNLOAD_ERROR);
    }
  };

  const handleApprove = async () => {
    try {
      await validateMutation.mutateAsync({
        dpiaId,
        input: {
          status: DPIA_STATUS.APPROVED,
          dpoComments: dpoComments || undefined,
        },
      });
      toast.success(TOAST_MESSAGES.DPIA_APPROVED_SUCCESS);
      setShowApproveDialog(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : TOAST_MESSAGES.DPIA_VALIDATION_ERROR);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.length < DPIA_MIN_REJECTION_REASON_LENGTH) {
      toast.error(TOAST_MESSAGES.DPIA_MIN_REJECTION_LENGTH);
      return;
    }

    try {
      await validateMutation.mutateAsync({
        dpiaId,
        input: {
          status: DPIA_STATUS.REJECTED,
          dpoComments: dpoComments || undefined,
          rejectionReason,
        },
      });
      toast.success(TOAST_MESSAGES.DPIA_REJECTED_SUCCESS);
      setShowRejectDialog(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : TOAST_MESSAGES.DPIA_REJECTION_ERROR);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">{LOADING_MESSAGES.DPIA_DETAIL}</p>
        </div>
      </div>
    );
  }

  if (error || !data?.dpia) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">{ERROR_STATES.NOT_FOUND.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {ERROR_STATES.NOT_FOUND.description}
                </p>
              </div>
              <Link href={PORTAL_ROUTES.DPIA}>
                <Button variant="outline">{ERROR_STATES.BACK_TO_LIST}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dpia = data.dpia;
  const isPending = dpia.status === DPIA_STATUS.PENDING;
  const canValidate = isDpo && isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={PORTAL_ROUTES.DPIA}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileCheck className="h-8 w-8" />
              {dpia.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              Finalité : {dpia.purposeLabel || FALLBACK_TEXT.NOT_AVAILABLE}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {dpia.status === DPIA_STATUS.APPROVED && (
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={`border-2 ${DPIA_STATUS_BORDER_COLORS[dpia.status as keyof typeof DPIA_STATUS_BORDER_COLORS] || 'border-gray-300'}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(dpia.status)}
              <div>
                <p className="font-semibold">{DPIA_STATUS_FULL_LABELS[dpia.status as keyof typeof DPIA_STATUS_FULL_LABELS] || dpia.status}</p>
                <p className="text-sm text-muted-foreground">
                  Créée le {new Date(dpia.createdAt).toLocaleDateString(DEFAULT_LOCALE)}
                  {dpia.validatedAt && (
                    <> - Validée le {new Date(dpia.validatedAt).toLocaleDateString(DEFAULT_LOCALE)}</>
                  )}
                </p>
              </div>
            </div>
            <RiskLevelBadgeFull level={dpia.overallRiskLevel} />
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason (if rejected) */}
      {dpia.status === DPIA_STATUS.REJECTED && dpia.rejectionReason && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Motif de rejet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{dpia.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Revision Request Info (if pending with revision comments) */}
      {dpia.status === DPIA_STATUS.PENDING && dpia.revisionRequestedAt && dpia.revisionComments && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Demande de révision
            </CardTitle>
            <CardDescription>
              Demandée le {new Date(dpia.revisionRequestedAt).toLocaleDateString(DEFAULT_LOCALE)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  Commentaires du Tenant Admin :
                </p>
                <p className="mt-1 text-sm">{dpia.revisionComments}</p>
              </div>
            </div>
            {isDpo && (
              <div className="pt-3 border-t border-orange-200">
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  <strong>Note :</strong> Le Tenant Admin a demandé une révision suite à un rejet précédent.
                  Veuillez ré-examiner la DPIA en tenant compte des corrections apportées.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Description Section */}
        <Card>
          <CardHeader>
            <CardTitle>1. Description du traitement</CardTitle>
            <CardDescription>Art. 35.7.a RGPD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{dpia.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Classification</Label>
                <p className="mt-1">
                  <Badge variant="outline">{dpia.dataClassification}</Badge>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Données traitées</Label>
                <p className="mt-1">
                  {dpia.dataProcessed.length > 0
                    ? dpia.dataProcessed.join(', ')
                    : 'Non spécifié'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Measures Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              4. Mesures de sécurité
            </CardTitle>
            <CardDescription>Art. 32 RGPD</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dpia.securityMeasures.map((measure, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{measure}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Risks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            3. Evaluation des risques
          </CardTitle>
          <CardDescription>Art. 35.7.c RGPD</CardDescription>
        </CardHeader>
        <CardContent>
          {dpia.risks && dpia.risks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">#</TableHead>
                  <TableHead className="w-[25%]">Risque</TableHead>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead className="w-[10%]">Probabilité</TableHead>
                  <TableHead className="w-[10%]">Impact</TableHead>
                  <TableHead className="w-[15%]">Atténuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dpia.risks.map((risk, index) => (
                  <TableRow key={risk.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{risk.riskName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {risk.description}
                    </TableCell>
                    <TableCell>
                      <LikelihoodBadge level={risk.likelihood} />
                    </TableCell>
                    <TableCell>
                      <ImpactBadge level={risk.impact} />
                    </TableCell>
                    <TableCell className="text-sm">{risk.mitigation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Aucun risque identifié
            </p>
          )}
        </CardContent>
      </Card>

      {/* DPO Comments */}
      {dpia.dpoComments && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400">
              Avis du DPO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{dpia.dpoComments}</p>
          </CardContent>
        </Card>
      )}

      {/* Validation Actions (DPO only, pending status) */}
      {canValidate && (
        <Card>
          <CardHeader>
            <CardTitle>Actions DPO</CardTitle>
            <CardDescription>
              En tant que DPO, vous pouvez valider ou rejeter cette DPIA
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-4">
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approuver
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la DPIA</DialogTitle>
            <DialogDescription>
              Confirmez-vous l&apos;approbation de cette analyse d&apos;impact ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dpoComments">Commentaires DPO (optionnel)</Label>
              <Textarea
                id="dpoComments"
                placeholder="Ajoutez vos commentaires..."
                value={dpoComments}
                onChange={(e) => setDpoComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Annuler
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? 'Validation...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la DPIA</DialogTitle>
            <DialogDescription>
              Veuillez indiquer le motif de rejet (obligatoire)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Motif de rejet *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Indiquez le motif de rejet (min. 10 caractères)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dpoCommentsReject">Commentaires DPO (optionnel)</Label>
              <Textarea
                id="dpoCommentsReject"
                placeholder="Ajoutez vos commentaires..."
                value={dpoComments}
                onChange={(e) => setDpoComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={validateMutation.isPending || rejectionReason.length < 10}
            >
              {validateMutation.isPending ? 'Rejet...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function for status icon display

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-6 w-6 text-yellow-500" />;
    case 'APPROVED':
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    case 'REJECTED':
      return <XCircle className="h-6 w-6 text-red-500" />;
    default:
      return <AlertCircle className="h-6 w-6 text-gray-500" />;
  }
}
