/** Dry-run by default. Only the three inspected items; backup + atomic version checks. */
import { config } from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { reviewedWritingRevision } from '../src/lib/quality/reviewed-writing-revisions.js';
import { writingContentFindings } from '../src/lib/quality/writing-content-audit.js';
import { record } from '../src/lib/quality/item-evidence-audit.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const db = new PrismaClient();
const ids = ['cmorvaow50006nuwgupilf6qv', 'cmorvapnw000onuwg0muihsha', 'cmorvapvo000tnuwgspsqr5re'];
async function main() {
  const rows = await db.item.findMany({ where: { id: { in: ids }, skill: 'WRITING' } });
  if (rows.length !== ids.length) throw new Error('Inspected item missing');
  const changes = rows.flatMap(item => {
    const revision = reviewedWritingRevision(item.content);
    if (!revision) return [];
    if (!['ACTIVE', 'PRETEST', 'REVIEW'].includes(item.status)) throw new Error('Unexpected status');
    if (writingContentFindings(revision.next).some(f => f.severity === 'BLOCKER' || f.severity === 'REVIEW'))
      throw new Error('Replacement fails content checks');
    return [{ item, revision }];
  });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    changes: changes.map(({ item, revision }) => ({ id: item.id, code: item.itemCode, reason: revision.reason,
      status: revision.substantive ? 'REVIEW' : item.status })) }, null, 2));
  if (!process.argv.includes('--apply') || !changes.length) return;
  const at = new Date().toISOString(), dir = path.resolve('reports/item-evidence');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const backup = path.join(dir, `inspected-writing-backup-${at.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backup, JSON.stringify({ at, items: changes.map(c => c.item) }, null, 2), { mode: 0o600 });
  await db.$transaction(async tx => {
    const changingIds = changes.map(c => c.item.id);
    const open = await tx.session.count({ where: { status: 'IN_PROGRESS',
      OR: changingIds.map(id => ({ metadata: { path: ['currentItemId'], equals: id } })) } });
    const pending = await tx.response.count({ where: { itemId: { in: changingIds }, score: null } });
    if (open || pending) throw new Error('Inspected tasks are currently in use; no revisions applied');
    for (const { item, revision } of changes) {
      const m = record(item.metadata);
      const changed = await tx.item.updateMany({ where: { id: item.id, version: item.version, updatedAt: item.updatedAt, status: item.status },
        data: { content: revision.next as Prisma.InputJsonValue, version: { increment: 1 },
          ...(revision.substantive ? { status: 'REVIEW', pipelineStage: 'EDITING' } : {}),
          metadata: { ...m, humanReviewRequired: true, validationEvidenceStatus: 'PENDING_AFTER_CONTENT_REVISION',
            editorialCorrections: [...(Array.isArray(m.editorialCorrections) ? m.editorialCorrections : []), {
              at, reason: revision.reason, previousVersion: item.version, previousStatus: item.status,
              approvedByHuman: false, backupFile: path.basename(backup),
            }] } as Prisma.InputJsonValue } });
      if (changed.count !== 1) throw new Error('Concurrent change; transaction rolled back');
    }
  });
  console.log(JSON.stringify({ applied: changes.length, backup }));
}
main().catch(() => { console.error('Inspected writing revision failed; check the backup and item versions.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
