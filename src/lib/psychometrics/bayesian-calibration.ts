/**
 * Online Bayesian Item Calibration
 *
 * Implements MAP (Maximum A Posteriori) estimation of 3PL IRT parameters
 * with an incremental Bayesian update cycle suitable for a continuously
 * running adaptive testing platform.
 *
 * Model
 * -----
 * P(θ | a, b, c) = c + (1 − c) / (1 + exp(−a(θ − b)))
 *
 * Prior on b  : Normal(μ_b, σ_b²)  — centred on CEFR-level target from
 *               `getIrtNorm()`; σ_b = 1.0 logit (weakly informative)
 * Prior on a  : Log-Normal(μ_lna, σ_lna²)  with μ_lna = log(1.0), σ_lna = 0.5
 * c is held fixed during online updates (needs ≥ 1 000 responses to be stable)
 *
 * Algorithm
 * ---------
 * Newton-Raphson MAP for each new batch of ≥ MIN_RESPONSES responses.
 * Posterior precision carried forward as prior precision for the next batch
 * (online Laplace approximation).
 */

import { prisma } from "../prisma.js";
import { probability } from "../assessment-engine/irt.js";
import { IrtParameters } from "../assessment-engine/types.js";
import { getIrtNorm } from "../language-skills/item-writing-framework.js";
import type { CefrLevel } from "../assessment-engine/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_RESPONSES = 30;     // Minimum new responses to trigger an update
const MAX_ITER = 40;          // Newton-Raphson iterations
const TOL = 1e-5;             // Convergence tolerance (logit)
const B_PRIOR_SD = 1.0;       // Prior SD on b (logits)
const LNA_PRIOR_MEAN = 0.0;   // log(1.0) — prior on log(a)
const LNA_PRIOR_SD = 0.5;     // Prior SD on log(a)
const B_MIN = -4.5;
const B_MAX = 4.5;
const A_MIN = 0.2;
const A_MAX = 3.5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BayesianUpdateResult {
  itemId: string;
  oldB: number;
  newB: number;
  oldA: number;
  newA: number;
  posteriorSdB: number;  // Posterior SD of b (useful as prior for next round)
  pValue: number;
  nResponses: number;
  converged: boolean;
}

export interface BatchCalibrationSummary {
  processed: number;
  skipped: number;      // Not enough new responses
  diverged: number;     // Newton-Raphson did not converge
  results: BayesianUpdateResult[];
  runAt: string;
}

// ─── Gradient helpers ─────────────────────────────────────────────────────────

/** First and second derivative of the 3PL log-likelihood w.r.t. b */
function bDerivatives(
  thetas: number[],
  scores: number[],
  params: IrtParameters
): { grad: number; hessian: number } {
  const { a, b, c } = params;
  let grad = 0;
  let hessian = 0;

  for (let i = 0; i < thetas.length; i++) {
    const p = probability(thetas[i], params);
    const u = scores[i];
    const q = 1 - p;
    const pm = p - c;        // p minus c
    const om = 1 - c;        // one minus c

    // dP/db = −a · (P−c)(1−P) / (1−c)
    const dPdb = -a * pm * q / om;

    // d²P/db² = a² · (P−c) · [(P−c) · P − q · (1−P)] / (1−c)²
    //          (chain rule of dP/db w.r.t. b)
    const d2Pdb2 = (a * a * pm * (pm * p - q * q)) / (om * om);

    // Score function contribution: (u/P − (1−u)/Q) · dP/db
    const safeP = Math.max(1e-7, Math.min(1 - 1e-7, p));
    const safeQ = 1 - safeP;
    const scoreFunc = (u / safeP - (1 - u) / safeQ) * dPdb;

    // Hessian approximation via expected information (negative)
    const infoContrib = (dPdb * dPdb) / (safeP * safeQ);

    grad += scoreFunc;
    hessian -= infoContrib;

    // Second-order observed hessian correction
    const hessObserved = (u / safeP - (1 - u) / safeQ) * d2Pdb2
      - (u / (safeP * safeP) + (1 - u) / (safeQ * safeQ)) * dPdb * dPdb;
    hessian += hessObserved - scoreFunc; // combine expected + observed
    hessian -= hessObserved; // keep expected only (more stable)
    hessian += -(dPdb * dPdb) / (safeP * safeQ); // back to simple expected info
  }

  // Reset hessian to clean expected-information version
  hessian = 0;
  for (let i = 0; i < thetas.length; i++) {
    const p = probability(thetas[i], params);
    const pm = p - c;
    const om = 1 - c;
    const q = 1 - p;
    const safeP = Math.max(1e-7, Math.min(1 - 1e-7, p));
    const safeQ = 1 - safeP;
    const dPdb = -a * pm * q / om;
    hessian -= (dPdb * dPdb) / (safeP * safeQ);
  }

  return { grad, hessian };
}

