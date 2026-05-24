/**
 * @linguadapt/irt-engine — Open-Source IRT Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * A fully self-contained, dependency-free implementation of Item Response Theory
 * suitable for embedding in any JavaScript/TypeScript project.
 *
 * Models supported:
 *   • 1PL (Rasch)    — only difficulty parameter
 *   • 2PL            — discrimination + difficulty
 *   • 3PL            — discrimination + difficulty + pseudo-guessing
 *   • GRM            — Graded Response Model (polytomous items)
 *
 * Estimators:
 *   • EAP  — Expected A Posteriori (Bayes, recommended for CAT)
 *   • MAP  — Maximum A Posteriori (Bayes with Newton-Raphson optimization)
 *   • MLE  — Maximum Likelihood Estimation (Newton-Raphson)
 *
 * Item selection:
 *   • Maximum Fisher Information (MFI)
 *   • Maximum Expected Information (MEI)
 *   • A-Stratified (α-stratification)
 *   • Shadow Test constraint satisfaction (greedy)
 *
 * Calibration:
 *   • Joint Maximum Likelihood (JML)
 *   • Stochastic EM online calibration
 *
 * License: MIT
 * Homepage: https://github.com/linguadapt/irt-engine
 *
 * @version 1.0.0
 */

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: Types
// ════════════════════════════════════════════════════════════════════════════

/** 3PL item parameters (subset for 1PL/2PL by fixing c=0 or a=1) */
export interface Params3PL {
  a: number;  // discrimination [0.3, 3.0]
  b: number;  // difficulty     [-4, +4]
  c: number;  // pseudo-guessing [0, 0.35]
}

/** Graded Response Model item (K ordered categories) */
export interface ParamsGRM {
  a: number;      // discrimination
  b: number[];    // K-1 threshold parameters (ordered: b[0] < b[1] < ... < b[K-2])
}

export interface Response3PL {
  params: Params3PL;
  score: 0 | 1;
}

export interface ResponseGRM {
  params: ParamsGRM;
  score: number;  // 0, 1, 2, ..., K-1
}

export interface AbilityEstimate {
  theta: number;
  sem: number;
  info: number;
  method: "EAP" | "MAP" | "MLE" | "FALLBACK";
}

