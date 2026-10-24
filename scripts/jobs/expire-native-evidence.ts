// Dry run by default. Operates only on the versioned native camera evidence namespace.
import { PrismaClient } from '@prisma/client';
import { deletePrivateObject, type StorageReference } from '../../src/lib/storage/private-storage.js';
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
async function main() {
  const now = new Date().toISOString();
  const rows = await db.proctoringEvent.findMany({ where: {
    id: { startsWith: 'evidence_' }, type: { in: ['SCREENSHOT', 'EVIDENCE_PENDING'] },
    metadata: { path: ['expiresAt'], lte: now },
  }, take: 100, orderBy: { timestamp: 'asc' } });
  let expired = 0;
  for (const row of rows) {
    const metadata = row.metadata as any;
    const reference = metadata?.reference as StorageReference | undefined;
    if (!reference || reference.key !== `native/${row.sessionId}/${row.id.slice('evidence_'.length)}.jpg`
      || metadata?.reservation?.version !== 1 || !(Date.parse(metadata.expiresAt) <= Date.now())) throw Error('Unexpected native evidence retention record');
    if (!apply) continue;
    await deletePrivateObject(reference);
    await db.proctoringEvent.update({ where: { id: row.id }, data: { type: 'EVIDENCE_EXPIRED', metadata: {
      reason: 'native-baseline-expired', platform: metadata.reservation.platform, expiresAt: metadata.expiresAt,
      expiredAt: new Date().toISOString(), reservationDigest: metadata.reservationDigest,
    } } });
    expired++;
  }
  console.log(JSON.stringify({ dryRun: !apply, eligible: rows.length, expired, batchLimit: 100 }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(() => db.$disconnect());
