'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  usePurposeTemplates,
  useAdoptTemplate,
  type PurposeTemplate,
  type TemplateFilters,
  CATEGORY_OPTIONS,
  RISK_LEVEL_OPTIONS,
  SECTOR_OPTIONS,
} from '@/lib/api/hooks/usePurposeTemplates'
import {
  RISK_LEVEL,
  PURPOSE_CATEGORY,
  SECTOR,
  RISK_BADGE_STYLES,
  SECTOR_BADGE_STYLES,
  SECTOR_LABELS,
  FILTER_ALL,
  type Sector,
} from '@/lib/constants/rgpd'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RgpdComplianceCard, COMPLIANCE_CARD_VARIANT } from '@/components/rgpd/RgpdComplianceCard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  AlertCircle,
  Info as _Info,
  Building2,
  Check,
  AlertTriangle,
  FileCheck,
  Sparkles,
  Brain,
  ExternalLink,
  Briefcase,
} from 'lucide-react'

/**
 * Purpose Templates Catalog Page - TENANT Admin (LOT 12.2)
 *
 * Features:
 * - Browse available purpose templates
 * - Filter by category and risk level
 * - Adopt template for tenant
 * - Customize label and description before adoption
 *
 * RGPD Compliance:
 * - Templates are platform-level, pre-validated
 * - Immutable fields: lawfulBasis, category, riskLevel
 * - Tenant can only customize label/description
 */

// Category icons (using constants)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  [PURPOSE_CATEGORY.AI_PROCESSING]: <Brain className="h-5 w-5" />,
  [PURPOSE_CATEGORY.ANALYTICS]: <Sparkles className="h-5 w-5" />,
  [PURPOSE_CATEGORY.MARKETING]: <ExternalLink className="h-5 w-5" />,
  [PURPOSE_CATEGORY.ESSENTIAL]: <ShieldCheck className="h-5 w-5" />,
  [PURPOSE_CATEGORY.PROFESSIONAL]: <Briefcase className="h-5 w-5" />,
};

