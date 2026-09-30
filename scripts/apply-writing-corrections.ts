/** Dry run by default; backups and compare-and-swap updates protect original evidence. */
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { writingCorrectionPlan } from '../src/lib/quality/writing-content-audit.js';
import { record } from '../src/lib/quality/item-evidence-audit.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
const inspectedMissingSourceIds = new Set([
  'cmp0ch3t7000hnuda6puyru5n', 'cmp0cv27v000znudapfdxkyfp', 'cmp0coo92000qnudavott9hoc',
  'cmp0c5lrr0006nuda1422jat4', 'cmp0ch3px000fnuda2pqr4kfo', 'cmp0cv26d000ynudar1buzed8',
  'cmp0c5lws0008nudaj8w9usun', 'cmp0coo5v000onuda8rqvahn3', 'cmp0c5lv60007nuda5yi0pyvc',
  'cmp0cv24n000xnudaefstlr8c', 'cmp0ch3rk000gnudagdbt5clc',
]);
async function main() {
  const rows = await prisma.item.findMany({ where: { skill: 'WRITING', status: { in: ['ACTIVE', 'PRETEST'] } } });
  const changes = rows.map(item => ({ item, plan: writingCorrectionPlan(item.status, item.content) })).filter(c => c.plan.changed);
  // Missing-source decisions have been individually inspected in this pilot batch.
  // Never remove an ACTIVE item using a heuristic alone.
  if (changes.some(c => c.plan.quarantine && (c.item.status !== 'PRETEST' || !inspectedMissingSourceIds.has(c.item.id))))
    throw new Error('Uninspected source gap requires adjudication');
  const summary = { changedItems: changes.length, pilotRangeRevisions: changes.filter(c => c.plan.rangeRevised).length,
    missingSourceQuarantines: changes.filter(c => c.plan.quarantine).length, activeDeliveryLimitsPreserved: true };
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', ...summary,
    quarantineIds: changes.filter(c => c.plan.quarantine).map(c => c.item.id) }, null, 2));
  if (!process.argv.includes('--apply') || !changes.length) return;
  const at = new Date().toISOString(), dir = path.resolve('reports/item-evidence');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const backup = path.join(dir, `writing-backup-${at.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backup, JSON.stringify({ at, items: changes.map(c => c.item) }, null, 2), { mode: 0o600 });
  await prisma.$transaction(async tx => {
    for (const { item, plan } of changes) {
      const m = record(item.metadata), semantic = plan.rangeRevised || plan.quarantine;
      const updated = await tx.item.updateMany({ where: { id: item.id, version: item.version, updatedAt: item.updatedAt, status: item.status }, data: {
        content: plan.next as Prisma.InputJsonValue, version: { increment: 1 },
        ...(plan.quarantine ? { status: 'REVIEW', pipelineStage: 'FLAGGED' } : plan.rangeRevised ? { pipelineStage: 'EDITING' } : {}),
        metadata: { ...m,
          ...(semantic ? { humanReviewRequired: true, validationEvidenceStatus: 'PENDING_AFTER_CONTENT_REVISION' } : {}),
          ...(plan.quarantine ? { editorialQuarantine: { at, reason: 'WRITING_REQUIRED_SOURCE_MISSING', previousStatus: item.status, backupFile: path.basename(backup) } } : {}),
          editorialCorrections: [...(Array.isArray(m.editorialCorrections) ? m.editorialCorrections : []), {
            at, previousVersion: item.version, backupFile: path.basename(backup), approvedByHuman: false,
            reason: plan.quarantine ? 'WRITING_REQUIRED_SOURCE_MISSING' : plan.rangeRevised ? 'ALIGN_PILOT_EDITOR_WITH_AUTHORED_WORD_RANGE' : 'ALIGN_WRITING_ALIASES_WITH_RENDERER',
          }] } as Prisma.InputJsonValue,
      } });
      if (updated.count !== 1) throw new Error('Concurrent modification; batch rolled back');
    }
  }, { timeout: 60000 });
  console.log(JSON.stringify({ applied: summary, backupPath: backup }));
}
main().catch(() => { console.error('Writing correction failed; inspect backup and concurrency state.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
