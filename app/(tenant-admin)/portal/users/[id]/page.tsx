'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ACTOR_ROLE } from '@/shared/actorRole'
import {
  useUserDetail,
  useUserStats,
  useUserJobs,
  useUserConsents,
  useUserAuditEvents,
  useSuspendTenantUser,
  useReactivateTenantUser,
  useDeleteTenantUser,
} from '@/lib/api/hooks/useTenantUsers'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  User,
  Edit,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  History,
  Pause,
  Play,
  Trash2,
  Calendar,
  Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * User Detail Page - TENANT Admin (LOT 12.1)
 *
 * Features:
 * - View user info (name, role, status, created date)
 * - View user statistics (jobs count, consents count)
 * - View AI jobs history (paginated)
 * - View consents list
 * - View audit events (paginated)
 * - Suspend/Reactivate user
 * - Delete user (soft delete)
 *
 * RGPD Compliance:
 * - Only P1 data displayed (displayName, role, status, dates)
 * - Email NOT displayed (P2 data)
 * - No P3 content (prompt/output) displayed
 * - Tenant isolation enforced (API backend)
 */

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id: userId } = use(params)
  const router = useRouter()

  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const { data: userData, isLoading: userLoading, error: userError, refetch: refetchUser } = useUserDetail(userId)
  const { data: statsData, isLoading: statsLoading } = useUserStats(userId)
  const { data: jobsData, isLoading: jobsLoading } = useUserJobs(userId, { limit: 20 })
  const { data: consentsData, isLoading: consentsLoading } = useUserConsents(userId)
  const { data: auditData, isLoading: auditLoading } = useUserAuditEvents(userId, { limit: 50 })

  const suspendUser = useSuspendTenantUser(userId)
  const reactivateUser = useReactivateTenantUser(userId)
  const deleteUser = useDeleteTenantUser(userId)

  const user = userData?.user
  const stats = statsData?.stats
  const jobs = jobsData?.jobs || []
  const consents = consentsData?.consents || []
  const auditEvents = auditData?.events || []

  const handleSuspend = () => {
    if (!suspendReason.trim()) return
    suspendUser.mutate(
      { reason: suspendReason },
      {
        onSuccess: () => {
          setShowSuspendDialog(false)
          setSuspendReason('')
          // Force refetch to ensure UI is updated
          refetchUser()
        },
      }
    )
  }

  const handleReactivate = () => {
    reactivateUser.mutate(undefined, {
      onSuccess: () => {
        setShowReactivateDialog(false)
        // Force refetch to ensure UI is updated
        refetchUser()
      },
    })
  }

  const handleDelete = () => {
    deleteUser.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        router.push('/portal/users')
      },
    })
  }

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (userError || !user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Utilisateur introuvable</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  L&apos;utilisateur demandé n&apos;existe pas ou vous n&apos;y avez pas accès.
                </p>
              </div>
              <Link href="/portal/users">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la liste
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8" />
              {user.displayName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {user.role === ACTOR_ROLE.TENANT_ADMIN ? (
                <Badge variant="default">Admin</Badge>
              ) : (
                <Badge variant="secondary">{user.role}</Badge>
              )}
              <Badge variant={user.dataSuspended ? 'destructive' : 'default'}>
                {user.dataSuspended ? 'Suspendu' : 'Actif'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/portal/users/${userId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          {user.dataSuspended ? (
            <Button variant="outline" onClick={() => setShowReactivateDialog(true)}>
              <Play className="mr-2 h-4 w-4" />
              Réactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowSuspendDialog(true)}>
              <Pause className="mr-2 h-4 w-4" />
              Suspendre
            </Button>
          )}
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Calendar className="inline mr-2 h-4 w-4" />
              Membre depuis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Date(user.createdAt).toLocaleDateString('fr-FR')}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(user.createdAt), { locale: fr, addSuffix: true })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Briefcase className="inline mr-2 h-4 w-4" />
              Jobs IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.jobs.total || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.jobs.success || 0} succès / {stats?.jobs.failed || 0} échecs
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <ShieldCheck className="inline mr-2 h-4 w-4" />
              Consentements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.consents.total || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {stats?.consents.granted || 0} accordés / {stats?.consents.revoked || 0} révoqués
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Activity className="inline mr-2 h-4 w-4" />
              Événements audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.auditEvents.total || 0}</p>
                <p className="text-sm text-muted-foreground">événements enregistrés</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for History */}
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs IA ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="consents" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Consentements ({consents.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit ({auditEvents.length})
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Jobs IA</CardTitle>
              <CardDescription>
                Liste des traitements IA effectués par cet utilisateur (20 derniers)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun job IA</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Modèle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          {job.createdAt
                            ? formatDistanceToNow(new Date(job.createdAt), { locale: fr, addSuffix: true })
                            : '-'}
                        </TableCell>
                        <TableCell>{job.purpose}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.model}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.status === 'COMPLETED' ? 'default' : 'destructive'}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.latencyMs ? `${job.latencyMs}ms` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consents Tab */}
        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <CardTitle>Consentements</CardTitle>
              <CardDescription>
                État des consentements de cet utilisateur pour les différentes finalités
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consentsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : consents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun consentement</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finalité</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date accordé</TableHead>
                      <TableHead>Date révoqué</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consents.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{consent.purposeLabel}</p>
                            <p className="text-sm text-muted-foreground">{consent.purposeDescription}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              consent.status === 'granted'
                                ? 'default'
                                : consent.status === 'revoked'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {consent.status === 'granted'
                              ? 'Accordé'
                              : consent.status === 'revoked'
                              ? 'Révoqué'
                              : 'En attente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {consent.grantedAt
                            ? new Date(consent.grantedAt).toLocaleDateString('fr-FR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {consent.revokedAt
                            ? new Date(consent.revokedAt).toLocaleDateString('fr-FR')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Événements d&apos;audit</CardTitle>
              <CardDescription>
                Historique des actions liées à cet utilisateur (50 derniers)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : auditEvents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun événement</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rôle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {event.createdAt
                            ? formatDistanceToNow(new Date(event.createdAt), { locale: fr, addSuffix: true })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.type.includes('failed') || event.type.includes('revoked') || event.type.includes('suspended')
                                ? 'destructive'
                                : event.type.includes('created') || event.type.includes('granted') || event.type.includes('completed')
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.isActor && event.isTarget ? (
                            <Badge variant="outline">Acteur & Cible</Badge>
                          ) : event.isActor ? (
                            <Badge variant="outline">Acteur</Badge>
                          ) : (
                            <Badge variant="outline">Cible</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre {user.displayName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va suspendre le traitement des données pour cet utilisateur.
              Il ne pourra plus utiliser les services IA jusqu&apos;à réactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Raison de la suspension *</label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Ex: Départ de l'entreprise, incident sécurité..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuspendReason('')}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={suspendUser.isPending || !suspendReason.trim()}
            >
              {suspendUser.isPending ? 'Suspension...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver {user.displayName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va réactiver l&apos;utilisateur. Il pourra à nouveau
              utiliser les services IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={reactivateUser.isPending}>
              {reactivateUser.isPending ? 'Réactivation...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {user.displayName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L&apos;utilisateur sera supprimé définitivement
              et ne pourra plus accéder à la plateforme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
