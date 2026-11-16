import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { deletePrivateObject, type StorageReference } from '../storage/private-storage.js';

type Writer = Pick<Prisma.TransactionClient, 'erasureObject' | 'erasureLedger'>;
export async function queueObjectErasure(db: Writer, reference: StorageReference) {
  const id = createHash('sha256').update(JSON.stringify(reference)).digest('hex');
  await db.erasureObject.upsert({ where: { id }, create: { id, generation: randomUUID(), nextAttemptAt: new Date(0), reference: { ...reference } },
    update: { generation: randomUUID(), reference: { ...reference }, deletedAt: null, nextAttemptAt: new Date(0) } });
  return id;
}
export async function erasureReceipt(db: Writer, targetType: string, targetId: string, reason: string) {
  await db.erasureLedger.upsert({ where: { targetType_targetId: { targetType, targetId } },
    create: { targetType, targetId, reason }, update: {} });
}

/** A crash after the object deletion is safe: both storage providers delete idempotently.
 * Completed rows contain only a digest, timestamps and attempts, not a storage path.
 */
export async function drainErasureObjects(db: PrismaClient, remove = deletePrivateObject, now = new Date(), take = 200) {
  const rows = await db.erasureObject.findMany({ where: { deletedAt: null, nextAttemptAt: { lte: now } },
    orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take });
  let deleted = 0, failed = 0;
  for (const row of rows) {
    try {
      const ref = row.reference as unknown as StorageReference;
      if (!ref || !['s3', 'supabase'].includes(ref.provider) || !ref.bucket || !ref.key) throw new Error('Invalid deletion reference');
      await remove(ref);
      const completed = await db.erasureObject.updateMany({ where: { id: row.id, generation: row.generation }, data: { reference: Prisma.DbNull, deletedAt: now, attempts: { increment: 1 } } });
      deleted += completed.count;
    } catch {
      failed++;
      await db.erasureObject.updateMany({ where: { id: row.id, generation: row.generation }, data: { attempts: { increment: 1 },
        nextAttemptAt: new Date(now.getTime() + Math.min(3600, 60 * 2 ** Math.min(row.attempts, 6)) * 1000) } });
    }
  }
  return { deleted, failed, pending: await db.erasureObject.count({ where: { deletedAt: null } }) };
}

/** Never fetch arbitrary URLs or delete a bucket merely because a response names it. */
export function legacyArtifactReference(value: string | null): StorageReference | null {
  if (!value) return null;
  const url = new URL(value);
  const allowed = (process.env.LEGACY_RESPONSE_BUCKETS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (url.protocol === 's3:' && allowed.includes(url.hostname)) {
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key || key.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('Invalid legacy artifact');
    return { provider: 's3', bucket: url.hostname, key };
  }
  if (process.env.SUPABASE_URL && url.origin === new URL(process.env.SUPABASE_URL).origin) {
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:authenticated|sign|public)\/([^/]+)\/(.+)$/);
    if (match && allowed.includes(match[1])) {
      const key = decodeURIComponent(match[2]);
      if (key.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('Invalid legacy artifact');
      return { provider: 'supabase', bucket: match[1], key };
    }
  }
  throw new Error('Unresolved legacy artifact: configure its owned bucket before erasure');
}

/** Legal holds must have an owner, reference and review deadline. Invalid holds require review. */
export function retentionHold(metadata: unknown, now: Date): boolean {
  const hold = (metadata as any)?.retentionHold;
  if (!hold) return false;
  if (typeof hold !== 'object' || !hold.reference || !hold.owner || !Number.isFinite(Date.parse(hold.until))) return true;
  return Date.parse(hold.until) > now.getTime();
}
