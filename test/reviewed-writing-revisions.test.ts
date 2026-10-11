import { expect, it } from 'vitest';
import { reviewedWritingRevision } from '../src/lib/quality/reviewed-writing-revisions';
import { writingContentFindings } from '../src/lib/quality/writing-content-audit';

it('aligns the inspected story without changing its prompt or source', () => {
  const content = { prompt: 'Continue this story in 110–150 words:\nMaria lost her bag.', wordRange: { min: 110, max: 160 }, minWords: 110, maxWords: 160 };
  const revision = reviewedWritingRevision(content)!;
  expect(revision.substantive).toBe(false); expect(revision.next.prompt).toBe(content.prompt);
  expect(revision.next.wordRange).toEqual({ min: 110, max: 150 }); expect(revision.next.maxWords).toBe(150);
  expect(reviewedWritingRevision(revision.next)).toBeNull();
});
it('retains the actual source, shortens the summary, and requires renewed review', () => {
  const source = 'Networks can support cooperation while also reproducing inequality. '.repeat(20);
  const revision = reviewedWritingRevision({ prompt: `Summarise the following passage in 150–180 words, using your own words:\n\n${source}`, wordRange: { min: 160, max: 220 } })!;
  expect(revision.substantive).toBe(true); expect(revision.next.prompt).toContain(source);
  expect(revision.next.wordRange).toEqual({ min: 90, max: 120 });
  const words = revision.next.sampleAnswer.split(/\s+/).length;
  expect(words).toBeGreaterThanOrEqual(90); expect(words).toBeLessThanOrEqual(120);
  expect(writingContentFindings(revision.next)).toEqual([]);
  expect(reviewedWritingRevision(revision.next)).toBeNull();
});
it('gives all necessary research figures and identifies them as fictional', () => {
  const revision = reviewedWritingRevision({ prompt: 'You have conducted a six-month research project on employee burnout in the financial services sector.', wordRange: { min: 200, max: 270 } })!;
  expect(revision.substantive).toBe(true); expect(revision.next.prompt).toContain('fictional research notes');
  for (const figure of ['1,240', '58%', '71%', '36%']) {
    expect(revision.next.prompt).toContain(figure); expect(revision.next.sampleAnswer).toContain(figure);
  }
  const words = revision.next.sampleAnswer.split(/\s+/).length;
  expect(words).toBeGreaterThanOrEqual(200); expect(words).toBeLessThanOrEqual(250);
  expect(writingContentFindings(revision.next)).toEqual([]);
  expect(reviewedWritingRevision(revision.next)).toBeNull();
});
it('never revises unrelated prompts or a changed editorial specification', () => {
  expect(reviewedWritingRevision({ prompt: 'Write a story.', wordRange: { min: 110, max: 160 } })).toBeNull();
  expect(reviewedWritingRevision({ prompt: 'Continue this story in 110–150 words:', wordRange: { min: 100, max: 140 } })).toBeNull();
});