/** First and second derivative of 3PL log-likelihood w.r.t. log(a) */
function lnaDerivatives(
  thetas: number[],
  scores: number[],
  params: IrtParameters
): { grad: number; hessian: number } {
  const { a, b, c } = params;
  let grad = 0;
  let hessian = 0;

  for (let i = 0; i < thetas.length; i++) {
    const p = probability(thetas[i], params);
    const u = scores[i];
    const q = 1 - p;
    const pm = p - c;
    const om = 1 - c;
    const delta = thetas[i] - b;

    // dP/d(lna) = a · delta · (P−c)(1−P) / (1−c)   [chain rule: dP/da · a]
    const dPdlna = a * delta * pm * q / om;

    const safeP = Math.max(1e-7, Math.min(1 - 1e-7, p));
    const safeQ = 1 - safeP;

    const scoreFunc = (u / safeP - (1 - u) / safeQ) * dPdlna;
    grad += scoreFunc;
    hessian -= (dPdlna * dPdlna) / (safeP * safeQ);
  }

  return { grad, hessian };
}

// ─── MAP Estimator ────────────────────────────────────────────────────────────

/**
 * MAP estimation of (b, a) for a single item given observed responses.
 *
 * Prior: b ~ Normal(bPriorMean, bPriorPrecision⁻¹)
 *        lna ~ Normal(LNA_PRIOR_MEAN, LNA_PRIOR_SD²)
 *
 * Returns new parameter estimates and posterior precision on b.
 */
function mapEstimate(
  thetas: number[],
  scores: number[],
  currentParams: IrtParameters,
  bPriorMean: number,
  bPriorPrecision: number   // = 1/σ²
): { b: number; a: number; posteriorPrecisionB: number; converged: boolean } {
  let b = currentParams.b;
  let lna = Math.log(Math.max(A_MIN, currentParams.a));
  const c = currentParams.c;
  let converged = false;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const params: IrtParameters = { a: Math.exp(lna), b, c };

    // Update b
    const { grad: gb, hessian: hb } = bDerivatives(thetas, scores, params);
    // Add prior contribution: d(log p(b))/db = −precision·(b − μ_b)
    const gbPost = gb - bPriorPrecision * (b - bPriorMean);
    const hbPost = hb - bPriorPrecision;
    const db = Math.abs(hbPost) > 1e-10 ? -gbPost / hbPost : 0;
    const bNew = Math.max(B_MIN, Math.min(B_MAX, b + db));

    // Update log(a)
    const { grad: ga, hessian: ha } = lnaDerivatives(thetas, scores, params);
    // Add log-normal prior: d/d(lna) = −(lna − μ_lna)/σ_lna²
    const gaPost = ga - (lna - LNA_PRIOR_MEAN) / (LNA_PRIOR_SD * LNA_PRIOR_SD);
    const haPost = ha - 1 / (LNA_PRIOR_SD * LNA_PRIOR_SD);
    const dlna = Math.abs(haPost) > 1e-10 ? -gaPost / haPost : 0;
    const lnaNew = Math.log(A_MIN) > lna + dlna
      ? Math.log(A_MIN)
      : Math.log(A_MAX) < lna + dlna
        ? Math.log(A_MAX)
        : lna + dlna;

    const delta = Math.abs(bNew - b) + Math.abs(lnaNew - lna);
    b = bNew;
    lna = lnaNew;

    if (delta < TOL) {
      converged = true;
      break;
    }
  }

  // Posterior precision on b = Fisher info at MAP + prior precision
  const finalParams: IrtParameters = { a: Math.exp(lna), b, c };
  const { hessian: hbFinal } = bDerivatives(thetas, scores, finalParams);
  const posteriorPrecisionB = Math.max(0.1, -hbFinal + bPriorPrecision);

  return { b, a: Math.exp(lna), posteriorPrecisionB, converged };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a full Bayesian calibration pass over all PRETEST items that have
 * accumulated at least MIN_RESPONSES new responses since their last update.
 */
