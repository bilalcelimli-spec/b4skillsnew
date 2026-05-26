import { AIScore, GeminiScoringService } from "./gemini-scoring-service.js";
import {
  assessWritingIntegrity,
  assessSpeakingIntegrity,
  type IntegrityReport,
} from "./response-integrity.js";
import { CircuitBreakerOpenError } from "../ai/circuit-breaker.js";
import { ProsodicAnalyzer } from "./prosodic-analyzer.js";
import { ArgumentQualityAnalyzer } from "./argument-quality-analyzer.js";
import { AcousticAnalyzer, computeAcousticFluencyScore, flagAudioQuality, type AudioFeatures } from "./acoustic-analyzer.js";
import { AudioQualityAnalyzer, generateQualityRecommendation, type AudioQualityMetrics } from "./audio-quality-analyzer.js";

export type ScoreSource = "ai_auto" | "ai_flagged" | "human" | "rejected_integrity" | "ai_unavailable";

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
  /** Pre-scoring integrity report; populated for every response. */
  integrity?: IntegrityReport;
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

/**
 * Build a zero-score "rejected" result for responses that fail the integrity
 * guard with a `reject` recommendation. We do NOT spend Gemini calls on these.
 */
function buildRejectedScore(integrity: IntegrityReport): OrchestratedScore {
  const reasons = integrity.issues.map(i => `INTEGRITY_${i.flag}`);
  return {
    score: 0,
    requiresHumanReview: true,
    reviewReasons: reasons,
    agreementDelta: 0,
    scoreSource: "rejected_integrity",
    model: MODEL_NAME,
    modelVersion: MODEL_NAME,
    scoringPasses: [],
    integrity,
    aiResult: {
      score: 0,
      cefrLevel: "PRE_A1",
      feedback:
        "This response was flagged by the response-integrity guard before AI scoring. " +
        "Reason(s): " + integrity.issues.map(i => i.detail).join(" | "),
      confidence: 1, // Confident in the rejection
      rubricScores: { grammar: 0, vocabulary: 0, coherence: 0, taskRelevance: 0 },
      corrections: [],
    },
  };
}

/**
 * Build a placeholder result when the Gemini API is unavailable (circuit open
 * or all retries exhausted). Score is withheld (null-ish 0.5 mid-band) and the
 * response is routed to the human review queue automatically.
 */
function buildUnavailableScore(
  error: unknown,
  integrity?: IntegrityReport
): OrchestratedScore {
  const isOpen = error instanceof CircuitBreakerOpenError;
  const reason = isOpen
    ? `AI_CIRCUIT_OPEN_UNTIL_${(error as CircuitBreakerOpenError).opensUntil.toISOString()}`
    : "AI_SERVICE_UNAVAILABLE";

  return {
    score: 0.5,            // withheld — human reviewer will override
    requiresHumanReview: true,
    reviewReasons: [reason],
    agreementDelta: 0,
    scoreSource: "ai_unavailable",
    model: MODEL_NAME,
    modelVersion: MODEL_NAME,
    scoringPasses: [],
    integrity,
    aiResult: {
      score: 0.5,
      cefrLevel: "UNKNOWN",
      feedback: "AI scoring is temporarily unavailable. This response has been queued for human review.",
      confidence: 0,
      rubricScores: { grammar: 0, vocabulary: 0, coherence: 0, taskRelevance: 0 },
      corrections: [],
    },
  };
}

/** Merge integrity issues into reviewReasons / scoreSource of an AI-scored result. */
function applyIntegrityToResult(
  result: OrchestratedScore,
  integrity: IntegrityReport
): OrchestratedScore {
  if (integrity.passed) {
    return { ...result, integrity };
  }
  // Force human review for any non-passing integrity report
  const integrityReasons = integrity.issues.map(i => `INTEGRITY_${i.flag}`);
  return {
    ...result,
    integrity,
    requiresHumanReview: true,
    reviewReasons: [...result.reviewReasons, ...integrityReasons],
    scoreSource: result.scoreSource === "rejected_integrity" ? result.scoreSource : "ai_flagged",
  };
}

