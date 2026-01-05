/**
 * API Endpoint: GET /api/docs/dpia
 *
 * RGPD: Art. 35 (DPIA Gateway LLM)
 * Classification: P0 (document interne confidentiel)
 * Access: SUPER_ADMIN, DPO uniquement
 *
 * LOT 10.5 — DPIA Gateway LLM
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
    const hasPermission = requirePermission(user, ['dpia:read'], {
      allowedRoles: ['SUPER_ADMIN', 'DPO'],
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only SUPER_ADMIN or DPO can access DPIA' },
        { status: 403 }
      );
    }

    // Read markdown file
    const filePath = join(process.cwd(), 'docs', 'rgpd', 'dpia.md');
    const markdown = await readFile(filePath, 'utf-8');

    // Parse markdown to HTML
    const html = await marked(markdown);

    // Extract metadata
    const dateMatch = markdown.match(/Date de réalisation[:\s]+([0-9-]+)/);
    const validatedByMatch = markdown.match(/Validé par[:\s]+(.+)/);
    const nextRevisionMatch = markdown.match(/Prochaine révision[:\s]+([0-9-]+)/);
    const riskLevelMatch = markdown.match(/Risque global[:\s\n]+[🔴🟡🟢]+\s+\*\*(.+?)\*\*/);

    const response = {
      title: 'DPIA — Analyse d\'Impact Gateway LLM (Art. 35 RGPD)',
      content: html,
      markdownContent: markdown,
      dateRealized: dateMatch ? dateMatch[1] : null,
      validatedBy: validatedByMatch ? validatedByMatch[1].trim() : null,
      nextRevision: nextRevisionMatch ? nextRevisionMatch[1] : null,
      riskLevel: riskLevelMatch ? riskLevelMatch[1] : 'UNKNOWN',
      risksCount: (markdown.match(/###.*Risque \d+/g) || []).length,
    };

    // Audit event
    await emitAuditEvent({
      eventType: 'docs.dpia.accessed',
      actorId: user.id,
      tenantId: user.tenantId || null,
      metadata: {
        accessedAt: new Date().toISOString(),
        riskLevel: response.riskLevel,
      },
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching DPIA:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
