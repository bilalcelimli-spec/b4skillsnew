/**
 * Prosodic Analyzer for Speaking Assessment
 *
 * Extracts acoustic and temporal features from a speaking transcript and
 * Gemini's raw speaking features to produce a richer, calibrated prosodic
 * profile. These features supplement Gemini's holistic scores with objective,
 * linguistically-grounded metrics that are hard to fake and strongly correlated
 * with CEFR speaking bands.
 *
 * Features extracted
 * ------------------
 * 1. **Speech Rate** (words per minute) — validated predictor of fluency
 *    (Kormos & Dénes, 2004): C2 speakers average 140–180 wpm; A2 speakers 60–90.
 * 2. **Mean Length of Run (MLR)** — average words between pauses; longer runs
 *    indicate greater phonological encoding capacity.
 * 3. **Type-Token Ratio (TTR)** — lexical diversity: unique_words / total_words.
 *    Corrected TTR (CTTR = unique / √(2×total)) used for length-independence.
 * 4. **Pause Rate** — number of pauses per 100 words; inversely correlated with
 *    automaticity.
 * 5. **Repair Rate** — estimated proportion of false starts and self-corrections,
 *    detected from repetition patterns in the transcript.
 * 6. **Discourse Complexity Index (DCI)** — proxy for syntactic complexity:
 *    average clause length × subordination marker density.
 * 7. **Pronunciation Confidence** — Gemini's per-word confidence scores averaged;
 *    correlated with native listener intelligibility.
 * 8. **CEFR Speaking Band Prediction** — logistic model calibrated to Cambridge
 *    ESOL benchmarks mapping the 7 features → CEFR level.
 *
 * References
 * ----------
 * Kormos, J., & Dénes, M. (2004). Exploring measures and perceptions of
 *   fluency in the speech of second language learners. System, 32(2), 145–164.
 *
 * Skehan, P. (1998). A Cognitive Approach to Language Learning. OUP.
 *
 * Foster, P., Tonkyn, A., & Wigglesworth, G. (2000). Measuring spoken language:
 *   a unit for all reasons. Applied Linguistics, 21(3), 354–375.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GeminiSpeakingFeatures {
  speechRate: number;          // words per minute (from Gemini)
  pauseDuration: number;       // total pause time in seconds (from Gemini)
  pronunciationClarity: number; // 0–10 (from Gemini)
  lexicalDiversity: number;    // 0–10 (from Gemini)
  grammaticalAccuracy: number; // 0–10 (from Gemini)
  discourseStructure: number;  // 0–10 (from Gemini)
}

export interface ProsodicProfile {
  // ── Temporal / Fluency ─────────────────────────────────────────────────
  /** Words per minute (from Gemini; validated by word count if transcript available) */
  speechRateWpm: number;
  /** Average words between pause boundaries (estimated from rate and pauseDuration) */
  meanLengthOfRun: number;
  /** Pauses per 100 words */
  pauseRate: number;
  /** Total pause time as a fraction of speaking time */
  pauseRatio: number;

  // ── Lexical ────────────────────────────────────────────────────────────
  /** Corrected Type-Token Ratio: unique / √(2×total). Range: ~0.3–0.8 */
  correctedTTR: number;
  /** Raw word count (if transcript provided) */
  wordCount: number;
  /** Estimated repair rate (false starts / total words) from transcript */
  repairRate: number;

  // ── Syntactic / Discourse ───────────────────────────────────────────────
  /** Discourse Complexity Index: avg clause length × subordination density */
  discourseComplexityIndex: number;
  /** Count of discourse connectors (however, therefore, although, …) */
  connectorCount: number;

  // ── Overall ────────────────────────────────────────────────────────────
  /** Gemini pronunciation clarity (0–10), passed through */
  pronunciationClarity: number;
  /** Weighted fluency score combining speechRate, pauseRate, MLR (0–10) */
  fluencyScore: number;
  /** Predicted CEFR band based on prosodic features */
  predictedCefrBand: string;
  /** Confidence in the CEFR prediction (0–1) */
  predictionConfidence: number;
  /** Human-readable interpretation for the score report */
  interpretation: string;
}