export const ScoringOrchestrator = {
  async scoreWriting(text: string, prompt: string): Promise<OrchestratedScore> {
    const integrity = assessWritingIntegrity({ text, prompt });
    if (integrity.recommendation === "reject") {
      return buildRejectedScore(integrity);
    }

    try {
      const [primary, verifier] = await Promise.all([
        GeminiScoringService.scoreWriting(text, prompt),
        GeminiScoringService.verifyWriting(text, prompt),
      ]);
      const orchestrated = applyIntegrityToResult(buildFinalScore(primary, verifier), integrity);

      // Enrich with objective discourse analysis
      const aqProfile = ArgumentQualityAnalyzer.analyse(text, prompt);
      (orchestrated.aiResult as any).argumentQualityProfile = aqProfile;

      // If discourse quality diverges strongly from Gemini's coherence score, flag for review
      // raterAgreementKappa expects both values on 0..1 scale; rubricScores.coherence is 0..10
      const rawCoherence = orchestrated.aiResult.rubricScores.coherence ?? (orchestrated.aiResult.score * 10);
      const geminiCoherence = rawCoherence > 1 ? rawCoherence / 10 : rawCoherence;
      const aqAgreement = ArgumentQualityAnalyzer.raterAgreementKappa(geminiCoherence, aqProfile.discourseQualityScore);
      (orchestrated.aiResult as any).argumentQualityAgreement = aqAgreement;

      if (aqAgreement.agreement === "POOR") {
        orchestrated.requiresHumanReview = true;
        orchestrated.reviewReasons.push("DISCOURSE_AI_DISAGREEMENT");
        if (orchestrated.scoreSource === "ai_auto") {
          orchestrated.scoreSource = "ai_flagged";
        }
      }

      // Surface critical discourse flags for reviewers
      if (aqProfile.flags.includes("UNSUPPORTED_CLAIMS") || aqProfile.flags.includes("NO_CLAIM_DETECTED")) {
        orchestrated.reviewReasons.push("WEAK_ARGUMENT_STRUCTURE");
      }

      return orchestrated;
    } catch (err) {
      // Circuit open or all retries exhausted → queue for human review
      return buildUnavailableScore(err, integrity);
    }
  },

  async scoreSpeaking(
    audioBase64: string,
    mimeType: string,
    prompt: string,
    audioMetadata?: { audioDurationSec?: number; silentDurationSec?: number }
  ): Promise<OrchestratedScore> {
    // Speaking integrity needs a transcript; we run audio-only checks first
    // (duration / silence), then re-run the text checks once Gemini returns
    // a transcript so the full guard is still applied.
    const audioOnly = assessSpeakingIntegrity({
      transcript: "",
      prompt,
      audioDurationSec: audioMetadata?.audioDurationSec,
      silentDurationSec: audioMetadata?.silentDurationSec,
      // Disable text-based checks at this stage: empty transcript would falsely
      // trigger BELOW_MIN_LENGTH otherwise.
      minWordCount: 0,
    });
    if (audioOnly.issues.some(i =>
      i.flag === "AUDIO_TOO_SHORT" || i.flag === "AUDIO_MOSTLY_SILENT"
    )) {
      return buildRejectedScore(audioOnly);
    }

    let primary: AIScore, verifier: AIScore;
    try {
      [primary, verifier] = await Promise.all([
        GeminiScoringService.scoreSpeaking(audioBase64, mimeType, prompt),
        GeminiScoringService.verifySpeaking(audioBase64, mimeType, prompt),
      ]);
    } catch (err) {
      return buildUnavailableScore(err, audioOnly);
    }

    const transcript = primary.transcript || verifier.transcript || "";
    const integrity = assessSpeakingIntegrity({
      transcript,
      prompt,
      audioDurationSec: audioMetadata?.audioDurationSec,
      silentDurationSec: audioMetadata?.silentDurationSec,
    });

    if (integrity.recommendation === "reject") {
      return buildRejectedScore(integrity);
    }

    const orchestrated = applyIntegrityToResult(buildFinalScore(primary, verifier), integrity);

    // Enrich with prosodic analysis when Gemini returns speaking features
    const geminiFeatures = orchestrated.aiResult.speakingFeatures;
    if (geminiFeatures) {
      const prosodicProfile = ProsodicAnalyzer.analyse(
        geminiFeatures,
        transcript || undefined,
        audioMetadata?.audioDurationSec
      );
      const kappa = ProsodicAnalyzer.raterAgreementKappa(
        orchestrated.aiResult.rubricScores.fluency ?? orchestrated.aiResult.score * 10,
        prosodicProfile.fluencyScore
      );
      // If prosodic kappa is POOR, flag for human review
      if (kappa.agreement === "POOR") {
        orchestrated.requiresHumanReview = true;
        orchestrated.reviewReasons.push("PROSODIC_AI_DISAGREEMENT");
        if (orchestrated.scoreSource === "ai_auto") {
          orchestrated.scoreSource = "ai_flagged";
        }
      }
      // Attach prosodic profile to metadata in aiResult
      (orchestrated.aiResult as any).prosodicProfile = prosodicProfile;
      (orchestrated.aiResult as any).prosodicKappa = kappa;
    }

    return orchestrated;
  },

  async scoreSpeakingFromText(text: string, prompt: string): Promise<OrchestratedScore> {
    const integrity = assessSpeakingIntegrity({ transcript: text, prompt });
    if (integrity.recommendation === "reject") {
      return buildRejectedScore(integrity);
    }

    try {
      const [primary, verifier] = await Promise.all([
        GeminiScoringService.scoreWriting(text, prompt),
        GeminiScoringService.verifyWriting(text, prompt),
      ]);
      return applyIntegrityToResult(buildFinalScore(primary, verifier), integrity);
    } catch (err) {
      return buildUnavailableScore(err, integrity);
    }
  },
};
// ─── Multi-Rater Ensemble Integration ─────────────────────────────────────────

