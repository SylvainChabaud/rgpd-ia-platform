'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { apiClient } from '@/lib/api/apiClient'
import { Terminal, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

/**
 * System Logs Viewer Page
 * LOT 11.3 - Simple file reader (TODO: Loki/ES in prod)
 *
 * RGPD Compliance:
 * - Logs are RGPD-safe (no sensitive user data, enforced by EPIC 1.3)
 * - P1 metadata only
 */
export default function LogsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    level: 'all',
    limit: 50,
    offset: 0,
  })

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.level && filters.level !== 'all') params.append('level', filters.level)
      params.append('limit', String(filters.limit))
      params.append('offset', String(filters.offset))

      return apiClient<{
        logs: Array<{
          timestamp: string
          level: string
          message: string
          metadata?: Record<string, unknown>
        }>
        pagination: { limit: number; offset: number; hasMore: boolean }
        environment: string
        note?: string
      }>(`/logs?${params.toString()}`)
    },
  })

  // Fetch RGPD compliance stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['logs-stats'],
    queryFn: () =>
      apiClient<{
        totalFiles: number
        totalSize: number
        totalSizeFormatted: string
        oldestFileAge: number | null
        rgpdCompliant: boolean
        warning: string | null
      }>('/logs/stats'),
  })

  // Purge mutation
  const purgeMutation = useMutation({
    mutationFn: () =>
      apiClient<{
        success: boolean
        deletedCount: number
        deletedSize: string
        message: string
      }>('/logs', { method: 'DELETE' }),
    onSuccess: (result) => {
      toast.success(`${result.deletedCount} fichier(s) supprimé(s)`, {
        description: result.message,
      })
      // Refresh both logs and stats
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      queryClient.invalidateQueries({ queryKey: ['logs-stats'] })
    },
    onError: () => {
      toast.error('Échec de la purge', {
        description: 'Impossible de supprimer les logs anciens',
      })
    },
  })

  const levelColors = {
    error: 'text-red-600 dark:text-red-400',
    warn: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
    debug: 'text-gray-600 dark:text-gray-400',
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Logs Système</h1>
            <p className="text-muted-foreground">
              Consultation logs ({data?.environment || 'development'})
            </p>
          </div>
        </div>

        {/* RGPD Compliance Badge + Purge Button */}
        <div className="flex items-center gap-3">
          {!statsLoading && stats && (
            <>
              {/* RGPD Status Badge */}
              {stats.rgpdCompliant ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
                  <ShieldCheck className="h-4 w-4" />
                  <div className="text-sm">
                    <div className="font-semibold">Conforme RGPD</div>
                    <div className="text-xs opacity-80">
                      Date des logs &lt; 30j
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg border border-orange-500/20">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="text-sm">
                    <div className="font-semibold">Attention RGPD</div>
                    <div className="text-xs opacity-80">
                      Logs dépassent 30 jours (purge requise)
                    </div>
                  </div>
                </div>
              )}

              {/* Purge Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={stats.rgpdCompliant ? 'outline' : 'destructive'}
                    disabled={purgeMutation.isPending || stats.totalFiles === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Purger les logs
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Purger les logs anciens</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <div>
                          Cette action va supprimer tous les fichiers de logs ayant{' '}
                          <strong>plus de 30 jours</strong>.
                        </div>
                        <div className="bg-muted p-3 rounded text-sm space-y-1">
                          <div>Fichiers actuels: {stats.totalFiles}</div>
                          <div>Taille totale: {stats.totalSizeFormatted}</div>
                          {stats.oldestFileAge !== null && (
                            <div>Plus ancien: {stats.oldestFileAge} jours</div>
                          )}
                        </div>
                        {stats.warning ? (
                          <div className="text-orange-600 dark:text-orange-400 font-medium">
                            ⚠️ {stats.warning}
                          </div>
                        ) : (
                          <div className="text-green-600 dark:text-green-400 font-medium">
                            ✅ Aucun fichier à supprimer (tous les logs ont moins de 30 jours)
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Conformité RGPD: Les logs ne contiennent que des métadonnées techniques
                          (P0/P1). Rétention maximale: 30 jours.
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => purgeMutation.mutate()}
                      disabled={purgeMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {purgeMutation.isPending ? 'Purge en cours...' : 'Confirmer la purge'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {data?.note && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ℹ️ {data.note}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Niveau</label>
              <Select
                value={filters.level}
                onValueChange={(value) => setFilters({ ...filters, level: value, offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Lignes</label>
              <Select
                value={String(filters.limit)}
                onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value), offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setFilters({ level: 'all', limit: 50, offset: 0 })}
                variant="outline"
                className="w-full"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Entrées ({data?.logs.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun log trouvé
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {data?.logs.map((log, index) => (
                <div key={index} className="border-l-2 border-muted pl-3 py-1 hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                    <span
                      className={`uppercase font-semibold min-w-[50px] ${
                        levelColors[log.level as keyof typeof levelColors] || levelColors.info
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-foreground flex-1">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.logs.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                disabled={filters.offset === 0}
                variant="outline"
                size="sm"
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Affichage {filters.offset + 1} - {filters.offset + data.logs.length}
              </span>
              <Button
                onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                disabled={!data.pagination.hasMore}
                variant="outline"
                size="sm"
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
