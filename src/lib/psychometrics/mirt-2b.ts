/**
 * Two-dimensional (receptive / productive) compensatory IRT.
 * P(u=1) = c + (1-c) * sigmoid(aR·θR + aP·θP + d), with d = -a·b to align
 * unidimensional b with common calibration practice when loadings are split.
 *
 * Receptive: READING, LISTENING. Productive: WRITING, SPEAKING.
 * GRAMMAR / VOCAB load on both (balanced by default).
 */

import { SkillType, type IrtParameters, type Item, type Mirt2BProfile } from "../assessment-engine/types";

export interface Irt2BItemParams {
  aR: number;
  aP: number;
  d: number;
  c: number;
}

const GRID = [-2.4, -2, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2, 2.4] as const;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function normalPdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return 0;
  const z = (x - mean) / sd;
  return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

/** How unidimensional discrimination splits across receptive / productive. */
function splitLoadings(skill: SkillType, a: number): { aR: number; aP: number } {
  let r: number;
  let p: number;
  switch (skill) {
    case SkillType.READING:
    case SkillType.LISTENING:
      r = 0.88;
      p = 0.12;
      break;
    case SkillType.WRITING:
    case SkillType.SPEAKING:
      r = 0.12;
      p = 0.88;
      break;
    default:
      r = 0.55;
      p = 0.45;
  }
  return { aR: r * a, aP: p * a };
}

export function itemTo2BParams(item: Item): Irt2BItemParams {
  const { a, b, c } = item.params;
  const ap = item.params as IrtParameters & { aReceptive?: number; aProductive?: number };
  if (ap.aReceptive != null && ap.aProductive != null) {
    const sum = ap.aReceptive + ap.aProductive;
    const d = sum > 0 ? -0.5 * b * (ap.aReceptive + ap.aProductive) : -a * b;
    return { aR: ap.aReceptive, aP: ap.aProductive, d, c };
  }
  const { aR, aP } = splitLoadings(item.skill, a);
  return { aR, aP, d: -a * b, c };
}

export function probability2B(
  tR: number,
  tP: number,
  p: Irt2BItemParams
): number {
  const z = p.aR * tR + p.aP * tP + p.d;
  return p.c + (1 - p.c) * sigmoid(z);
}

function logPBinary(u: number, prob: number): number {
  const pp = Math.max(1e-9, Math.min(1 - 1e-9, prob));
  return u * Math.log(pp) + (1 - u) * Math.log(1 - pp);
}

function posteriorLog2B(
  tR: number,
  tP: number,
  binary: { u: number; params: Irt2BItemParams }[],
  priorMean: number,
  priorSd: number
): number {
  let ll = 0;
  for (const b of binary) {
    const pr = probability2B(tR, tP, b.params);
    ll += logPBinary(b.u, pr);
  }
  ll += Math.log(normalPdf(tR, priorMean, priorSd) + 1e-30);
  ll += Math.log(normalPdf(tP, priorMean, priorSd) + 1e-30);
  return ll;
}

/**
 * 2D EAP on a fixed grid (product prior).
 */
export function estimate2BTheta(
  binary: { u: number; params: Irt2BItemParams }[],
  priorMean = 0,
  priorSd = 1
): Mirt2BProfile {
  if (binary.length === 0) {
    return { thetaR: priorMean, thetaP: priorMean, semR: priorSd, semP: priorSd };
  }
  const pts = [...GRID];
  const logW: number[][] = [];
  for (const tr of pts) {
    const row: number[] = [];
    for (const tp of pts) {
      row.push(posteriorLog2B(tr, tp, binary, priorMean, priorSd));
    }
    logW.push(row);
  }
  let maxL = -Infinity;
  for (const row of logW) {
    for (const v of row) maxL = Math.max(maxL, v);
  }
  const w: number[][] = logW.map((row) => row.map((v) => Math.exp(v - maxL)));
  const sumW = w.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
  if (sumW <= 0 || !Number.isFinite(sumW)) {
    return { thetaR: 0, thetaP: 0, semR: 1, semP: 1 };
  }
  let eR = 0;
  let eP = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < pts.length; j++) {
      const p = w[i][j]! / sumW;
      eR += pts[i]! * p;
      eP += pts[j]! * p;
    }
  }
  let vR = 0;
  let vP = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < pts.length; j++) {
      const p = w[i][j]! / sumW;
      vR += (pts[i]! - eR) ** 2 * p;
      vP += (pts[j]! - eP) ** 2 * p;
    }
  }
  return {
    thetaR: Number(eR.toFixed(3)),
    thetaP: Number(eP.toFixed(3)),
    semR: Number(Math.sqrt(vR + 0.0001).toFixed(3)),
    semP: Number(Math.sqrt(vP + 0.0001).toFixed(3)),
  };
}

/**
 * Diagonal-approx Fisher trace at (tR, tP) for 3PL 2D compensatory item.
 */
export function fisherTrace2B(tR: number, tP: number, p: Irt2BItemParams): number {
  const P = probability2B(tR, tP, p);
  if (P <= 1e-4 || P >= 1 - 1e-4) return 0;
  const L = (P - p.c) / (1 - p.c);
  const s = L * (1 - L);
  const dpDtr = (1 - p.c) * s * p.aR;
  const dpDtp = (1 - p.c) * s * p.aP;
  const inv = 1 / (P * (1 - P));
  return inv * (dpDtr * dpDtr + dpDtp * dpDtp);
}

export function select2BItem(
  pool: Item[],
  profile: Mirt2BProfile,
  used: Set<string>
): Item | null {
  const available = pool.filter((it) => !it.isPretest && !used.has(it.id));
  if (available.length === 0) return null;
  const tR = profile.thetaR;
  const tP = profile.thetaP;
  const wR = profile.semR * profile.semR;
  const wP = profile.semP * profile.semP;
  let best: Item = available[0]!;
  let bestScore = -Infinity;
  for (const it of available) {
    const p2 = itemTo2BParams(it);
    const trI = fisherTrace2B(tR, tP, p2) * (wR + wP);
    if (trI > bestScore) {
      bestScore = trI;
      best = it;
    }
  }
  return best;
}
