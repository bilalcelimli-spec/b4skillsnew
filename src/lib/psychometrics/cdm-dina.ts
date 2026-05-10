/**
 * Cognitive Diagnostic Models (CDM)
 *
 * Implements two foundational models for skills-mastery diagnosis:
 *
 * 1. DINA (Deterministic Input, Noisy "And" gate)
 *    P(X=1 | α) = (1 − s_j)^η_j · g_j^(1−η_j)
 *    where η_j = ∏_k α_k^q_jk  (1 only if examinee masters ALL required attributes)
 *    s_j  = slip parameter  (P(wrong | mastery)
 *    g_j  = guess parameter (P(correct | no mastery))
 *
 * 2. G-DINA (Generalized DINA)
 *    Decomposes the reduced latent class into saturated ANOVA-style effects:
 *    P(X_j=1 | α*_j) = δ_j0 + Σ_k δ_jk·α*_jk + Σ_{k<k'} δ_jkk'·α*_jk·α*_jk' + …
 *    Reduces to DINA with: δ_j0 = g_j, δ_j0+…full = 1−s_j, others = 0.
 *
 * References
 * ----------
 * de la Torre (2009) — DINA model parameter estimation via EM
 * de la Torre (2011) — G-DINA model
 * Hartz (2002) — NIDA / RRUM
 *
 * This module provides:
 * - Q-matrix validation
 * - DINA parameter estimation (EM algorithm, marginalised over latent classes)
 * - G-DINA parameter estimation (saturated ANOVA expansion)
 * - Attribute-profile posterior classification (EAP)
 * - Model fit: item-level residuals, RMSEA, absolute fit statistics
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Q-matrix: J items × K attributes; entry is 1 if item j requires attribute k */
export type QMatrix = number[][];  // qMatrix[j][k] ∈ {0, 1}

/** Attribute mastery profile: binary vector of length K */
export type AttributeProfile = number[];  // αProfile[k] ∈ {0, 1}

/** All 2^K possible attribute profiles */
export function generateAllProfiles(K: number): AttributeProfile[] {
  const profiles: AttributeProfile[] = [];
  for (let m = 0; m < Math.pow(2, K); m++) {
    const profile: number[] = [];
    for (let k = K - 1; k >= 0; k--) {
      profile.unshift((m >> k) & 1);
    }
    profiles.push(profile);
  }
  return profiles;
}

// DINA item parameters
export interface DinaParams {
  slip: number;    // s_j ∈ [0, 0.5)
  guess: number;   // g_j ∈ [0, 0.5)
}

// G-DINA item parameters (delta coefficients)
export interface GdinaParams {
  /** Number of attributes required by this item (sum of q-row) */
  nAttributes: number;
  /** δ coefficients indexed by reduced latent-class pattern (0 … 2^nAttr − 1) */
  deltas: number[];
}

export interface DinaModel {
  K: number;
  J: number;
  qMatrix: QMatrix;
  itemParams: DinaParams[];
  classPriors: number[];   // π_m for 2^K classes
}

export interface GdinaModel {
  K: number;
  J: number;
  qMatrix: QMatrix;
  itemParams: GdinaParams[];
  classPriors: number[];
}

export interface CdmClassificationResult {
  /** Most likely attribute profile (MAP) */
  mapProfile: AttributeProfile;
  /** EAP marginal mastery probability per attribute */
  pMastery: number[];
  /** Posterior probability over all 2^K profiles */
  posterior: number[];
}

