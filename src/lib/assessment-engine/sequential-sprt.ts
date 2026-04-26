/**
 * SPRT: Wald's sequential probability ratio test for simple vs simple hypotheses
 * on the θ scale, using 3PL item likelihoods, or the same 3PL+GRM joint LL as EAP
 * when `useGrmProductive` is set (Faz6, aligned with Faz5 GRM+3PL).
 * The GLR for two point hypotheses H0: θ=θ0 vs H1: θ=θ1 uses log L(t1) − log L(t0).
 */

import { logLikelihood } from "./irt";
import { jointLogLikelihoodAt } from "./estimator.js";
import type { IrtParameters, Item, Response } from "./types";

export interface SprtConfig {
  enabled: boolean;
  /** Type I error for Wald boundaries */
  alpha?: number;
  /** Type II error */
  beta?: number;
  /** θ0 = cut - halfWidth, θ1 = cut + halfWidth */
  halfWidth?: number;
  /** Minimum operational items before SPRT is allowed to stop the test */
  minItems?: number;
}

const DEFAULT_ALPHA = 0.05;
const DEFAULT_BETA = 0.05;
const DEFAULT_HW = 0.18;
const DEFAULT_MIN = 8;

export function waldLogThresholds(alpha: number, beta: number): { logA: number; logB: number } {
  const a = (1 - beta) / alpha;
  const b = beta / (1 - alpha);
  return { logA: Math.log(a), logB: Math.log(b) };
}

/**
 * 2 * |log L(θ1) - log L(θ0)| — GLR form for a single-parameter comparison of two simple hypotheses.
 */
export function glrTwoPointStatistic(
  data: { score: number; params: IrtParameters }[],
  theta0: number,
  theta1: number
): number {
  const r = logLikelihood(theta1, data) - logLikelihood(theta0, data);
  return 2 * Math.abs(r);
}

/**
 * @returns nearest numeric cut from the ordered list of CEFR θ thresholds
 */
export function nearestThetaCut(
  theta: number,
  cuts: number[]
): number {
  if (cuts.length === 0) return 0;
  return cuts.reduce((best, t) => {
    return Math.abs(t - theta) < Math.abs(best - theta) ? t : best;
  }, cuts[0]!);
}

function responseDataForSprt(
  responses: Response[],
  items: Record<string, Item> | undefined
): { score: number; params: IrtParameters }[] | null {
  if (!items) return null;
  const out: { score: number; params: IrtParameters }[] = [];
  for (const r of responses) {
    if (r.isPretest) continue;
    const it = items[r.itemId];
    if (it) {
      out.push({ score: r.score, params: it.params });
    }
  }
  return out;
}

export type SprtEvaluateOptions = {
  /** Faz6: use same 3PL+GRM joint LL as EAP/SPRT (requires full `Item` map). */
  useGrmProductive?: boolean;
};

/**
 * @returns `null` if SPRT does not apply, else stop reason
 */
export function evaluateSprtStop(
  state: { theta: number; responses: Response[]; sem: number },
  cfg: SprtConfig,
  cefrCuts: number[],
  items: Record<string, Item> | undefined,
  options?: SprtEvaluateOptions
): { stop: boolean; reason: string | null } {
  if (!cfg.enabled) {
    return { stop: false, reason: null };
  }
  const opN = state.responses.filter((r) => !r.isPretest).length;
  const minI = cfg.minItems ?? DEFAULT_MIN;
  if (opN < minI) {
    return { stop: false, reason: null };
  }
  if (!items) {
    return { stop: false, reason: null };
  }
  const op = state.responses.filter((r) => !r.isPretest);
  if (op.length === 0) {
    return { stop: false, reason: null };
  }
  const cut = nearestThetaCut(state.theta, cefrCuts);
  const hw = cfg.halfWidth ?? DEFAULT_HW;
  const t0 = cut - hw;
  const t1 = cut + hw;

  const useGrm = options?.useGrmProductive === true;
  let logR: number;
  if (useGrm) {
    logR = jointLogLikelihoodAt(t1, op, items) - jointLogLikelihoodAt(t0, op, items);
  } else {
    const data = responseDataForSprt(state.responses, items);
    if (!data || data.length === 0) {
      return { stop: false, reason: null };
    }
    logR = logLikelihood(t1, data) - logLikelihood(t0, data);
  }
  const a = cfg.alpha ?? DEFAULT_ALPHA;
  const b = cfg.beta ?? DEFAULT_BETA;
  const { logA, logB } = waldLogThresholds(a, b);
  if (logR >= logA) {
    return { stop: true, reason: "SPRT_FAVOR_HIGH_THETA" };
  }
  if (logR <= -logB) {
    return { stop: true, reason: "SPRT_FAVOR_LOW_THETA" };
  }
  return { stop: false, reason: null };
}

export function cefrCutValues(
  t: Record<string, number> | undefined
): number[] {
  if (!t || Object.keys(t).length === 0) {
    return [-1.75, -0.5, 0.5, 1.5, 2.5];
  }
  return [
    t.A1, t.A2, t.B1, t.B2, t.C1, t.C2,
  ]
    .filter((x): x is number => x !== undefined && Number.isFinite(x))
    .sort((a, b) => a - b);
}
