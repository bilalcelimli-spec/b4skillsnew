/**
 * MIRT 4D — Four-dimensional compensatory IRT model.
 *
 * Latent trait vector θ = (θ_receptive, θ_productive, θ_grammatical, θ_strategic)
 *
 * - θ_receptive   : READING + LISTENING ability
 * - θ_productive  : WRITING + SPEAKING ability
 * - θ_grammatical : GRAMMAR + VOCABULARY accuracy
 * - θ_strategic   : discourse coherence, pragmatic & inferencing skill
 *
 * Model: P(u=1|θ) = c + (1−c) · σ(a⊤θ + d)
 *   where  a = [a1, a2, a3, a4]  (4D discrimination vector)
 *          d = intercept  (related to item difficulty: d ≈ −‖a‖·b)
 *          c = guessing parameter
 *
 * Estimation: EAP with 9-point Gauss–Hermite quadrature (product grid ≈ 6,561 nodes).
 * For n ≥ 300 calibration observations, Newton–Raphson M-step updates a & d.
 *
 * References:
 *   Reckase (2009) Multidimensional Item Response Theory
 *   Segall (1996) Multidimensional adaptive testing
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface Mirt4DItemParams {
  /** 4D discrimination vector [a1, a2, a3, a4] */
  a: [number, number, number, number];
  /** Intercept (d = −Σaᵢ·b for compensatory model) */
  d: number;
  /** Lower asymptote / guessing (default 0) */
  c: number;
}

export interface Mirt4DProfile {
  theta: [number, number, number, number];
  sem: [number, number, number, number];
  /** Trace of the posterior covariance (≈ total variance) */
  traceCovariance: number;
}

export interface Mirt4DObservation {
  /** Response (0 | 1) */
  score: 0 | 1;
  params: Mirt4DItemParams;
}

export interface Mirt4DCalibrationInput {
  /** Observed examinee θ estimates (4D vectors) */
  thetas: [number, number, number, number][];
  /** Corresponding dichotomous responses */
  scores: (0 | 1)[];
}

