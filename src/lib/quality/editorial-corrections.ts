import { record } from './item-evidence-audit.js';

export const speakingCorrections = {
  cmp07rc0a000gnuc6uyegi1vz: {
    prompt: 'Describe a local event. You can choose a real event or imagine one. Say what people do there and explain whether you would like to go.',
    rubric: 'Describe a real or imagined local event, say what people do, and express a preference with a simple reason. Accept an imagined event without penalty. Assess language using the applicable speaking dimensions; do not require multiple follow-up answers or specialist cultural knowledge.',
    sampleAnswer: 'There is a music event in the park. People listen to music and eat together. I would like to go because I enjoy music and I can meet my friends.',
  },
  cmp085af80012nuc6hg2ihozb: {
    prompt: 'Look at the picture and describe what you can see. Then say whether you like doing activities with other people and give one reason.',
    rubric: 'Describe the visible scene and express a preference about doing activities with other people, with a simple reason. Do not require a past teamwork experience or assume that the pictured activity is workplace teamwork. Assess the response using the applicable speaking dimensions.',
    sampleAnswer: null,
  },
} as const;

/** Preserve the actual renderer limit; changes to unused aliases must not shorten the test. */
export function normalizeSpeakingLimits(value: unknown): Record<string, any> | null {
  const c = record(value);
  const effective = Number(c.responseTime ?? c.maxTime);
  if (!Number.isFinite(effective) || effective <= 0) return null;
  const fields = ['responseTime', 'maxTime', 'responseTimeSec', 'timeLimitSeconds'];
  const mismatched = fields.some(field => c[field] !== undefined && Number(c[field]) > 0 && Number(c[field]) !== effective);
  if (!mismatched) return null;
  const next = { ...c };
  for (const field of fields) if (c[field] !== undefined) next[field] = effective;
  return next;
}

export function correctedSpeakingContent(id: string, content: unknown): Record<string, any> | null {
  const c = record(content), limitFix = normalizeSpeakingLimits(c);
  const editorial = speakingCorrections[id as keyof typeof speakingCorrections];
  if (!editorial) return limitFix;
  if (c.prompt === editorial.prompt && c.rubric === editorial.rubric && !limitFix) return null;
  return { ...(limitFix || c), prompt: editorial.prompt, rubric: editorial.rubric, scoringRubric: editorial.rubric,
    ...(editorial.sampleAnswer ? { sampleAnswer: editorial.sampleAnswer, sampleAnswerStatus: 'ILLUSTRATIVE_NOT_ADJUDICATED' } : {}) };
}
