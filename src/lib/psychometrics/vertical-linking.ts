/**
 * Vertical Linking — Common-Item IRT Linking (Stocking-Lord & Haebara)
 *
 * Establishes a single θ scale spanning Pre_A1 ↔ C2 so that ability
 * estimates from different test forms / administrations are directly
 * comparable ("growth reporting").
 *
 * References
 * ──────────
 * Stocking, M.L. & Lord, F.M. (1983). Developing a common metric in item
 *   response theory. Applied Psychological Measurement, 7(2), 201-210.
 *
 * Haebara, T. (1980). Equating logistic ability scales by a weighted least
 *   squares method. Japanese Psychological Research, 22(3), 144-149.
 *
 * Kolen, M.J. & Brennan, R.L. (2014). Test Equating, Scaling, and Linking
 *   (3rd ed.). Springer. Chapter 6.
 *
 * Algorithm
 * ─────────
 * Given two calibrations of the same anchor items (common items that appear
 * in both forms), find a linear transformation (A, B) such that:
 *
 *   θ_new = A · θ_old + B
 *
 * that maps the old scale to the new (reference) scale.
 *
 * Stocking-Lord minimises:
 *   F(A,B) = Σ_j Σ_k w_k [P_j(θ_k; old params) − P_j(θ_k; new params)]²
 *
 * Haebara minimises item-level discrepancies (more robust to item misfit):
 *   G(A,B) = Σ_j Σ_k [P_j(θ_k; old) − P_j(θ_k; new·A+B)]²
 *
 * We use a grid search + gradient-free Nelder-Mead simplex over (A, B).
 *
 * Output
 * ──────
 * The (A, B) pair converts old-scale θ to reference-scale θ:
 *   θ_ref = A · θ_old + B
 *
 * Also transforms item parameters:
 *   a_ref = a_old / A
 *   b_ref = A · b_old + B
 *   c_ref = c_old  (unchanged)
 */

import { probability } from "../assessment-engine/irt.js";
import { IrtParameters } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnchorItem {
  itemId: string;
  /** Parameters in the OLD (new form) calibration. */
  paramsOld: IrtParameters;
  /** Parameters in the NEW (reference) calibration. */
  paramsNew: IrtParameters;
}

export interface LinkingResult {
  /** Scale constant A: θ_ref = A·θ_old + B */
  A: number;
  /** Scale shift B. */
  B: number;
  /** Criterion value at convergence (lower = better fit). */
  criterion: number;
  /** Method used. */
  method: "STOCKING_LORD" | "HAEBARA";
  /** Number of anchor items used. */
  anchorCount: number;
  /** Summary of transformation quality. */
  diagnostics: {
    /** RMSD between old and new characteristic curves after transformation. */
    rmsd: number;
    /** Max absolute discrepancy across quadrature points. */
    maxDiscrepancy: number;
  };
}

// ─── Quadrature points for criterion evaluation ───────────────────────────────

function gaussQuadraturePoints(nPoints = 41): { theta: number; weight: number }[] {
  // Uniform quadrature over [-4, 4] with N(0,1) weights
  const lo = -4;
  const hi =  4;
  const step = (hi - lo) / (nPoints - 1);
  const points = [];
  for (let k = 0; k < nPoints; k++) {
    const theta = lo + k * step;
    const weight = Math.exp(-0.5 * theta * theta) / Math.sqrt(2 * Math.PI) * step;
    points.push({ theta, weight });
  }
  return points;
}

const QUADRATURE = gaussQuadraturePoints(41);

// ─── Parameter transformation ─────────────────────────────────────────────────

/** Apply (A, B) transformation to item parameters on the old scale. */
export function transformParams(
  params: IrtParameters,
  A: number,
  B: number
): IrtParameters {
  return {
    a: params.a / A,
    b: A * params.b + B,
    c: params.c,
  };
}

/** Apply (A, B) transformation to a θ value. */
export function transformTheta(theta: number, A: number, B: number): number {
  return A * theta + B;
}

// ─── Criterion functions ───────────────────────────────────────────────────────

/**
 * Stocking-Lord criterion: sum over anchor items and quadrature points of
 * squared TCC differences.
 */
function stockingLordCriterion(
  anchors: AnchorItem[],
  A: number,
  B: number
): number {
  let F = 0;
  for (const { theta, weight } of QUADRATURE) {
    let tccOld = 0;
    let tccNew = 0;
    for (const anchor of anchors) {
      // Transform old params to new scale then evaluate at theta
      const transformedOld = transformParams(anchor.paramsOld, A, B);
      tccOld += probability(theta, transformedOld);
      tccNew += probability(theta, anchor.paramsNew);
    }
    F += weight * (tccOld - tccNew) ** 2;
  }
  return F;
}

/**
 * Haebara criterion: item-level squared P-function differences.
 */
function haebaraCriterion(
  anchors: AnchorItem[],
  A: number,
  B: number
): number {
  let G = 0;
  for (const anchor of anchors) {
    for (const { theta, weight } of QUADRATURE) {
      const transformedOld = transformParams(anchor.paramsOld, A, B);
      const pOld = probability(theta, transformedOld);
      const pNew = probability(theta, anchor.paramsNew);
      G += weight * (pOld - pNew) ** 2;
    }
  }
  return G;
}

// ─── Nelder-Mead simplex minimiser (2D) ──────────────────────────────────────

type Vec2 = [number, number];

