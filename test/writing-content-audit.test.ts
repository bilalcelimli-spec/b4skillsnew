import { expect, it } from 'vitest';
import { writingContentFindings, writingWordRange, normalizeWritingAliases, declaredWritingRanges } from '../src/lib/quality/writing-content-audit';
import { inAudioRepairScope } from '../src/lib/quality/audio-repair-scope';
import { writingCorrectionPlan } from '../src/lib/quality/writing-content-audit';
it('does not mistake the conclusion of an authored report for an absent source', () => {
  expect(writingContentFindings({ prompt: "Your report should include survey findings: email 92%. Conclusion: Summarise the report's main points." }).map(f => f.rule)).not.toContain('WRITING_SOURCE_MISSING');
});
it('aligns pilot ranges but preserves active delivery specifications', () => {
  const c = { prompt: 'Write 250-300 words.', wordRange: { min: 160, max: 220 }, maxWords: 220 };
  const pilot = writingCorrectionPlan('PRETEST', c);
  expect(pilot.next.wordRange).toEqual({ min: 250, max: 300 }); expect(pilot.next.maxWords).toBe(300);
  expect(writingCorrectionPlan('PRETEST', pilot.next).changed).toBe(false);
  expect(writingCorrectionPlan('ACTIVE', c).rangeRevised).toBe(false);
});
it('quarantines missing-source tasks without inventing or revising a passage', () => {
  const c = { prompt: 'Read the essay above and summarise it in 150-190 words.', wordRange: { min: 160, max: 220 } };
  const plan = writingCorrectionPlan('PRETEST', c);
  expect(plan.quarantine).toBe(true); expect(plan.rangeRevised).toBe(false); expect(plan.next).toEqual(c);
});
it('uses the same precedence as the writing editor', () => {
  expect(writingWordRange({ wordRange: { min: 15, max: 25 }, minWords: 10, maxWords: 30 })).toEqual({ min: 15, max: 25, documented: true });
});
it('recognizes dash and between/and ranges', () => {
  expect(declaredWritingRanges('Write between 150 and 180 words.')).toMatchObject([{ min: 150, max: 180 }]);
  expect(declaredWritingRanges('Write 200–250 words.')).toMatchObject([{ min: 200, max: 250 }]);
});
it('flags an unavailable article rather than claiming the task is answerable', () => {
  expect(writingContentFindings({ prompt: 'Read the essay above and summarise the main points.', wordRange: { min: 150, max: 180 } }).map(f => f.rule)).toContain('WRITING_SOURCE_MISSING');
});
it('accepts a provided source or explicit inline source information', () => {
  expect(writingContentFindings({ prompt: 'Summarise the article.', passage: 'Source article', minWords: 50 }).map(f => f.rule)).not.toContain('WRITING_SOURCE_MISSING');
  expect(writingContentFindings({ prompt: 'Key information: Developer claims: five jobs. Summarise the claims in your report.', minWords: 50 }).map(f => f.rule)).not.toContain('WRITING_SOURCE_MISSING');
});
it('does not confuse a free essay with source-based summarising', () => {
  expect(writingContentFindings({ prompt: 'Write an essay about tourism.', minWords: 50 }).map(f => f.rule)).not.toContain('WRITING_SOURCE_MISSING');
});
it('normalizes only aliases while preserving the prompt, source and effective limits', () => {
  const c = { prompt: 'Write 30 words.', passage: 'Source', wordRange: { min: 15, max: 25 }, maxWords: 30, rubric: { maxWords: 30, criteria: ['task'] } };
  const next = normalizeWritingAliases(c)!;
  expect(next.maxWords).toBe(25); expect(next.rubric.maxWords).toBe(25);
  expect(next.prompt).toBe(c.prompt); expect(next.passage).toBe(c.passage);
  expect(normalizeWritingAliases(next)).toBeNull();
});
it('rejects inverted bounds', () => {
  expect(writingContentFindings({ minWords: 100, maxWords: 50 }).some(f => f.severity === 'BLOCKER')).toBe(true);
});
it('includes only the specifically quarantined recordings when retrying', () => {
  const item = { skill: 'LISTENING', status: 'REVIEW', metadata: { editorialQuarantine: { reason: 'LEGACY_DIALOGUE_REPAIR_QUOTA_BLOCKED' } } };
  expect(inAudioRepairScope(item)).toBe(false); expect(inAudioRepairScope(item, true)).toBe(true);
  expect(inAudioRepairScope({ ...item, metadata: {} }, true)).toBe(false);
  expect(inAudioRepairScope({ ...item, skill: 'WRITING' }, true)).toBe(false);
});
