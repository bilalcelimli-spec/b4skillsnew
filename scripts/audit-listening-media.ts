/** Read-only media audit. --live adds bounded, same-origin HEAD checks; never generates audio. */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { record } from '../src/lib/quality/item-evidence-audit.js';
import { inspectWav } from '../src/lib/audio/wav-evidence.js';
import { speakerLabels } from '../src/lib/audio/speaker-labels.js';

config({ path: '.env.local', quiet: true }); config({ quiet: true });
const prisma = new PrismaClient();
const proposals = {
  cmp07rc0a000gnuc6uyegi1vz: {
    prompt: 'Describe a local event. You can choose a real event or imagine one. Say what people do there and explain whether you would like to go.',
    responseTime: 60,
    reason: 'Reduce fragmented follow-up questions and remove the assumption that the candidate knows a local community event.',
    rubricChange: 'Describe an event and give a simple preference with a reason; accept an imagined event without penalty.',
    sampleAnswer: 'There is a music event in the park. People listen to music and eat together. I would like to go because I enjoy music and I can meet my friends.',
  },
  cmp085af80012nuc6hg2ihozb: {
    prompt: 'Look at the picture and describe what you can see. Then say whether you like doing activities with other people and give one reason.',
    responseTime: 60,
    reason: 'Remove the additional past-experience narrative; the existing linked image must be checked before release.',
    rubricChange: 'Describe the visible scene and state a simple preference with a reason; do not require a previous teamwork experience.',
    sampleAnswer: null,
  },
};
async function main() {
  const items = await prisma.item.findMany({ where: { skill: 'LISTENING', status: { in: ['ACTIVE', 'PRETEST'] } },
    orderBy: { id: 'asc' }, select: { id: true, itemCode: true, version: true, status: true, cefrLevel: true, content: true } });
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const url = String(record(item.content).audioUrl || '');
    groups.set(url, [...(groups.get(url) || []), item]);
  }
  const recordings = [];
  for (const [url, group] of groups) {
    const c = record(group[0].content);
    const source = [c.transcript, c.passage, c.script, c.ttsScript].find(v => typeof v === 'string' && v.trim()) || '';
    const evidence: Record<string, unknown> = {
      itemIds: group.map(i => i.id), audioReference: url.split('?')[0],
      expectedSpeakers: Math.max(speakerLabels(source).length, Number(c.numberOfSpeakers) || 0, Array.isArray(c.speakers) ? c.speakers.length : 0),
      productionMetadata: record(c.audioMetadata), humanListeningVerdict: 'PENDING',
    };
    const root = path.resolve('public/audio');
    const resolved = path.resolve('public', `.${url.split('?')[0]}`);
    const safeLocal = url.startsWith('/audio/') && resolved.startsWith(root + path.sep);
    if (safeLocal && existsSync(resolved)) {
      const size = statSync(resolved).size;
      evidence.localBytes = size;
      if (size <= 32 * 1024 * 1024) {
        const bytes = readFileSync(resolved);
        evidence.audioHash = createHash('sha256').update(bytes).digest('hex');
        evidence.localContainer = path.extname(resolved).toLowerCase() === '.wav' ? inspectWav(bytes) : { valid: null, reason: 'Non-WAV decoding not performed' };
      } else evidence.localContainer = { valid: null, reason: 'Exceeds inspection size limit' };
    } else evidence.localContainer = { valid: null, reason: safeLocal ? 'No local copy; this does not establish a live outage' : 'Remote or unsupported local reference' };
    // Sequential and capped: no credentials, arbitrary hosts or redirects are followed.
    if (process.argv.includes('--live') && safeLocal) {
      const target = new URL(url, 'https://b4skills.com');
      if (target.origin === 'https://b4skills.com' && target.pathname.startsWith('/audio/')) {
        try {
          const response = await fetch(target, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(4000) });
          evidence.liveHead = { status: response.status, contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'), verdict: response.ok ? 'HTTP_ONLY_NOT_DECODED' : 'REQUIRES_GET_CONFIRMATION' };
        } catch { evidence.liveHead = { verdict: 'UNVERIFIED_TIMEOUT_OR_NETWORK_ERROR' }; }
      }
    }
    recordings.push(evidence);
    if (recordings.length % 20 === 0) console.error(`Checked ${recordings.length}/${groups.size} recordings`);
  }
  const drafts = await prisma.item.findMany({ where: { id: { in: Object.keys(proposals) } },
    select: { id: true, version: true, status: true, content: true } });
  const editorialDrafts = drafts.map(item => ({ itemId: item.id, expectedVersion: item.version, status: item.status,
    expectedContentHash: createHash('sha256').update(JSON.stringify(item.content)).digest('hex'),
    originalPrompt: record(item.content).prompt, proposal: proposals[item.id as keyof typeof proposals],
    decision: 'DRAFT_NOT_APPLIED_NOT_EXPERT_APPROVED',
    requiredBeforeRelease: ['Two independent reviews', 'Rubric and time-limit alignment', 'Image verification where applicable', 'Version increment and renewed pilot evidence'],
  }));
  const summary = { itemCount: items.length, recordingCount: recordings.length,
    invalidLocalWav: recordings.filter(r => record(r.localContainer).valid === false).length,
    validLocalWav: recordings.filter(r => record(r.localContainer).valid === true).length,
    liveHeadSuccess: recordings.filter(r => record(r.liveHead).verdict === 'HTTP_ONLY_NOT_DECODED').length,
    liveHeadNeedsConfirmation: recordings.filter(r => record(r.liveHead).verdict === 'REQUIRES_GET_CONFIRMATION').length,
    editorialDrafts: editorialDrafts.length };
  const directory = path.resolve('reports/item-evidence'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  const reportPath = path.join(directory, `listening-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary,
    limitations: ['Container and HTTP checks do not verify audible voices or content.', 'Local and live files may differ.',
      'HEAD failures alone do not prove GET playback failure.', 'Editorial drafts are not human-approved or applied.'], recordings, editorialDrafts }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
}
main().catch(() => { console.error('Listening audit failed. No database changes were attempted.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
