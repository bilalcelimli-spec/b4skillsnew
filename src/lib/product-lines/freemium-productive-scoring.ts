import { buildScoringPrompt } from "../scoring/task-context.js";
import { ScoringOrchestrator } from '../scoring/scoring-orchestrator.js';
import { productiveScoringMode } from '../assessment-engine/productive-response.js';
import { scoreStructuredResponse } from '../assessment-engine/structured-response.js';
import { scoreBlankResponse } from '../assessment-engine/blank-response.js';
import { scoreFreemiumResponse } from './freemium-response-scoring.js';

export interface FreemiumEvaluation {
  score: number | null;
  kind: 'objective' | 'rubric';
  status: 'scored' | 'review_required' | 'unavailable';
  feedback?: string;
}

export async function evaluateFreemiumResponse(
  item: { skill: string; type: string; content?: Record<string, any> }, answer: unknown,
): Promise<FreemiumEvaluation> {
  const content = item.content ?? {};
  const mode = productiveScoringMode(item.skill, item.type, content, answer);
  if (!mode) {
    if (item.type === 'DRAG_DROP') return {score:scoreStructuredResponse(content,answer),kind:'objective',status:'scored'};
    if (item.type === 'FILL_IN_BLANKS' && content.blanks?.length) return {score:scoreBlankResponse(content.blanks,answer),kind:'objective',status:'scored'};
    const objective = scoreFreemiumResponse(item,answer);
    return {score:objective === null ? null : objective ? 1 : 0,kind:'objective',status:objective === null ? 'unavailable' : 'scored'};
  }
  const prompt = buildScoringPrompt(content);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    let scoring;
    if (mode === 'WRITING') {
      if (typeof answer !== 'string' || answer.length > 100_000) throw new Error('Invalid writing response');
      scoring = ScoringOrchestrator.scoreWriting(answer, prompt);
    } else {
      if (!answer || typeof answer !== 'object') throw new Error('Speaking requires an audio recording');
      const audio = answer as { audio?: unknown; mimeType?: unknown };
      if (typeof audio.audio !== 'string' || audio.audio.length < 24 || audio.audio.length > 10_000_000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.audio) || typeof audio.mimeType !== 'string' ||
          !/^audio\/(webm|mp4|mpeg|wav|ogg|flac)(;.*)?$/.test(audio.mimeType)) throw new Error('Invalid speaking audio');
      scoring = ScoringOrchestrator.scoreSpeaking(audio.audio, audio.mimeType, prompt);
    }
    const decision = await Promise.race([scoring, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Scoring timed out')), 45_000);
    })]);
    if (decision.scoreSource === 'ai_unavailable') return { score: null, kind: 'rubric', status: 'unavailable' };
    // Integrity rejection is evidence of an invalid/non-substantive response, never full credit.
    if (decision.scoreSource === 'rejected_integrity') return { score: 0, kind: 'rubric', status: 'scored', feedback: decision.aiResult.feedback };
    if (decision.requiresHumanReview) return { score: null, kind: 'rubric', status: 'review_required', feedback: decision.aiResult.feedback };
    if (!Number.isFinite(decision.score) || decision.score < 0 || decision.score > 1) return { score: null, kind: 'rubric', status: 'unavailable' };
    return { score: decision.score, kind: 'rubric', status: 'scored', feedback: decision.aiResult.feedback };
  } catch (error) {
    if (error instanceof Error && error.message === "Scoring timed out") return {score:null,kind:"rubric",status:"unavailable"};
    throw error;
  } finally { if (timer) clearTimeout(timer); }
}
