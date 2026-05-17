/**
 * General English Level Test
 *
 * A full adaptive level assessment (10–30 items) that:
 *  - Requires no authentication (open endpoint)
 *  - Runs a CAT starting at B1 (theta=0)
 *  - Returns a precise CEFR level estimate with a 90% confidence interval
 *  - Stores anonymised response data for psychometric research
 *    (user consents via API call — GDPR Article 6(1)(a))
 *  - Stops when SEM ≤ 0.35 or after maxItems=30 items
 *
 * Design goals
 * ------------
 * 1. Accurate: 10–30 items, each < 90 seconds → completes in ~20–30 minutes
 * 2. Open: no account required; share a link and test immediately
 * 3. Data flywheel: every placement contributes anonymised calibration data
 * 4. Conversion: result page shows "Upgrade for a full 4-skill report" CTA
 *
 * Item pool selection
 * -------------------
 * READING, LISTENING (with audioUrl), GRAMMAR, and VOCABULARY items with
 * status=ACTIVE and isPretest=false are eligible for the placement pool.
 *
 * Privacy
 * -------
 * - No PII is stored by default
 * - A pseudonymous `placementId` (UUID v4) is generated per session
 * - IP addresses are NOT stored
 * - Consent is explicit (consentToResearch: true in request body)
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

/** IRT parameters + metadata stored server-side for each served item. */
export interface PlacementItemMeta {
  a: number;           // discrimination
  b: number;           // difficulty
  c: number;           // guessing (pseudo-chance)
  skill: string;       // e.g. "READING"
  correctAnswer: number | string; // MC option index or FIB correct text
  type: string;        // "MULTIPLE_CHOICE" | "FILL_IN_BLANKS"
}

export interface PlacementConfig {
  /** Minimum items before stopping */
  minItems: number;
  /** Maximum items (hard ceiling) */
  maxItems: number;
  /** SEM stopping threshold — stop when SEM ≤ this value */
  semThreshold: number;
  /** Starting theta (ability estimate) */
  startingTheta: number;
  /** Starting SEM */
  startingSem: number;
  /** Skills to draw items from */
  eligibleSkills: string[];
}

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  minItems: 10,
  maxItems: 30,
  semThreshold: 0.35,
  startingTheta: 0.0,  // B1 — best starting point for a general English test
  startingSem: 1.2,    // Wide prior — we know nothing about the user
  eligibleSkills: ["READING", "LISTENING", "GRAMMAR", "VOCABULARY"],
};

export interface PlacementResponse {
  itemId: string;
  score: 0 | 1;
  latencyMs: number;
}

export interface PlacementSessionState {
  placementId: string;
  /** Candidate's display name (collected at registration) */
  name: string;
  /** Candidate's email (collected at registration; not persisted to DB) */
  email: string;
  theta: number;
  sem: number;
  responses: PlacementResponse[];
  usedItemIds: Set<string>;
  /** IRT params + correct answer keyed by itemId — used for server-side scoring */
  itemMeta: Map<string, PlacementItemMeta>;
  consentToResearch: boolean;
  startedAt: number;
}

export interface PlacementResult {
  placementId: string;
  cefrLevel: string;
  theta: number;
  sem: number;
  /** 90% confidence interval: [lower CEFR, upper CEFR] */
  cefrConfidenceInterval: [string, number, number]; // [level, thetaLow, thetaHigh]
  itemsAdministered: number;
  completionMs: number;
  /** Per-skill correct/total breakdown */
  skillBreakdown: Record<string, { total: number; correct: number }>;
  /** Upgrade prompt — next step for the user */
  upgradePrompt: {
    message: string;
    skills: string[];
    callToActionUrl: string;
  };
}

// ─── CEFR mapping ─────────────────────────────────────────────────────────────

