'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useValidateCustomPurpose,
  useCreateCustomPurpose,
  LAWFUL_BASIS_OPTIONS,
  DATA_CLASS_OPTIONS,
  PROCESSING_TYPE_OPTIONS,
  type ValidationResult,
  type LawfulBasisOption,
} from '@/lib/api/hooks/usePurposeTemplates'
import {
  DATA_CLASS,
  PURPOSE_CATEGORY,
  PROCESSING_TYPE,
  LAWFUL_BASIS,
  RISK_BADGE_STYLES,
  type LawfulBasis,
  type RiskLevel,
  type DataClass,
} from '@/lib/constants/rgpd'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Info,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileCheck,
  Sparkles,
  Database,
  Brain,
  Scale,
  Check,
  HelpCircle,
} from 'lucide-react'

/**
 * Create Custom Purpose Wizard - TENANT Admin (LOT 12.2)
 *
 * 5-step wizard to guide non-expert admins in creating RGPD-compliant purposes:
 * 1. Identification: label, description
 * 2. Data Classification: P0/P1/P2/P3 involved
 * 3. Processing Types: AI automated, profiling, automated decision
 * 4. Lawful Basis: selection with RGPD explanations
 * 5. Validation: summary, warnings, DPIA acknowledgment
 *
 * RGPD Compliance:
 * - Guides user through RGPD requirements
 * - Validates and suggests appropriate lawful basis
 * - Warns about DPIA requirements
 * - Audit trail on creation
 */

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Identification',
  2: 'Données personnelles',
  3: 'Type de traitement',
  4: 'Base légale',
  5: 'Validation',
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: 'Définissez le nom et la description de la finalité',
  2: 'Indiquez les catégories de données personnelles impliquées',
  3: 'Précisez le type de traitement effectué',
  4: 'Sélectionnez la base légale appropriée (Art. 6 RGPD)',
  5: 'Vérifiez et confirmez la création',
};

// Re-use centralized risk badge styles from constants
const RISK_COLORS = RISK_BADGE_STYLES;

/**
 * RGPD isRequired Logic (Art. 6 & Art. 7.4)
 *
 * - CONSENT: isRequired MUST be false (Art. 7.4 - consent must be free, not conditioned)
 * - CONTRACT/LEGAL_OBLIGATION/VITAL_INTEREST/PUBLIC_INTEREST: isRequired MUST be true (necessary for service)
 * - LEGITIMATE_INTEREST: isRequired is optional (user choice, but opposition right Art. 21 applies)
 */
const LAWFUL_BASIS_REQUIRED_MAP: Record<string, { value: boolean; locked: boolean; message: string }> = {
  [LAWFUL_BASIS.CONSENT]: {
    value: false,
    locked: true,
    message: 'Art. 7.4 RGPD : Le consentement doit être libre. Conditionner le service à un consentement non nécessaire est interdit.',
  },
  [LAWFUL_BASIS.CONTRACT]: {
    value: true,
    locked: true,
    message: 'Art. 6.1.b RGPD : Ce traitement est nécessaire à l\'exécution du contrat.',
  },
  [LAWFUL_BASIS.LEGAL_OBLIGATION]: {
    value: true,
    locked: true,
    message: 'Art. 6.1.c RGPD : Ce traitement est requis par une obligation légale.',
  },
  [LAWFUL_BASIS.VITAL_INTEREST]: {
    value: true,
    locked: true,
    message: 'Art. 6.1.d RGPD : Ce traitement est nécessaire pour protéger les intérêts vitaux.',
  },
  [LAWFUL_BASIS.PUBLIC_INTEREST]: {
    value: true,
    locked: true,
    message: 'Art. 6.1.e RGPD : Ce traitement est nécessaire à une mission d\'intérêt public.',
  },
  [LAWFUL_BASIS.LEGITIMATE_INTEREST]: {
    value: false,
    locked: false,
    message: 'Art. 21 RGPD : L\'utilisateur conserve son droit d\'opposition au traitement.',
  },
};

