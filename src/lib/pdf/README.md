# PDF Generator Module

> **RGPD Compliance**: Art. 30 (Registre), Art. 35 (DPIA) - Export documentation officielle

Module partagé de génération de PDF pour les documents RGPD (DPIA, Registre des traitements).

---

## Features

### Markdown to PDF Conversion

- Conversion automatique du markdown en texte formaté
- Suppression des éléments non imprimables (code blocks, emojis, images)
- Gestion des listes, headers, blockquotes
- Pagination automatique avec page breaks intelligents

### Thèmes pré-définis

| Thème | Usage | Couleur accent |
|-------|-------|----------------|
| `dpia` | DPIA Gateway LLM (Art. 35) | Purple (#8B5CF6) |
| `registre` | Registre des traitements (Art. 30) | Blue (#2563EB) |

### Métadonnées

- Titre et sous-titre personnalisables
- Boîte de métadonnées avec champs clé-valeur
- Notice de confidentialité optionnelle (DPIA)
- Footer avec pagination automatique

---

## Usage

```typescript
import {
  generateMarkdownPdf,
  PDF_THEMES,
  markdownToPlainText,
} from "@/lib/pdf/markdownPdfGenerator";

// Génération d'un PDF DPIA
const pdfBuffer = generateMarkdownPdf(markdownContent, {
  title: "DPIA Gateway LLM",
  subtitle: "Article 35 RGPD",
  theme: PDF_THEMES.dpia,
  fields: {
    "Date de réalisation": "2026-01-20",
    "Validé par": "DPO",
    "Niveau de risque": "MODÉRÉ",
  },
  confidentialityNotice: [
    "CONFIDENTIEL - Document soumis au secret professionnel",
  ],
  footerText: "DPIA Gateway LLM - CONFIDENTIEL",
  titlePatterns: {
    main: [/^Résumé exécutif$/i, /^Évaluation des risques$/i],
    sub: [/^Risque \d+$/i],
  },
});

// Conversion markdown vers texte (utilitaire)
const plainText = markdownToPlainText("# Header\n**Bold** text");
// → "Header\nBold text"
```

---

## API

### `generateMarkdownPdf(markdown, metadata): Uint8Array`

Génère un PDF à partir de contenu markdown.

**Paramètres** :
- `markdown: string` - Contenu markdown source
- `metadata: PdfDocumentMetadata` - Configuration du document

**Retour** : `Uint8Array` - Buffer PDF prêt à télécharger

### `markdownToPlainText(markdown): string`

Convertit du markdown en texte brut (utilitaire).

**Transformations** :
- Suppression code blocks (` ``` `)
- Suppression inline code (`` ` ``)
- Suppression formatage (**bold**, *italic*)
- Conversion headers (# → texte)
- Conversion listes (- → •)
- Suppression liens/images (garde le texte)
- Suppression emojis

### `PDF_THEMES`

Thèmes pré-définis pour les documents RGPD.

```typescript
PDF_THEMES.dpia     // Theme purple pour DPIA
PDF_THEMES.registre // Theme bleu pour Registre
```

---

## Intégration API Routes

### DPIA Export (`/api/docs/dpia/export`)

```typescript
import { generateMarkdownPdf, PDF_THEMES } from "@/lib/pdf/markdownPdfGenerator";

const pdfBuffer = generateMarkdownPdf(markdown, {
  title: "DPIA Gateway LLM",
  subtitle: "Article 35 RGPD",
  theme: PDF_THEMES.dpia,
  // ...
});

return new NextResponse(Buffer.from(pdfBuffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="dpia.pdf"`,
  },
});
```

### Registre Export (`/api/docs/registre/export`)

```typescript
import { generateMarkdownPdf, PDF_THEMES } from "@/lib/pdf/markdownPdfGenerator";

const pdfBuffer = generateMarkdownPdf(markdown, {
  title: "Registre des Traitements",
  subtitle: "Article 30 RGPD",
  theme: PDF_THEMES.registre,
  // ...
});
```

---

## Tests

```bash
# Tests unitaires
npm test -- markdownPdfGenerator

# Couverture
npm test -- --coverage markdownPdfGenerator
```

**Couverture** : 15 tests

| Catégorie | Tests |
|-----------|-------|
| `markdownToPlainText()` | 12 |
| `PDF_THEMES` | 2 |
| `generateMarkdownPdf()` | 6 |

Fichier : `tests/backend/unit/lib/markdownPdfGenerator.test.ts`

---

## Dépendances

- `jspdf` - Génération PDF (MIT License)

---

## Sécurité

- **Pas de données P2/P3 dans les logs** : Seuls les métadonnées (date, auteur) sont loggées
- **Audit event** : Chaque export génère un événement d'audit (`docs.dpia.exported`, `docs.registre.exported`)
- **Accès restreint** : SUPERADMIN et DPO uniquement

---

## Références

- [LOT 10.4 Implementation](../../../docs/implementation/LOT10_IMPLEMENTATION.md)
- [DPIA Document](../../../docs/rgpd/dpia.md)
- [Registre Document](../../../docs/rgpd/registre-traitements.md)

---

**Last Updated**: 2026-01-20
**Status**: ✅ Production-ready (15/15 tests passing)
