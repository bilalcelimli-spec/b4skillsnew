import { describe, expect, it } from 'vitest';
import { auditItemEvidence, buildEvidenceQueue, type AuditItem } from '../src/lib/quality/item-evidence-audit';

const item = (changes: Partial<AuditItem> = {}): AuditItem => ({ id: 'item-1', version: 1, type: 'MULTIPLE_CHOICE',
  skill: 'GRAMMAR', cefrLevel: 'B1', status: 'ACTIVE', content: { prompt: 'Choose the correct word.',
    options: [{ id: 'A', text: 'first', isCorrect: true }, { id: 'B', text: 'second' }], correctAnswer: 'A' }, ...changes });
const rules = (i: AuditItem) => auditItemEvidence(i).map(f => f.rule);
describe('item evidence audit', () => {
  it('accepts index zero as a real key', () => {
    expect(rules(item({ content: { prompt: 'Select.', options: ['yes', 'no'], correctIndex: 0 } }))).not.toContain('KEY_MISSING');
  });
  it('does not require choice options for open gaps', () => {
    expect(auditItemEvidence(item({ type: 'FILL_IN_BLANKS', content: { prompt: 'She ___ home.', blanks: [{ acceptableAnswers: ['went'] }] } })).filter(f => f.severity === 'BLOCKER')).toEqual([]);
  });
  it('requires answers for every gap', () => {
    expect(rules(item({ type: 'FILL_IN_BLANKS', content: { prompt: '___ ___', blanks: [{ acceptableAnswers: ['a'] }, { acceptableAnswers: [] }] } }))).toContain('GAP_ANSWERS_MISSING');
  });
  it('detects contradictory keys', () => {
    const c = { ...item().content as object, correctAnswer: 'B' };
    expect(rules(item({ content: c }))).toContain('KEY_CONFLICT');
  });
  it('finds repeated alternatives despite case/spacing', () => {
    expect(rules(item({ content: { prompt: 'Select.', options: ['An answer', ' an  ANSWER '], correctIndex: 0 } }))).toContain('DUPLICATE_OPTIONS');
  });
  it('falls back from empty prompt to question', () => {
    expect(rules(item({ content: { prompt: ' ', question: 'Select.', options: ['yes', 'no'], correctIndex: 0 } }))).not.toContain('PROMPT_MISSING');
  });
  it('does not claim that collapsed script proves bad recorded audio', () => {
    const findings = auditItemEvidence(item({ skill: 'LISTENING', content: { prompt: 'Listen.', audioUrl: '/audio/dialogue.wav', transcript: 'Alice: Hello\nBob: Hi', ttsScript: 'Hello. Hi.' } }));
    expect(findings.find(f => f.rule === 'DIALOGUE_SCRIPT_COLLAPSED')?.severity).toBe('REVIEW');
    expect(findings.some(f => f.rule === 'AUDIO_HUMAN_CHECK_REQUIRED')).toBe(true);
  });
  it('does not demand separate audio files for two speakers', () => {
    expect(rules(item({ skill: 'LISTENING', content: { prompt: 'Listen.', audioUrl: '/one-file.wav', transcript: 'Alice: Hello\nBob: Hi', ttsScript: 'Alice: Hello\nBob: Hi' } }))).not.toContain('DIALOGUE_SCRIPT_COLLAPSED');
  });
  it('does not count repeated reviews by one person as dual review', () => {
    expect(rules(item({ itemReviews: [{ reviewerId: 'a', verdict: 'APPROVE' }, { reviewerId: 'a', verdict: 'APPROVE' }] }))).toContain('DUAL_REVIEW_EVIDENCE_MISSING');
  });
  it('requires version-bound evidence even for two reviewers', () => {
    expect(rules(item({ itemReviews: [{ reviewerId: 'a', verdict: 'APPROVE' }, { reviewerId: 'b', verdict: 'APPROVE' }] }))).toContain('REVIEW_VERSION_UNVERIFIED');
  });
  it('does not call priors calibrated based on response counts', () => {
    expect(rules(item({ metadata: { paramSource: 'prior' }, _count: { responses: 1000, calibrationRuns: 0 } }))).toContain('EMPIRICAL_CALIBRATION_UNVERIFIED');
  });
  it('prioritizes active blockers and never approves from IQS', () => {
    const queue = buildEvidenceQueue([item({ id: 'clean' }), item({ id: 'pretest', status: 'PRETEST', content: {} }), item({ id: 'active', content: {}, metadata: { iqScore: 100 } })]);
    expect(queue.map(r => r.itemId)).toEqual(['active', 'pretest', 'clean']);
    expect(queue[2].decision).toBe('PENDING_REVIEW_AND_EVIDENCE');
  });
  it('handles malformed content without throwing', () => {
    expect(rules(item({ content: null }))).toContain('PROMPT_MISSING');
  });
  it('flags a short overloaded speaking task for review, not rejection', () => {
    const findings = auditItemEvidence(item({ skill: 'SPEAKING', type: 'SPEAKING_PROMPT', content: {
      prompt: 'Where? Why? When? How?', responseTime: 30, rubric: { task: 'Respond' }, sampleAnswer: 'A response',
    } }));
    expect(findings.find(f => f.rule === 'RESPONSE_LOAD_REVIEW')?.severity).toBe('REVIEW');
    expect(findings.some(f => f.rule === 'RUBRIC_MISSING')).toBe(false);
  });
  it('keeps structural correctness separate from semantic answer verification', () => {
    const queue = buildEvidenceQueue([item()]);
    expect(queue[0].requiredManualChecks).toContain('Key correctness and plausible alternatives/accepted variants');
  });
  it('keeps a calibration tag without a recorded run unverified', () => {
    expect(rules(item({ metadata: { paramSource: 'calibrated' }, _count: { responses: 1000, calibrationRuns: 0 } }))).toContain('EMPIRICAL_CALIBRATION_UNVERIFIED');
  });
  it('flags contradictory speaking time limits', () => {
    expect(rules(item({ skill: 'SPEAKING', type: 'SPEAKING_PROMPT', content: { prompt: 'Describe your town.', responseTime: 60, timeLimitSeconds: 45 } }))).toContain('RESPONSE_LIMIT_CONFLICT');
  });
  it('recognizes legacy bracketed dialogues even without a transcript', () => {
    expect(rules(item({ skill: 'LISTENING', content: { prompt: 'Listen.', audioUrl: '/a.wav', ttsScript: '[Speaker A]: Hello.\n[Speaker B]: Hi.' } }))).toContain('LEGACY_BRACKETED_DIALOGUE');
  });
});