const CEFR_BANDS: Array<{ min: number; max: number; level: string }> = [
  { min: 2.5, max: Infinity, level: "C2" },
  { min: 1.5, max: 2.5, level: "C1" },
  { min: 0.5, max: 1.5, level: "B2" },
  { min: -0.5, max: 0.5, level: "B1" },
  { min: -1.75, max: -0.5, level: "A2" },
  { min: -3.0, max: -1.75, level: "A1" },
  { min: -Infinity, max: -3.0, level: "PRE_A1" },
];

export function thetaToCefr(theta: number): string {
  for (const band of CEFR_BANDS) {
    if (theta >= band.min) return band.level;
  }
  return "PRE_A1";
}

export function cefrConfidenceInterval(
  theta: number,
  sem: number,
  zScore = 1.645  // z for 90% CI
): [string, number, number] {
  const lo = theta - zScore * sem;
  const hi = theta + zScore * sem;
  return [thetaToCefr(theta), Number(lo.toFixed(2)), Number(hi.toFixed(2))];
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

/**
 * Create a new placement session state.
 */
export function createPlacementSession(
  consentToResearch: boolean,
  name: string,
  email: string,
  config: PlacementConfig = DEFAULT_PLACEMENT_CONFIG
): PlacementSessionState {
  return {
    placementId: crypto.randomUUID(),
    name,
    email,
    theta: config.startingTheta,
    sem: config.startingSem,
    responses: [],
    usedItemIds: new Set(),
    itemMeta: new Map(),
    consentToResearch,
    startedAt: Date.now(),
  };
}

/**
 * Determine if the placement session should stop.
 */
export function shouldStopPlacement(
  state: PlacementSessionState,
  config: PlacementConfig = DEFAULT_PLACEMENT_CONFIG
): { stop: boolean; reason: string | null } {
  const n = state.responses.length;

  if (n >= config.maxItems) {
    return { stop: true, reason: "MAX_ITEMS_REACHED" };
  }
  if (n < config.minItems) {
    return { stop: false, reason: null };
  }
  if (state.sem <= config.semThreshold) {
    return { stop: true, reason: "SEM_THRESHOLD_REACHED" };
  }
  return { stop: false, reason: null };
}

/**
 * Build the final placement result from a completed session state.
 */
export function buildPlacementResult(
  state: PlacementSessionState,
  appBaseUrl = ""
): PlacementResult {
  const cefrLevel = thetaToCefr(state.theta);
  const ci = cefrConfidenceInterval(state.theta, state.sem);
  const completionMs = Date.now() - state.startedAt;

  const missingSkills = ["WRITING", "SPEAKING"].filter(
    s => !DEFAULT_PLACEMENT_CONFIG.eligibleSkills.includes(s)
  );

  const upgradeUrl = appBaseUrl
    ? `${appBaseUrl}/register?ref=placement&level=${cefrLevel}`
    : `/register?ref=placement&level=${cefrLevel}`;

  const skillBreakdown: Record<string, { total: number; correct: number }> = {};
  for (const r of state.responses) {
    const m = state.itemMeta.get(r.itemId);
    if (!m) continue;
    if (!skillBreakdown[m.skill]) skillBreakdown[m.skill] = { total: 0, correct: 0 };
    skillBreakdown[m.skill].total++;
    skillBreakdown[m.skill].correct += r.score;
  }

  return {
    placementId: state.placementId,
    cefrLevel,
    theta: Number(state.theta.toFixed(3)),
    sem: Number(state.sem.toFixed(3)),
    cefrConfidenceInterval: ci,
    itemsAdministered: state.responses.length,
    completionMs,
    skillBreakdown,
    upgradePrompt: {
      message: `Your estimated level is ${cefrLevel}. Get a complete 4-skill report with speaking and writing assessment.`,
      skills: missingSkills,
      callToActionUrl: upgradeUrl,
    },
  };
}

/**
 * Validate a placement response before processing.
 * Returns an error string or null if valid.
 */
export function validatePlacementResponse(
  itemId: string,
  score: unknown,
  latencyMs: unknown
): string | null {
  if (!itemId || typeof itemId !== "string") return "itemId is required";
  if (score !== 0 && score !== 1) return "score must be 0 or 1";
  if (typeof latencyMs !== "number" || latencyMs < 0 || latencyMs > 300_000) {
    return "latencyMs must be a number between 0 and 300000";
  }
  return null;
}

/**
 * Estimate whether a response exhibits rapid-guessing behaviour.
 * Placement tests are lower-stakes so the threshold is more lenient.
 */
export function isRapidGuess(latencyMs: number, itemDifficulty: number): boolean {
  const expectedMs = 10_000 + Math.max(0, itemDifficulty) * 5_000;
  return latencyMs < 1_500 || latencyMs < expectedMs * 0.10;
}

// ─── IRT Psychometrics ────────────────────────────────────────────────────────

const IRT_SCALE = 1.7; // Standard IRT logistic scaling constant

/**
 * 3PL IRT probability: P(θ) = c + (1-c) / (1 + exp(-1.7·a·(θ-b)))
 */
export function irt3PL(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-IRT_SCALE * a * (theta - b)));
}