const USE_ENSEMBLE_SCORING = process.env.USE_ENSEMBLE_SCORING === "true";

import { scoreWithEnsemble, scoreWritingWithEnsemble, scoreSpeakingWithEnsemble } from "./multi-rater-ensemble.js";
import { convertEnsembleToOrchestrated } from "./ensemble-adapter.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";

/**
 * Extended orchestrator that can use either primary-verifier or multi-rater ensemble
 * mode based on USE_ENSEMBLE_SCORING environment variable.
 */
export const ScoringOrchestratorEnsemble = {
  async scoreWriting(text: string, prompt: string, targetCefrLevel?: CefrLevel): Promise<OrchestratedScore> {
    if (!USE_ENSEMBLE_SCORING) {
      return ScoringOrchestrator.scoreWriting(text, prompt);
    }

    const integrity = assessWritingIntegrity({ text, prompt });
    if (integrity.recommendation === "reject") {
      return buildRejectedScore(integrity);
    }

    try {
      // Call multi-rater ensemble instead
      const ensembleResult = await scoreWritingWithEnsemble(text, prompt, targetCefrLevel || "B1");

      // Convert ensemble result to orchestrated format
      const orchestrated = convertEnsembleToOrchestrated(ensembleResult, "WRITING", integrity);

      // Enrich with discourse analysis (same as primary-verifier flow)
      const aqProfile = ArgumentQualityAnalyzer.analyse(text, prompt);
      (orchestrated.aiResult as any).argumentQualityProfile = aqProfile;

      const rawCoherence = orchestrated.aiResult.rubricScores.coherence ?? (orchestrated.aiResult.score * 10);
      const normalizedCoherence = rawCoherence > 1 ? rawCoherence / 10 : rawCoherence;
      const aqAgreement = ArgumentQualityAnalyzer.raterAgreementKappa(normalizedCoherence, aqProfile.discourseQualityScore);
      (orchestrated.aiResult as any).argumentQualityAgreement = aqAgreement;

      if (aqAgreement.agreement === "POOR") {
        orchestrated.requiresHumanReview = true;
        orchestrated.reviewReasons.push("DISCOURSE_AI_DISAGREEMENT");
        if (orchestrated.scoreSource === "ai_auto") {
          orchestrated.scoreSource = "ai_flagged";
        }
      }

      if (aqProfile.flags.includes("UNSUPPORTED_CLAIMS") || aqProfile.flags.includes("NO_CLAIM_DETECTED")) {
        orchestrated.reviewReasons.push("WEAK_ARGUMENT_STRUCTURE");
      }

      return orchestrated;
    } catch (err) {
      return buildUnavailableScore(err, integrity);
    }
  },

  async scoreSpeaking(
    audioBase64: string,
    mimeType: string,
    prompt: string,
    audioMetadata?: { audioDurationSec?: number; silentDurationSec?: number },
    targetCefrLevel?: CefrLevel
  ): Promise<OrchestratedScore> {
    if (!USE_ENSEMBLE_SCORING) {
      return ScoringOrchestrator.scoreSpeaking(audioBase64, mimeType, prompt, audioMetadata);
    }

    // Audio-only integrity checks first
    const audioOnly = assessSpeakingIntegrity({
      transcript: "",
      prompt,
      audioDurationSec: audioMetadata?.audioDurationSec,
      silentDurationSec: audioMetadata?.silentDurationSec,
      minWordCount: 0,
    });
    if (audioOnly.issues.some(i =>
      i.flag === "AUDIO_TOO_SHORT" || i.flag === "AUDIO_MOSTLY_SILENT"
    )) {
      return buildRejectedScore(audioOnly);
    }

    try {
      // Call multi-rater ensemble
      const ensembleResult = await scoreSpeakingWithEnsemble(
        audioBase64,
        prompt,
        targetCefrLevel || "B1"
      );

      // Extract transcript from first rater (all raters should provide same transcript)
      const transcript = ensembleResult.raterScores[0]?.feedback?.split("\n")[0] || "";

      // Full integrity check with transcript
      const integrity = assessSpeakingIntegrity({
        transcript,
        prompt,
        audioDurationSec: audioMetadata?.audioDurationSec,
        silentDurationSec: audioMetadata?.silentDurationSec,
      });

      if (integrity.recommendation === "reject") {
        return buildRejectedScore(integrity);
      }

      // Convert ensemble result
      const orchestrated = convertEnsembleToOrchestrated(ensembleResult, "SPEAKING", integrity);

      // ─── Q2.1: Extract acoustic features for fluency scoring ──────────────────
      let audioFeatures: AudioFeatures | undefined;
      let audioQualityMetrics: AudioQualityMetrics | undefined;
      try {
        audioFeatures = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

        // Check audio quality and flag if poor
        const audioQualityCheck = flagAudioQuality(audioFeatures);
        if (!audioQualityCheck.acceptable) {
          orchestrated.requiresHumanReview = true;
          orchestrated.reviewReasons.push(`AUDIO_QUALITY_FLAG: ${audioQualityCheck.reason}`);
          if (orchestrated.scoreSource === "ai_auto") {
            orchestrated.scoreSource = "ai_flagged";
          }
        }

        // ─── Q2.2: Advanced audio quality analysis ──────────────────────────────
        try {
          audioQualityMetrics = await AudioQualityAnalyzer.analyzeAudioQuality(
            audioBase64,
            audioFeatures
          );

          // Generate quality recommendation
          const qualityRec = generateQualityRecommendation(audioQualityMetrics, audioFeatures);

          // REJECT if critical quality issues
          if (qualityRec.recommendation === "REJECT") {
            orchestrated.requiresHumanReview = true;
            orchestrated.reviewReasons.push(`AUDIO_QUALITY_REJECT: ${qualityRec.reason}`);
            if (orchestrated.scoreSource === "ai_auto") {
              orchestrated.scoreSource = "ai_flagged";
            }
          }

          // WARN if quality concerns
          if (qualityRec.recommendation === "WARN") {
            orchestrated.requiresHumanReview = true;
            orchestrated.reviewReasons.push(`AUDIO_QUALITY_WARN: ${qualityRec.reason}`);
            if (orchestrated.scoreSource === "ai_auto") {
              orchestrated.scoreSource = "ai_flagged";
            }
          }

          // Attach quality metrics to metadata
          (orchestrated.aiResult as any).audioQualityMetrics = audioQualityMetrics;
          (orchestrated.aiResult as any).qualityRecommendation = qualityRec;
        } catch (qualityError) {
          console.warn("[ScoringOrchestrator] Audio quality analysis failed, continuing:", qualityError);
          // Gracefully degrade: continue without quality analysis
        }

        // Blend acoustic fluency with LLM fluency (50% LLM + 30% acoustic + 20% speech rate)
        const acousticFluencyContribution = computeAcousticFluencyScore(
          audioFeatures,
          ensembleResult.finalCefrLevel
        );
        const llmFluency = orchestrated.aiResult.rubricScores.fluency ?? orchestrated.aiResult.score;
        const normalizedLLMFluency = llmFluency > 1 ? llmFluency / 10 : llmFluency;

        // Weighted blend: 50% LLM fluency + 50% acoustic contribution
        const blendedFluency = (normalizedLLMFluency * 0.5 + acousticFluencyContribution * 0.5);
        orchestrated.aiResult.rubricScores.fluency = blendedFluency * 10; // Convert back to 0-10 scale

        // Attach acoustic features metadata
        (orchestrated.aiResult as any).audioFeatures = audioFeatures;
        (orchestrated.aiResult as any).acousticFluencyContribution = acousticFluencyContribution;
      } catch (acousticError) {
        console.warn("[ScoringOrchestrator] Acoustic analysis failed, continuing without acoustic features:", acousticError);
        // Gracefully degrade: continue without acoustic features
      }

      // Enrich with prosodic analysis
      const geminiFeatures = orchestrated.aiResult.speakingFeatures;
      if (geminiFeatures) {
        const prosodicProfile = ProsodicAnalyzer.analyse(
          geminiFeatures,
          transcript || undefined,
          audioMetadata?.audioDurationSec
        );
        const kappa = ProsodicAnalyzer.raterAgreementKappa(
          orchestrated.aiResult.rubricScores.fluency ?? orchestrated.aiResult.score * 10,
          prosodicProfile.fluencyScore
        );
        if (kappa.agreement === "POOR") {
          orchestrated.requiresHumanReview = true;
          orchestrated.reviewReasons.push("PROSODIC_AI_DISAGREEMENT");
          if (orchestrated.scoreSource === "ai_auto") {
            orchestrated.scoreSource = "ai_flagged";
          }
        }
        (orchestrated.aiResult as any).prosodicProfile = prosodicProfile;
        (orchestrated.aiResult as any).prosodicKappa = kappa;
      }

      return orchestrated;
    } catch (err) {
      return buildUnavailableScore(err, audioOnly);
    }
  },

  async scoreSpeakingFromText(text: string, prompt: string): Promise<OrchestratedScore> {
    if (!USE_ENSEMBLE_SCORING) {
      return ScoringOrchestrator.scoreSpeakingFromText(text, prompt);
    }

    const integrity = assessSpeakingIntegrity({ transcript: text, prompt });
    if (integrity.recommendation === "reject") {
      return buildRejectedScore(integrity);
    }

    try {
      const ensembleResult = await scoreSpeakingWithEnsemble(text, prompt, "B1");
      return applyIntegrityToResult(
        convertEnsembleToOrchestrated(ensembleResult, "SPEAKING", integrity),
        integrity
      );
    } catch (err) {
      return buildUnavailableScore(err, integrity);
    }
  },
};
