import { describe, expect, it } from 'vitest';
import { finalResponseScore, isObjectiveEvidence, responseScoringStatus, embeddedSpeakingAudio } from '../response-presentation';
import { requiresArgumentStructure } from '../writing-task-policy';
describe('response reporting evidence', () => {
  const response = { item: {skill: 'WRITING'}, score: null, aiScore: 0, isCorrect: null };
  it('never treats a zero AI proposal as a final score', () => {
    expect(finalResponseScore({...response, scoringStatus: 'review_required'})).toBeNull();
    expect(responseScoringStatus(response)).toBe('pending');
  });
  it('withholds stale scores when review or failure metadata excludes evidence', () => {
    for (const scoringStatus of ['review_required', 'unavailable', 'pending', 'pretest'] as const)
      expect(finalResponseScore({...response, score: 0.7, scoringStatus})).toBeNull();
  });
  it('preserves genuine final zero scores without converting them into missing values', () => {
    expect(finalResponseScore({...response, score: 0, scoringStatus: 'scored'})).toBe(0);
  });
  it('excludes productive and unresolved responses from correctness statistics', () => {
    expect(isObjectiveEvidence({...response, score: 0.17, isCorrect: false})).toBe(false);
    expect(isObjectiveEvidence({...response, item: {skill: 'READING'}, score: 0, isCorrect: false})).toBe(true);
    expect(isObjectiveEvidence({...response, item: {skill: 'READING'}, score: 1, isCorrect: true, scoringStatus: 'pretest'})).toBe(false);
  });
  it('accepts supported embedded audio and rejects arbitrary URLs and malformed values', () => {
    expect(embeddedSpeakingAudio(JSON.stringify({audio: 'YWJj', mimeType: 'audio/webm;codecs=opus'}))).toEqual({audio: 'YWJj', mimeType: 'audio/webm;codecs=opus'});
    for (const value of ['garbage', '{}', JSON.stringify({audio: 'https://example.com', mimeType: 'audio/webm'}), JSON.stringify({audio: 'YWJj', mimeType: 'text/html'})])
      expect(embeddedSpeakingAudio(value)).toBeNull();
  });
});
describe('task-sensitive writing checks', () => {
  it.each(['Write about your favourite food.', 'Write a short thank-you note to your grandpa.', 'Describe your background.', 'Tell your friend about your school.'])('does not require an argument for %s', prompt => {
    expect(requiresArgumentStructure(prompt)).toBe(false);
  });
  it.each(['Discuss the advantages and disadvantages of remote work.', 'Write an argumentative essay.', 'To what extent do you agree or disagree?'])('keeps argument checks for %s', prompt => {
    expect(requiresArgumentStructure(prompt)).toBe(true);
  });
});