export default function TemplatesCatalogPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<TemplateFilters>({})
  const [selectedTemplate, setSelectedTemplate] = useState<PurposeTemplate | null>(null)
  const [showAdoptDialog, setShowAdoptDialog] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [isRequired, setIsRequired] = useState(false)

  const { data, isLoading, error } = usePurposeTemplates(filters)
  const adoptTemplate = useAdoptTemplate()

  const templates = data?.templates || []

  const handleAdoptClick = (template: PurposeTemplate) => {
    setSelectedTemplate(template)
    setCustomLabel(template.name)
    setCustomDescription(template.description)
    setIsRequired(false)
    setShowAdoptDialog(true)
  }

  const handleConfirmAdopt = () => {
    if (!selectedTemplate) return

    adoptTemplate.mutate(
      {
        templateCode: selectedTemplate.code,
        label: customLabel !== selectedTemplate.name ? customLabel : undefined,
        description: customDescription !== selectedTemplate.description ? customDescription : undefined,
        isRequired,
      },
      {
        onSuccess: () => {
          setShowAdoptDialog(false)
          setSelectedTemplate(null)
          router.push('/portal/consents/purposes')
        },
        onError: () => {
          // Keep dialog open on error - toast is shown by hook
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
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
                  Impossible de charger le catalogue de templates.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/portal/consents/purposes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                Catalogue de templates
              </h1>
              <p className="text-muted-foreground mt-1">
                Templates de finalités pré-validés RGPD, prêts à être adoptés
              </p>
            </div>
          </div>
        </div>

        {/* RGPD Compliance Card */}
        <RgpdComplianceCard variant={COMPLIANCE_CARD_VARIANT.CONSENTS_TEMPLATES} />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* 1. Secteur */}
              <div className="space-y-2">
                <Label>Mon secteur</Label>
                <Select
                  value={filters.sector || SECTOR.GENERAL}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      sector: v === SECTOR.GENERAL ? undefined : (v as TemplateFilters['sector']),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous secteurs" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 2. Catégorie */}
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={filters.category || FILTER_ALL}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      category: v === FILTER_ALL ? undefined : (v as TemplateFilters['category']),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Toutes les catégories</SelectItem>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 3. Niveau de risque */}
              <div className="space-y-2">
                <Label>Niveau de risque</Label>
                <Select
                  value={filters.riskLevel || FILTER_ALL}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      riskLevel: v === FILTER_ALL ? undefined : (v as TemplateFilters['riskLevel']),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Tous les niveaux</SelectItem>
                    {RISK_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[template.category] || <Shield className="h-5 w-5" />}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  {template.isAiPurpose && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="gap-1">
                          <Brain className="h-3 w-3" />
                          IA
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Traitement par Intelligence Artificielle</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  {/* Lawful Basis */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base légale</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {template.lawfulBasisLabel}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">Art. 6 RGPD</p>
                        <p className="text-xs">{template.lawfulBasisDescription}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Risk Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Niveau de risque</span>
                    <Badge
                      variant="outline"
                      className={`${RISK_BADGE_STYLES[template.riskLevel] || ''}`}
                    >
                      {template.riskLevel === RISK_LEVEL.HIGH || template.riskLevel === RISK_LEVEL.CRITICAL ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : null}
                      {template.riskLevelLabel}
                    </Badge>
                  </div>

                  {/* Sector */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Secteur</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className={`${SECTOR_BADGE_STYLES[template.sector as Sector] || ''}`}
                        >
                          <Briefcase className="h-3 w-3 mr-1" />
                          {SECTOR_LABELS[template.sector as Sector] || template.sector}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {template.sectorDescription}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Conformité (DPIA) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conformité</span>
                    {template.requiresDpia ? (
                      <Badge
                        variant="outline"
                        className="text-orange-700 border-orange-300"
                      >
                        <FileCheck className="h-3 w-3 mr-1" />
                        DPIA requise
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* CNIL Reference */}
                  {template.cnilReference && (
                    <div className="rounded-md border border-slate-200 p-2">
                      <div className="text-xs text-muted-foreground">
                        Réf. CNIL: {template.cnilReference}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleAdoptClick(template)}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Adopter ce template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* No results */}
        {templates.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucun template ne correspond aux filtres sélectionnés
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setFilters({})}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adopt Dialog */}
        <Dialog open={showAdoptDialog} onOpenChange={setShowAdoptDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Adopter &quot;{selectedTemplate?.name}&quot;
              </DialogTitle>
              <DialogDescription>
                Personnalisez le libellé et la description pour votre organisation.
                Les champs RGPD (base légale, risque) sont hérités du template.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Info (readonly) */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Base légale</span>
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {selectedTemplate?.lawfulBasisLabel}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Niveau de risque</span>
                  <Badge
                    variant="outline"
                    className={`${RISK_BADGE_STYLES[selectedTemplate?.riskLevel || ''] || ''}`}
                  >
                    {selectedTemplate?.riskLevelLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ces champs sont immuables et définis par le template.
                </p>
              </div>

              {/* Customizable fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Libellé</Label>
                  <Input
                    id="label"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Libellé personnalisé"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nom affiché aux utilisateurs dans le formulaire de consentement
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Description personnalisée"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Explication détaillée affichée aux utilisateurs
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="required">Consentement obligatoire</Label>
                    <p className="text-xs text-muted-foreground">
                      L&apos;utilisateur doit accepter pour utiliser le service
                    </p>
                  </div>
                  <Switch
                    id="required"
                    checked={isRequired}
                    onCheckedChange={setIsRequired}
                  />
                </div>
              </div>

              {/* DPIA Warning */}
              {selectedTemplate?.requiresDpia && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>DPIA requise</strong> — Ce template nécessite une Analyse d&apos;Impact.
                    Contactez votre DPO avant mise en production.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAdoptDialog(false)}
                disabled={adoptTemplate.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmAdopt}
                disabled={adoptTemplate.isPending || !customLabel.trim()}
              >
                {adoptTemplate.isPending ? 'Adoption...' : 'Confirmer l\'adoption'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
