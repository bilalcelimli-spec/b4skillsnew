/** Explicit opt-in: synthetic answers, real AI, disposable localhost database only. */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const target = new URL(process.env.DATABASE_URL ?? '');
assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname.startsWith('/all_exams_'), 'Disposable localhost all_exams_ database required');
assert(process.env.ALLOW_REAL_AI_SCORING_SMOKE === '1', 'Set ALLOW_REAL_AI_SCORING_SMOKE=1 to authorize real AI scoring requests');
assert(process.env.B4SKILLS_AI_SMOKE_AUDIO_PATH, 'Provide a synthetic English WAV response as B4SKILLS_AI_SMOKE_AUDIO_PATH');
const audio = readFileSync(process.env.B4SKILLS_AI_SMOKE_AUDIO_PATH);
assert(audio.subarray(0, 4).toString() === 'RIFF' && audio.subarray(8, 12).toString() === 'WAVE', 'Synthetic smoke audio must be WAV');
const { prisma: db } = await import('../../src/lib/prisma.ts');
const { enqueueScoringJob } = await import('../../src/lib/scoring/scoring-queue.ts');
try {
  const org = await db.organization.create({ data: { name: 'Synthetic AI queue smoke', slug: 'ai-smoke-' + Date.now() } });
  const user = await db.user.create({ data: { email: `synthetic-${Date.now()}@local-audit.test`, role: 'CANDIDATE', organizationId: org.id } });
  const session = await db.session.create({ data: { organizationId: org.id, candidateId: user.id, status: 'IN_PROGRESS', metadata: { productLine: 'General English' } } });
  const text = 'Last summer I travelled to a small seaside town with my family. We stayed in a comfortable hotel near the beach. Each morning we walked along the coast and visited the local market. I enjoyed trying fresh food and talking with the people who lived there. In the evening we watched the sunset together. I would like to return next year because the town was peaceful and welcoming.';
  for (const [index, skill] of ['WRITING', 'SPEAKING'].entries()) {
    const item = await db.item.create({ data: { organizationId: org.id, type: skill === 'WRITING' ? 'WRITING_PROMPT' : 'SPEAKING_PROMPT', skill, cefrLevel: 'B1', status: 'DRAFT', content: { prompt: 'Describe a holiday you enjoyed.', responseTime: 60, prepTime: 15, scoringRubric: { grammar: 'Accuracy', vocabulary: 'Range', fluency: 'Continuity', coherence: 'Organisation', taskRelevance: 'Address the holiday task' } } } });
    const value = skill === 'WRITING' ? text : { audio: audio.toString('base64'), mimeType: 'audio/wav' };
    const row = await db.response.create({ data: { sessionId: session.id, itemId: item.id, order: index + 1, value: typeof value === 'string' ? value : JSON.stringify(value), metadata: { pendingAsyncScore: true, scoringMode: skill } } });
    const started = Date.now();
    await enqueueScoringJob({ sessionId: session.id, responseId: row.id, itemId: item.id, skill, value, prompt: 'Describe a holiday you enjoyed.' });
    const saved = await db.response.findUniqueOrThrow({ where: { id: row.id } });
    assert(saved.metadata.asyncScored === true && saved.metadata.pendingAsyncScore === false);
    assert(saved.metadata.scoringPasses?.length === 2, 'Both independent scoring passes must finish');
    assert(saved.metadata.aiUnavailable === false && Number.isFinite(saved.aiScore), 'Provider failure is not a valid grade');
    assert(saved.metadata.requiresHumanReview ? saved.score === null : Number.isFinite(saved.score), 'Disputes stay withheld');
    console.log(JSON.stringify({ verification: 'real-provider-to-persisted-response', skill, elapsedMs: Date.now() - started, scoreSource: saved.metadata.scoreSource, passes: saved.metadata.scoringPasses.length, aiScorePresent: true, scoreWithheldForReview: saved.score === null }));
  }
} finally { await db.$disconnect(); }