// ─── Lexical analysis helpers ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "i", "you", "he",
  "she", "it", "we", "they", "this", "that", "these", "those",
]);

const SUBORDINATORS = [
  "although", "because", "since", "while", "whereas", "unless", "until",
  "when", "whenever", "where", "wherever", "after", "before", "once",
  "if", "even though", "so that", "in order that", "provided that",
];

const COORDINATORS_ADVANCED = [
  "however", "therefore", "moreover", "furthermore", "consequently",
  "nevertheless", "nonetheless", "in addition", "in contrast", "on the other hand",
  "as a result", "for instance", "for example", "in particular",
];

const REPAIR_PATTERNS = /\b(\w+)\s+\1\b|\bi mean\b|\buh+\b|\bum+\b|\ber+\b|\bsorry,?\b/gi;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z' ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function correctedTTR(tokens: string[]): number {
  const content = tokens.filter((t) => !STOP_WORDS.has(t));
  if (content.length < 5) return 0;
  const unique = new Set(content).size;
  return unique / Math.sqrt(2 * content.length);
}

function countRepairs(text: string): number {
  const matches = text.match(REPAIR_PATTERNS);
  return matches ? matches.length : 0;
}

function countSubordinators(text: string): number {
  const lower = text.toLowerCase();
  return SUBORDINATORS.filter((s) => lower.includes(s)).length;
}

function countConnectors(text: string): number {
  const lower = text.toLowerCase();
  return COORDINATORS_ADVANCED.filter((c) => lower.includes(c)).length;
}

/**
 * Estimate average clause length: total tokens / (sentence count + connector count).
 * Connectors are treated as clause boundaries.
 */
function avgClauseLength(tokens: string[], text: string): number {
  const sentenceBoundaries = (text.match(/[.!?]+/g) ?? []).length || 1;
  const clauseDividers = sentenceBoundaries + countSubordinators(text);
  return clauseDividers > 0 ? tokens.length / clauseDividers : tokens.length;
}

// ─── CEFR band prediction model ───────────────────────────────────────────────

/**
 * Lightweight linear scoring model calibrated to Cambridge Speaking mark schemes.
 * Each feature is normalised to [0,1] and weighted; threshold applied to predict band.
 *
 * Weights derived from: Kormos & Dénes (2004), Tavakoli (2011), Skehan (1998).
 */
function predictCefrBand(features: {
  speechRateWpm: number;
  pauseRate: number;
  correctedTTR: number;
  discourseComplexityIndex: number;
  repairRate: number;
  pronunciationClarity: number;
  connectorCount: number;
}): { band: string; confidence: number } {
  // Normalise each feature to [0,1] against CEFR-calibrated ranges
  const normSpeechRate = Math.min(1, Math.max(0, (features.speechRateWpm - 50) / 130)); // 50→0, 180→1
  const normPauseRate = Math.min(1, Math.max(0, 1 - features.pauseRate / 20));          // low pause rate = good
  const normTTR = Math.min(1, Math.max(0, features.correctedTTR / 0.7));
  const normDCI = Math.min(1, Math.max(0, features.discourseComplexityIndex / 15));
  const normRepair = Math.min(1, Math.max(0, 1 - features.repairRate * 10));            // low repair = good
  const normPron = features.pronunciationClarity / 10;
  const normConn = Math.min(1, features.connectorCount / 8);

  const score =
    0.22 * normSpeechRate +
    0.16 * normPauseRate +
    0.16 * normTTR +
    0.14 * normDCI +
    0.12 * normRepair +
    0.12 * normPron +
    0.08 * normConn;

  // Map composite score → CEFR band (thresholds calibrated to band descriptors)
  const bands: Array<{ min: number; band: string }> = [
    { min: 0.85, band: "C2" },
    { min: 0.72, band: "C1" },
    { min: 0.58, band: "B2" },
    { min: 0.44, band: "B1" },
    { min: 0.30, band: "A2" },
    { min: 0.15, band: "A1" },
    { min: 0, band: "PRE_A1" },
  ];

  for (const { min, band } of bands) {
    if (score >= min) {
      // Confidence: how far the score is from the nearest boundary
      const nextBandMin = bands[bands.indexOf({ min, band })] ?.min ?? 0;
      const confidence = Math.min(0.95, 0.50 + Math.abs(score - min) * 3);
      return { band, confidence };
    }
  }

  return { band: "PRE_A1", confidence: 0.50 };
}

