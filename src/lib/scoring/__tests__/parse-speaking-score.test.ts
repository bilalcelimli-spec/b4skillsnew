import { expect, it } from 'vitest';
import { parseSpeakingScore } from '../parse-speaking-score';

it.each(['{"score":0.46}', '```json\n{"score":0.46}\n```', '```\n{"score":0.46}\n```'])('accepts a complete JSON object with optional code fence: %s', input => {
  expect(parseSpeakingScore(input)).toEqual({score:0.46});
});
it.each(['{"score":', 'Explanation\n{"score":0.46}', '```json\n{"score":0.46}\n```\nextra', 'null', '[]', '42', '{"transcript":"private text",broken}'])('rejects malformed or ambiguous output without disclosing content: %s', input => {
  expect(() => parseSpeakingScore(input)).toThrow('Invalid AI speaking response format');
});
