/** Prevent delivery of unresolved legacy recordings when generation is quota-blocked. Dry-run unless --apply. */
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { record } from '../src/lib/quality/item-evidence-audit.js';
import { resolveListeningScript } from '../src/lib/audio/tts-generator.js';
import { normalizeSpeakerLabels, stripListeningWorksheet } from '../src/lib/audio/speaker-labels.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.item.findMany({ where: { skill: 'LISTENING', status: 'ACTIVE' } });
  const affected = rows.filter(row => {
    const c = record(row.content), pending = record(record(row.metadata).pendingAudioReplacement);
    const script = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(c)));
    return /^\s*\[[^\]\n]+\]:/m.test(String(c.ttsScript || ''))
      && pending.sourceHash !== createHash('sha256').update(script).digest('hex');
  });
  const coverage = Object.fromEntries([...new Set(affected.map(r => r.cefrLevel))].map(level => [level,
    rows.filter(r => r.cefrLevel === level).length - affected.filter(r => r.cefrLevel === level).length]));
  if (Object.values(coverage).some(n => n < 10)) throw new Error('Insufficient remaining active listening coverage for automatic quarantine');
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', affectedItems: affected.length, remainingActiveByLevel: coverage }));
  if (!process.argv.includes('--apply') || !affected.length) return;
  const dir = path.resolve('reports/item-evidence'); mkdirSync(dir, { recursive: true, mode: 0o700 });
  const at = new Date().toISOString(), backupPath = path.join(dir, `quarantine-backup-${at.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupPath, JSON.stringify({ at, items: affected }, null, 2), { mode: 0o600 });
  await prisma.$transaction(async tx => {
    for (const row of affected) {
      const result = await tx.item.updateMany({ where: { id: row.id, version: row.version, updatedAt: row.updatedAt, status: 'ACTIVE' },
        data: { status: 'REVIEW', pipelineStage: 'FLAGGED', version: { increment: 1 }, metadata: {
          ...record(row.metadata), editorialQuarantine: { at, reason: 'LEGACY_DIALOGUE_REPAIR_QUOTA_BLOCKED',
            previousStatus: row.status, previousStage: row.pipelineStage, humanReviewRequired: true, backupFile: path.basename(backupPath) },
        } as Prisma.InputJsonValue } });
      if (result.count !== 1) throw new Error('Concurrent revision; quarantine rolled back');
    }
  });
  console.log(JSON.stringify({ quarantinedItems: affected.length, backupPath, remainingActiveByLevel: coverage }));
}
main().catch(() => { console.error('Quarantine stopped: coverage or concurrency checks failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