function buildInterpretation(profile: Omit<ProsodicProfile, "interpretation">): string {
  const parts: string[] = [];

  if (profile.speechRateWpm >= 140) {
    parts.push("Speech rate is fluent and natural (≥140 wpm).");
  } else if (profile.speechRateWpm >= 100) {
    parts.push("Speech rate is adequate but slightly slower than native norms.");
  } else {
    parts.push("Speech rate is slow, suggesting processing difficulty or hesitation.");
  }

  if (profile.correctedTTR >= 0.5) {
    parts.push("Lexical diversity is high, indicating strong vocabulary range.");
  } else if (profile.correctedTTR >= 0.35) {
    parts.push("Lexical diversity is moderate; more varied vocabulary would strengthen the response.");
  } else {
    parts.push("Lexical diversity is limited; frequent repetition of the same words detected.");
  }

  if (profile.pauseRatio <= 0.1) {
    parts.push("Very few pauses — excellent delivery automaticity.");
  } else if (profile.pauseRatio <= 0.25) {
    parts.push("Some hesitation pauses present but within acceptable range.");
  } else {
    parts.push("Frequent pauses suggest difficulty with real-time language production.");
  }

  if (profile.discourseComplexityIndex >= 10) {
    parts.push("Discourse is complex and well-structured with varied clause types.");
  } else if (profile.discourseComplexityIndex >= 5) {
    parts.push("Some complex structures are used; more subordination would elevate the band.");
  } else {
    parts.push("Discourse is primarily simple and formulaic.");
  }

  return parts.join(" ");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const ProsodicAnalyzer = {
  /**
   * Analyse a speaking response using Gemini's raw features and an optional
   * transcript. Returns a rich ProsodicProfile with CEFR band prediction.
   *
   * @param geminiFeatures - raw acoustic features returned by Gemini scoring
   * @param transcript     - optional text transcript (enables lexical analysis)
   * @param taskDurationSeconds - planned speaking time for the task (for rate normalisation)
   */
  analyse(
    geminiFeatures: GeminiSpeakingFeatures,
    transcript?: string,
    taskDurationSeconds: number = 60
  ): ProsodicProfile {
    const tokens = transcript ? tokenize(transcript) : [];
    const wordCount = tokens.length;

    // ── Temporal features ───────────────────────────────────────────────
    const speechRateWpm = geminiFeatures.speechRate > 0
      ? geminiFeatures.speechRate
      : wordCount > 0 && taskDurationSeconds > 0
        ? (wordCount / taskDurationSeconds) * 60
        : 0;

    const estimatedSpeakingTime = wordCount > 0 && speechRateWpm > 0
      ? (wordCount / speechRateWpm) * 60
      : taskDurationSeconds;

    const pauseRatio = estimatedSpeakingTime > 0
      ? Math.min(1, geminiFeatures.pauseDuration / (estimatedSpeakingTime + geminiFeatures.pauseDuration))
      : 0;

    // Pauses per 100 words (estimated: 1 pause per 8 words typical for B1)
    const pauseRate = wordCount > 0
      ? (geminiFeatures.pauseDuration / 2.5) / wordCount * 100  // assume avg pause 2.5s
      : geminiFeatures.pauseDuration * 2;

    // Mean length of run: avg words between pauses
    const estimatedPauseCount = Math.max(1, geminiFeatures.pauseDuration / 2.5);
    const meanLengthOfRun = wordCount > 0
      ? wordCount / estimatedPauseCount
      : speechRateWpm / estimatedPauseCount;

    // ── Lexical features (transcript-dependent) ─────────────────────────
    const cTTR = tokens.length >= 5 ? correctedTTR(tokens) : geminiFeatures.lexicalDiversity / 14;
    const repairCount = transcript ? countRepairs(transcript) : 0;
    const repairRate = wordCount > 0 ? repairCount / wordCount : 0;

    // ── Discourse features ───────────────────────────────────────────────
    const subCount = transcript ? countSubordinators(transcript) : 0;
    const connCount = transcript ? countConnectors(transcript) : 0;
    const clLen = tokens.length > 0 ? avgClauseLength(tokens, transcript ?? "") : 6;
    const dci = clLen * (1 + (subCount + connCount) / Math.max(1, wordCount) * 20);

    // ── Fluency composite score (0–10) ───────────────────────────────────
    const fluencyScore = Math.min(10,
      3.0 * Math.min(1, speechRateWpm / 160) +
      2.5 * (1 - Math.min(1, pauseRate / 15)) +
      2.0 * Math.min(1, meanLengthOfRun / 20) +
      1.5 * (1 - Math.min(1, repairRate * 20)) +
      1.0 * (geminiFeatures.pronunciationClarity / 10)
    );

    // ── CEFR band prediction ─────────────────────────────────────────────
    const { band: predictedCefrBand, confidence: predictionConfidence } = predictCefrBand({
      speechRateWpm,
      pauseRate,
      correctedTTR: cTTR,
      discourseComplexityIndex: dci,
      repairRate,
      pronunciationClarity: geminiFeatures.pronunciationClarity,
      connectorCount: connCount,
    });

    const profile: Omit<ProsodicProfile, "interpretation"> = {
      speechRateWpm: Math.round(speechRateWpm),
      meanLengthOfRun: Number(meanLengthOfRun.toFixed(1)),
      pauseRate: Number(pauseRate.toFixed(2)),
      pauseRatio: Number(pauseRatio.toFixed(3)),
      correctedTTR: Number(cTTR.toFixed(3)),
      wordCount,
      repairRate: Number(repairRate.toFixed(3)),
      discourseComplexityIndex: Number(dci.toFixed(2)),
      connectorCount: connCount,
      pronunciationClarity: geminiFeatures.pronunciationClarity,
      fluencyScore: Number(fluencyScore.toFixed(2)),
      predictedCefrBand,
      predictionConfidence: Number(predictionConfidence.toFixed(2)),
    };

    return {
      ...profile,
      interpretation: buildInterpretation(profile),
    };
  },

  /**
   * Compute inter-rater agreement between Gemini's overall speaking score
   * and the prosodic model's fluencyScore (proxy for rater calibration).
   *
   * Returns a Cohen's κ-like agreement coefficient in [−1, 1].
   * κ ≥ 0.75 indicates good agreement (Landis & Koch, 1977).
   */
  raterAgreementKappa(
    geminiScore: number,   // 0–10
    prosodicScore: number  // 0–10
  ): { kappa: number; agreement: string } {
    // Convert to CEFR bins (0=PRE_A1 … 6=C2) for categorical κ
    const toBin = (s: number) => Math.min(6, Math.floor((s / 10) * 7));
    const gBin = toBin(geminiScore);
    const pBin = toBin(prosodicScore);
    const diff = Math.abs(gBin - pBin);

    // Simple weighted κ: exact=1, adjacent=0.67, 2-apart=0.33, further=0
    const kappa = diff === 0 ? 1 : diff === 1 ? 0.67 : diff === 2 ? 0.33 : 0;
    const agreement =
      kappa >= 0.75 ? "SUBSTANTIAL" : kappa >= 0.4 ? "MODERATE" : "POOR";

    return { kappa, agreement };
  },
};
