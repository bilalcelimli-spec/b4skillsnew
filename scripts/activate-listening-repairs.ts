/** Dry-run unless --apply. Refuses activation until the deployed TestPlayer enables anonymous CORS. */
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
async function deployedPlayer() {
  const get = async (url: string) => {
    const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Deployment evidence unavailable');
    return response.text();
  };
  const html = await get('https://b4skills.com/');
  const entry = html.match(/src="(\/assets\/index-[\w-]+\.js)"/);
  if (!entry) throw new Error('Cannot identify deployed entry');
  const bundle = await get(`https://b4skills.com${entry[1]}`);
  const player = bundle.match(/(?:assets\/|\.\/)TestPlayer-[\w-]+\.js/);
  if (!player) throw new Error('Cannot identify deployed player');
  const url = `https://b4skills.com/assets/${path.basename(player[0])}`;
  const source = await get(url);
  if (!/crossOrigin:["']anonymous["'],src:[^,]+,preload:["']metadata["']/.test(source)) throw new Error('Deployed player does not enable anonymous CORS');
  return url;
}
async function main() {
  const rows = await prisma.item.findMany({ where: { skill: 'LISTENING', status: { in: ['ACTIVE', 'PRETEST'] } } });
  const staged = rows.filter(r => record(record(r.metadata).pendingAudioReplacement).audioUrl);
  const pending = staged.filter(row => {
    const replacement = record(record(row.metadata).pendingAudioReplacement);
    const source = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(record(row.content))));
    return replacement.sourceHash === createHash('sha256').update(source).digest('hex');
  });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', pendingItems: pending.length,
    skippedStaleSourceItems: staged.length - pending.length }));
  if (!process.argv.includes('--apply') || !pending.length) return;
  const playerUrl = await deployedPlayer();
  const storageOrigin = new URL(process.env.SUPABASE_URL!).origin;
  for (const row of pending) {
    const replacement = record(record(row.metadata).pendingAudioReplacement);
    const source = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(record(row.content))));
    if (replacement.sourceHash !== createHash('sha256').update(source).digest('hex')) throw new Error('Source changed after synthesis');
    const url = new URL(replacement.audioUrl);
    if (url.origin !== storageOrigin || !url.pathname.startsWith('/storage/v1/object/public/question-audio/')) throw new Error('Unexpected audio origin or bucket');
    const response = await fetch(url, { method: 'HEAD', headers: { Origin: 'https://b4skills.com' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    const cors = response.headers.get('access-control-allow-origin');
    if (!response.ok || !['*', 'https://b4skills.com'].includes(cors || '') || !(Number(response.headers.get('content-length')) > 44)) throw new Error('Audio access or CORS verification failed');
  }
  const dir = path.resolve('reports/item-evidence'); mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString(), backupPath = path.join(dir, `activation-backup-${stamp.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupPath, JSON.stringify({ at: stamp, playerUrl, items: pending }, null, 2), { mode: 0o600 });
  await prisma.$transaction(async tx => {
    for (const row of pending) {
      const metadata = record(row.metadata), replacement = record(metadata.pendingAudioReplacement);
      const { pendingAudioReplacement: removed, ...rest } = metadata;
      const result = await tx.item.updateMany({ where: { id: row.id, version: row.version, updatedAt: row.updatedAt, status: row.status }, data: {
        version: { increment: 1 }, content: { ...record(row.content), ttsScript: replacement.ttsScript, transcript: replacement.transcript,
          audioUrl: replacement.audioUrl, audioMetadata: replacement.audioMetadata } as Prisma.InputJsonValue,
        metadata: { ...rest, validationEvidenceStatus: 'AUDIO_REPAIRED_HUMAN_LISTENING_AND_PILOT_REVIEW_PENDING',
          editorialAudioRepairs: (Array.isArray(rest.editorialAudioRepairs) ? rest.editorialAudioRepairs : []).map((entry: any) => entry.run === replacement.run ? { ...entry, state: 'ACTIVATED', activatedAt: stamp, playerUrl } : entry),
        } as Prisma.InputJsonValue,
      } });
      if (result.count !== 1) throw new Error('Concurrent revision; activation batch rolled back');
    }
  }, { timeout: 30000 });
  console.log(JSON.stringify({ activatedItems: pending.length, playerUrl, backupPath, humanListeningApproved: false }));
}
main().catch(() => { console.error('Activation stopped: deployed player, source consistency, media/CORS or concurrency check failed. Original references retained if transaction did not commit.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