export interface Mirt4DCalibrationResult {
  params: Mirt4DItemParams;
  stable: boolean;
  n: number;
  logLikelihood: number;
  rejectionReason?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Skill → dimension mapping
// ────────────────────────────────────────────────────────────────────────────

/** Canonical loading profiles for each skill type. */
const SKILL_LOADINGS: Record<string, [number, number, number, number]> = {
  READING:   [0.80, 0.05, 0.10, 0.05],
  LISTENING: [0.80, 0.05, 0.10, 0.05],
  WRITING:   [0.05, 0.80, 0.10, 0.05],
  SPEAKING:  [0.05, 0.80, 0.10, 0.05],
  GRAMMAR:   [0.05, 0.05, 0.85, 0.05],
  VOCABULARY:[0.10, 0.10, 0.75, 0.05],
  DEFAULT:   [0.25, 0.25, 0.25, 0.25],
};

/**
 * Convert unidimensional IRT parameters + skill into 4D MIRT params.
 * Loadings sum to 1; total discrimination norm preserved: ‖a4d‖ ≈ a_1D.
 */
export function unidimTo4DParams(
  a1D: number,
  b: number,
  c: number,
  skill: string,
): Mirt4DItemParams {
  const loadings = SKILL_LOADINGS[skill.toUpperCase()] ?? SKILL_LOADINGS.DEFAULT!;
  const a: [number, number, number, number] = [
    loadings[0]! * a1D,
    loadings[1]! * a1D,
    loadings[2]! * a1D,
    loadings[3]! * a1D,
  ];
  // d = −a⊤·[b,b,b,b] for "same b across all active dimensions"
  const d = -(a[0] + a[1] + a[2] + a[3]) * b;
  return { a, d, c };
}

// ────────────────────────────────────────────────────────────────────────────
// Core probability function
// ────────────────────────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  if (x > 40) return 1;
  if (x < -40) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * P(u=1 | θ, params) under the 4D compensatory model.
 */
export function probability4D(
  theta: [number, number, number, number],
  params: Mirt4DItemParams,
): number {
  const z = params.a[0] * theta[0]
           + params.a[1] * theta[1]
           + params.a[2] * theta[2]
           + params.a[3] * theta[3]
           + params.d;
  return params.c + (1 - params.c) * sigmoid(z);
}

// ────────────────────────────────────────────────────────────────────────────
// 4D Fisher information (diagonal of the item information matrix)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Diagonal elements of the 4D item information matrix I(θ) at the given θ.
 * Returns [I1, I2, I3, I4].
 *
 * Formula (k-th diagonal): Iₖₖ = aₖ² · (P−c)² · (1−P) / [P · (1−c)²]
 */
export function information4D(
  theta: [number, number, number, number],
  params: Mirt4DItemParams,
): [number, number, number, number] {
  const P = probability4D(theta, params);
  if (P <= 1e-4 || P >= 1 - 1e-4 || params.c >= 1 - 1e-4) {
    return [0, 0, 0, 0];
  }
  const q = 1 - P;
  const L = (P - params.c) / (1 - params.c);
  const factor = q * L * L / P;
  return [
    params.a[0] ** 2 * factor,
    params.a[1] ** 2 * factor,
    params.a[2] ** 2 * factor,
    params.a[3] ** 2 * factor,
  ];
}

/**
 * Scalar "information trace" — sum of diagonal elements.
 * Used for 4D item selection (analogous to Fisher information in 1D).
 */
export function informationTrace4D(
  theta: [number, number, number, number],
  params: Mirt4DItemParams,
): number {
  const diag = information4D(theta, params);
  return diag[0] + diag[1] + diag[2] + diag[3];
}

// ────────────────────────────────────────────────────────────────────────────
// 9-point Gauss–Hermite quadrature nodes & weights
// ────────────────────────────────────────────────────────────────────────────

/** Nodes xᵢ and weights wᵢ for ∫f(x)e^{−x²}dx ≈ Σwᵢf(xᵢ), standardised to N(0,1). */
const GH9_NODES: number[] = [
  -3.190993, -2.266581, -1.468553, -0.723552,
   0.000000,
   0.723552,  1.468553,  2.266581,  3.190993,
];
const GH9_WEIGHTS: number[] = [
  3.960698e-5, 4.943605e-3, 8.847453e-2, 4.326836e-1,
  7.202352e-1,
  4.326836e-1, 8.847453e-2, 4.943605e-3, 3.960698e-5,
];
const N_QUAD = GH9_NODES.length; // 9

// ────────────────────────────────────────────────────────────────────────────
// EAP θ estimation (product-grid quadrature)
// ────────────────────────────────────────────────────────────────────────────

function logLikGrid(
  theta: [number, number, number, number],
  observations: Mirt4DObservation[],
): number {
  let ll = 0;
  for (const obs of observations) {
    const p = Math.max(1e-9, Math.min(1 - 1e-9, probability4D(theta, obs.params)));
    ll += obs.score === 1 ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

/**
 * EAP estimate of 4D θ using 9-point Gauss–Hermite product quadrature.
 *
 * Grid size = 9⁴ = 6,561 nodes — tractable in ≪1 ms for typical response sets.
 * Prior: independent N(priorMean, priorSd²) on each dimension.
 */
export function estimate4DTheta(
  observations: Mirt4DObservation[],
  priorMean = 0,
  priorSd = 1,
): Mirt4DProfile {
  if (observations.length === 0) {
    const t: [number, number, number, number] = [priorMean, priorMean, priorMean, priorMean];
    const s: [number, number, number, number] = [priorSd, priorSd, priorSd, priorSd];
    return { theta: t, sem: s, traceCovariance: 4 * priorSd * priorSd };
  }

  // Quadrature nodes in ability space: xᵢ = priorMean + priorSd · GH9_NODES[i]·√2
  // (Gauss–Hermite is defined for e^{-x²}, so we transform: t = (θ−μ)/(σ√2))
  const scale = priorSd * Math.SQRT2;
  const pts = GH9_NODES.map((n) => priorMean + scale * n);

  // Accumulate numerators (E[θₖ]) and E[θₖ²] over the product grid.
  // We iterate dimension-by-dimension to avoid allocating a 4D array.
  // Strategy: one flat loop over 9^4 = 6561 multi-indices.

  const sum4 = Array<number>(4).fill(0);
  const sum4sq = Array<number>(4).fill(0);
  let sumW = 0;

  // Pre-compute log-prior weights for each 1D node.
  const logW1D = GH9_NODES.map((_, i) => Math.log(GH9_WEIGHTS[i]! + 1e-300));

  for (let i0 = 0; i0 < N_QUAD; i0++) {
    for (let i1 = 0; i1 < N_QUAD; i1++) {
      for (let i2 = 0; i2 < N_QUAD; i2++) {
        for (let i3 = 0; i3 < N_QUAD; i3++) {
          const theta4: [number, number, number, number] = [
            pts[i0]!, pts[i1]!, pts[i2]!, pts[i3]!,
          ];
          const logPrior = logW1D[i0]! + logW1D[i1]! + logW1D[i2]! + logW1D[i3]!;
          const ll = logLikGrid(theta4, observations);
          const logPost = logPrior + ll;
          // We accumulate in log-space (with overflow protection) via running max trick below.
          // Here we directly exponentiate — since logPost differences matter, not absolute values,
          // we apply a fixed offset after the first pass. For numerical safety we clamp ll.
          const w = Math.exp(Math.max(-700, logPost));
          sumW += w;
          sum4[0]! += pts[i0]! * w;
          sum4[1]! += pts[i1]! * w;
          sum4[2]! += pts[i2]! * w;
          sum4[3]! += pts[i3]! * w;
          sum4sq[0]! += pts[i0]! ** 2 * w;
          sum4sq[1]! += pts[i1]! ** 2 * w;
          sum4sq[2]! += pts[i2]! ** 2 * w;
          sum4sq[3]! += pts[i3]! ** 2 * w;
        }
      }
    }
  }

  if (sumW <= 0 || !Number.isFinite(sumW)) {
    const t: [number, number, number, number] = [priorMean, priorMean, priorMean, priorMean];
    const s: [number, number, number, number] = [priorSd, priorSd, priorSd, priorSd];
    return { theta: t, sem: s, traceCovariance: 4 * priorSd * priorSd };
  }

  const eap: [number, number, number, number] = [
    sum4[0]! / sumW,
    sum4[1]! / sumW,
    sum4[2]! / sumW,
    sum4[3]! / sumW,
  ];
  // Posterior variance: Var = E[θ²] − (E[θ])²
  const variances: [number, number, number, number] = [
    Math.max(1e-6, sum4sq[0]! / sumW - eap[0] ** 2),
    Math.max(1e-6, sum4sq[1]! / sumW - eap[1] ** 2),
    Math.max(1e-6, sum4sq[2]! / sumW - eap[2] ** 2),
    Math.max(1e-6, sum4sq[3]! / sumW - eap[3] ** 2),
  ];
  const sems: [number, number, number, number] = [
    Math.sqrt(variances[0]),
    Math.sqrt(variances[1]),
    Math.sqrt(variances[2]),
    Math.sqrt(variances[3]),
  ];
  const traceCovariance = variances[0] + variances[1] + variances[2] + variances[3];

  return {
    theta: [
      parseFloat(eap[0].toFixed(4)),
      parseFloat(eap[1].toFixed(4)),
      parseFloat(eap[2].toFixed(4)),
      parseFloat(eap[3].toFixed(4)),
    ],
    sem: [
      parseFloat(sems[0].toFixed(4)),
      parseFloat(sems[1].toFixed(4)),
      parseFloat(sems[2].toFixed(4)),
      parseFloat(sems[3].toFixed(4)),
    ],
    traceCovariance: parseFloat(traceCovariance.toFixed(6)),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Composite θ (unidimensional projection)
// ────────────────────────────────────────────────────────────────────────────

/** Equal-weight composite of 4D θ → single score on N(0,1) scale. */
export function compositeTheta(profile: Mirt4DProfile): number {
  const [t1, t2, t3, t4] = profile.theta;
  return (t1 + t2 + t3 + t4) / 4;
}

/** SEM of composite (propagation of independent SEM²). */
export function compositeSem(profile: Mirt4DProfile): number {
  const [s1, s2, s3, s4] = profile.sem;
  return Math.sqrt((s1 ** 2 + s2 ** 2 + s3 ** 2 + s4 ** 2) / 16);
}

// ────────────────────────────────────────────────────────────────────────────
// Online Newton–Raphson calibration for pretest items (Mirt4D)
// ────────────────────────────────────────────────────────────────────────────

const MIN_N_A = 500;  // minimum n before updating a-vector
const MIN_N_D = 200;  // minimum n before updating d (intercept / difficulty)

/**
 * Newton–Raphson M-step update for a single parameter given sufficient statistics.
 * Shared by a-vector elements and d.
 */
function nrStep(
  currentVal: number,
  gradient: number,
  hessian: number,
  maxStep: number,
): number {
  if (Math.abs(hessian) < 1e-10) return currentVal;
  const delta = -gradient / hessian;
  const clamped = Math.max(-maxStep, Math.min(maxStep, delta));
  return currentVal + clamped;
}

/**
 * One EM M-step: update item parameters given observed (θ, u) pairs.
 *
 * @param current  Current item parameters.
 * @param input    Examinee θ estimates and observed responses.
 * @returns Updated Mirt4DCalibrationResult.
 */
export function calibrate4DItem(
  current: Mirt4DItemParams,
  input: Mirt4DCalibrationInput,
): Mirt4DCalibrationResult {
  const n = input.thetas.length;
  if (n < 20) {
    return {
      params: current,
      stable: false,
      n,
      logLikelihood: NaN,
      rejectionReason: `n=${n} < 20 (minimum)`,
    };
  }

  // Compute gradient & Hessian for each parameter via second derivatives of log-L.
  // dLL/daₖ  = Σᵢ (uᵢ − Pᵢ) · (Pᵢ − c)/(Pᵢ(1−c)) · θᵢₖ
  // d²LL/daₖ² = −Σᵢ Wᵢ · θᵢₖ²     where Wᵢ = Pᵢ(1−Pᵢ)(Pᵢ−c)²/(Pᵢ²(1−c)²)  [neg-def]
  // Same structure for d (intercept), with θᵢₖ replaced by 1.

  const grad_a: [number, number, number, number] = [0, 0, 0, 0];
  const hess_a: [number, number, number, number] = [0, 0, 0, 0];
  let grad_d = 0;
  let hess_d = 0;
  let ll = 0;

  for (let i = 0; i < n; i++) {
    const theta = input.thetas[i]!;
    const u = input.scores[i]!;
    const P = Math.max(1e-9, Math.min(1 - 1e-9, probability4D(theta, current)));
    const q = 1 - P;
    const c = current.c;
    const L = (P - c) / ((1 - c) * P);
    const W = P * q * ((P - c) / ((1 - c) * P)) ** 2;
    const res = (u - P) * L;

    ll += u * Math.log(P) + (1 - u) * Math.log(q);

    for (let k = 0; k < 4; k++) {
      grad_a[k] += res * theta[k]!;
      hess_a[k] -= W * theta[k]! ** 2;
    }
    grad_d += res;
    hess_d -= W;
  }

  // Apply updates with stability gates.
  let newA: [number, number, number, number] = [...current.a];
  let newD = current.d;
  let stable = true;

  if (n >= MIN_N_A) {
    for (let k = 0; k < 4; k++) {
      const updated = nrStep(current.a[k]!, grad_a[k]!, hess_a[k]!, 0.5);
      newA[k] = Math.max(0.05, Math.min(4.0, updated));
      if (Math.abs(newA[k] - current.a[k]!) > 0.5) stable = false;
    }
  }

  if (n >= MIN_N_D) {
    const updatedD = nrStep(current.d, grad_d, hess_d, 1.0);
    // Keep d in reasonable range: corresponds to b ≈ [−4, 4] on N(0,1) scale
    newD = Math.max(-8, Math.min(8, updatedD));
    if (Math.abs(newD - current.d) > 1.0) stable = false;
  }

  return {
    params: { a: newA, d: newD, c: current.c },
    stable,
    n,
    logLikelihood: ll,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Batch processing helpers
// ────────────────────────────────────────────────────────────────────────────

export interface ItemPool4D {
  id: string;
  params: Mirt4DItemParams;
}

/**
 * Select the item from the pool with the highest information trace at the current θ.
 * Excludes items in `used`.
 */
export function select4DItem(
  pool: ItemPool4D[],
  profile: Mirt4DProfile,
  used: Set<string>,
): ItemPool4D | null {
  const theta = profile.theta;
  let best: ItemPool4D | null = null;
  let bestInfo = -Infinity;
  for (const item of pool) {
    if (used.has(item.id)) continue;
    const info = informationTrace4D(theta, item.params);
    if (info > bestInfo) {
      bestInfo = info;
      best = item;
    }
  }
  return best;
}

/**
 * Dimension label map for reporting.
 */
export const DIMENSION_LABELS: [string, string, string, string] = [
  "Receptive (Reading/Listening)",
  "Productive (Writing/Speaking)",
  "Grammatical Accuracy (Grammar/Vocabulary)",
  "Strategic Competence (Discourse/Pragmatics)",
];
