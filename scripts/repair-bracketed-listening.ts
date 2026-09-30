/** --apply generates immutable media and stages replacements. Activation requires a verified player deployment. */
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateListeningAudio, resolveListeningScript } from '../src/lib/audio/tts-generator.js';
import { normalizeSpeakerLabels, speakerLabels, stripListeningWorksheet } from '../src/lib/audio/speaker-labels.js';
import { inspectWav } from '../src/lib/audio/wav-evidence.js';
import { record } from '../src/lib/quality/item-evidence-audit.js';
import { supabaseStorageClient } from '../src/lib/storage/private-storage.js';
config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.item.findMany({ where: { skill: 'LISTENING', status: { in: ['ACTIVE', 'PRETEST'] } } });
  const affected = rows.filter(item => {
    const c = record(item.content), pending = record(record(item.metadata).pendingAudioReplacement);
    const script = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(c)));
    const alreadyStaged = pending.sourceHash === createHash('sha256').update(script).digest('hex') && pending.audioUrl;
    return /^\s*\[[^\]\n]+\]:/m.test(String(c.ttsScript || '')) && !alreadyStaged;
  });
  const groups = new Map<string, typeof rows>();
  for (const item of affected) {
    const c = record(item.content), key = String(c.audioUrl || item.id);
    // Update every deliverable item sharing the recording, not only the originally flagged row.
    if (!groups.has(key)) groups.set(key, rows.filter(r => record(r.content).audioUrl === c.audioUrl));
  }
  const eligible = [...groups.entries()].filter(([, group]) => {
    const scripts = new Set(group.map(item => normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(record(item.content))))));
    return scripts.size === 1 && speakerLabels([...scripts][0]).length === 2;
  });
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : eligible.length;
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Invalid limit');
  const selected = eligible.slice(0, limit);
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    affectedItems: affected.length, eligibleRecordings: eligible.length, selectedRecordings: selected.length,
    skippedRecordings: groups.size - eligible.length }, null, 2));
  if (!process.argv.includes('--apply') || !selected.length) return;
  if (!process.env.GEMINI_API_KEY) throw new Error('TTS not configured');
  const run = randomUUID(), dir = path.resolve('reports/item-evidence', `listening-repair-${run}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const backupPath = path.join(dir, 'backup.json');
  writeFileSync(backupPath, JSON.stringify({ run, createdAt: new Date().toISOString(), items: selected.flatMap(([, g]) => g) }, null, 2), { mode: 0o600 });
  const storage = supabaseStorageClient();
  // Only assessment stimuli already exposed via public /audio/. Never place identity/proctoring evidence here.
  const bucket = 'question-audio';
  const inspection = await storage.storage.getBucket(bucket);
  if (inspection.error) {
    if (String(inspection.error.statusCode) !== '404') throw new Error('Cannot inspect question audio bucket');
    const creation = await storage.storage.createBucket(bucket, { public: true, allowedMimeTypes: ['audio/wav'], fileSizeLimit: 32 * 1024 * 1024 });
    if (creation.error) throw new Error('Cannot create question audio bucket');
  } else if (!inspection.data?.public) throw new Error('Refusing to change a private bucket to public');
  const results: Record<string, unknown>[] = [];
  for (const [, group] of selected) {
    const first = group[0], c = record(first.content);
    const script = normalizeSpeakerLabels(stripListeningWorksheet(resolveListeningScript(c)));
    const filename = `dialogue-${randomUUID()}`;
    let stage = 'generate';
    try {
      const audio = await generateListeningAudio({ moduleId: filename, ttsScript: script,
        cefrLevel: first.cefrLevel, productLine: c.productLine, outputDir: dir });
      const bytes = readFileSync(audio.absolutePath), container = inspectWav(bytes);
      if (!container.valid || !audio.voiceName.includes('+')) throw new Error('Invalid dialogue output');
      stage = 'upload';
      const objectKey = `editorial/${run}/${filename}.wav`;
      const uploaded = await storage.storage.from(bucket).upload(objectKey, bytes, { contentType: 'audio/wav', upsert: false, cacheControl: '31536000' });
      if (uploaded.error) throw new Error('Upload failed');
      const audioUrl = storage.storage.from(bucket).getPublicUrl(objectKey).data.publicUrl;
      stage = 'verify-public-access';
      const response = await fetch(audioUrl, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      if (!response.ok || Number(response.headers.get('content-length')) !== bytes.length) throw new Error('Public media verification failed');
      stage = 'database';
      const at = new Date().toISOString();
      await prisma.$transaction(async tx => {
        for (const item of group) {
          const content = record(item.content), metadata = record(item.metadata);
          const changed = await tx.item.updateMany({ where: { id: item.id, version: item.version, updatedAt: item.updatedAt, status: item.status },
            data: { metadata: { ...metadata, validationEvidenceStatus: 'AUDIO_REPAIR_STAGED_PENDING_PLAYER_DEPLOYMENT',
              pendingAudioReplacement: { run, sourceHash: createHash('sha256').update(script).digest('hex'), audioUrl, ttsScript: script, transcript: script,
                audioMetadata: { speakerCount: 2, speakers: speakerLabels(script), voiceName: audio.voiceName, generatedAt: at,
                  durationSeconds: container.durationSeconds, audioHash: createHash('sha256').update(bytes).digest('hex'),
                  humanListeningVerdict: 'PENDING', storageProvider: 'supabase' } },
              editorialAudioRepairs: [...(Array.isArray(metadata.editorialAudioRepairs) ? metadata.editorialAudioRepairs : []),
                { run, at, previousVersion: item.version, previousAudioUrl: content.audioUrl, state: 'STAGED_NOT_ACTIVE',
                  change: 'REGENERATED_WITH_TWO_DISTINCT_VOICE_CONFIGURATIONS', humanApproved: false }] } as Prisma.InputJsonValue } });
          if (changed.count !== 1) throw new Error('Concurrent item change');
        }
      }, { timeout: 30000 });
      results.push({ itemIds: group.map(i => i.id), outcome: 'STAGED', audioUrl });
      console.log(`Staged dialogue repair: ${group.length} item(s), ${audio.voiceName}`);
    } catch {
      results.push({ itemIds: group.map(i => i.id), outcome: 'FAILED', stage });
      console.error(`Dialogue repair failed at ${stage}; original DB reference retained if transaction did not commit.`);
    }
    writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ run, backupPath, results }, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify({ stagedItems: results.filter(r => r.outcome === 'STAGED').flatMap(r => r.itemIds as string[]).length,
    failedRecordings: results.filter(r => r.outcome === 'FAILED').length, backupPath, resultPath: path.join(dir, 'result.json') }));
  if (results.some(r => r.outcome === 'FAILED')) process.exitCode = 1;
}
main().catch(() => { console.error('Listening repair stopped; inspect its backup/result before retrying.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