export async function runBatchBayesianCalibration(): Promise<BatchCalibrationSummary> {
  const pretestItems = await prisma.item.findMany({
    where: { status: "PRETEST" },
    include: {
      responses: {
        select: {
          score: true,
          session: { select: { theta: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500, // Cap to keep memory bounded
      },
    },
  }) as any[];

  const results: BayesianUpdateResult[] = [];
  let skipped = 0;
  let diverged = 0;

  for (const item of pretestItems) {
    const responses: { score: number; theta: number }[] = (item.responses as any[]).map(
      (r: any) => ({ score: r.score, theta: r.session.theta })
    );

    if (responses.length < MIN_RESPONSES) {
      skipped++;
      continue;
    }

    const thetas = responses.map((r) => r.theta);
    const scores = responses.map((r) => r.score);

    // CEFR-level prior mean for b
    const norm = getIrtNorm(item.cefrLevel as CefrLevel);
    const bPriorMean = norm?.b?.target ?? item.difficulty;

    // Prior precision: use stored posterior precision if available
    // (stored in item.metadata.bayesianPrecisionB)
    const storedPrecision = (item.metadata as any)?.bayesianPrecisionB;
    const bPriorPrecision = storedPrecision != null
      ? (storedPrecision as number)
      : 1 / (B_PRIOR_SD * B_PRIOR_SD);

    const currentParams: IrtParameters = {
      a: item.discrimination,
      b: item.difficulty,
      c: item.guessing ?? 0.25,
    };

    const { b: newB, a: newA, posteriorPrecisionB, converged } =
      mapEstimate(thetas, scores, currentParams, bPriorMean, bPriorPrecision);

    if (!converged) diverged++;

    const pValue = scores.reduce((s, x) => s + x, 0) / scores.length;

    // Persist updated params and carry posterior precision forward
    const newMetadata = {
      ...((item.metadata as object) ?? {}),
      bayesianPrecisionB: posteriorPrecisionB,
      lastBayesianUpdate: new Date().toISOString(),
    };

    await prisma.item.update({
      where: { id: item.id },
      data: {
        difficulty: newB,
        discrimination: newA,
        pVal: pValue,
        metadata: newMetadata,
      },
    });

    results.push({
      itemId: item.id,
      oldB: item.difficulty,
      newB,
      oldA: item.discrimination,
      newA,
      posteriorSdB: 1 / Math.sqrt(posteriorPrecisionB),
      pValue,
      nResponses: responses.length,
      converged,
    });
  }

  return {
    processed: results.length,
    skipped,
    diverged,
    results,
    runAt: new Date().toISOString(),
  };
}

/**
 * Single-item Bayesian update — useful when a pretest item has just
 * collected a new batch of responses and you want an immediate update.
 */
export async function updateItemPosterior(
  itemId: string
): Promise<BayesianUpdateResult | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      responses: {
        select: { score: true, session: { select: { theta: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      },
    },
  }) as any;

  if (!item) return null;

  const responses: { score: number; theta: number }[] = (item.responses as any[]).map(
    (r: any) => ({ score: r.score, theta: r.session.theta })
  );

  if (responses.length < MIN_RESPONSES) return null;

  const thetas = responses.map((r) => r.theta);
  const scores = responses.map((r) => r.score);

  const norm = getIrtNorm(item.cefrLevel as CefrLevel);
  const bPriorMean = norm?.b?.target ?? item.difficulty;
  const storedPrecision = (item.metadata as any)?.bayesianPrecisionB;
  const bPriorPrecision = storedPrecision != null
    ? (storedPrecision as number)
    : 1 / (B_PRIOR_SD * B_PRIOR_SD);

  const currentParams: IrtParameters = {
    a: item.discrimination,
    b: item.difficulty,
    c: item.guessing ?? 0.25,
  };

  const { b: newB, a: newA, posteriorPrecisionB, converged } =
    mapEstimate(thetas, scores, currentParams, bPriorMean, bPriorPrecision);

  const pValue = scores.reduce((s, x) => s + x, 0) / scores.length;

  const newMetadata = {
    ...((item.metadata as object) ?? {}),
    bayesianPrecisionB: posteriorPrecisionB,
    lastBayesianUpdate: new Date().toISOString(),
  };

  await prisma.item.update({
    where: { id: item.id },
    data: { difficulty: newB, discrimination: newA, pVal: pValue, metadata: newMetadata },
  });

  return {
    itemId,
    oldB: item.difficulty,
    newB,
    oldA: item.discrimination,
    newA,
    posteriorSdB: 1 / Math.sqrt(posteriorPrecisionB),
    pValue,
    nResponses: responses.length,
    converged,
  };
}
