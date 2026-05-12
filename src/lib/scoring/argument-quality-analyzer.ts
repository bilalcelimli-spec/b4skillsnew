/**
 * Writing Argument Quality Analyzer
 *
 * Extracts objective discourse-level features from writing responses to
 * supplement Gemini's holistic rubric scoring. Implements:
 *
 *  - Claim-Evidence-Warrant (Toulmin 1958) structural analysis
 *  - Discourse coherence via coreference chain density
 *  - Register consistency (formal vs. informal mixing)
 *  - Argument depth score (composite)
 *  - CEFR-band prediction from discourse features
 *
 * All computations are deterministic, regex-based, and O(n) in text length.
 * No external dependencies. Calibrated against CEFR B1–C1 writing descriptors
 * (Council of Europe Companion Volume 2020).
 *
 * Typical integration:
 *   const aqProfile = ArgumentQualityAnalyzer.analyse(text, prompt);
 *   // Attach to orchestrated result, flag for human review if quality is poor.
 *
 * References:
 *   - Toulmin, S. (1958). The Uses of Argument. Cambridge UP.
 *   - Halliday & Hasan (1976). Cohesion in English. Longman.
 *   - Biber (1988). Variation across Speech and Writing. Cambridge UP.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Lexical resources (lower-cased, used with word-boundary matching)
// ─────────────────────────────────────────────────────────────────────────────

/** Claim-signalling phrases (Toulmin: claim / conclusion markers). */
const CLAIM_MARKERS = [
  "i believe", "i think", "i argue", "i contend", "i maintain", "i suggest",
  "it is clear that", "it is evident that", "it is obvious that",
  "therefore", "thus", "hence", "consequently", "as a result", "so",
  "in conclusion", "to conclude", "in summary", "to sum up",
  "my view is", "my position is", "this shows that", "this demonstrates that",
  "this means that", "this implies that",
];

/** Evidence/data-signalling phrases (Toulmin: grounds). */
const EVIDENCE_MARKERS = [
  "for example", "for instance", "such as", "namely", "e.g.",
  "according to", "based on", "as shown by", "as reported by",
  "research shows", "studies show", "evidence suggests",
  "statistics show", "data indicates", "a study found",
  "in fact", "indeed", "as a matter of fact",
  "first", "second", "third", "additionally", "furthermore", "moreover",
  "in addition", "to illustrate", "to demonstrate",
];

/** Warrant/reasoning connectors (Toulmin: warrant/backing). */
const WARRANT_MARKERS = [
  "because", "since", "as", "due to", "owing to", "given that",
  "this is because", "the reason is", "one reason is",
  "this can be explained by", "this is supported by",
  "if", "unless", "provided that", "on condition that",
  "assuming that", "on the assumption that",
];

/** Counter-argument acknowledgement markers. */
const CONCESSION_MARKERS = [
  "although", "even though", "though", "while", "whilst",
  "despite", "in spite of", "admittedly", "granted",
  "some argue", "some people believe", "critics say", "opponents argue",
  "on the other hand", "conversely", "however", "nevertheless",
  "nonetheless", "yet", "but", "still",
];

/** Informal / spoken register markers that reduce formal register score. */
const INFORMAL_MARKERS = [
  "gonna", "wanna", "gotta", "kinda", "sorta", "dunno",
  "yeah", "yep", "nope", "ok", "okay", "alright",
  "stuff", "things", "lots of", "a lot of", "tons of",
  "super", "totally", "basically", "literally", "actually",
  "like", "you know", "i mean", "anyway", "anyways",
  "hey", "hi", "bye", "cool", "awesome", "great", "nice",
  "!!!", "??", "lol", "omg", "btw", "tbh", "imo",
];

/** Formal/academic vocabulary indicators (positive register signal). */
const FORMAL_MARKERS = [
  "furthermore", "moreover", "however", "therefore", "consequently",
  "nevertheless", "nonetheless", "in addition", "additionally",
  "regarding", "concerning", "with respect to", "in terms of",
  "it is argued", "it can be seen", "it is worth noting",
  "significantly", "substantially", "considerably", "notably",
  "the aforementioned", "the latter", "the former",
];

/** Cohesive devices: referencing / substitution / ellipsis signals. */
const COHESIVE_REFERENCES = [
  "this", "these", "that", "those", "such",
  "the former", "the latter", "the above", "as mentioned",
  "as stated", "as discussed", "as noted",
  "it", "they", "them", "their", "its",
  "which", "who", "whom", "whose",
];

// ─────────────────────────────────────────────────────────────────────────────
// Feature extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const p of patterns) {
    // Word-boundary-aware: ensure pattern is surrounded by non-word chars or string edges
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "gi");
    const matches = lower.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function sentenceCount(text: string): number {
  // Split on . ! ? followed by space or end of string
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 2);
  return Math.max(1, sentences.length);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function paragraphCount(text: string): number {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 10).length || 1;
}

function uniqueWordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => /[a-z]/.test(w));
  if (words.length === 0) return 0;
  const unique = new Set(words).size;
  return unique / words.length;
}

/** Average sentence length in words. */
function avgSentenceLength(text: string): number {
  const sents = text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 2);
  if (sents.length === 0) return 0;
  const totalWords = sents.reduce((s, sent) => s + sent.trim().split(/\s+/).length, 0);
  return totalWords / sents.length;
}

/** Guiraud's Index: type/token ratio adjusted for text length (= unique / √total). */
function guiraudIndex(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => /[a-z]/.test(w));
  if (words.length === 0) return 0;
  return new Set(words).size / Math.sqrt(words.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analysis types
// ─────────────────────────────────────────────────────────────────────────────

export interface ArgumentFeatures {
  /** Total claim markers found (normalised per 100 words). */
  claimDensity: number;
  /** Total evidence markers found (normalised per 100 words). */
  evidenceDensity: number;
  /** Total warrant/reasoning connectors (normalised per 100 words). */
  warrantDensity: number;
  /** Total counter-argument acknowledgements (normalised per 100 words). */
  concessionDensity: number;
  /** Ratio: evidence / claim — higher = better-supported arguments. */
  supportRatio: number;
  /** True if at least one concession + claim pair is detected (nuanced argument). */
  hasCounterArgument: boolean;
}

export interface CoherenceFeatures {
  /** Cohesive reference density (per 100 words). */
  cohesiveReferenceDensity: number;
  /** Average sentence length (words). */
  avgSentenceLength: number;
  /** Paragraph count. */
  paragraphCount: number;
  /** Inter-paragraph topic continuity proxy: 0..1 (based on shared lexical stems). */
  topicContinuity: number;
}

export interface RegisterFeatures {
  /** Informal marker count (per 100 words). Ideal near 0 for formal writing. */
  informalMarkerDensity: number;
  /** Formal marker count (per 100 words). Higher = more academic register. */
  formalMarkerDensity: number;
  /** Guiraud lexical richness index. Higher = richer vocabulary. */
  guiraudIndex: number;
  /** Unique word ratio (type-token ratio). */
  uniqueWordRatio: number;
  /** Register consistency score 0..1. 1 = fully consistent formal register. */
  registerConsistency: number;
}

export type CefrBand = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface ArgumentQualityProfile {
  wordCount: number;
  sentenceCount: number;
  argument: ArgumentFeatures;
  coherence: CoherenceFeatures;
  register: RegisterFeatures;
  /** Composite argument depth score 0..10. */
  argumentDepthScore: number;
  /** Overall discourse quality score 0..10. */
  discourseQualityScore: number;
  /** Predicted CEFR band based on discourse features. */
  predictedCefrBand: CefrBand;
  /** Prediction confidence 0..1. */
  predictionConfidence: number;
  /** Flags for human review routing. */
  flags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CEFR prediction weights
// Calibrated against CEFR writing descriptors (CoE 2020):
//  A1/A2: minimal structure, informal, short sentences
//  B1:    some organisation, basic connectors
//  B2:    clear argument, evidence, cohesion
//  C1:    complex argument, counter-arguments, academic register
//  C2:    sophisticated, nuanced, consistent register
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_WEIGHTS = {
  claimDensity:          0.15,
  evidenceDensity:       0.20,
  warrantDensity:        0.18,
  concessionDensity:     0.12,
  cohesiveRef:           0.10,
  registerConsistency:   0.15,
  guiraudIndex:          0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Topic continuity helper
// ─────────────────────────────────────────────────────────────────────────────

function computeTopicContinuity(text: string): number {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  if (paragraphs.length < 2) return 0.5; // single paragraph — no penalty

  // Extract content words (≥4 chars, non-stopword) from each paragraph
  const STOP = new Set([
    "that", "this", "with", "from", "have", "been", "were", "they",
    "them", "their", "would", "could", "should", "will", "shall",
    "also", "more", "some", "very", "then", "when", "than", "what",
    "which", "your", "into", "over", "upon", "such", "each", "both",
  ]);

  const words = (para: string): Set<string> => {
    const ws = para.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOP.has(w));
    return new Set(ws);
  };

  let overlapSum = 0;
  let pairs = 0;
  for (let i = 0; i < paragraphs.length - 1; i++) {
    const a = words(paragraphs[i]);
    const b = words(paragraphs[i + 1]);
    if (a.size === 0 || b.size === 0) continue;
    let shared = 0;
    for (const w of a) { if (b.has(w)) shared++; }
    overlapSum += shared / Math.min(a.size, b.size);
    pairs++;
  }
  return pairs > 0 ? Math.min(1, overlapSum / pairs) : 0.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Sigmoid-like normaliser: maps [0, scale] → [0, 1] with saturation. */
function sigScale(value: number, scale: number): number {
  return Math.min(1, value / scale);
}

function predictCefrBand(
  arg: ArgumentFeatures,
  coh: CoherenceFeatures,
  reg: RegisterFeatures,
  wc: number
): { band: CefrBand; confidence: number } {
  // Composite score on [0,1] scale from feature weights
  const raw =
    CEFR_WEIGHTS.claimDensity       * sigScale(arg.claimDensity, 3) +
    CEFR_WEIGHTS.evidenceDensity     * sigScale(arg.evidenceDensity, 5) +
    CEFR_WEIGHTS.warrantDensity      * sigScale(arg.warrantDensity, 4) +
    CEFR_WEIGHTS.concessionDensity   * sigScale(arg.concessionDensity, 2) +
    CEFR_WEIGHTS.cohesiveRef         * sigScale(coh.cohesiveReferenceDensity, 8) +
    CEFR_WEIGHTS.registerConsistency * reg.registerConsistency +
    CEFR_WEIGHTS.guiraudIndex        * sigScale(reg.guiraudIndex, 8);

  // Word count penalty for very short texts
  const wcPenalty = wc < 50 ? 0.6 : wc < 100 ? 0.8 : 1.0;
  const score = raw * wcPenalty;

  // Map to CEFR band
  let band: CefrBand;
  if (score < 0.20)      band = "A1";
  else if (score < 0.35) band = "A2";
  else if (score < 0.50) band = "B1";
  else if (score < 0.65) band = "B2";
  else if (score < 0.80) band = "C1";
  else                   band = "C2";

  // Confidence: how far from the nearest boundary
  const THRESHOLDS = [0, 0.20, 0.35, 0.50, 0.65, 0.80, 1.0];
  const idx = THRESHOLDS.findIndex((t) => score < t) - 1;
  const lo = THRESHOLDS[Math.max(0, idx)] ?? 0;
  const hi = THRESHOLDS[Math.min(6, idx + 1)] ?? 1;
  const relPos = (score - lo) / Math.max(0.01, hi - lo);
  // Confidence peaks at centre of band (0.5), falls at edges
  const confidence = 0.5 + 0.5 * (1 - Math.abs(relPos - 0.5) * 2);

  return { band, confidence: Math.round(confidence * 100) / 100 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analyser
// ─────────────────────────────────────────────────────────────────────────────

export const ArgumentQualityAnalyzer = {
  /**
   * Analyse a writing response for argument quality, coherence, and register.
   *
   * @param text      The candidate's written response (plain text).
   * @param _prompt   The task prompt (reserved for future prompt-relevance check).
   * @returns         Full ArgumentQualityProfile.
   */
  analyse(text: string, _prompt?: string): ArgumentQualityProfile {
    if (!text || text.trim().length === 0) {
      return this._empty();
    }

    const wc = wordCount(text);
    const sc = sentenceCount(text);
    const per100 = (n: number) => wc > 0 ? (n / wc) * 100 : 0;

    // ── Argument features ───────────────────────────────────────────────────
    const claimCount    = countMatches(text, CLAIM_MARKERS);
    const evidenceCount = countMatches(text, EVIDENCE_MARKERS);
    const warrantCount  = countMatches(text, WARRANT_MARKERS);
    const concessionCount = countMatches(text, CONCESSION_MARKERS);

    const argument: ArgumentFeatures = {
      claimDensity:      Number(per100(claimCount).toFixed(3)),
      evidenceDensity:   Number(per100(evidenceCount).toFixed(3)),
      warrantDensity:    Number(per100(warrantCount).toFixed(3)),
      concessionDensity: Number(per100(concessionCount).toFixed(3)),
      supportRatio:      claimCount > 0 ? Number((evidenceCount / claimCount).toFixed(2)) : 0,
      hasCounterArgument: concessionCount >= 1 && claimCount >= 1,
    };

    // ── Coherence features ──────────────────────────────────────────────────
    const cohRefCount = countMatches(text, COHESIVE_REFERENCES);
    const coherence: CoherenceFeatures = {
      cohesiveReferenceDensity: Number(per100(cohRefCount).toFixed(3)),
      avgSentenceLength:        Number(avgSentenceLength(text).toFixed(1)),
      paragraphCount:           paragraphCount(text),
      topicContinuity:          Number(computeTopicContinuity(text).toFixed(3)),
    };

    // ── Register features ───────────────────────────────────────────────────
    const informalCount = countMatches(text, INFORMAL_MARKERS);
    const formalCount   = countMatches(text, FORMAL_MARKERS);
    const gi = guiraudIndex(text);
    const uwr = uniqueWordRatio(text);

    // Register consistency: penalise informal markers, reward formal ones
    const infPenalty = Math.min(1, informalCount / Math.max(1, wc / 20));
    const formBonus  = Math.min(0.4, (formalCount / Math.max(1, wc / 10)) * 0.4);
    const registerConsistency = Math.max(0, Math.min(1, 1 - infPenalty + formBonus));

    const register: RegisterFeatures = {
      informalMarkerDensity: Number(per100(informalCount).toFixed(3)),
      formalMarkerDensity:   Number(per100(formalCount).toFixed(3)),
      guiraudIndex:          Number(gi.toFixed(3)),
      uniqueWordRatio:       Number(uwr.toFixed(3)),
      registerConsistency:   Number(registerConsistency.toFixed(3)),
    };

    // ── Composite scores ────────────────────────────────────────────────────
    // Argument depth (0..10): rewards claim+evidence+warrant structure
    const argDepth =
      sigScale(argument.claimDensity, 3) * 2.5 +
      sigScale(argument.evidenceDensity, 5) * 3.0 +
      sigScale(argument.warrantDensity, 4) * 2.5 +
      (argument.hasCounterArgument ? 1.0 : 0) +
      sigScale(argument.supportRatio, 3) * 1.0;
    const argumentDepthScore = Math.min(10, Number((argDepth * 10 / 10).toFixed(2)));

    // Discourse quality (0..10): blends coherence + register + argument depth
    const dq =
      argumentDepthScore * 0.40 +
      (sigScale(coherence.cohesiveReferenceDensity, 8) * 10) * 0.25 +
      (register.registerConsistency * 10) * 0.20 +
      (coherence.topicContinuity * 10) * 0.15;
    const discourseQualityScore = Math.min(10, Number(dq.toFixed(2)));

    // ── CEFR prediction ─────────────────────────────────────────────────────
    const { band, confidence } = predictCefrBand(argument, coherence, register, wc);

    // ── Flags ───────────────────────────────────────────────────────────────
    const flags: string[] = [];
    if (wc < 50)                                  flags.push("VERY_SHORT");
    if (argument.claimDensity === 0)               flags.push("NO_CLAIM_DETECTED");
    if (argument.evidenceDensity === 0)            flags.push("NO_EVIDENCE_DETECTED");
    if (register.informalMarkerDensity > 3)        flags.push("HIGH_INFORMALITY");
    if (coherence.topicContinuity < 0.15)          flags.push("LOW_TOPIC_CONTINUITY");
    if (register.guiraudIndex < 2.5)               flags.push("RESTRICTED_VOCABULARY");
    if (argument.supportRatio < 0.5 && wc > 80)   flags.push("UNSUPPORTED_CLAIMS");

    return {
      wordCount: wc,
      sentenceCount: sc,
      argument,
      coherence,
      register,
      argumentDepthScore,
      discourseQualityScore,
      predictedCefrBand: band,
      predictionConfidence: confidence,
      flags,
    };
  },

  /** Returns an empty profile for zero-length inputs. */
  _empty(): ArgumentQualityProfile {
    return {
      wordCount: 0,
      sentenceCount: 0,
      argument: {
        claimDensity: 0, evidenceDensity: 0, warrantDensity: 0,
        concessionDensity: 0, supportRatio: 0, hasCounterArgument: false,
      },
      coherence: {
        cohesiveReferenceDensity: 0, avgSentenceLength: 0,
        paragraphCount: 0, topicContinuity: 0,
      },
      register: {
        informalMarkerDensity: 0, formalMarkerDensity: 0,
        guiraudIndex: 0, uniqueWordRatio: 0, registerConsistency: 0,
      },
      argumentDepthScore: 0,
      discourseQualityScore: 0,
      predictedCefrBand: "A1",
      predictionConfidence: 0,
      flags: ["EMPTY_RESPONSE"],
    };
  },

  /**
   * Compute inter-rater agreement between Gemini's coherence score and the
   * analyzer's discourse quality score.
   *
   * @param geminiCoherence   Gemini rubric coherence score (0..1)
   * @param analyzerScore     discourseQualityScore (0..10)
   * @returns                 agreement category and weighted difference
   */
  raterAgreementKappa(
    geminiCoherence: number,
    analyzerScore: number
  ): { agreement: "STRONG" | "ACCEPTABLE" | "POOR"; delta: number } {
    // Normalise analyzerScore to 0..1
    const normalised = analyzerScore / 10;
    const delta = Math.abs(geminiCoherence - normalised);

    let agreement: "STRONG" | "ACCEPTABLE" | "POOR";
    if (delta <= 0.15)      agreement = "STRONG";
    else if (delta <= 0.30) agreement = "ACCEPTABLE";
    else                    agreement = "POOR";

    return { agreement, delta: Number(delta.toFixed(3)) };
  },
};
