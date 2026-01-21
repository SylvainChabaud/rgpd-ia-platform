/**
 * API Endpoint: GET /api/docs/dpia/export
 *
 * RGPD: Art. 35 (DPIA Gateway LLM) - Export PDF
 * Classification: P0 (document interne confidentiel)
 * Access: SUPERADMIN, DPO uniquement
 *
 * LOT 10.5 — DPIA Gateway LLM (Export PDF pour documentation conformité)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { authenticateRequest } from "@/app/middleware/auth";
import { createAuditDependencies } from "@/app/dependencies";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { logError } from "@/shared/logger";
import { ACTOR_ROLE } from "@/shared/actorRole";
import type { ActorScope } from "@/shared/actorScope";
import {
  generateMarkdownPdf,
  PDF_THEMES,
} from "@/lib/pdf/markdownPdfGenerator";

/**
 * DPIA-specific title patterns for PDF formatting
 */
const DPIA_TITLE_PATTERNS = {
  main: [
    /^(Résumé exécutif|Description systématique|Nécessité et proportionnalité|Évaluation des risques|Mesures d'atténuation|Droits des personnes|Consultations|Validation et suivi|Conclusion|Références)/i,
  ],
  sub: [
    /^(Risque \d+|Traitement concerné|Risque global|Principales mesures|Nature du traitement|Architecture technique|Technologies utilisées|Acteurs|Nécessité du traitement|Proportionnalité|Méthodologie|Approbation|Révisions prévues|Traçabilité|Acceptabilité du risque|Recommandations)/i,
  ],
  section: [
    /^(Description|Impact|Vraisemblance|Risque brut|Mesures d'atténuation|Risque résiduel|Personnes concernées)/i,
  ],
};

export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;

    // RBAC: Only SUPERADMIN or DPO can access
    const allowedRoles = [ACTOR_ROLE.SUPERADMIN, ACTOR_ROLE.DPO];
    const isAuthorized = allowedRoles.includes(
      user.role as (typeof allowedRoles)[number]
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Only SUPERADMIN or DPO can export DPIA" },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), "docs", "rgpd", "dpia.md");
    const markdown = await readFile(filePath, "utf-8");

    // Extract metadata from markdown
    const dateMatch = markdown.match(/Date de réalisation[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);
    const nextRevisionMatch = markdown.match(/Prochaine révision[:\s]+([0-9-]+)/);
    const riskLevelMatch = markdown.match(
      /Risque global[:\s\n]+[🔴🟡🟢]+\s+\*\*(.+?)\*\*/
    );
    const risksCount = (markdown.match(/###.*Risque \d+/g) || []).length;

    // Generate PDF using shared generator
    const pdfBuffer = generateMarkdownPdf(markdown, {
      title: "DPIA Gateway LLM",
      subtitle: "Article 35 RGPD - Analyse d'Impact relative à la Protection des Données",
      theme: PDF_THEMES.dpia,
      fields: {
        "Date de réalisation": dateMatch?.[1] ?? "Non renseignée",
        "Validé par": validatedByMatch?.[1]?.trim() ?? "En attente DPO",
        "Prochaine révision": nextRevisionMatch?.[1] ?? "À déterminer",
        "Niveau de risque résiduel": riskLevelMatch?.[1] ?? "UNKNOWN",
        "Nombre de risques évalués": risksCount,
        "Date d'export": new Date().toLocaleDateString("fr-FR"),
      },
      confidentialityNotice: [
        "CONFIDENTIEL - Document soumis au secret professionnel (Art. 35.10 RGPD)",
        "Ne peut être communiqué qu'à la CNIL sur demande expresse",
      ],
      footerText: "DPIA Gateway LLM (Art. 35 RGPD) - CONFIDENTIEL",
      titlePatterns: DPIA_TITLE_PATTERNS,
    });

    // Audit event (via dependency injection - BOUNDARIES.md section 11)
    const deps = createAuditDependencies();
    await emitAuditEvent(deps.auditEventWriter, {
      id: crypto.randomUUID(),
      eventName: "docs.dpia.exported",
      actorScope: user.scope as ActorScope,
      actorId: user.id,
      tenantId: user.tenantId ?? undefined,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "pdf",
        riskLevel: riskLevelMatch?.[1] ?? "UNKNOWN",
      },
    });

    // Return PDF file
    const filename = `dpia-gateway-llm-${new Date().toISOString().split("T")[0]}.pdf`;
    const buffer = Buffer.from(pdfBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    logError("docs.dpia.export_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
