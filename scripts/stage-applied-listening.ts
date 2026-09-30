/** Restore only this repair run's live references, retaining new immutable assets as pending replacements. */
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { record } from '../src/lib/quality/item-evidence-audit.js';
import { resolveListeningScript } from '../src/lib/audio/tts-generator.js';
import { normalizeSpeakerLabels, stripListeningWorksheet } from '../src/lib/audio/speaker-labels.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
async function main() {
  const filename = path.resolve(process.argv[2] || '');
  if (!filename.startsWith(path.resolve('reports/item-evidence') + path.sep) || path.basename(filename) !== 'backup.json') throw new Error('Invalid backup path');
  const backup = JSON.parse(readFileSync(filename, 'utf8'));
  let restored = 0;
  for (const old of backup.items) {
    const current = await prisma.item.findUnique({ where: { id: old.id } });
    if (!current) throw new Error('Missing item');
    const c = record(current.content), m = record(current.metadata);
    const history = Array.isArray(m.editorialAudioRepairs) ? m.editorialAudioRepairs : [];
    if (history.at(-1)?.run !== backup.run) continue;
    if (current.version !== old.version + 1) throw new Error('Concurrent content revision; refusing restore');
    const source = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(record(old.content))));
    const result = await prisma.item.updateMany({ where: { id: current.id, version: current.version, updatedAt: current.updatedAt }, data: {
      content: old.content as Prisma.InputJsonValue, version: { increment: 1 }, metadata: {
        ...m, validationEvidenceStatus: 'AUDIO_REPAIR_STAGED_PENDING_PLAYER_DEPLOYMENT',
        pendingAudioReplacement: { run: backup.run, sourceHash: createHash('sha256').update(source).digest('hex'),
          audioUrl: c.audioUrl, ttsScript: c.ttsScript, transcript: c.transcript, audioMetadata: c.audioMetadata },
        editorialAudioRepairs: history.map((entry: any) => entry.run === backup.run ? { ...entry, state: 'STAGED_NOT_ACTIVE' } : entry),
      } as Prisma.InputJsonValue,
    } });
    if (result.count !== 1) throw new Error('Concurrent modification');
    restored++;
  }
  console.log(JSON.stringify({ restoredLiveReferences: restored, retainedAsPendingReplacements: restored, run: backup.run }));
}
main().catch(() => { console.error('Staging stopped; inspect backup and concurrent revisions.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
