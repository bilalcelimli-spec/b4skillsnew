import { buildScoringPrompt } from "../scoring/task-context.js";
import { ScoringOrchestrator } from '../scoring/scoring-orchestrator.js';
import { productiveScoringMode } from '../assessment-engine/productive-response.js';
import { scoreObjectiveResponse, UnscorableObjectiveError } from '../assessment-engine/objective-response.js';
import type { SkillType } from '../assessment-engine/types.js';

export interface FreemiumEvaluation {
  score: number | null;
  kind: 'objective' | 'rubric';
  status: 'scored' | 'review_required' | 'unavailable';
  feedback?: string;
  scoreSource?: 'ai_auto' | 'ai_flagged' | 'ai_unavailable' | 'rejected_integrity';
  aiScore?: number | null;
  scoringMode?: 'WRITING' | 'SPEAKING';
}

export async function evaluateFreemiumResponse(
  item: { skill: string; type: string; content?: Record<string, any> }, answer: unknown,
): Promise<FreemiumEvaluation> {
  const content = item.content ?? {};
  const mode = productiveScoringMode(item.skill, item.type, content, answer);
  if (!mode) {
    try {
      const score = scoreObjectiveResponse({ id: 'unshuffled', skill: item.skill as SkillType, type: item.type,
        metadata: content, params: { a: 1, b: 0, c: 0 } }, '', answer, false);
      return { score, kind: 'objective', status: 'scored' };
    } catch (error) {
      if (error instanceof UnscorableObjectiveError) return { score: null, kind: 'objective', status: 'unavailable' };
      throw error;
    }
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
    if (decision.scoreSource === 'ai_unavailable') return { score: null, kind: 'rubric', status: 'unavailable', scoreSource: 'ai_unavailable', aiScore: null, scoringMode: mode };
    // Integrity rejection is evidence of an invalid/non-substantive response, never full credit.
    if (decision.scoreSource === 'rejected_integrity') return { score: 0, kind: 'rubric', status: 'scored', feedback: decision.aiResult.feedback, scoreSource: 'rejected_integrity', aiScore: null, scoringMode: mode };
    const aiScore = decision.aiResult.score ?? decision.score;
    if (!Number.isFinite(aiScore) || aiScore < 0 || aiScore > 1) return { score: null, kind: 'rubric', status: 'unavailable', scoreSource: 'ai_unavailable', aiScore: null, scoringMode: mode };
    if (decision.requiresHumanReview) return { score: null, kind: 'rubric', status: 'review_required', feedback: decision.aiResult.feedback, scoreSource: 'ai_flagged', aiScore, scoringMode: mode };
    if (!Number.isFinite(decision.score) || decision.score < 0 || decision.score > 1) return { score: null, kind: 'rubric', status: 'unavailable', scoreSource: 'ai_unavailable', aiScore: null, scoringMode: mode };
    return { score: decision.score, kind: 'rubric', status: 'scored', feedback: decision.aiResult.feedback, scoreSource: 'ai_auto', aiScore, scoringMode: mode };
  } catch (error) {
    if (error instanceof Error && error.message === "Scoring timed out") return {score:null,kind:"rubric",status:"unavailable",scoreSource:"ai_unavailable",aiScore:null,scoringMode:mode};
    throw error;
  } finally { if (timer) clearTimeout(timer); }
}
