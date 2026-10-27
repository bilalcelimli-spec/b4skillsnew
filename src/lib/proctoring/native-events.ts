import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { NativeProctoringEventBody } from '../security/schemas/proctoring.js';
import { AppError } from '../errors/app-error.js';

type Event = z.infer<typeof NativeProctoringEventBody>;
/** Call only after session ownership has been established by the authenticated route. */
export async function storeNativeEvent(db: Pick<PrismaClient, 'proctoringEvent'>, body: Event) {
  const canonical = { version: 2, eventId: body.eventId.toLowerCase(), sessionId: body.sessionId, sequence: body.sequence, platform: body.platform, eventType: body.eventType, timestamp: body.timestamp, severity: body.severity ?? 'INFO', metadata: Object.fromEntries(Object.entries(body.metadata ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
  const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  // Deterministic PK gives atomic duplicate suppression using the existing schema.
  const id = `native_${body.eventId.toLowerCase()}`;
  let event;
  try { event = await db.proctoringEvent.upsert({
    where: { id: `native_${body.eventId.toLowerCase()}` }, update: {},
    create: {
      id: `native_${body.eventId.toLowerCase()}`, sessionId: body.sessionId, type: body.eventType,
      severity: { INFO: 1, WARNING: 3, CRITICAL: 5 }[body.severity ?? 'INFO'],
      metadata: { ...body.metadata, nativeProtocol: { version: 2, eventId: body.eventId, sequence: body.sequence, platform: body.platform, occurredAt: body.timestamp, digest } },
    },
  }); } catch (error) {
    // Prisma may implement an empty-update upsert as read+insert; concurrent
    // inserts can race. The unique constraint still protects the row.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    event = await db.proctoringEvent.findUniqueOrThrow({ where: { id } });
  }
  const metadata = event.metadata as { nativeProtocol?: { digest?: string } } | null;
  if (event.sessionId !== body.sessionId || metadata?.nativeProtocol?.digest !== digest) {
    throw new AppError(409, 'EVENT_ID_CONFLICT', 'Olay kimliği farklı içerikle yeniden kullanılamaz.');
  }
  return { accepted: true as const, eventId: body.eventId, receivedAt: event.timestamp.toISOString() };
}
