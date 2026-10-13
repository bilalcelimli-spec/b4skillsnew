import { prisma } from '../prisma.js';
import { logger } from '../observability/index.js';

/** Serialize refreshes per session; persist retry intent with each committed grade. */
const refreshes = new Map<string, Promise<void>>();
export async function refreshScoredSession(sessionId: string): Promise<void> {
  const previous = refreshes.get(sessionId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    // Snapshot before rebuilding. A newer grade must retain its retry marker if
    // it commits during this refresh, even when the same response is re-rated.
    const pending = await prisma.response.findMany({
      where: { sessionId, metadata: { path: ['reportRefreshPending'], equals: true } },
      select: { id: true, metadata: true },
    });
    const { AssessmentService } = await import('../assessment-engine/server-engine.js');
    await AssessmentService.refreshSessionScoring(sessionId);
    for (const response of pending) {
      const metadata = response.metadata as Record<string, any>;
      await prisma.response.updateMany({
        where: { id: response.id, metadata: { equals: response.metadata! } },
        data: { metadata: { ...metadata, reportRefreshPending: false } },
      });
    }
  });
  refreshes.set(sessionId, next);
  try { await next; }
  finally { if (refreshes.get(sessionId) === next) refreshes.delete(sessionId); }
}

let recoveryCursor: string | undefined;
let recoveryInFlight: Promise<number> | undefined;
/** Durable retry after DB outages/restarts, without re-running AI or human rating. */
export function recoverPendingReportRefreshes(): Promise<number> {
  if (recoveryInFlight) return recoveryInFlight;
  recoveryInFlight = recoverBatch().finally(() => { recoveryInFlight = undefined; });
  return recoveryInFlight;
}
async function recoverBatch(): Promise<number> {
  const rows = await prisma.response.groupBy({
    by: ['sessionId'],
    where: { metadata: { path: ['reportRefreshPending'], equals: true },
      session: { status: { in: ['IN_PROGRESS', 'PAUSED', 'SCORING', 'COMPLETED', 'FLAGGED'] } },
      ...(recoveryCursor ? { sessionId: { gt: recoveryCursor } } : {}),
    },
    orderBy: { sessionId: 'asc' }, take: 25,
  });
  let recovered = 0;
  for (const { sessionId } of rows) {
    recoveryCursor = sessionId;
    try { await refreshScoredSession(sessionId); recovered++; }
    catch (err) { logger.error({ err, sessionId }, 'scoring: pending report refresh failed'); }
  }
  if (rows.length < 25) recoveryCursor = undefined;
  return recovered;
}
