/**
 * GRM item calibration — concurrent estimation of Samejima graded-response
 * thresholds for one writing/speaking task from graded responses whose θ is
 * known from the operational items (Stocking-style concurrent design).
 *
 * Model: P(X ≥ k | θ) = 1 / (1 + exp(−a (θ − b_k))), k = 1..K−1, b_1 < … < b_{K−1}.
 *
 * Why this exists (roadmap Faz 4): productive items run on synthetic thresholds
 * (`rubricToGrmParams`: 10 equally spaced cuts around the 3PL b). Once a task
 * has enough graded responses, this module estimates its real thresholds and
 * `pretest-calibration-pipeline` records them as a DRAFT ItemParameterVersion
 * (`thresholds`); publishing copies them to `Item.metadata.grm`, which the
 * estimator already prefers over the synthetic fallback.
 *
 * Estimation: penalised maximum likelihood by coordinate-wise Newton steps on
 * each threshold with `a` fixed (n < 500) or updated by a damped Newton step
 * (n ≥ 500), plus a ridge toward the seed thresholds (`ridge`, default 2
 * pseudo-observations) that keeps sparse categories identifiable. Order is
 * enforced by a minimum gap. Standard errors come from the observed
 * information at the solution.
 */

import { categoryProbability, type GrmParameters } from "./graded-response-model.js";

export interface GrmObservation {
  /** Examinee θ from the operational items. */
  theta: number;
  /** Observed category 0..K−1. */
  category: number;
  weight?: number;
}

export interface GrmCalibrationConfig {
  /** Minimum responses before an estimate is attempted (default 80). */
  minN?: number;
  /** Ridge weight toward the seed thresholds, in pseudo-observations (default 2). */
  ridge?: number;
  /** Minimum gap between adjacent thresholds (default 0.15 logit). */
  minGap?: number;
  /** Newton iterations over the whole threshold vector (default 25). */
  iterations?: number;
  /** Damping for Newton steps (default 0.7). */
  dampen?: number;
  /** Update `a` as well when n ≥ this (default 500). */
  estimateAFromN?: number;
}

export interface GrmCalibrationResult {
  params: GrmParameters;
  thresholdSe: Array<number | null>;
  aSe: number | null;
  n: number;
  /** Categories with no observations (thresholds there are ridge-dominated). */
  emptyCategories: number[];
  logLikelihood: number;
  /** Max |Δb_k| versus the seed thresholds. */
  maxDeltaB: number;
  stable: boolean;
  rejectionReason?: string;
}

const DEFAULTS: Required<GrmCalibrationConfig> = {
  minN: 80,
  ridge: 2,
  minGap: 0.15,
  iterations: 25,
  dampen: 0.7,
  estimateAFromN: 500,
};

function logLikelihood(obs: GrmObservation[], params: GrmParameters): number {
  let ll = 0;
  for (const o of obs) {
    const p = Math.max(1e-10, categoryProbability(o.theta, params, o.category));
    ll += (o.weight ?? 1) * Math.log(p);
  }
  return ll;
}

/** Penalised log-likelihood: LL − ridge/2 · Σ (b_k − seed_k)². */
function penalised(obs: GrmObservation[], params: GrmParameters, seed: number[], ridge: number): number {
  let pen = 0;
  for (let k = 0; k < params.b.length; k++) pen += (params.b[k]! - seed[k]!) ** 2;
  return logLikelihood(obs, params) - (ridge / 2) * pen;
}

/** Numerical first and second derivative of the penalised LL in one coordinate. */
function derivatives(
  obs: GrmObservation[], params: GrmParameters, seed: number[], ridge: number,
  getter: () => number, setter: (v: number) => void, h = 1e-3,
): { grad: number; hess: number } {
  const x = getter();
  setter(x + h); const fp = penalised(obs, params, seed, ridge);
  setter(x - h); const fm = penalised(obs, params, seed, ridge);
  setter(x);     const f0 = penalised(obs, params, seed, ridge);
  return { grad: (fp - fm) / (2 * h), hess: (fp - 2 * f0 + fm) / (h * h) };
}

function enforceOrder(b: number[], minGap: number): void {
  for (let k = 1; k < b.length; k++) if (b[k]! < b[k - 1]! + minGap) b[k] = b[k - 1]! + minGap;
}

