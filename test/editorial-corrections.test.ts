import { expect, it } from 'vitest';
import { correctedSpeakingContent, normalizeSpeakingLimits, speakingCorrections } from '../src/lib/quality/editorial-corrections';
it('preserves the rendered limit rather than using the shorter stale alias', () => {
  expect(normalizeSpeakingLimits({ responseTime: 60, timeLimitSeconds: 45, prepTime: 30 })).toEqual({ responseTime: 60, timeLimitSeconds: 60, prepTime: 30 });
});
it('uses maxTime when responseTime is absent', () => {
  expect(normalizeSpeakingLimits({ maxTime: 90, responseTimeSec: 60 })?.responseTimeSec).toBe(90);
});
it('does not invent a limit for malformed or unspecified delivery', () => {
  expect(normalizeSpeakingLimits({ timeLimitSeconds: 45 })).toBeNull();
  expect(normalizeSpeakingLimits({ responseTime: -1, timeLimitSeconds: 30 })).toBeNull();
});
it('is idempotent', () => {
  const next = normalizeSpeakingLimits({ responseTime: 60, timeLimitSeconds: 45 });
  expect(normalizeSpeakingLimits(next)).toBeNull();
});
it('updates both task-specific rubric aliases and preserves the stimulus', () => {
  const id = 'cmp085af80012nuc6hg2ihozb';
  const next = correctedSpeakingContent(id, { prompt: 'Old', imageUrl: '/image.jpg', responseTime: 60, timeLimitSeconds: 45 });
  expect(next?.prompt).toBe(speakingCorrections[id].prompt);
  expect(next?.rubric).toBe(next?.scoringRubric);
  expect(next?.imageUrl).toBe('/image.jpg');
  expect(correctedSpeakingContent(id, next)).toBeNull();
});
