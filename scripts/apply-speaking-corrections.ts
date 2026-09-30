/** Dry run by default. --apply takes a backup and atomically applies version-guarded corrections. */
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { correctedSpeakingContent, speakingCorrections } from '../src/lib/quality/editorial-corrections.js';
import { record } from '../src/lib/quality/item-evidence-audit.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.item.findMany({ where: { skill: 'SPEAKING', status: { in: ['ACTIVE', 'PRETEST'] } } });
  const changes = items.flatMap(item => {
    const next = correctedSpeakingContent(item.id, item.content);
    return next ? [{ item, next, semantic: item.id in speakingCorrections }] : [];
  });
  // The two semantic revisions are pilot material, never automatically promoted to ACTIVE.
  if (changes.some(c => c.semantic && c.item.status !== 'PRETEST')) throw new Error('Semantic target is no longer PRETEST');
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    changedItems: changes.length, promptRevisions: changes.filter(c => c.semantic).length,
    actualResponseTimesPreserved: true }, null, 2));
  if (!process.argv.includes('--apply') || !changes.length) return;
  const dir = path.resolve('reports/item-evidence'); mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString(), backupPath = path.join(dir, `speaking-backup-${stamp.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupPath, JSON.stringify({ createdAt: stamp, items: changes.map(c => c.item) }, null, 2), { mode: 0o600 });
  await prisma.$transaction(async tx => {
    for (const { item, next, semantic } of changes) {
      const m = record(item.metadata);
      const change = await tx.item.updateMany({ where: { id: item.id, version: item.version, updatedAt: item.updatedAt, status: item.status },
        data: { content: next as Prisma.InputJsonValue, version: { increment: 1 },
          ...(semantic ? { pipelineStage: 'EDITING', isPretest: true } : {}),
          metadata: { ...m, ...(semantic ? { humanReviewRequired: true, validationEvidenceStatus: 'PENDING_AFTER_CONTENT_REVISION' } : {}),
            editorialCorrections: [...(Array.isArray(m.editorialCorrections) ? m.editorialCorrections : []), {
              at: stamp, previousVersion: item.version, reason: semantic ? 'SIMPLIFY_RESPONSE_LOAD_AND_ALIGN_RUBRIC' : 'ALIGN_UNUSED_TIME_ALIASES_WITH_RENDERER',
              backupFile: path.basename(backupPath), approvedByHuman: false,
              calibrationImpact: semantic ? 'REQUIRES_RENEWED_PILOT_EVIDENCE' : 'NO_CHANGE_TO_DELIVERED_PROMPT_OR_RESPONSE_TIME',
            }] } as Prisma.InputJsonValue } });
      if (change.count !== 1) throw new Error('Concurrent modification; entire batch rolled back');
    }
  }, { timeout: 60000 });
  console.log(JSON.stringify({ appliedItems: changes.length, backupPath, statusesPreserved: true }));
}
main().catch(() => { console.error('Speaking correction failed; check the backup and concurrency state.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
