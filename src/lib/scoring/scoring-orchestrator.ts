import { AIScore, GeminiScoringService } from "./gemini-scoring-service";

export type ScoreSource = "ai_auto" | "ai_flagged" | "human";

export interface ScoringPass {
  role: "primary" | "verifier";
  score: number;
  confidence: number;
  cefrLevel: string;
}

export interface OrchestratedScore {
  score: number;
  aiResult: AIScore;
  requiresHumanReview: boolean;
  reviewReasons: string[];
  agreementDelta: number;
  scoreSource: ScoreSource;
  model: string;
  modelVersion: string;
  scoringPasses: ScoringPass[];
}

const MODEL_NAME = "gemini-2.5-flash";
const CONFIDENCE_THRESHOLD = 0.7;
const AGREEMENT_THRESHOLD = 0.15;

function normalizeBand(level?: string): string {
  const value = String(level || "").trim().toUpperCase();
  if (!value) return "UNKNOWN";
  return value.replace(/-/g, "_").replace(/\s+/g, "_");
}

function mergeCorrections(primary: AIScore, verifier: AIScore): AIScore["corrections"] {
  const seen = new Set<string>();
  const merged: AIScore["corrections"] = [];

  for (const correction of [...(primary.corrections || []), ...(verifier.corrections || [])]) {
    const key = `${correction.type}:${correction.original}:${correction.suggestion}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(correction);
    }
  }

  return merged.slice(0, 12);
}

function averageRubricScores(primary: AIScore, verifier: AIScore): AIScore["rubricScores"] {
  const fluencyValues = [primary.rubricScores.fluency, verifier.rubricScores.fluency].filter(
    (value): value is number => typeof value === "number"
  );

  return {
    grammar: (primary.rubricScores.grammar + verifier.rubricScores.grammar) / 2,
    vocabulary: (primary.rubricScores.vocabulary + verifier.rubricScores.vocabulary) / 2,
    coherence: (primary.rubricScores.coherence + verifier.rubricScores.coherence) / 2,
    taskRelevance: (primary.rubricScores.taskRelevance + verifier.rubricScores.taskRelevance) / 2,
    ...(fluencyValues.length > 0
      ? { fluency: fluencyValues.reduce((sum, value) => sum + value, 0) / fluencyValues.length }
      : {})
  };
}

function buildFinalScore(primary: AIScore, verifier: AIScore): OrchestratedScore {
  const agreementDelta = Math.abs(primary.score - verifier.score);
  const reviewReasons: string[] = [];

  if (primary.confidence < CONFIDENCE_THRESHOLD) reviewReasons.push("PRIMARY_LOW_CONFIDENCE");
  if (verifier.confidence < CONFIDENCE_THRESHOLD) reviewReasons.push("VERIFIER_LOW_CONFIDENCE");
  if (agreementDelta > AGREEMENT_THRESHOLD) reviewReasons.push("SCORE_DISAGREEMENT");
  if (normalizeBand(primary.cefrLevel) !== normalizeBand(verifier.cefrLevel)) {
    reviewReasons.push("CEFR_DISAGREEMENT");
  }

  const requiresHumanReview = reviewReasons.length > 0;
  const blendedScore = Number(((primary.score + verifier.score) / 2).toFixed(4));

  return {
    score: blendedScore,
    requiresHumanReview,
    reviewReasons,
    agreementDelta,
    scoreSource: requiresHumanReview ? "ai_flagged" : "ai_auto",
    model: MODEL_NAME,
    modelVersion: MODEL_NAME,
    scoringPasses: [
      {
        role: "primary",
        score: primary.score,
        confidence: primary.confidence,
        cefrLevel: primary.cefrLevel
      },
      {
        role: "verifier",
        score: verifier.score,
        confidence: verifier.confidence,
        cefrLevel: verifier.cefrLevel
      }
    ],
    aiResult: {
      ...primary,
      score: blendedScore,
      confidence: Number(Math.min(primary.confidence, verifier.confidence).toFixed(4)),
      cefrLevel: primary.confidence >= verifier.confidence ? primary.cefrLevel : verifier.cefrLevel,
      feedback: requiresHumanReview
        ? `${primary.feedback}\n\nFlagged for review: ${reviewReasons.join(", ")}`
        : primary.feedback,
      rubricScores: averageRubricScores(primary, verifier),
      corrections: mergeCorrections(primary, verifier),
      transcript: primary.transcript || verifier.transcript,
      speakingFeatures: primary.speakingFeatures || verifier.speakingFeatures
    }
  };
}

export const ScoringOrchestrator = {
  async scoreWriting(text: string, prompt: string): Promise<OrchestratedScore> {
    const [primary, verifier] = await Promise.all([
      GeminiScoringService.scoreWriting(text, prompt),
      GeminiScoringService.verifyWriting(text, prompt)
    ]);

    return buildFinalScore(primary, verifier);
  },

  async scoreSpeaking(audioBase64: string, mimeType: string, prompt: string): Promise<OrchestratedScore> {
    const [primary, verifier] = await Promise.all([
      GeminiScoringService.scoreSpeaking(audioBase64, mimeType, prompt),
      GeminiScoringService.verifySpeaking(audioBase64, mimeType, prompt)
    ]);

    return buildFinalScore(primary, verifier);
  },

  async scoreSpeakingFromText(text: string, prompt: string): Promise<OrchestratedScore> {
    const [primary, verifier] = await Promise.all([
      GeminiScoringService.scoreWriting(text, prompt),
      GeminiScoringService.verifyWriting(text, prompt)
    ]);

    return buildFinalScore(primary, verifier);
  }
};