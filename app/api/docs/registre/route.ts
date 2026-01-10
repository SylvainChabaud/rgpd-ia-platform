/**
 * API Endpoint: GET /api/docs/registre
 *
 * RGPD: Art. 30 (Registre des traitements)
 * Classification: P0 (document public interne)
 * Access: SUPER_ADMIN, DPO uniquement
 *
 * LOT 10.4 — Registre des Traitements
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import { authenticateRequest } from '@/app/middleware/auth';
import { requirePermission } from '@/app/middleware/rbac';
import { emitAuditEvent } from '@/infrastructure/audit/auditService';

export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Only SUPER_ADMIN or DPO can access
    const hasPermission = requirePermission(user, ['registre:read'], {
      allowedRoles: ['SUPERADMIN', 'DPO'],
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only SUPER_ADMIN or DPO can access registre' },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), 'docs', 'rgpd', 'registre-traitements.md');
    const markdown = await readFile(filePath, 'utf-8');

    // Parse markdown to HTML with GitHub Flavored Markdown enabled
    const html = await marked(markdown, {
      breaks: false,  // Don't convert single \n to <br> (use proper paragraph breaks)
      gfm: true,      // GitHub Flavored Markdown (tables, strikethrough, etc.)
    });

    // Extract metadata
    const lastModifiedMatch = markdown.match(/Dernière mise à jour[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);

    const response = {
      title: 'Registre des Traitements (Art. 30 RGPD)',
      content: html,
      markdownContent: markdown,
      lastModified: lastModifiedMatch ? lastModifiedMatch[1] : null,
      validatedBy: validatedByMatch ? validatedByMatch[1].trim() : null,
      treatmentsCount: (markdown.match(/^## Traitement \d+/gm) || []).length,
    };

    // Audit event
    await emitAuditEvent({
      eventType: 'docs.registre.accessed',
      actorId: user.id,
      tenantId: user.tenantId || null,
      metadata: {
        accessedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching registre:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
