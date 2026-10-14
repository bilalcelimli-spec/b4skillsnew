export type ResponseScoringStatus = 'scored' | 'pending' | 'review_required' | 'unavailable' | 'pretest';
export interface PresentedResponse {
  score?: number | null;
  aiScore?: number | null;
  isCorrect?: boolean | null;
  scoringStatus?: ResponseScoringStatus;
  reviewReasons?: string[];
  failureCode?: string;
  item: { skill: string };
}
export const isProductiveResponse = (response: PresentedResponse) =>
  response.item.skill === 'WRITING' || response.item.skill === 'SPEAKING';
export function responseScoringStatus(response: PresentedResponse): ResponseScoringStatus {
  return response.scoringStatus ?? (typeof response.score === 'number' && Number.isFinite(response.score) ? 'scored' : 'pending');
}
export const scoringStatusLabels: Record<ResponseScoringStatus, string> = {
  scored: 'Scored', pending: 'Awaiting scoring', review_required: 'Human review required',
  unavailable: 'Scoring unavailable', pretest: 'Pilot item — excluded',
};
export function finalResponseScore(response: PresentedResponse): number | null {
  return responseScoringStatus(response) === 'scored' && typeof response.score === 'number' &&
    Number.isFinite(response.score) && response.score >= 0 && response.score <= 1 ? response.score : null;
}
export function isObjectiveEvidence(response: PresentedResponse): boolean {
  return !isProductiveResponse(response) && finalResponseScore(response) !== null && typeof response.isCorrect === 'boolean';
}
const reasons: Record<string, string> = {
  RUBRIC_MISSING: 'Task rubric is missing — content review required',
  RUBRIC_INVALID: 'Task rubric has invalid criteria — content review required',
  RUBRIC_TOO_LARGE: 'Task rubric exceeds the supported size — content review required',
  RUBRIC_INVALID_WEIGHT: 'Task rubric weights are invalid — content review required',
  PRIMARY_LOW_CONFIDENCE: 'Primary AI rating needs verification',
  VERIFIER_LOW_CONFIDENCE: 'Verifier AI rating needs verification',
  SCORE_DISAGREEMENT: 'AI ratings disagree on the score',
  CEFR_DISAGREEMENT: 'AI ratings disagree on the CEFR band',
  LOW_TASK_RELEVANCE: 'Task relevance needs review',
  DISCOURSE_AI_DISAGREEMENT: 'Discourse analysis and AI rating disagree',
  PROSODIC_AI_DISAGREEMENT: 'Speech analysis and AI rating disagree',
  AI_SERVICE_UNAVAILABLE: 'AI provider could not complete scoring',
  AI_TIMEOUT: 'AI scoring timed out', AI_RATE_LIMITED: 'AI provider rate limit reached',
  AI_NOT_CONFIGURED: 'AI scoring is not configured', AI_AUTH_FAILED: 'AI provider authentication failed',
  AI_INVALID_RESULT: 'AI provider returned an invalid result', AI_CIRCUIT_OPEN: 'AI scoring temporarily paused',
};
export function scoringReasonLabel(code: string): string {
  if (code.startsWith('AI_CIRCUIT_OPEN_UNTIL_')) return reasons.AI_CIRCUIT_OPEN;
  return reasons[code] ?? code.replace(/_/g, ' ').toLowerCase();
}
/** Only embedded audio submitted to the assessment; never load arbitrary remote URLs. */
export function embeddedSpeakingAudio(value: string | null | undefined): { audio: string; mimeType: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.audio !== 'string' || !parsed.audio || !/^[A-Za-z0-9+/]+={0,2}$/.test(parsed.audio)) return null;
    if (typeof parsed.mimeType !== 'string' || !/^audio\/(webm|mp4|wav|mpeg|ogg)(\s*;\s*codecs=[\w.\-", ]+)?$/i.test(parsed.mimeType)) return null;
    return { audio: parsed.audio, mimeType: parsed.mimeType };
  } catch { return null; }
}
