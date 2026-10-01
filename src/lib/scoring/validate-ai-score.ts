import type { AIScore } from './gemini-scoring-service.js';

/** Reject malformed provider output instead of silently converting it into a grade. */
export function validateAIScore(value: unknown): AIScore {
  if (!value || typeof value !== 'object') throw new Error('AI scoring returned no result');
  const result = value as AIScore;
  const inRange = (n: unknown, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
  if (!inRange(result.score, 1) || !inRange(result.confidence, 1)) throw new Error('Invalid AI score or confidence');
  if (!['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(result.cefrLevel)) throw new Error('Invalid AI CEFR level');
  if (typeof result.feedback !== 'string') throw new Error('Missing AI feedback');
  for (const key of ['grammar', 'vocabulary', 'coherence', 'taskRelevance'] as const) {
    if (!inRange(result.rubricScores?.[key], 10)) throw new Error(`Invalid AI rubric dimension: ${key}`);
  }
  if (result.rubricScores.fluency !== undefined && !inRange(result.rubricScores.fluency, 10)) throw new Error('Invalid AI fluency');
  return { ...result, corrections: Array.isArray(result.corrections) ? result.corrections : [] };
}
