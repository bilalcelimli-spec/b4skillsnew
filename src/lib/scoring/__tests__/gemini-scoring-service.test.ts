import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ key: vi.fn(), construct: vi.fn(), generate: vi.fn() }));
vi.mock('../../secrets/secrets-manager', () => ({ SecretsManager: { get: mocks.key } }));
vi.mock('../../ai/circuit-breaker', () => ({ geminiScoringBreaker: { execute: async (fn: any) => ({ data: await fn() }) } }));
vi.mock('@google/genai', async importOriginal => ({ ...await importOriginal<any>(), GoogleGenAI: class {
  constructor(options: any) { mocks.construct(options); }
  models = { generateContent: mocks.generate };
} }));
import { GeminiScoringService, isGeminiScoringConfigured } from '../gemini-scoring-service';
import { SCORING_REQUEST_TIMEOUT_MS, SCORING_JOB_TIMEOUT_MS, SCORING_MAX_RETRIES, SCORING_MAX_RETRY_DELAY_MS, scoringFailureCode } from '../ai-scoring-policy';
const result = { score: .6, cefrLevel: 'B1', feedback: 'Feedback', confidence: .9,
  rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 8, fluency: 6 }, corrections: [], transcript: 'Synthetic response.' };
let keySequence = 0;
beforeEach(() => { vi.clearAllMocks(); mocks.key.mockReturnValue('test-key-' + ++keySequence); mocks.generate.mockResolvedValue({ text: JSON.stringify(result) }); });
it('loads a key made available after module import instead of capturing an empty startup environment', async () => {
  mocks.key.mockReturnValue(undefined);
  expect(isGeminiScoringConfigured()).toBe(false);
  await expect(GeminiScoringService.scoreWriting('Example response.', 'Task')).rejects.toThrow('not configured');
  expect(mocks.construct).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  mocks.key.mockReturnValue('loaded-later');
  await GeminiScoringService.scoreWriting('Example response.', 'Task');
  expect(mocks.construct).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'loaded-later' }));
});
it('reuses the current client and replaces it after secret rotation', async () => {
  await GeminiScoringService.scoreWriting('Response', 'Task'); await GeminiScoringService.verifyWriting('Response', 'Task');
  expect(mocks.construct).toHaveBeenCalledOnce();
  mocks.key.mockReturnValue('rotated-key'); await GeminiScoringService.scoreWriting('Response', 'Task');
  expect(mocks.construct).toHaveBeenCalledTimes(2);
});
it('keeps the provider request and bounded retry within the queue deadline', async () => {
  expect(SCORING_JOB_TIMEOUT_MS).toBeGreaterThan(SCORING_REQUEST_TIMEOUT_MS * (SCORING_MAX_RETRIES + 1) + SCORING_MAX_RETRY_DELAY_MS);
  await GeminiScoringService.scoreWriting('Response', 'Task');
  expect(mocks.construct.mock.calls[0][0].httpOptions.timeout).toBe(SCORING_REQUEST_TIMEOUT_MS);
  expect(mocks.generate.mock.calls[0][0].config).toMatchObject({ thinkingConfig: { thinkingBudget: 1024 }, maxOutputTokens: 4096 });
});
it.each(['writing', 'speaking'])('requests complete %s rubric dimensions and supported CEFR bands', async skill => {
  if (skill === 'writing') await GeminiScoringService.scoreWriting('Response', 'Task');
  else await GeminiScoringService.scoreSpeaking('synthetic-base64', 'audio/webm', 'Task');
  const schema = mocks.generate.mock.calls[0][0].config.responseSchema;
  expect(schema.properties.cefrLevel.enum).toContain('PRE_A1');
  expect(schema.properties.score).toMatchObject({ minimum: 0, maximum: 1 });
  expect(schema.properties.confidence).toMatchObject({ minimum: 0, maximum: 1 });
  expect(schema.properties.rubricScores.properties.grammar).toMatchObject({ minimum: 0, maximum: 10 });
  expect(schema.properties.rubricScores.required).toEqual(expect.arrayContaining(['grammar', 'vocabulary', 'coherence', 'taskRelevance']));
  if (skill === 'speaking') expect(schema.properties.rubricScores.required).toContain('fluency');
});
it.each([{ text: '' }, { text: JSON.stringify(result), candidates: [{ finishReason: 'MAX_TOKENS' }] }, { text: '{}' }])('rejects empty, truncated or incomplete grades', async response => {
  mocks.generate.mockResolvedValue(response);
  await expect(GeminiScoringService.scoreWriting('Response', 'Task')).rejects.toThrow();
});
it('classifies operational errors without retaining provider payloads or secrets', () => {
  expect(scoringFailureCode({ status: 403, message: 'private secret' })).toBe('AI_AUTH_FAILED');
  expect(scoringFailureCode({ status: 429 })).toBe('AI_RATE_LIMITED');
  expect(scoringFailureCode(new Error('Gateway Timeout'))).toBe('AI_TIMEOUT');
  expect(scoringFailureCode(new SyntaxError('private candidate text'))).toBe('AI_INVALID_RESULT');
});

it('supplies CEFR descriptors for the authored target without treating it as an attained level', async () => {
 await GeminiScoringService.scoreWriting('Synthetic answer','Describe your room.','A1');
 const request = mocks.generate.mock.calls[0][0];
 expect(request.contents).toContain('A1');
 expect(request.config.systemInstruction).toContain("not the candidate's attained level");
 expect(request.contents).toContain('Never invent errors');
});
it('supplies the same target descriptors to the audio verifier', async () => {
 await GeminiScoringService.verifySpeaking('synthetic-base64','audio/webm','Describe your room.','A2');
 expect(mocks.generate.mock.calls[0][0].contents[0].text).toContain('A2');
});
it('does not equate C2 proficiency with native-speaker likeness even when an author note does', async () => {
 await GeminiScoringService.scoreSpeaking('synthetic-base64','audio/webm','Assess near-native mastery.','C2');
 expect(mocks.generate.mock.calls[0][0].config.systemInstruction).toContain('C2 does not require native-speaker or near-native-speaker competence');
});