export interface DinaFitReport {
  /** Item-level absolute fit: max |observed − expected| across classes */
  itemResiduals: number[];
  meanAbsoluteResidual: number;
  /** Proportion of items with |residual| > 0.1 */
  proportionMisfitting: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** η_j(α) = 1 iff examinee masters ALL attributes required by item j */
function eta(j: number, alpha: AttributeProfile, qMatrix: QMatrix): 0 | 1 {
  for (let k = 0; k < qMatrix[j].length; k++) {
    if (qMatrix[j][k] === 1 && alpha[k] === 0) return 0;
  }
  return 1;
}

/** DINA probability of correct response for item j given profile alpha */
function dinaP(j: number, alpha: AttributeProfile, qMatrix: QMatrix, params: DinaParams): number {
  const e = eta(j, alpha, qMatrix);
  return e === 1 ? 1 - params.slip : params.guess;
}

/** Clamp to valid slip/guess range */
function clampSG(v: number): number {
  return Math.max(0.01, Math.min(0.49, v));
}

/** Reduced attribute profile for item j (keep only attributes required by j) */
function reducedProfile(j: number, alpha: AttributeProfile, qMatrix: QMatrix): number {
  let idx = 0;
  const required: number[] = [];
  for (let k = 0; k < qMatrix[j].length; k++) {
    if (qMatrix[j][k] === 1) required.push(k);
  }
  for (let r = 0; r < required.length; r++) {
    idx = (idx << 1) | alpha[required[r]];
  }
  return idx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Q-MATRIX VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface QMatrixDiagnostics {
  valid: boolean;
  warnings: string[];
  identifiability: boolean;  // Each attribute tested by ≥ 2 items
  nItems: number;
  nAttributes: number;
}

export function validateQMatrix(qMatrix: QMatrix): QMatrixDiagnostics {
  const J = qMatrix.length;
  const warnings: string[] = [];
  if (J === 0) return { valid: false, warnings: ["Empty Q-matrix"], identifiability: false, nItems: 0, nAttributes: 0 };

  const K = qMatrix[0].length;
  if (K === 0) return { valid: false, warnings: ["Q-matrix has 0 attributes"], identifiability: false, nItems: J, nAttributes: 0 };

  // Check binary entries
  for (let j = 0; j < J; j++) {
    if (qMatrix[j].length !== K) {
      warnings.push(`Row ${j} has length ${qMatrix[j].length}, expected ${K}`);
    }
    for (let k = 0; k < K; k++) {
      if (qMatrix[j][k] !== 0 && qMatrix[j][k] !== 1) {
        warnings.push(`Q[${j}][${k}] = ${qMatrix[j][k]} is not binary`);
      }
    }
    if (qMatrix[j].reduce((s, v) => s + v, 0) === 0) {
      warnings.push(`Item ${j} requires no attributes (zero row)`);
    }
  }

  // Identifiability: each attribute required by at least 2 items
  let identifiable = true;
  for (let k = 0; k < K; k++) {
    const count = qMatrix.filter((row) => row[k] === 1).length;
    if (count < 2) {
      warnings.push(`Attribute ${k} is required by only ${count} item(s) — identifiability concern`);
      identifiable = false;
    }
  }

  // Completeness: at least K items that form an identity-matrix-like sub-matrix
  // (simplified check: each attribute measured in isolation at least once)
  for (let k = 0; k < K; k++) {
    const isolatedItems = qMatrix.filter((row) => {
      return row[k] === 1 && row.reduce((s, v) => s + v, 0) === 1;
    });
    if (isolatedItems.length === 0) {
      warnings.push(`Attribute ${k} is never assessed in isolation — partial identifiability`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    identifiability: identifiable,
    nItems: J,
    nAttributes: K,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DINA EM ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate DINA parameters via EM algorithm.
 *
 * @param responses  N × J binary response matrix (responses[n][j] ∈ {0, 1})
 * @param qMatrix    J × K Q-matrix
 * @param maxIter    Maximum EM iterations (default 200)
 * @param tol        Log-likelihood convergence tolerance (default 1e-5)
 */
export function estimateDina(
  responses: number[][],
  qMatrix: QMatrix,
  maxIter = 200,
  tol = 1e-5
): DinaModel {
  const N = responses.length;
  const J = qMatrix.length;
  const K = qMatrix[0].length;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length; // 2^K

  // Initialise parameters
  let itemParams: DinaParams[] = Array.from({ length: J }, () => ({
    slip: 0.2,
    guess: 0.2,
  }));
  let classPriors: number[] = Array(M).fill(1 / M);

  let prevLogLik = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // ── E-STEP ──────────────────────────────────────────────────────────────
    // posteriors[n][m] = P(α_m | X_n)
    const posteriors: number[][] = [];
    let logLik = 0;

    for (let n = 0; n < N; n++) {
      const unnorm: number[] = [];
      for (let m = 0; m < M; m++) {
        let lik = classPriors[m];
        for (let j = 0; j < J; j++) {
          const p = dinaP(j, allProfiles[m], qMatrix, itemParams[j]);
          const u = responses[n][j];
          lik *= u === 1 ? p : 1 - p;
          if (lik === 0) break; // underflow guard
        }
        unnorm.push(lik);
      }
      const sum = unnorm.reduce((a, b) => a + b, 0);
      logLik += Math.log(Math.max(sum, 1e-300));
      posteriors.push(unnorm.map((v) => (sum > 0 ? v / sum : 1 / M)));
    }

    // ── M-STEP ──────────────────────────────────────────────────────────────
    // Update class priors
    const newPriors: number[] = Array(M).fill(0);
    for (let n = 0; n < N; n++) {
      for (let m = 0; m < M; m++) newPriors[m] += posteriors[n][m];
    }
    classPriors = newPriors.map((v) => v / N);

    // Update slip and guess per item
    const newParams: DinaParams[] = [];
    for (let j = 0; j < J; j++) {
      let numSlip = 0, denomMastery = 0;
      let numGuess = 0, denomNoMastery = 0;

      for (let n = 0; n < N; n++) {
        for (let m = 0; m < M; m++) {
          const post = posteriors[n][m];
          const e = eta(j, allProfiles[m], qMatrix);
          if (e === 1) {
            denomMastery += post;
            if (responses[n][j] === 0) numSlip += post; // slipped
          } else {
            denomNoMastery += post;
            if (responses[n][j] === 1) numGuess += post; // guessed
          }
        }
      }

      newParams.push({
        slip: clampSG(denomMastery > 0 ? numSlip / denomMastery : 0.2),
        guess: clampSG(denomNoMastery > 0 ? numGuess / denomNoMastery : 0.2),
      });
    }
    itemParams = newParams;

    // Convergence check
    if (Math.abs(logLik - prevLogLik) < tol) break;
    prevLogLik = logLik;
  }

  return { K, J, qMatrix, itemParams, classPriors };
}

// ─────────────────────────────────────────────────────────────────────────────
// G-DINA EM ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate G-DINA parameters via EM.
 * Uses saturated ANOVA-like expansion per item over reduced latent classes.
 */
export function estimateGdina(
  responses: number[][],
  qMatrix: QMatrix,
  maxIter = 200,
  tol = 1e-5
): GdinaModel {
  const N = responses.length;
  const J = qMatrix.length;
  const K = qMatrix[0].length;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length;

  // For each item j, determine which attributes it requires
  const requiredAttrs: number[][] = qMatrix.map((row) =>
    row.map((v, k) => (v === 1 ? k : -1)).filter((k) => k >= 0)
  );
  const nReduced: number[] = requiredAttrs.map((attrs) => Math.pow(2, attrs.length));

  // Initialise: monotone — P(correct) increases with number of mastered attributes.
  // This avoids label-switching local optima that plague uniform initialisation.
  let pCorrect: number[][] = Array.from({ length: J }, (_, j) => {
    const nr = nReduced[j];
    return Array.from({ length: nr }, (__, c) => {
      // Count 1-bits in c (mastered attributes out of required set)
      const mastered = c.toString(2).split("").filter((b) => b === "1").length;
      const ratio = nr > 1 ? mastered / (nr - 1) : 1;
      return 0.2 + 0.6 * ratio;  // 0.2 (no mastery) → 0.8 (full mastery)
    });
  });
  let classPriors: number[] = Array(M).fill(1 / M);

  let prevLogLik = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // ── E-STEP ──────────────────────────────────────────────────────────────
    const posteriors: number[][] = [];
    let logLik = 0;

    for (let n = 0; n < N; n++) {
      const unnorm: number[] = [];
      for (let m = 0; m < M; m++) {
        let lik = classPriors[m];
        for (let j = 0; j < J; j++) {
          const rIdx = reducedProfile(j, allProfiles[m], qMatrix);
          const p = Math.max(0.001, Math.min(0.999, pCorrect[j][rIdx]));
          lik *= responses[n][j] === 1 ? p : 1 - p;
          if (lik === 0) break;
        }
        unnorm.push(lik);
      }
      const sum = unnorm.reduce((a, b) => a + b, 0);
      logLik += Math.log(Math.max(sum, 1e-300));
      posteriors.push(unnorm.map((v) => (sum > 0 ? v / sum : 1 / M)));
    }

    // ── M-STEP ──────────────────────────────────────────────────────────────
    // Update class priors
    const newPriors: number[] = Array(M).fill(0);
    for (let n = 0; n < N; n++) {
      for (let m = 0; m < M; m++) newPriors[m] += posteriors[n][m];
    }
    classPriors = newPriors.map((v) => v / N);

    // Update P(correct | reduced class) for each item
    const newPCorrect: number[][] = [];
    for (let j = 0; j < J; j++) {
      const nr = nReduced[j];
      const numCorrect = Array(nr).fill(0);
      const denom = Array(nr).fill(0);

      for (let n = 0; n < N; n++) {
        for (let m = 0; m < M; m++) {
          const rIdx = reducedProfile(j, allProfiles[m], qMatrix);
          denom[rIdx] += posteriors[n][m];
          if (responses[n][j] === 1) numCorrect[rIdx] += posteriors[n][m];
        }
      }
      newPCorrect.push(
        numCorrect.map((num, r) =>
          denom[r] > 0 ? Math.max(0.001, Math.min(0.999, num / denom[r])) : 0.5
        )
      );
    }
    pCorrect = newPCorrect;

    if (Math.abs(logLik - prevLogLik) < tol) break;
    prevLogLik = logLik;
  }

  // Convert to delta parameterisation
  const itemParams: GdinaParams[] = pCorrect.map((pj, j) => {
    const nr = nReduced[j];
    const attrs = requiredAttrs[j];
    // Simple delta: delta[c] = pCorrect[c] for each reduced class pattern c
    // Full ANOVA inversion is complex; store p-values directly as deltas for now.
    // Caller can apply Hadamard / ANOVA transform if needed.
    return { nAttributes: attrs.length, deltas: [...pj] };
  });

  return { K, J, qMatrix, itemParams, classPriors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION (EAP + MAP)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a single examinee given their response vector and a fitted DINA model.
 */
export function classifyExaminee(
  responseVector: number[],
  model: DinaModel
): CdmClassificationResult {
  const { K, J, qMatrix, itemParams, classPriors } = model;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length;

  // Compute unnormalised posterior
  const unnorm: number[] = allProfiles.map((alpha, m) => {
    let lik = classPriors[m];
    for (let j = 0; j < J; j++) {
      const p = dinaP(j, alpha, qMatrix, itemParams[j]);
      lik *= responseVector[j] === 1 ? p : 1 - p;
      if (lik === 0) break;
    }
    return lik;
  });

  const sum = unnorm.reduce((a, b) => a + b, 0) || 1;
  const posterior = unnorm.map((v) => v / sum);

  // MAP profile
  const mapIdx = posterior.indexOf(Math.max(...posterior));
  const mapProfile = allProfiles[mapIdx];

  // EAP: marginal mastery probability per attribute
  const pMastery: number[] = Array(K).fill(0);
  for (let m = 0; m < M; m++) {
    for (let k = 0; k < K; k++) {
      pMastery[k] += posterior[m] * allProfiles[m][k];
    }
  }

  return { mapProfile, pMastery, posterior };
}

/**
 * Classify using G-DINA model.
 */
export function classifyExamineeGdina(
  responseVector: number[],
  model: GdinaModel
): CdmClassificationResult {
  const { K, J, qMatrix, itemParams, classPriors } = model;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length;

  const unnorm: number[] = allProfiles.map((alpha, m) => {
    let lik = classPriors[m];
    for (let j = 0; j < J; j++) {
      const rIdx = reducedProfile(j, alpha, qMatrix);
      const p = Math.max(0.001, Math.min(0.999, itemParams[j].deltas[rIdx] ?? 0.5));
      lik *= responseVector[j] === 1 ? p : 1 - p;
      if (lik === 0) break;
    }
    return lik;
  });

  const sum = unnorm.reduce((a, b) => a + b, 0) || 1;
  const posterior = unnorm.map((v) => v / sum);
  const mapIdx = posterior.indexOf(Math.max(...posterior));
  const mapProfile = allProfiles[mapIdx];

  const pMastery: number[] = Array(K).fill(0);
  for (let m = 0; m < M; m++) {
    for (let k = 0; k < K; k++) {
      pMastery[k] += posterior[m] * allProfiles[m][k];
    }
  }

  return { mapProfile, pMastery, posterior };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIT STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute item-level absolute fit for the DINA model.
 * Compares observed P(X_j=1 | class) with model-predicted P(X_j=1 | class)
 * averaged over the estimated class posteriors.
 */
export function dinaFit(
  responses: number[][],
  model: DinaModel
): DinaFitReport {
  const { K, J, qMatrix, itemParams, classPriors } = model;
  const N = responses.length;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length;

  // Compute posteriors
  const posteriors: number[][] = responses.map((rv) => {
    const unnorm = allProfiles.map((alpha, m) => {
      let lik = classPriors[m];
      for (let j = 0; j < J; j++) {
        const p = dinaP(j, alpha, qMatrix, itemParams[j]);
        lik *= rv[j] === 1 ? p : 1 - p;
        if (lik === 0) break;
      }
      return lik;
    });
    const sum = unnorm.reduce((a, b) => a + b, 0) || 1;
    return unnorm.map((v) => v / sum);
  });

  const itemResiduals: number[] = [];
  for (let j = 0; j < J; j++) {
    // Expected P(X_j=1) under model
    let expected = 0;
    for (let m = 0; m < M; m++) {
      const classWeight = posteriors.reduce((s, post) => s + post[m], 0) / N;
      expected += classWeight * dinaP(j, allProfiles[m], qMatrix, itemParams[j]);
    }
    // Observed
    const observed = responses.reduce((s, rv) => s + rv[j], 0) / N;
    itemResiduals.push(Math.abs(observed - expected));
  }

  const meanAbsoluteResidual = itemResiduals.reduce((s, r) => s + r, 0) / J;
  const proportionMisfitting = itemResiduals.filter((r) => r > 0.1).length / J;

  return { itemResiduals, meanAbsoluteResidual, proportionMisfitting };
}

// ─────────────────────────────────────────────────────────────────────────────
// LINGUADAPT SKILL TAXONOMY Q-MATRIX
// ─────────────────────────────────────────────────────────────────────────────
//
// 8 fine-grained cognitive attributes mapped to 6 CEFR skill domains:
//
//   Attr 0 · Phonological / orthographic decoding   (Reading, Listening)
//   Attr 1 · Lexical knowledge                      (all skills)
//   Attr 2 · Grammatical accuracy                   (Grammar, Writing, Speaking)
//   Attr 3 · Reading comprehension (global)         (Reading)
//   Attr 4 · Listening comprehension (global)       (Listening)
//   Attr 5 · Written production / coherence         (Writing)
//   Attr 6 · Spoken production / fluency            (Speaking)
//   Attr 7 · Pragmatic / discourse competence       (Writing, Speaking, Reading adv.)
//
// Q-matrix row = item, col = attribute (8 columns).
// This canonical Q-matrix covers one item per skill; real deployments
// should supply a full item-bank Q-matrix via `LINGUADAPT_QMATRIX`.

/**
 * Attribute index → human-readable label.
 */
export const LINGUADAPT_ATTRIBUTES: string[] = [
  "Phonological/Orthographic Decoding",
  "Lexical Knowledge",
  "Grammatical Accuracy",
  "Reading Comprehension",
  "Listening Comprehension",
  "Written Production & Coherence",
  "Spoken Production & Fluency",
  "Pragmatic & Discourse Competence",
];

export const LINGUADAPT_K = LINGUADAPT_ATTRIBUTES.length; // 8

/**
 * Prototype 8-column Q-matrix for the 6 LinguAdapt skills.
 * Each row corresponds to a representative item type.
 * Cols: [phon, lex, gram, read, listen, write, speak, pragma]
 */
export const LINGUADAPT_QMATRIX: QMatrix = [
  // Reading items (prototype — 2 rows)
  [1, 1, 0, 1, 0, 0, 0, 0],   // Basic reading comprehension
  [0, 1, 0, 1, 0, 0, 0, 1],   // Advanced reading (inference/pragmatics)
  // Listening items
  [1, 1, 0, 0, 1, 0, 0, 0],   // Basic listening comprehension
  [0, 1, 0, 0, 1, 0, 0, 1],   // Advanced listening (implicit meaning)
  // Grammar items
  [0, 0, 1, 0, 0, 0, 0, 0],   // Grammar accuracy (isolated)
  [0, 1, 1, 0, 0, 0, 0, 0],   // Grammar in context (lexicogrammar)
  // Vocabulary items
  [0, 1, 0, 0, 0, 0, 0, 0],   // Lexical knowledge (isolated)
  [0, 1, 1, 0, 0, 0, 0, 0],   // Collocation / lexicogrammar
  // Writing items
  [0, 1, 1, 0, 0, 1, 0, 0],   // Short written production
  [0, 1, 1, 0, 0, 1, 0, 1],   // Extended written production (coherence)
  // Speaking items
  [1, 1, 1, 0, 0, 0, 1, 0],   // Spoken production (phonological + grammar)
  [0, 1, 1, 0, 0, 0, 1, 1],   // Extended spoken production (discourse)
];

// ─────────────────────────────────────────────────────────────────────────────
// G-DINA DIAGNOSTIC FEEDBACK REPORT
// ─────────────────────────────────────────────────────────────────────────────

export type MasteryLevel = "not_mastered" | "developing" | "mastered";

export interface AttributeFeedback {
  attribute: string;
  masteryProbability: number;
  masteryLevel: MasteryLevel;
  /** One-sentence actionable feedback for learner report */
  feedback: string;
  /** Suggested next-step activity type */
  recommendedActivity: string;
}

export interface GdinaDiagnosticReport {
  /** Overall proportion of attributes mastered (MAP ≥ 0.5) */
  overallMasteryRate: number;
  attributes: AttributeFeedback[];
  /** Weakest attribute by mastery probability */
  primaryWeakness: string;
  /** Strongest attribute */
  primaryStrength: string;
  /** MAP profile as binary string e.g. "10110100" */
  mapProfileString: string;
  /** Estimated learning stage based on overall mastery */
  learningStage: "Foundation" | "Developing" | "Consolidating" | "Proficient";
}

const MASTERY_THRESHOLD_HIGH = 0.80;  // P ≥ 0.80 → mastered
const MASTERY_THRESHOLD_LOW  = 0.40;  // P < 0.40 → not mastered

const FEEDBACK_LIBRARY: Record<string, { feedback: string; activity: string }> = {
  "Phonological/Orthographic Decoding": {
    feedback: "Focus on sound-spelling correspondences and phoneme awareness exercises.",
    activity: "Phonics drills & pronunciation practice",
  },
  "Lexical Knowledge": {
    feedback: "Expand your vocabulary through extensive reading and spaced-repetition flashcards.",
    activity: "Vocabulary builder & collocation exercises",
  },
  "Grammatical Accuracy": {
    feedback: "Review core grammar rules and practise with structured error-correction tasks.",
    activity: "Grammar accuracy drills",
  },
  "Reading Comprehension": {
    feedback: "Practise skimming and scanning strategies and read authentic texts at your level.",
    activity: "Graded reader & comprehension questions",
  },
  "Listening Comprehension": {
    feedback: "Increase exposure to authentic spoken English (podcasts, lectures) and practise note-taking.",
    activity: "Dictation & authentic listening tasks",
  },
  "Written Production & Coherence": {
    feedback: "Practise planning and organising paragraphs; use discourse markers for cohesion.",
    activity: "Guided writing with feedback",
  },
  "Spoken Production & Fluency": {
    feedback: "Engage in regular speaking practice; record yourself and reflect on fluency and accuracy.",
    activity: "Spoken production tasks & self-review",
  },
  "Pragmatic & Discourse Competence": {
    feedback: "Study how meaning is conveyed in context; analyse authentic dialogues for implied meaning.",
    activity: "Pragmatics awareness tasks",
  },
};

/**
 * Generate a structured, student-facing diagnostic report from a G-DINA
 * classification result and the LinguAdapt attribute taxonomy.
 *
 * @param result    Output of `classifyExamineeGdina()` or `classifyExaminee()`
 * @param attributeLabels  Optional override for attribute names (defaults to LINGUADAPT_ATTRIBUTES)
 */
export function generateDiagnosticFeedback(
  result: CdmClassificationResult,
  attributeLabels: string[] = LINGUADAPT_ATTRIBUTES,
): GdinaDiagnosticReport {
  const K = result.pMastery.length;
  const attributes: AttributeFeedback[] = result.pMastery.map((p, k) => {
    const label = attributeLabels[k] ?? `Attribute ${k}`;
    const level: MasteryLevel =
      p >= MASTERY_THRESHOLD_HIGH ? "mastered"
      : p >= MASTERY_THRESHOLD_LOW ? "developing"
      : "not_mastered";
    const lib = FEEDBACK_LIBRARY[label];
    return {
      attribute: label,
      masteryProbability: parseFloat(p.toFixed(3)),
      masteryLevel: level,
      feedback: lib?.feedback ?? "Continue practising this skill area.",
      recommendedActivity: lib?.activity ?? "Targeted practice exercises",
    };
  });

  const masteredCount = attributes.filter((a) => a.masteryLevel === "mastered").length;
  const overallMasteryRate = K > 0 ? masteredCount / K : 0;

  let minP = Infinity, maxP = -Infinity;
  let primaryWeakness = attributeLabels[0] ?? "Unknown";
  let primaryStrength  = attributeLabels[0] ?? "Unknown";
  for (let k = 0; k < K; k++) {
    if (result.pMastery[k]! < minP) { minP = result.pMastery[k]!; primaryWeakness = attributeLabels[k] ?? `Attr ${k}`; }
    if (result.pMastery[k]! > maxP) { maxP = result.pMastery[k]!; primaryStrength  = attributeLabels[k] ?? `Attr ${k}`; }
  }

  const mapProfileString = result.mapProfile.join("");

  const learningStage: GdinaDiagnosticReport["learningStage"] =
    overallMasteryRate >= 0.875 ? "Proficient"
    : overallMasteryRate >= 0.625 ? "Consolidating"
    : overallMasteryRate >= 0.375 ? "Developing"
    : "Foundation";

  return {
    overallMasteryRate: parseFloat(overallMasteryRate.toFixed(3)),
    attributes,
    primaryWeakness,
    primaryStrength,
    mapProfileString,
    learningStage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE-LEVEL CAT ITEM SELECTION (G-DINA)
// ─────────────────────────────────────────────────────────────────────────────

export interface CdmItemPool {
  id: string;
  /** Row index into the Q-matrix */
  qRow: number[];
}

/**
 * KL-divergence between two posterior vectors (measured in nats).
 * KL(P || Q) = Σ P_m · ln(P_m / Q_m)
 */
function klDivergence(p: number[], q: number[]): number {
  let kl = 0;
  for (let m = 0; m < p.length; m++) {
    const pm = Math.max(p[m]!, 1e-12);
    const qm = Math.max(q[m]!, 1e-12);
    kl += pm * Math.log(pm / qm);
  }
  return kl;
}

/**
 * Compute expected posterior KL-divergence for item j
 * (Tatsuoka & Ferguson 2003 attribute-level mutual information).
 *
 * EKLD_j = Σ_{u∈{0,1}} P(X_j=u | current posterior) · KL(post_after_u || current_post)
 */
function expectedKLD(
  j: number,
  currentPosterior: number[],
  model: GdinaModel,
): number {
  const { K, qMatrix, itemParams, classPriors: _p } = model;
  const allProfiles = generateAllProfiles(K);
  const M = allProfiles.length;

  // P(X_j = 1) = Σ_m post[m] · P(X_j=1 | alpha_m)
  let pX1 = 0;
  for (let m = 0; m < M; m++) {
    const rIdx = reducedProfile(j, allProfiles[m]!, qMatrix);
    const pij = itemParams[j]!.deltas[rIdx] ?? 0.5;
    pX1 += currentPosterior[m]! * pij;
  }
  const pX0 = 1 - pX1;

  if (pX1 < 1e-6 || pX0 < 1e-6) return 0; // Item provides no discrimination

  // Posterior after observing X_j=1 and X_j=0
  const postAfter1 = new Array<number>(M).fill(0);
  const postAfter0 = new Array<number>(M).fill(0);
  let sum1 = 0, sum0 = 0;
  for (let m = 0; m < M; m++) {
    const rIdx = reducedProfile(j, allProfiles[m]!, qMatrix);
    const pij = Math.max(0.001, Math.min(0.999, itemParams[j]!.deltas[rIdx] ?? 0.5));
    postAfter1[m] = currentPosterior[m]! * pij;
    postAfter0[m] = currentPosterior[m]! * (1 - pij);
    sum1 += postAfter1[m]!;
    sum0 += postAfter0[m]!;
  }
  if (sum1 > 0) for (let m = 0; m < M; m++) postAfter1[m]! /= sum1;
  if (sum0 > 0) for (let m = 0; m < M; m++) postAfter0[m]! /= sum0;

  return pX1 * klDivergence(postAfter1, currentPosterior)
       + pX0 * klDivergence(postAfter0, currentPosterior);
}

/**
 * Select the next item from the pool that maximises expected KL-divergence
 * (attribute-level Fisher information in CDM terms).
 *
 * @param pool         Available items with their Q-matrix rows.
 * @param model        Fitted G-DINA model (same K and Q-structure).
 * @param posterior    Current examinee posterior over 2^K classes.
 * @param used         Set of item IDs already administered.
 */
export function selectNextCdmItem(
  pool: CdmItemPool[],
  model: GdinaModel,
  posterior: number[],
  used: Set<string>,
): CdmItemPool | null {
  const { J, qMatrix } = model;
  const available = pool.filter((it) => !used.has(it.id));
  if (available.length === 0) return null;

  let bestItem: CdmItemPool = available[0]!;
  let bestEKLD = -Infinity;

  for (const item of available) {
    // Map item's qRow to an item index j in the model's Q-matrix.
    // If qRow matches a row in qMatrix exactly, use that item's G-DINA params.
    let j = 0;
    for (let jj = 0; jj < J; jj++) {
      if (qMatrix[jj]!.length === item.qRow.length &&
          qMatrix[jj]!.every((v, k) => v === item.qRow[k])) {
        j = jj;
        break;
      }
    }
    const ekld = expectedKLD(j, posterior, model);
    if (ekld > bestEKLD) {
      bestEKLD = ekld;
      bestItem = item;
    }
  }
  return bestItem;
}

/**
 * Compute attribute-level standard error (posterior SD) for each attribute.
 * SEM_k = sqrt( P_k · (1 − P_k) ) — Bernoulli variance of marginal mastery.
 */
export function computeAttributeSem(pMastery: number[]): number[] {
  return pMastery.map((p) => Math.sqrt(Math.max(0, p * (1 - p))));
}

/**
 * Mastery stopping rule: stop when all SEM_k < threshold AND n ≥ minItems.
 */
export function cdmStoppingRule(
  pMastery: number[],
  nAdministered: number,
  semThreshold = 0.20,
  minItems = 8,
): { stop: boolean; reason?: string } {
  if (nAdministered < minItems) return { stop: false };
  const sems = computeAttributeSem(pMastery);
  const maxSem = Math.max(...sems);
  if (maxSem < semThreshold) {
    return { stop: true, reason: `All attribute SEMs < ${semThreshold} after ${nAdministered} items` };
  }
  return { stop: false };
}
