/**
 * API Endpoint: GET /api/docs/registre/export
 *
 * RGPD: Art. 30 (Registre des traitements) - Export PDF
 * Classification: P0 (document public interne)
 * Access: SUPER_ADMIN, DPO uniquement
 *
 * LOT 10.4 — Registre des Traitements (Export PDF pour audit CNIL)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { authenticateRequest } from "@/app/middleware/auth";
import { requirePermission } from "@/app/middleware/rbac";
import { createAuditDependencies } from "@/app/dependencies";
import { emitAuditEvent } from "@/app/audit/emitAuditEvent";
import { logError } from "@/shared/logger";
import type { ActorScope } from "@/shared/actorScope";
import {
  generateMarkdownPdf,
  PDF_THEMES,
} from "@/lib/pdf/markdownPdfGenerator";

/**
 * Registre-specific title patterns for PDF formatting
 */
const REGISTRE_TITLE_PATTERNS = {
  main: [
    /^(Traitement \d+|Responsable|Sous-traitants|Mesures|Droits|Révisions|Validation|Références)/i,
  ],
  sub: [],
};

export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC: Only SUPERADMIN or DPO can access
    const hasPermission = requirePermission(user, ["registre:export"], {
      allowedRoles: ["SUPERADMIN", "DPO"],
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden: Only SUPER_ADMIN or DPO can export registre" },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), "docs", "rgpd", "registre-traitements.md");
    const markdown = await readFile(filePath, "utf-8");

    // Extract metadata from markdown
    const lastModifiedMatch = markdown.match(/Dernière mise à jour[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);
    const treatmentsCount = (markdown.match(/^## Traitement \d+/gm) || []).length;

    // Generate PDF using shared generator
    const pdfBuffer = generateMarkdownPdf(markdown, {
      title: "Registre des Traitements",
      subtitle: "Article 30 RGPD - Document obligatoire",
      theme: PDF_THEMES.registre,
      fields: {
        "Dernière mise à jour": lastModifiedMatch?.[1] ?? "Non renseignée",
        "Validé par": validatedByMatch?.[1]?.trim() ?? "En attente DPO",
        "Nombre de traitements recensés": treatmentsCount,
        "Date d'export": new Date().toLocaleDateString("fr-FR"),
      },
      footerText: "Registre des Traitements RGPD - Confidentiel",
      titlePatterns: REGISTRE_TITLE_PATTERNS,
    });

    // Audit event (via dependency injection - BOUNDARIES.md section 11)
    const deps = createAuditDependencies();
    await emitAuditEvent(deps.auditEventWriter, {
      id: crypto.randomUUID(),
      eventName: "docs.registre.exported",
      actorScope: user.scope as ActorScope,
      actorId: user.id,
      tenantId: user.tenantId ?? undefined,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "pdf",
      },
    });

    // Return PDF file
    const filename = `registre-traitements-${new Date().toISOString().split("T")[0]}.pdf`;
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
    logError("docs.registre.export_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