function nelderMead(
  f: (x: Vec2) => number,
  start: Vec2,
  maxIter = 500,
  tol = 1e-8
): { x: Vec2; fVal: number; iterations: number } {
  // Reflection/expansion/contraction coefficients (standard)
  const α = 1.0, γ = 2.0, ρ = 0.5, σ = 0.5;

  // Initialise simplex with a small perturbation
  let simplex: Vec2[] = [
    start,
    [start[0] + 0.1, start[1]],
    [start[0], start[1] + 0.1],
  ];

  let vals = simplex.map(f);
  let iter = 0;

  while (iter < maxIter) {
    // Sort by function value
    const order = [0, 1, 2].sort((a, b) => vals[a] - vals[b]);
    simplex = order.map(i => simplex[i]);
    vals = order.map(i => vals[i]);

    // Convergence check
    const range = Math.abs(vals[2] - vals[0]);
    if (range < tol) break;

    // Centroid of best two
    const x0: Vec2 = [
      (simplex[0][0] + simplex[1][0]) / 2,
      (simplex[0][1] + simplex[1][1]) / 2,
    ];

    // Reflection
    const xr: Vec2 = [
      x0[0] + α * (x0[0] - simplex[2][0]),
      x0[1] + α * (x0[1] - simplex[2][1]),
    ];
    const fxr = f(xr);

    if (fxr < vals[0]) {
      // Expansion
      const xe: Vec2 = [
        x0[0] + γ * (xr[0] - x0[0]),
        x0[1] + γ * (xr[1] - x0[1]),
      ];
      const fxe = f(xe);
      if (fxe < fxr) { simplex[2] = xe; vals[2] = fxe; }
      else           { simplex[2] = xr; vals[2] = fxr; }
    } else if (fxr < vals[1]) {
      simplex[2] = xr; vals[2] = fxr;
    } else {
      // Contraction
      const xc: Vec2 = [
        x0[0] + ρ * (simplex[2][0] - x0[0]),
        x0[1] + ρ * (simplex[2][1] - x0[1]),
      ];
      const fxc = f(xc);
      if (fxc < vals[2]) { simplex[2] = xc; vals[2] = fxc; }
      else {
        // Shrink
        for (let i = 1; i <= 2; i++) {
          simplex[i] = [
            simplex[0][0] + σ * (simplex[i][0] - simplex[0][0]),
            simplex[0][1] + σ * (simplex[i][1] - simplex[0][1]),
          ];
          vals[i] = f(simplex[i]);
        }
      }
    }

    iter++;
  }

  return { x: simplex[0], fVal: vals[0], iterations: iter };
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

function computeDiagnostics(
  anchors: AnchorItem[],
  A: number,
  B: number
): { rmsd: number; maxDiscrepancy: number } {
  let sumSq = 0;
  let count = 0;
  let maxDisc = 0;

  for (const anchor of anchors) {
    for (const { theta } of QUADRATURE) {
      const transformedOld = transformParams(anchor.paramsOld, A, B);
      const disc = Math.abs(
        probability(theta, transformedOld) - probability(theta, anchor.paramsNew)
      );
      sumSq += disc * disc;
      count++;
      if (disc > maxDisc) maxDisc = disc;
    }
  }

  return {
    rmsd: count > 0 ? Math.sqrt(sumSq / count) : 0,
    maxDiscrepancy: maxDisc,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute vertical linking constants (A, B) using Stocking-Lord or Haebara.
 *
 * @param anchors  Common items with parameters in both old and new calibrations.
 * @param method   Criterion to minimise (default: STOCKING_LORD).
 * @returns        LinkingResult with transformation constants and diagnostics.
 */
export function computeLinkingConstants(
  anchors: AnchorItem[],
  method: "STOCKING_LORD" | "HAEBARA" = "STOCKING_LORD"
): LinkingResult {
  if (anchors.length < 3) {
    throw new Error(
      `Vertical linking requires ≥3 anchor items; got ${anchors.length}.`
    );
  }

  const criterion =
    method === "STOCKING_LORD" ? stockingLordCriterion : haebaraCriterion;

  const f = ([A, B]: Vec2): number => criterion(anchors, A, B);

  // Start near identity (A=1, B=0) with grid search to find a good initial simplex
  let bestStart: Vec2 = [1, 0];
  let bestF = f(bestStart);

  for (let a = 0.7; a <= 1.5; a += 0.2) {
    for (let b = -0.5; b <= 0.5; b += 0.25) {
      const cand: Vec2 = [a, b];
      const v = f(cand);
      if (v < bestF) { bestF = v; bestStart = cand; }
    }
  }

  const result = nelderMead(f, bestStart);

  const [A, B] = result.x;
  const diagnostics = computeDiagnostics(anchors, A, B);

  return {
    A: Number(A.toFixed(6)),
    B: Number(B.toFixed(6)),
    criterion: Number(result.fVal.toFixed(8)),
    method,
    anchorCount: anchors.length,
    diagnostics: {
      rmsd: Number(diagnostics.rmsd.toFixed(6)),
      maxDiscrepancy: Number(diagnostics.maxDiscrepancy.toFixed(6)),
    },
  };
}

/**
 * Apply linking constants to a set of item parameters, converting them from
 * the old scale to the reference scale.
 *
 * @param items  Array of {itemId, params} on the old scale.
 * @param A      Scale constant from computeLinkingConstants.
 * @param B      Shift constant.
 */
export function linkItemBank<T extends { itemId: string; params: IrtParameters }>(
  items: T[],
  A: number,
  B: number
): Array<T & { linkedParams: IrtParameters }> {
  return items.map(item => ({
    ...item,
    linkedParams: transformParams(item.params, A, B),
  }));
}
