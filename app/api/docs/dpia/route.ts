/**
 * API Endpoint: GET /api/docs/dpia
 *
 * RGPD: Art. 35 (DPIA Gateway LLM)
 * Classification: P0 (document interne confidentiel)
 * Access: SUPERADMIN, DPO uniquement
 *
 * LOT 10.5 — DPIA Gateway LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import { authenticateRequest } from '@/app/middleware/auth';
import { createAuditDependencies } from '@/app/dependencies';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { ACTOR_ROLE } from '@/shared/actorRole';
import type { ActorScope } from '@/shared/actorScope';

export async function GET(request: NextRequest) {
  // Dependencies (via factory - BOUNDARIES.md section 11)
  // Initialize ONCE at the start to avoid duplicate instantiation
  const deps = createAuditDependencies();

  try {
    // Authentication
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // RBAC: Only SUPERADMIN or DPO can access
    const allowedRoles = [ACTOR_ROLE.SUPERADMIN, ACTOR_ROLE.DPO];
    const isAuthorized = allowedRoles.includes(user.role as (typeof allowedRoles)[number]);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only SUPERADMIN or DPO can access DPIA' },
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
    await emitAuditEvent(deps.auditEventWriter, {
      id: crypto.randomUUID(),
      eventName: 'docs.dpia.accessed',
      actorScope: user.scope as ActorScope,
      actorId: user.id,
      tenantId: user.tenantId ?? undefined,
      metadata: {
        accessedAt: new Date().toISOString(),
        riskLevel: response.riskLevel,
      },
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    deps.logger.error({ event: 'docs.dpia.fetch_error', error: error instanceof Error ? error.message : 'Unknown error' }, 'Error fetching DPIA');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
