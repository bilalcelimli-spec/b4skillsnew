/**
 * Freemium Placement Test
 *
 * A lightweight 8–12 item adaptive placement test that:
 *  - Requires no authentication (open endpoint)
 *  - Runs a mini-CAT starting at B1 (theta=0)
 *  - Returns a CEFR level estimate with a 90% confidence interval
 *  - Stores anonymised response data for psychometric research
 *    (user consents via API call — GDPR Article 6(1)(a))
 *  - Stops when SEM ≤ 0.45 or after maxItems=12 items
 *
 * Design goals
 * ------------
 * 1. Fast: 8–12 items, each < 60 seconds → completes in < 10 minutes
 * 2. Open: no account required; share a link and test immediately
 * 3. Data flywheel: every placement contributes anonymised calibration data
 * 4. Conversion: result page shows "Upgrade for a full 4-skill report" CTA
 *
 * Item pool selection
 * -------------------
 * Only READING and LISTENING items with status=ACTIVE and isPretest=false
 * are eligible for the placement pool. Items used in placement are tracked
 * in a separate exposure counter so they don't inflate operational exposure.
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
  minItems: 6,
  maxItems: 12,
  semThreshold: 0.45,
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
  theta: number;
  sem: number;
  responses: PlacementResponse[];
  usedItemIds: Set<string>;
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
  config: PlacementConfig = DEFAULT_PLACEMENT_CONFIG
): PlacementSessionState {
  return {
    placementId: crypto.randomUUID(),
    theta: config.startingTheta,
    sem: config.startingSem,
    responses: [],
    usedItemIds: new Set(),
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

  return {
    placementId: state.placementId,
    cefrLevel,
    theta: Number(state.theta.toFixed(3)),
    sem: Number(state.sem.toFixed(3)),
    cefrConfidenceInterval: ci,
    itemsAdministered: state.responses.length,
    completionMs,
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