export default function NewPurposePage() {
  const router = useRouter()
  const validatePurpose = useValidateCustomPurpose()
  const createPurpose = useCreateCustomPurpose()

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1: Identification
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Data Classification
  const [dataClasses, setDataClasses] = useState<string[]>([])

  // Step 3: Processing Types
  const [processingTypes, setProcessingTypes] = useState<string[]>([])
  const [automaticDecision, setAutomaticDecision] = useState(false)
  const [highRisk, setHighRisk] = useState(false)

  // Step 4: Lawful Basis
  const [lawfulBasis, setLawfulBasis] = useState<string>('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [lawfulBasisOptions, setLawfulBasisOptions] = useState<LawfulBasisOption[]>([])

  // Step 5: Final options
  const [isRequired, setIsRequired] = useState(false)
  const [acknowledgeDpia, setAcknowledgeDpia] = useState(false)

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get current isRequired config based on lawfulBasis
  const isRequiredConfig = lawfulBasis ? LAWFUL_BASIS_REQUIRED_MAP[lawfulBasis] : null
  const isRequiredLocked = isRequiredConfig?.locked ?? false

  // Handle lawfulBasis change with RGPD isRequired auto-set
  const handleLawfulBasisChange = useCallback((newLawfulBasis: string) => {
    setLawfulBasis(newLawfulBasis)
    // Auto-set isRequired based on RGPD rules
    const config = LAWFUL_BASIS_REQUIRED_MAP[newLawfulBasis]
    if (config?.locked) {
      setIsRequired(config.value)
    }
  }, [])

  // Validate step before proceeding
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (label.length < 2) {
        newErrors.label = 'Le nom doit contenir au moins 2 caractères'
      } else if (label.length > 100) {
        newErrors.label = 'Le nom ne peut pas dépasser 100 caractères'
      }
      if (description.length < 10) {
        newErrors.description = 'La description doit contenir au moins 10 caractères'
      } else if (description.length > 500) {
        newErrors.description = 'La description ne peut pas dépasser 500 caractères'
      }
    }

    if (step === 2) {
      if (dataClasses.length === 0) {
        newErrors.dataClasses = 'Sélectionnez au moins une catégorie de données'
      }
    }

    if (step === 3) {
      if (processingTypes.length === 0) {
        newErrors.processingTypes = 'Sélectionnez au moins un type de traitement'
      }
    }

    if (step === 4) {
      if (!lawfulBasis) {
        newErrors.lawfulBasis = 'Sélectionnez une base légale'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, label, description, dataClasses, processingTypes, lawfulBasis])

  // Handle next step
  const handleNext = async () => {
    if (!validateStep()) return

    if (step === 3) {
      // Validate with backend before step 4
      try {
        const result = await validatePurpose.mutateAsync({
          label,
          description,
          dataClassInvolved: dataClasses as DataClass[],
          processingTypes,
          automaticDecision,
          highRisk,
        })
        setValidationResult(result.validation)
        setLawfulBasisOptions(result.lawfulBasisOptions)
        // Pre-select suggested lawful basis
        if (result.validation.suggestedLawfulBasis) {
          setLawfulBasis(result.validation.suggestedLawfulBasis)
        }
      } catch (error) {
        console.error('Validation error:', error)
      }
    }

    if (step < 5) {
      setStep((step + 1) as WizardStep)
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep)
    }
  }

  // Handle final submit
  const handleSubmit = () => {
    if (!validateStep()) return

    // Check DPIA acknowledgment
    if (validationResult?.requiresDpia && !acknowledgeDpia) {
      setErrors({ dpia: 'Vous devez reconnaître l\'obligation de DPIA' })
      return
    }

    createPurpose.mutate(
      {
        label: label.trim(),
        description: description.trim(),
        lawfulBasis: lawfulBasis as LawfulBasis,
        category: processingTypes.includes(PROCESSING_TYPE.AI_AUTOMATED) ? PURPOSE_CATEGORY.AI_PROCESSING : PURPOSE_CATEGORY.ANALYTICS,
        riskLevel: validationResult?.suggestedRiskLevel as RiskLevel | undefined,
        maxDataClass: dataClasses.includes(DATA_CLASS.P3) ? DATA_CLASS.P3 : dataClasses.includes(DATA_CLASS.P2) ? DATA_CLASS.P2 : dataClasses.includes(DATA_CLASS.P1) ? DATA_CLASS.P1 : DATA_CLASS.P0,
        isRequired,
        acknowledgeDpiaWarning: acknowledgeDpia,
      },
      {
        onSuccess: () => {
          router.push('/portal/consents/purposes')
        },
      }
    )
  }

  // Toggle data class
  const toggleDataClass = (value: string) => {
    setDataClasses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  // Processing types that trigger high risk (EDPB Guidelines)
  const HIGH_RISK_PROCESSING_TYPES: string[] = [
    PROCESSING_TYPE.AUTOMATED_DECISION, // Art. 35.3.a
    PROCESSING_TYPE.LARGE_SCALE,        // Art. 35.3.b
    PROCESSING_TYPE.MONITORING,         // Art. 35.3.c
  ]

  // Toggle processing type
  const toggleProcessingType = (value: string) => {
    const isAdding = !processingTypes.includes(value)

    const newProcessingTypes = processingTypes.includes(value)
      ? processingTypes.filter((v) => v !== value)
      : [...processingTypes, value]

    setProcessingTypes(newProcessingTypes)

    // Auto-check/uncheck automaticDecision based on AUTOMATED_DECISION
    if (value === PROCESSING_TYPE.AUTOMATED_DECISION) {
      setAutomaticDecision(isAdding)
    }

    // Auto-check/uncheck highRisk based on high-risk processing types
    if (HIGH_RISK_PROCESSING_TYPES.includes(value)) {
      if (isAdding) {
        setHighRisk(true)
      } else {
        // Check if any other high-risk type is still selected
        const hasOtherHighRisk = newProcessingTypes.some((pt) =>
          HIGH_RISK_PROCESSING_TYPES.includes(pt)
        )
        if (!hasOtherHighRisk) {
          setHighRisk(false)
        }
      }
    }
  }

  // Check if automaticDecision toggle should be disabled (locked by AUTOMATED_DECISION card)
  const isAutomaticDecisionLocked = processingTypes.includes(PROCESSING_TYPE.AUTOMATED_DECISION)

  // Check if highRisk toggle should be disabled (locked by high-risk processing types)
  const isHighRiskLocked = processingTypes.some((pt) =>
    HIGH_RISK_PROCESSING_TYPES.includes(pt)
  )

  const progress = (step / 5) * 100

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Link href="/portal/consents/purposes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              Nouvelle finalité personnalisée
            </h1>
            <p className="text-muted-foreground mt-1">
              Assistant guidé pour créer une finalité conforme au RGPD
            </p>
          </div>
          <Link href="/portal/consents/purposes/templates">
            <Button variant="outline" size="sm">
              Utiliser un template
            </Button>
          </Link>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>
                  Étape {step} sur 5: <strong>{STEP_TITLES[step]}</strong>
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`flex items-center gap-1 text-xs ${
                      s === step
                        ? 'text-primary font-medium'
                        : s < step
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {s < step ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : s === step ? (
                      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                        {s}
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center text-xs">
                        {s}
                      </div>
                    )}
                    <span className="hidden sm:inline">{STEP_TITLES[s as WizardStep]}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <Info className="h-5 w-5" />}
              {step === 2 && <Database className="h-5 w-5" />}
              {step === 3 && <Brain className="h-5 w-5" />}
              {step === 4 && <Scale className="h-5 w-5" />}
              {step === 5 && <CheckCircle className="h-5 w-5" />}
              {STEP_TITLES[step]}
            </CardTitle>
            <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Identification */}
            {step === 1 && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RGPD Art. 5.1.b</strong> — Le principe de limitation des finalités exige que les données
                    soient collectées pour des finalités déterminées, explicites et légitimes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="label">Nom de la finalité *</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex: Analyse de documents contractuels"
                    className={errors.label ? 'border-destructive' : ''}
                  />
                  {errors.label && (
                    <p className="text-sm text-destructive">{errors.label}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{label.length}/100 caractères</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description détaillée *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez clairement l'objectif du traitement et comment les données seront utilisées..."
                    rows={4}
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{description.length}/500 caractères</p>
                </div>
              </>
            )}

            {/* Step 2: Data Classification */}
            {step === 2 && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Identifiez les catégories de données personnelles qui seront traitées.
                    Plus les données sont sensibles, plus les exigences RGPD sont strictes.
                  </AlertDescription>
                </Alert>

                {errors.dataClasses && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errors.dataClasses}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {DATA_CLASS_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        dataClasses.includes(opt.value)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleDataClass(opt.value)}
                    >
                      <Checkbox
                        checked={dataClasses.includes(opt.value)}
                        onCheckedChange={() => toggleDataClass(opt.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{opt.label}</span>
                          {opt.value === DATA_CLASS.P3 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Sensible
                            </Badge>
                          )}
                          {opt.value === DATA_CLASS.P2 && (
                            <Badge variant="secondary" className="text-xs">Personnel</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {dataClasses.includes(DATA_CLASS.P3) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Données sensibles (Art. 9 RGPD)</AlertTitle>
                    <AlertDescription>
                      Le traitement de données sensibles (santé, opinions, biométrie) est en principe interdit.
                      Une DPIA sera probablement requise. Vérifiez que vous disposez d&apos;une exception légale.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Step 3: Processing Types */}
            {step === 3 && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Précisez le type de traitement. Certains traitements (profilage, décision automatisée)
                    déclenchent des obligations supplémentaires selon le RGPD.
                  </AlertDescription>
                </Alert>

                {errors.processingTypes && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errors.processingTypes}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {PROCESSING_TYPE_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        processingTypes.includes(opt.value)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleProcessingType(opt.value)}
                    >
                      <Checkbox
                        checked={processingTypes.includes(opt.value)}
                        onCheckedChange={() => toggleProcessingType(opt.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{opt.label}</span>
                          {opt.value === PROCESSING_TYPE.AI_AUTOMATED && (
                            <Badge variant="secondary" className="text-xs">Art. 13/14</Badge>
                          )}
                          {opt.value === PROCESSING_TYPE.PROFILING && (
                            <Badge variant="secondary" className="text-xs">Art. 4.4</Badge>
                          )}
                          {opt.value === PROCESSING_TYPE.AUTOMATED_DECISION && (
                            <Badge variant="destructive" className="text-xs">Art. 22</Badge>
                          )}
                          {opt.value === PROCESSING_TYPE.LARGE_SCALE && (
                            <Badge variant="secondary" className="text-xs">Art. 35.3</Badge>
                          )}
                          {opt.value === PROCESSING_TYPE.MONITORING && (
                            <Badge variant="secondary" className="text-xs">Art. 35.3.c</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center justify-between rounded-lg border p-4 ${isAutomaticDecisionLocked ? 'bg-muted/50' : ''}`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="automaticDecision" className="text-base">
                      Décision produisant des effets juridiques
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Le traitement aboutit-il à des décisions ayant un effet significatif sur les personnes ?
                    </p>
                    {isAutomaticDecisionLocked && (
                      <p className="text-xs text-primary mt-1">
                        Activé automatiquement car &quot;Décision automatisée&quot; est sélectionnée
                      </p>
                    )}
                  </div>
                  <Switch
                    id="automaticDecision"
                    checked={automaticDecision}
                    onCheckedChange={setAutomaticDecision}
                    disabled={isAutomaticDecisionLocked}
                  />
                </div>

                <div className={`flex items-center justify-between rounded-lg border p-4 ${isHighRiskLocked ? 'bg-muted/50' : ''}`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="highRisk" className="text-base">
                      Traitement à haut risque
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Considérez-vous ce traitement comme présentant un risque élevé pour les droits des personnes ?
                    </p>
                    {isHighRiskLocked && (
                      <p className="text-xs text-primary mt-1">
                        Activé automatiquement selon les critères EDPB (Art. 35.3)
                      </p>
                    )}
                  </div>
                  <Switch
                    id="highRisk"
                    checked={highRisk}
                    onCheckedChange={setHighRisk}
                    disabled={isHighRiskLocked}
                  />
                </div>

                {(automaticDecision || processingTypes.includes(PROCESSING_TYPE.AUTOMATED_DECISION)) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Article 22 RGPD</AlertTitle>
                    <AlertDescription>
                      Les décisions individuelles automatisées produisant des effets juridiques sont soumises
                      à des garanties spécifiques : droit à une intervention humaine, droit de contester.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Step 4: Lawful Basis */}
            {step === 4 && (
              <>
                {validatePurpose.isPending ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-muted-foreground">Analyse RGPD en cours...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {validationResult && (
                      <Alert className={validationResult.requiresDpia ? 'border-orange-500' : ''}>
                        <Shield className="h-4 w-4" />
                        <AlertTitle>Analyse RGPD</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <div className="flex items-center gap-4 mt-2">
                            <span>Niveau de risque suggéré:</span>
                            <Badge
                              variant="outline"
                              className={RISK_COLORS[validationResult.suggestedRiskLevel] || ''}
                            >
                              {validationResult.suggestedRiskLevelLabel}
                            </Badge>
                          </div>
                          {validationResult.requiresDpia && (
                            <div className="flex items-center gap-2 text-orange-600 mt-2">
                              <FileCheck className="h-4 w-4" />
                              <span className="font-medium">DPIA (Analyse d&apos;Impact) requise</span>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult?.warnings && validationResult.warnings.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Avertissements</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            {validationResult.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {errors.lawfulBasis && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.lawfulBasis}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label>Base légale (Art. 6 RGPD) *</Label>
                      <RadioGroup value={lawfulBasis} onValueChange={handleLawfulBasisChange}>
                        <div className="space-y-3">
                          {(lawfulBasisOptions.length > 0 ? lawfulBasisOptions : LAWFUL_BASIS_OPTIONS).map((opt) => (
                            <div
                              key={opt.value}
                              className={`flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                                lawfulBasis === opt.value
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => handleLawfulBasisChange(opt.value)}
                            >
                              <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={opt.value} className="font-medium cursor-pointer">
                                    {opt.label}
                                  </Label>
                                  {'isRecommended' in opt && (opt as LawfulBasisOption).isRecommended ? (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      <Check className="h-3 w-3 mr-1" />
                                      Recommandé
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Step 5: Validation */}
            {step === 5 && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vérifiez les informations avant de créer la finalité.
                    Une fois créée, certains champs RGPD ne pourront plus être modifiés.
                  </AlertDescription>
                </Alert>

                {/* Summary */}
                <div className="rounded-lg border p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Récapitulatif</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Nom</span>
                      <p className="font-medium">{label}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Base légale</span>
                      <p className="font-medium">
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {LAWFUL_BASIS_OPTIONS.find((o) => o.value === lawfulBasis)?.label || lawfulBasis}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground w-full">Données impliquées:</span>
                    {dataClasses.map((dc) => (
                      <Badge key={dc} variant="outline">
                        {DATA_CLASS_OPTIONS.find((o) => o.value === dc)?.label || dc}
                      </Badge>
                    ))}
                  </div>

                  {validationResult && (
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Niveau de risque:</span>
                      <Badge
                        variant="outline"
                        className={RISK_COLORS[validationResult.suggestedRiskLevel] || ''}
                      >
                        {validationResult.suggestedRiskLevelLabel}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* DPIA Acknowledgment */}
                {validationResult?.requiresDpia && (
                  <Alert variant="destructive">
                    <FileCheck className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      DPIA obligatoire (Art. 35 RGPD)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md p-4">
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold">Qu&apos;est-ce qu&apos;une DPIA ?</p>
                            <p>
                              L&apos;Analyse d&apos;Impact sur la Protection des Données (DPIA) est une
                              <strong> obligation légale</strong> pour les traitements à risque élevé,
                              <strong> indépendamment du consentement</strong> des utilisateurs.
                            </p>
                            <p>
                              Elle doit être réalisée <strong>avant</strong> la mise en production par votre
                              organisation (DPO, responsable de traitement).
                            </p>
                            <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
                              <p className="font-medium">La DPIA doit documenter :</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Les risques pour les droits des personnes</li>
                                <li>Les mesures de protection mises en place</li>
                                <li>La validation par le DPO</li>
                              </ul>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </AlertTitle>
                    <AlertDescription className="space-y-4">
                      <div className="space-y-2">
                        <p>
                          Ce traitement présente un <strong>risque élevé</strong> pour les droits des personnes.
                          Le RGPD (Art. 35) impose une analyse d&apos;impact <strong>avant toute mise en production</strong>,
                          même si les utilisateurs donnent leur consentement.
                        </p>
                        <p className="text-sm">
                          Vous pouvez créer cette finalité maintenant, mais elle ne doit <strong>pas être activée</strong> tant
                          que votre DPO n&apos;a pas réalisé et validé la DPIA.
                        </p>
                      </div>
                      <div
                        className="flex items-start space-x-4 p-4 rounded-lg border bg-background cursor-pointer"
                        onClick={() => setAcknowledgeDpia(!acknowledgeDpia)}
                      >
                        <Checkbox
                          checked={acknowledgeDpia}
                          onCheckedChange={(checked) => setAcknowledgeDpia(!!checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                        <div>
                          <p className="font-medium">
                            Je reconnais l&apos;obligation de réaliser une DPIA
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Je m&apos;engage à faire valider cette finalité par mon DPO avant de l&apos;activer en production
                          </p>
                        </div>
                      </div>
                      {errors.dpia && (
                        <p className="text-sm font-medium">{errors.dpia}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* isRequired Setting - RGPD controlled based on lawfulBasis */}
                <div className={`flex items-center justify-between rounded-lg border p-4 ${isRequiredLocked ? 'bg-muted/50' : ''}`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="isRequired" className="text-base">
                        Consentement obligatoire
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm p-4">
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold">Comment fonctionne ce paramètre ?</p>
                            <p>
                              <strong>Activé :</strong> L&apos;utilisateur <em>doit</em> accepter cette finalité
                              pour accéder au service IA correspondant. Sans acceptation, le service est bloqué.
                            </p>
                            <p>
                              <strong>Désactivé :</strong> L&apos;utilisateur <em>peut</em> refuser cette finalité.
                              Il garde accès à l&apos;application, mais pas à ce service IA spécifique.
                            </p>
                            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                              Le RGPD impose que le consentement soit libre (Art. 7.4).
                              Pour les bases légales &quot;Contrat&quot; ou &quot;Obligation légale&quot;,
                              ce paramètre est automatiquement activé car le traitement est nécessaire au service.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      {isRequiredLocked && (
                        <Badge variant="secondary" className="text-xs">
                          Verrouillé
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRequiredLocked
                        ? isRequiredConfig?.message
                        : 'Les utilisateurs devront accepter cette finalité pour utiliser le service IA associé'}
                    </p>
                    {isRequiredLocked && (
                      <p className="text-xs text-primary mt-1">
                        {isRequired
                          ? 'Activé automatiquement : ce traitement est nécessaire au service.'
                          : 'Désactivé automatiquement : le consentement doit rester libre.'}
                      </p>
                    )}
                  </div>
                  <Switch
                    id="isRequired"
                    checked={isRequired}
                    onCheckedChange={setIsRequired}
                    disabled={isRequiredLocked}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>

            {step < 5 ? (
              <Button onClick={handleNext} disabled={validatePurpose.isPending}>
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createPurpose.isPending || (validationResult?.requiresDpia && !acknowledgeDpia)}
              >
                <Save className="mr-2 h-4 w-4" />
                {createPurpose.isPending ? 'Création...' : 'Créer la finalité'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  )
}