/**
 * Estimate GRM thresholds (and optionally `a`) for one task.
 * `seed` supplies the starting values and the ridge centre (normally the
 * synthetic `rubricToGrmParams` thresholds or the previously published ones).
 */
export function calibrateGrmItem(
  seed: GrmParameters,
  observations: GrmObservation[],
  config: GrmCalibrationConfig = {},
): GrmCalibrationResult {
  const cfg = { ...DEFAULTS, ...config };
  const K = seed.categories;
  const obs = observations.filter((o) => Number.isFinite(o.theta) && Number.isInteger(o.category) && o.category >= 0 && o.category < K);
  const n = obs.reduce((sum, o) => sum + (o.weight ?? 1), 0);
  const counts = new Array<number>(K).fill(0);
  for (const o of obs) counts[o.category]! += o.weight ?? 1;
  const emptyCategories = counts.map((c, k) => (c === 0 ? k : -1)).filter((k) => k >= 0);
  const seedB = [...seed.b];
  const params: GrmParameters = { a: seed.a, b: [...seed.b], categories: K };

  const bail = (reason: string): GrmCalibrationResult => ({
    params: { a: seed.a, b: [...seed.b], categories: K },
    thresholdSe: seed.b.map(() => null), aSe: null, n, emptyCategories,
    logLikelihood: logLikelihood(obs, seed), maxDeltaB: 0, stable: false, rejectionReason: reason,
  });
  if (n < cfg.minN) return bail(`n=${n} < minN=${cfg.minN}`);
  if (K < 2 || seed.b.length !== K - 1) return bail("seed thresholds do not match categories");

  for (let iter = 0; iter < cfg.iterations; iter++) {
    let maxStep = 0;
    for (let k = 0; k < K - 1; k++) {
      const { grad, hess } = derivatives(obs, params, seedB, cfg.ridge, () => params.b[k]!, (v) => { params.b[k] = v; });
      if (hess >= -1e-9) continue; // not concave here: skip this coordinate this round
      const step = cfg.dampen * (grad / hess);
      params.b[k] = params.b[k]! - step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    enforceOrder(params.b, cfg.minGap);
    if (n >= cfg.estimateAFromN) {
      const { grad, hess } = derivatives(obs, params, seedB, cfg.ridge, () => params.a, (v) => { params.a = v; });
      if (hess < -1e-9) {
        params.a = Math.max(0.3, Math.min(3.0, params.a - cfg.dampen * (grad / hess)));
      }
    }
    if (maxStep < 1e-4) break;
  }

  const thresholdSe = params.b.map((_, k) => {
    const { hess } = derivatives(obs, params, seedB, 0, () => params.b[k]!, (v) => { params.b[k] = v; });
    return hess < -1e-9 ? 1 / Math.sqrt(-hess) : null;
  });
  let aSe: number | null = null;
  if (n >= cfg.estimateAFromN) {
    const { hess } = derivatives(obs, params, seedB, 0, () => params.a, (v) => { params.a = v; });
    aSe = hess < -1e-9 ? 1 / Math.sqrt(-hess) : null;
  }
  const maxDeltaB = Math.max(...params.b.map((b, k) => Math.abs(b - seedB[k]!)));
  const ordered = params.b.every((b, k) => k === 0 || b > params.b[k - 1]!);
  return {
    params: { a: Number(params.a.toFixed(4)), b: params.b.map((b) => Number(b.toFixed(4))), categories: K },
    thresholdSe: thresholdSe.map((se) => (se == null ? null : Number(se.toFixed(4)))),
    aSe: aSe == null ? null : Number(aSe.toFixed(4)),
    n,
    emptyCategories,
    logLikelihood: logLikelihood(obs, params),
    maxDeltaB,
    stable: ordered && Number.isFinite(maxDeltaB),
    ...(ordered ? {} : { rejectionReason: "thresholds not ordered" }),
  };
}

/** Map a 0–1 rubric score to a GRM category index for K categories. */
export function scoreToCategory(score: number, categories: number): number {
  return Math.max(0, Math.min(categories - 1, Math.round(score * (categories - 1))));
}