/**
 * Fisher Information at theta for a 3PL item.
 * I(θ) = (1.7a)² · (P-c)² / [(1-c)² · P · Q]
 */
export function irtFisherInfo(theta: number, a: number, b: number, c: number): number {
  const P = irt3PL(theta, a, b, c);
  const Q = 1 - P;
  if (P <= 0 || Q <= 0) return 0;
  return (IRT_SCALE * a) ** 2 * (P - c) ** 2 / ((1 - c) ** 2 * P * Q);
}

/**
 * EAP (Expected A Posteriori) theta estimation with Gaussian prior.
 *
 * Uses Gauss-Hermite quadrature over [-4.5, 4.5] with 41 points.
 * More stable than MLE for short adaptive tests (≤ 12 items).
 */
export function updateThetaEAP(
  responses: PlacementResponse[],
  itemMeta: Map<string, PlacementItemMeta>,
  priorMean = 0.0,
  priorSd = 1.2,
): { theta: number; sem: number } {
  const POINTS = 41;
  const MIN_T = -4.5;
  const MAX_T = 4.5;
  const step = (MAX_T - MIN_T) / (POINTS - 1);

  // Quadrature grid + Gaussian prior weights
  const quadThetas = Array.from({ length: POINTS }, (_, i) => MIN_T + i * step);
  const priorW = quadThetas.map((t) => {
    const z = (t - priorMean) / priorSd;
    return Math.exp(-0.5 * z * z);
  });
  const priorSum = priorW.reduce((a, b) => a + b, 0);
  const normPrior = priorW.map((w) => w / priorSum);

  // Posterior ∝ likelihood × prior
  const posterior = quadThetas.map((t, i) => {
    let logL = 0;
    for (const r of responses) {
      const meta = itemMeta.get(r.itemId);
      if (!meta) continue;
      const P = irt3PL(t, meta.a, meta.b, meta.c);
      logL += r.score === 1
        ? Math.log(Math.max(P, 1e-12))
        : Math.log(Math.max(1 - P, 1e-12));
    }
    return normPrior[i] * Math.exp(logL);
  });

  const postSum = posterior.reduce((a, b) => a + b, 0);
  if (postSum <= 0) return { theta: priorMean, sem: priorSd };

  const norm = posterior.map((p) => p / postSum);
  const theta = norm.reduce((acc, p, i) => acc + p * quadThetas[i], 0);
  const variance = norm.reduce((acc, p, i) => acc + p * (quadThetas[i] - theta) ** 2, 0);
  const sem = Math.sqrt(Math.max(variance, 0.001));

  return { theta: Number(theta.toFixed(3)), sem: Number(sem.toFixed(3)) };
}
