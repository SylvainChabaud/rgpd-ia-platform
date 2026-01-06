import { NextResponse } from 'next/server';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DpoContactRequestSchema, validateBody } from '@/lib/validation';
import { PgAuditEventWriter } from '@/infrastructure/audit/PgAuditEventWriter';
import { emitAuditEvent } from '@/app/audit/emitAuditEvent';
import { ACTOR_SCOPE } from '@/shared/actorScope';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await validateBody(request, DpoContactRequestSchema);

    const requestId = randomUUID();
    const receivedAt = new Date();

    const record = {
      id: requestId,
      receivedAt: receivedAt.toISOString(),
      requestType: body.requestType,
      email: body.email,
      message: body.message,
    };

    const dirPath = join(process.cwd(), 'data', 'dpo-requests');
    await mkdir(dirPath, { recursive: true });
    await appendFile(
      join(dirPath, 'requests.jsonl'),
      `${JSON.stringify(record)}\n`,
      'utf-8'
    );

    const auditWriter = new PgAuditEventWriter();
    await emitAuditEvent(auditWriter, {
      id: randomUUID(),
      eventName: 'dpo.contact.submitted',
      actorScope: ACTOR_SCOPE.PLATFORM,
      actorId: undefined, // Anonymous user - no identifier stored
      tenantId: undefined,
      metadata: {
        requestId,
        requestType: body.requestType,
        requestLength: body.message.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        receivedAt: receivedAt.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    const isValidationError = Boolean(
      error && typeof error === 'object' && 'issues' in error
    );

    return NextResponse.json(
      { error: isValidationError ? 'Invalid request' : 'Internal server error' },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
