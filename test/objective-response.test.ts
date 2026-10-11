import { expect, it } from 'vitest';
import { scoreObjectiveResponse } from '../src/lib/assessment-engine/objective-response';
import { shuffleMcqOptions } from '../src/lib/assessment-engine/mcq-options';
import { normalizeBlankScaffold } from '../src/lib/assessment-engine/blank-response';
import { SkillType, type Item } from '../src/lib/assessment-engine/types';
const item = (type: string, metadata: Record<string, any>): Item => ({ id: 'test-item', type, skill: SkillType.GRAMMAR, params: { a: 1, b: 0, c: .2 }, metadata });
it.each(['session-one', 'session-two', 'session-three'])('keeps all eight shuffled option IDs and the correct key valid: %s', sessionId => {
  const options = Array.from({ length: 8 }, (_, index) => ({ id: String.fromCharCode(65 + index), text: `Option ${index}`, isCorrect: index === 7 }));
  const question = item('MULTIPLE_CHOICE', { options, correctAnswer: 'H' });
  const shuffled = shuffleMcqOptions(options, 'H', sessionId, question.id)!;
  expect(shuffled.shuffledOptions.map(option => option.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  const expected = shuffled.shuffledOptions.findIndex(option => option.text === 'Option 7');
  for (let n = 0; n < 8; n++) expect(scoreObjectiveResponse(question, sessionId, String.fromCharCode(65 + n))).toBe(n === expected ? 1 : 0);
});
it('scores a gap dropdown by its shuffled ID and its plain text fallback', () => {
  const question = item('FILL_IN_BLANKS', { scaffold: 'The Earth ____ around the Sun.', correctAnswer: 'C',
    options: ['go', 'going', 'goes', 'went'].map((text, n) => ({ id: String.fromCharCode(65 + n), text, isCorrect: n === 2 })) });
  const shuffled = shuffleMcqOptions(question.metadata!.options, 'C', 'session', question.id)!;
  expect(scoreObjectiveResponse(question, 'session', shuffled.newCorrectAnswer)).toBe(1);
  expect(scoreObjectiveResponse(question, 'session', 'goes')).toBe(1);
  expect(scoreObjectiveResponse(question, 'session', 'go')).toBe(0);
});
it('renders long underscore runs as one gap and grades ordered legacy listening keys', () => {
  const prompt = 'Hair: ______; Colour: ______; Clothes: ______';
  expect(normalizeBlankScaffold(prompt)).toBe('Hair: ___; Colour: ___; Clothes: ___');
  const question = item('FILL_IN_BLANKS', { prompt, correctAnswer: 'short|brown|shorts' });
  expect(scoreObjectiveResponse(question, 'session', ' SHORT | brown | shorts ')).toBe(1);
  expect(scoreObjectiveResponse(question, 'session', 'brown|short|shorts')).toBe(0);
  expect(() => scoreObjectiveResponse(question, 'session', 'short')).toThrow('Incomplete');
  expect(() => scoreObjectiveResponse(item('FILL_IN_BLANKS', { prompt, correctAnswer: 'short|brown' }), 'session', 'short|brown')).toThrow('key count');
});