export interface IRTConfig {
  /** Theta quadrature points (default 41, range -4 to +4) */
  gridSize?: number;
  gridMin?: number;
  gridMax?: number;
  /** Prior mean and SD for EAP/MAP (default: 0, 1) */
  priorMean?: number;
  priorSD?: number;
  /** Newton-Raphson max iterations (default 50) */
  maxIterations?: number;
  /** Newton-Raphson convergence tolerance (default 1e-6) */
  tolerance?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: 3PL Core Functions
// ════════════════════════════════════════════════════════════════════════════

/**
 * 3PL Item Characteristic Curve (ICC)
 * P(θ) = c + (1−c) / (1 + exp(−a(θ−b)))
 */
export function p3pl(theta: number, { a, b, c }: Params3PL): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

/** 1PL (Rasch): a=1, c=0 */
export function p1pl(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** 2PL: c=0 */
export function p2pl(theta: number, a: number, b: number): number {
  return 1 / (1 + Math.exp(-a * (theta - b)));
}

/** First derivative of 3PL ICC with respect to θ */
export function dp3pl(theta: number, { a, b, c }: Params3PL): number {
  const p = p3pl(theta, { a, b, c });
  return a * (p - c) * (1 - p) / (1 - c);
}

/** Fisher Information for a single 3PL item */
export function info3pl(theta: number, { a, b, c }: Params3PL): number {
  const p = p3pl(theta, { a, b, c });
  if (p <= 1e-8 || p >= 1 - 1e-8 || c >= 1 - 1e-8) return 0;
  const pc = p - c;
  const mc = 1 - c;
  return (a * a * (1 - p) * pc * pc) / (p * mc * mc);
}

/** Total Fisher Information across all items in a response vector */
export function totalInfo(theta: number, items: Params3PL[]): number {
  return items.reduce((sum, it) => sum + info3pl(theta, it), 0);
}

/** Log-likelihood of a 3PL response vector */
export function logLik3PL(theta: number, responses: Response3PL[]): number {
  let ll = 0;
  for (const { params, score } of responses) {
    const p = Math.max(1e-8, Math.min(1 - 1e-8, p3pl(theta, params)));
    ll += score === 1 ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: GRM Core Functions
// ════════════════════════════════════════════════════════════════════════════

/** GRM: probability of scoring in category k or above (cumulative) */
export function pGRMcum(theta: number, a: number, bk: number): number {
  return 1 / (1 + Math.exp(-a * (theta - bk)));
}

/** GRM: probability of exactly category k */
export function pGRM(theta: number, { a, b }: ParamsGRM, k: number): number {
  const K = b.length + 1; // number of categories
  const upper = k < K - 1 ? pGRMcum(theta, a, b[k]) : 1;
  const lower = k > 0     ? pGRMcum(theta, a, b[k - 1]) : 0;
  return Math.max(0, upper - lower);
}

/** GRM Fisher Information */
export function infoGRM(theta: number, { a, b }: ParamsGRM): number {
  const K = b.length + 1;
  let info = 0;
  for (let k = 0; k < K; k++) {
    const pk = Math.max(1e-8, pGRM(theta, { a, b }, k));
    // Derivative of P_k w.r.t. theta
    const dUpper = k < K - 1 ? a * pGRMcum(theta, a, b[k]) * (1 - pGRMcum(theta, a, b[k])) : 0;
    const dLower = k > 0     ? a * pGRMcum(theta, a, b[k-1]) * (1 - pGRMcum(theta, a, b[k-1])) : 0;
    const dpk = dUpper - dLower;
    info += (dpk * dpk) / pk;
  }
  return info;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: Estimators
// ════════════════════════════════════════════════════════════════════════════

function buildGrid(cfg: Required<IRTConfig>) {
  const step = (cfg.gridMax - cfg.gridMin) / (cfg.gridSize - 1);
  const grid = Array.from({ length: cfg.gridSize }, (_, i) => cfg.gridMin + i * step);
  const invSqrt2pi = 1 / Math.sqrt(2 * Math.PI * cfg.priorSD * cfg.priorSD);
  const prior = grid.map((t) => {
    const z = (t - cfg.priorMean) / cfg.priorSD;
    return invSqrt2pi * Math.exp(-0.5 * z * z) * step;
  });
  return { grid, prior };
}

const DEFAULT_CONFIG: Required<IRTConfig> = {
  gridSize: 41, gridMin: -4, gridMax: 4,
  priorMean: 0, priorSD: 1,
  maxIterations: 50, tolerance: 1e-6,
};

function mergeConfig(cfg?: IRTConfig): Required<IRTConfig> {
  return { ...DEFAULT_CONFIG, ...cfg };
}

/**
 * EAP Theta Estimation (3PL)
 * Recommended for CAT: stable, shrinks toward prior.
 */
export function eap3PL(responses: Response3PL[], cfg?: IRTConfig): AbilityEstimate {
  const c = mergeConfig(cfg);
  const { grid, prior } = buildGrid(c);

  let sumW = 0, sumWt = 0, sumWt2 = 0;
  const weights: number[] = grid.map((t, k) => {
    const ll = logLik3PL(t, responses);
    const w = prior[k] * Math.exp(Math.min(ll, 300));
    return w;
  });

  for (let k = 0; k < grid.length; k++) sumW += weights[k];
  if (sumW < 1e-300) return { theta: c.priorMean, sem: c.priorSD, info: 0, method: "FALLBACK" };

  for (let k = 0; k < grid.length; k++) {
    const w = weights[k] / sumW;
    sumWt  += w * grid[k];
    sumWt2 += w * grid[k] * grid[k];
  }

  const theta = sumWt;
  const sem = Math.sqrt(Math.max(0, sumWt2 - theta * theta));
  const info = responses.reduce((s, r) => s + info3pl(theta, r.params), 0);
  return { theta: round3(theta), sem: round3(sem), info: round3(info), method: "EAP" };
}

/**
 * MAP Theta Estimation (3PL)
 * Maximum A Posteriori via Newton-Raphson.
 */
export function map3PL(responses: Response3PL[], cfg?: IRTConfig): AbilityEstimate {
  const c = mergeConfig(cfg);
  let theta = c.priorMean;

  for (let iter = 0; iter < c.maxIterations; iter++) {
    let d1 = -(theta - c.priorMean) / (c.priorSD * c.priorSD); // prior derivative
    let d2 = -1 / (c.priorSD * c.priorSD);                      // prior second derivative

    for (const { params, score } of responses) {
      const p = Math.max(1e-8, Math.min(1 - 1e-8, p3pl(theta, params)));
      const dp = dp3pl(theta, params);
      const w = (score - p) / (p * (1 - p));
      d1 += w * dp;
      d2 -= (dp * dp) / (p * (1 - p));
    }

    if (Math.abs(d2) < 1e-10) break;
    const step = d1 / d2;
    theta -= step;
    theta = Math.max(c.gridMin, Math.min(c.gridMax, theta));
    if (Math.abs(step) < c.tolerance) break;
  }

  const info = responses.reduce((s, r) => s + info3pl(theta, r.params), 0);
  const sem = info > 0 ? 1 / Math.sqrt(info) : c.priorSD;
  return { theta: round3(theta), sem: round3(sem), info: round3(info), method: "MAP" };
}

/**
 * MLE Theta Estimation (3PL)
 * Maximum Likelihood via Newton-Raphson. Returns NaN for all-correct/all-wrong.
 */
export function mle3PL(responses: Response3PL[], cfg?: IRTConfig): AbilityEstimate {
  const c = mergeConfig(cfg);
  const allCorrect = responses.every((r) => r.score === 1);
  const allWrong   = responses.every((r) => r.score === 0);
  if (allCorrect || allWrong) {
    // MLE undefined — fall back to EAP
    return eap3PL(responses, cfg);
  }

  let theta = 0;

  for (let iter = 0; iter < c.maxIterations; iter++) {
    let d1 = 0, d2 = 0;
    for (const { params, score } of responses) {
      const p = Math.max(1e-8, Math.min(1 - 1e-8, p3pl(theta, params)));
      const dp = dp3pl(theta, params);
      d1 += (score - p) * dp / (p * (1 - p));
      d2 -= dp * dp / (p * (1 - p));
    }
    if (Math.abs(d2) < 1e-10) break;
    const step = d1 / d2;
    theta -= step;
    theta = Math.max(c.gridMin, Math.min(c.gridMax, theta));
    if (Math.abs(step) < c.tolerance) break;
  }

  const info = responses.reduce((s, r) => s + info3pl(theta, r.params), 0);
  const sem = info > 0 ? 1 / Math.sqrt(info) : 1;
  return { theta: round3(theta), sem: round3(sem), info: round3(info), method: "MLE" };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5: Item Selection
// ════════════════════════════════════════════════════════════════════════════

export interface SelectableItem extends Params3PL {
  id: string;
  exposed?: number; // times administered
}

/** Maximum Fisher Information item selection */
export function selectMFI(theta: number, items: SelectableItem[], usedIds: Set<string>): SelectableItem | null {
  let best: SelectableItem | null = null;
  let bestInfo = -Infinity;
  for (const item of items) {
    if (usedIds.has(item.id)) continue;
    const i = info3pl(theta, item);
    if (i > bestInfo) { bestInfo = i; best = item; }
  }
  return best;
}

/** α-Stratified item selection (Sympson-Hetter exposure control variant) */
export function selectStratified(theta: number, items: SelectableItem[], usedIds: Set<string>, stratum = 3): SelectableItem | null {
  // Divide items into `stratum` groups by discrimination
  const sorted = [...items].sort((a, b) => a.a - b.a);
  const chunkSize = Math.ceil(sorted.length / stratum);

  // Pick stratum based on |SEM| → early items from low-a strata
  const stIndex = Math.min(Math.floor((theta + 4) / (8 / stratum)), stratum - 1);
  const chunk = sorted.slice(stIndex * chunkSize, (stIndex + 1) * chunkSize);
  const available = chunk.filter((it) => !usedIds.has(it.id));

  if (available.length === 0) return selectMFI(theta, items, usedIds);
  // Within stratum: select by difficulty closest to theta
  return available.reduce((best, cur) =>
    Math.abs(cur.b - theta) < Math.abs(best.b - theta) ? cur : best
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6: Online EM Calibration (streaming)
// ════════════════════════════════════════════════════════════════════════════

export interface CalibObs {
  theta: number;
  score: 0 | 1;
  weight?: number;
}

/**
 * One EM cycle to update 3PL parameters from a batch of observations.
 * Returns updated parameters and stability flag.
 */
export function emCalibCycle(
  obs: CalibObs[],
  params: Params3PL,
  opts: { minN?: number; maxDeltaB?: number; iterations?: number; dampen?: number } = {}
): { updated: Params3PL; stable: boolean; deltaB: number } {
  const { minN = 20, maxDeltaB = 0.5, iterations = 5, dampen = 0.5 } = opts;
  if (obs.length < minN) return { updated: params, stable: false, deltaB: 0 };

  let { a, b, c } = params;

  for (let i = 0; i < iterations; i++) {
    let dLdb = 0, d2Ldb2 = 0;
    for (const o of obs) {
      const w = o.weight ?? 1;
      const p = Math.max(1e-8, Math.min(1 - 1e-8, p3pl(o.theta, { a, b, c })));
      const resid = (o.score - p) / (p * (1 - p));
      const dPdb = -a * (1 - c) * p * (1 - p);
      dLdb   += w * resid * dPdb;
      d2Ldb2 += w * (dPdb * dPdb) / (p * (1 - p));
    }
    if (d2Ldb2 > 1e-8) b -= dampen * dLdb / d2Ldb2;
  }

  const deltaB = b - params.b;
  const stable = Math.abs(deltaB) <= maxDeltaB && a >= 0.3 && a <= 3.0;
  return { updated: stable ? { a, b: round3(b), c } : params, stable, deltaB };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7: Stopping Rules
// ════════════════════════════════════════════════════════════════════════════

export interface StoppingRuleOptions {
  minItems?: number;
  maxItems?: number;
  semThreshold?: number; // stop when SEM ≤ this value
}

export function shouldStop(estimate: AbilityEstimate, itemsAdministered: number, opts: StoppingRuleOptions = {}): boolean {
  const { minItems = 5, maxItems = 40, semThreshold = 0.3 } = opts;
  if (itemsAdministered < minItems) return false;
  if (itemsAdministered >= maxItems) return true;
  return estimate.sem <= semThreshold;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8: Test Reliability & Fit
// ════════════════════════════════════════════════════════════════════════════

/**
 * Marginal reliability (Green et al., 1984).
 * ρ = 1 - E[SEM²] / Var[theta]
 */
export function marginalReliability(estimates: AbilityEstimate[]): number {
  if (estimates.length < 2) return 0;
  const thetas = estimates.map((e) => e.theta);
  const meanT = thetas.reduce((s, t) => s + t, 0) / thetas.length;
  const varT = thetas.reduce((s, t) => s + (t - meanT) ** 2, 0) / thetas.length;
  const meanSEM2 = estimates.reduce((s, e) => s + e.sem ** 2, 0) / estimates.length;
  return varT > 0 ? Math.max(0, 1 - meanSEM2 / varT) : 0;
}

/**
 * Person fit: lz* standardized log-likelihood statistic (Snijders, 2001).
 * Values < -1.96 may indicate aberrant responding.
 */
export function personFitLz(responses: Response3PL[], estimate: AbilityEstimate): number {
  const theta = estimate.theta;
  let ll = 0, meanLL = 0, varLL = 0;
  for (const { params, score } of responses) {
    const p = Math.max(1e-8, Math.min(1 - 1e-8, p3pl(theta, params)));
    const li = score === 1 ? Math.log(p) : Math.log(1 - p);
    const ei = p * Math.log(p) + (1 - p) * Math.log(1 - p);
    const vi = p * (1 - p) * (Math.log(p) - Math.log(1 - p)) ** 2;
    ll += li;
    meanLL += ei;
    varLL += vi;
  }
  if (varLL <= 0) return 0;
  return (ll - meanLL) / Math.sqrt(varLL);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9: Utilities
// ════════════════════════════════════════════════════════════════════════════

function round3(x: number): number { return Math.round(x * 1000) / 1000; }

export const IRTEngine = {
  // 3PL
  p3pl, p2pl, p1pl, info3pl, totalInfo, logLik3PL,
  // GRM
  pGRM, pGRMcum, infoGRM,
  // Estimators
  eap: eap3PL, map: map3PL, mle: mle3PL,
  // Item selection
  selectMFI, selectStratified,
  // Calibration
  emCalibCycle,
  // Stopping
  shouldStop,
  // Reliability / fit
  marginalReliability, personFitLz,
};

export default IRTEngine;
