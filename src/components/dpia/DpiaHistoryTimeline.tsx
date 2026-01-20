'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  MessageSquare,
  History,
  User,
} from 'lucide-react';
import { useDpiaHistory, type DpiaHistoryEntry } from '@/lib/api/hooks/useDpia';
import { DEFAULT_LOCALE } from '@/shared/locale';

/**
 * DpiaHistoryTimeline Component
 * LOT 12.4 - Affichage de l'historique des échanges DPO/Tenant Admin
 *
 * Accessible par:
 * - DPO: Voir l'historique pour comprendre le contexte
 * - TENANT_ADMIN: Suivre l'évolution de ses demandes
 * - SUPERADMIN: Audit de conformité
 */

interface DpiaHistoryTimelineProps {
  dpiaId: string;
  className?: string;
  /** Optional tenant ID override for SUPERADMIN cross-tenant access */
  tenantId?: string;
  /** If true, show a message when there's no history (useful for modals) */
  showEmptyState?: boolean;
  /** If true, hide the card header (useful when embedded in a dialog with its own title) */
  hideHeader?: boolean;
}

// Labels et couleurs pour les actions
const ACTION_CONFIG: Record<DpiaHistoryEntry['action'], {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  iconClass: string;
}> = {
  CREATED: {
    label: 'DPIA créée',
    icon: Clock,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    iconClass: 'text-blue-500',
  },
  APPROVED: {
    label: 'Approuvée',
    icon: CheckCircle,
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    iconClass: 'text-green-500',
  },
  REJECTED: {
    label: 'Rejetée',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    iconClass: 'text-red-500',
  },
  REVISION_REQUESTED: {
    label: 'Révision demandée',
    icon: RefreshCw,
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    iconClass: 'text-orange-500',
  },
};

// Labels pour les rôles
const ROLE_LABELS: Record<string, string> = {
  DPO: 'DPO',
  TENANT_ADMIN: 'Tenant Admin',
  SUPERADMIN: 'Platform Admin',
};

function HistoryEntryCard({ entry }: { entry: DpiaHistoryEntry }) {
  const config = ACTION_CONFIG[entry.action];
  const Icon = config.icon;

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border last:hidden" />

      {/* Timeline dot */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center`}>
        <Icon className={`h-3 w-3 ${config.iconClass}`} />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={config.badgeClass}>{config.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          <span>
            {entry.actorDisplayName || 'Utilisateur'}
            {' '}
            <span className="text-xs">({ROLE_LABELS[entry.actorRole] || entry.actorRole})</span>
          </span>
        </div>

        {/* Rejection reason (for REJECTED action) */}
        {entry.action === 'REJECTED' && entry.rejectionReason && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
              Motif de rejet :
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">
              {entry.rejectionReason}
            </p>
          </div>
        )}

        {/* Comments (for all actions except REJECTED which shows rejectionReason) */}
        {entry.comments && entry.action !== 'REJECTED' && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md border">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm whitespace-pre-wrap">{entry.comments}</p>
            </div>
          </div>
        )}

        {/* DPO comments on rejection (if both exist) */}
        {entry.action === 'REJECTED' && entry.comments && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md border">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Commentaires DPO :</p>
                <p className="text-sm whitespace-pre-wrap">{entry.comments}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative pl-8">
          <Skeleton className="absolute left-0 top-1 w-6 h-6 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DpiaHistoryTimeline({ dpiaId, className = '', tenantId, showEmptyState = false, hideHeader = false }: DpiaHistoryTimelineProps) {
  const { data, isLoading, error } = useDpiaHistory(dpiaId, tenantId);

  const hasHistory = data?.history && data.history.length > 0;

  // Ne pas afficher le composant s'il n'y a pas d'historique (et pas d'erreur)
  // Sauf si showEmptyState est true (utile pour les modales)
  if (!isLoading && !error && !hasHistory && !showEmptyState) {
    return null;
  }

  return (
    <Card className={className}>
      {!hideHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des échanges
          </CardTitle>
          <CardDescription>
            Suivi chronologique des décisions DPO et demandes de révision
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={hideHeader ? 'pt-0' : ''}>
        {isLoading && <LoadingSkeleton />}

        {error && (
          <p className="text-sm text-destructive">
            Erreur lors du chargement de l&apos;historique
          </p>
        )}

        {!isLoading && !error && !hasHistory && showEmptyState && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun historique disponible pour cette DPIA
          </p>
        )}

        {!isLoading && !error && hasHistory && (
          <div className="relative">
            {data.history.map((entry) => (
              <HistoryEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
