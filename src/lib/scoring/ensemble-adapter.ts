/**
 * Multi-Rater Ensemble Adapter
 *
 * Bridges the multi-rater ensemble results (EnsembleResult) to the
 * OrchestratedScore format used by scoring-queue.ts and rating-queue.ts
 *
 * Converts:
 *  - Multiple rater scores → scoringPasses array
 *  - Variance + agreement → reviewReasons + requiresHumanReview
 *  - consensusLevel / diagnostics → metadata
 */

import type { EnsembleResult, RaterScore } from "./multi-rater-ensemble.js";
import type { OrchestratedScore, ScoreSource, ScoringPass } from "./scoring-orchestrator.js";
import type { AIScore } from "./gemini-scoring-service.js";
import type { IntegrityReport } from "./response-integrity.js";

export function convertEnsembleToOrchestrated(
  ensemble: EnsembleResult,
  skill: "WRITING" | "SPEAKING",
  integrity?: IntegrityReport
): OrchestratedScore {
  const reviewReasons: string[] = [];
  let scoreSource: ScoreSource = "ai_auto";

  // Determine review flags based on ensemble metrics
  if (ensemble.consensusLevel === "low") {
    reviewReasons.push("LOW_RATER_CONSENSUS");
    scoreSource = "ai_flagged";
  } else if (ensemble.consensusLevel === "medium") {
    // Medium consensus + other factors may warrant review
    if (ensemble.averageConfidence < 0.65) {
      reviewReasons.push("LOW_AVERAGE_CONFIDENCE");
      scoreSource = "ai_flagged";
    }
  }

  // Inter-rater agreement (Cohen's κ proxy)
  if (ensemble.raterAgreement < 0.6) {
    reviewReasons.push("POOR_INTER_RATER_AGREEMENT");
    scoreSource = "ai_flagged";
  }

  // Variance threshold
  if (ensemble.stdDev > 0.25) {
    reviewReasons.push("HIGH_SCORE_VARIANCE");
    scoreSource = "ai_flagged";
  }

  // Explicit review flag from ensemble
  if (ensemble.flagForHumanReview) {
    reviewReasons.push(`ENSEMBLE_FLAG: ${ensemble.reviewReason || "multi-rater disagreement"}`);
    scoreSource = "ai_flagged";
  }

  // Convert rater scores to scoringPasses
  const scoringPasses: ScoringPass[] = ensemble.raterScores.map((rater) => ({
    role: "rater" as any, // Extend to support "rater" role (currently only "primary"|"verifier")
    score: rater.score,
    confidence: rater.confidence,
    cefrLevel: rater.cefrLevel,
    model: rater.rater, // "gemini" | "claude" | "gpt4"
    latencyMs: rater.latencyMs,
  })) as ScoringPass[];

  // Build primary AIScore from ensemble (aggregated, with ensemble-level feedback)
  const primaryRater = ensemble.raterScores[0];
  const aiResult: AIScore = {
    score: ensemble.finalScore,
    cefrLevel: ensemble.finalCefrLevel,
    feedback: ensemble.diagnosticFeedback,
    confidence: ensemble.averageConfidence,
    rubricScores: {
      grammar: primaryRater?.rubricScores?.grammar || 0,
      vocabulary: primaryRater?.rubricScores?.vocabulary || 0,
      coherence: primaryRater?.rubricScores?.coherence || 0,
      taskRelevance: primaryRater?.rubricScores?.taskRelevance || 0,
      ...(skill === "SPEAKING" && primaryRater?.rubricScores?.fluency
        ? { fluency: primaryRater.rubricScores.fluency }
        : {}),
    },
    corrections: [],
    transcript: undefined,
    speakingFeatures: undefined,
  };

  // Apply integrity checks if provided
  const requiresHumanReview =
    reviewReasons.length > 0 ||
    (integrity ? !integrity.passed : false);

  const integrityReasons =
    integrity && !integrity.passed
      ? integrity.issues.map((i) => `INTEGRITY_${i.flag}`)
      : [];

  // Build final orchestrated score
  const orchestrated: OrchestratedScore & { ensembleMetadata?: any } = {
    score: ensemble.finalScore,
    aiResult,
    requiresHumanReview,
    reviewReasons: [...reviewReasons, ...integrityReasons],
    agreementDelta: ensemble.stdDev, // Use std dev as proxy for disagreement magnitude
    scoreSource:
      integrityReasons.length > 0
        ? scoreSource === "ai_auto"
          ? "ai_flagged"
          : scoreSource
        : scoreSource,
    model: "ensemble",
    modelVersion: "multi-rater-v1",
    scoringPasses,
    integrity,
    // Attach ensemble metadata
    ensembleMetadata: {
      consensusLevel: ensemble.consensusLevel,
      variance: ensemble.variance,
      stdDev: ensemble.stdDev,
      raterAgreement: ensemble.raterAgreement,
      raterCount: ensemble.raterScores.length,
      recommendedAction: ensemble.recommendedAction,
      diagnosticFeedback: ensemble.diagnosticFeedback,
    },
  };

  return orchestrated as OrchestratedScore;
}
