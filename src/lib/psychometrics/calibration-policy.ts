/**
 * Calibration policy — the single set of thresholds that decides when an
 * item's empirical IRT estimate may be *estimated*, *published* as its live
 * parameters, and (for PRETEST items) *promoted* to ACTIVE.
 *
 * Before Faz 2 three places disagreed: pretest-manager (30 / 50 responses),
 * pretest-calibration-pipeline (80 / 150 via env) and CLAUDE.md (≥ 200 and
 * IQS ≥ 65). Every gate now reads from here. The numbers follow the roadmap
 * (docs/ADAPTIVE_ENGINE_ROADMAP_2026_10.md, Faz 2) and the usual references:
 * Stocking (1990) n ≥ 200 for online 3PL updates; Angoff (1988) |Δb| ≤ 0.30
 * logit between stable runs; Linacre fit range 0.7–1.3 for infit/outfit.
 *
 * Only `estimateMinN` may be lowered through the environment, and only so a
 * low-traffic pilot can see noisy *draft* estimates sooner. Publishing never
 * relaxes.
 */

export const CALIBRATION_POLICY = {
  /** Responses needed before an EM / MMLE estimate is attempted at all. */
  estimateMinN: readPositiveInt(process.env.CALIBRATION_MIN_N, 80),
  /** Responses needed before a draft may be published / a PRETEST item promoted. */
  publishMinN: 200,
  /** Maximum standard error of b for publication (logits). */
  publishMaxBSe: 0.25,
  /** Acceptable infit / outfit mean-square range when fit statistics exist. */
  fitRange: { min: 0.7, max: 1.3 },
  /** Minimum point-biserial (item–rest correlation) when available. */
  minPointBiserial: 0.30,
  /** Minimum Item Quality Score when available. */
  minIqs: 65,
  /** Maximum |Δb| between the draft and the last stable estimate. */
  maxDeltaB: 0.30,
  /** Discrimination and guessing bounds for a publishable estimate. */
  aRange: { min: 0.5, max: 3.0 },
  cRange: { min: 0, max: 0.35 },
  /** A Class-C parameter drift against the published version blocks auto-publish. */
  blockingDriftClass: "C",
} as const;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export interface PublishCandidate {
  n: number;
  a: number;
  b: number;
  c: number;
  bSe?: number | null;
  infit?: number | null;
  outfit?: number | null;
  pointBiserial?: number | null;
  iqScore?: number | null;
  /** |b_draft − b_lastStable|; undefined when there is no previous stable estimate. */
  deltaB?: number | null;
  /** Drift class (A/B/C) against the currently published version, if any. */
  driftClass?: string | null;
}

export interface GateDecision {
  eligible: boolean;
  reasons: string[];
}

/**
 * Decide whether a draft estimate may be published as the item's live
 * parameters. Returns every failed criterion so operators see the whole gap.
 */
export function evaluatePublishGate(candidate: PublishCandidate, policy = CALIBRATION_POLICY): GateDecision {
  const reasons: string[] = [];
  if (!(candidate.n >= policy.publishMinN)) reasons.push(`N_BELOW_${policy.publishMinN}`);
  if (!(Number.isFinite(candidate.a) && candidate.a >= policy.aRange.min && candidate.a <= policy.aRange.max)) {
    reasons.push("A_OUT_OF_RANGE");
  }
  if (!(Number.isFinite(candidate.c) && candidate.c >= policy.cRange.min && candidate.c <= policy.cRange.max)) {
    reasons.push("C_OUT_OF_RANGE");
  }
  if (!Number.isFinite(candidate.b)) reasons.push("B_NOT_FINITE");
  if (candidate.bSe != null && !(candidate.bSe <= policy.publishMaxBSe)) reasons.push("B_SE_TOO_LARGE");
  if (candidate.bSe == null) reasons.push("B_SE_MISSING");
  for (const [name, value] of [["INFIT", candidate.infit], ["OUTFIT", candidate.outfit]] as const) {
    if (value != null && !(value >= policy.fitRange.min && value <= policy.fitRange.max)) reasons.push(`${name}_OUT_OF_RANGE`);
  }
  if (candidate.pointBiserial != null && !(candidate.pointBiserial >= policy.minPointBiserial)) reasons.push("POINT_BISERIAL_LOW");
  if (candidate.iqScore != null && !(candidate.iqScore >= policy.minIqs)) reasons.push("IQS_BELOW_MIN");
  if (candidate.deltaB != null && !(candidate.deltaB <= policy.maxDeltaB)) reasons.push("DELTA_B_UNSTABLE");
  if (candidate.driftClass === policy.blockingDriftClass) reasons.push("DRIFT_CLASS_C");
  return { eligible: reasons.length === 0, reasons };
}

/** Human-readable policy summary for reports and the admin console. */
export function describeCalibrationPolicy(policy = CALIBRATION_POLICY): Record<string, string> {
  return {
    estimate: `n ≥ ${policy.estimateMinN}`,
    publish: `n ≥ ${policy.publishMinN}, SE(b) ≤ ${policy.publishMaxBSe}, a ∈ [${policy.aRange.min}, ${policy.aRange.max}], c ∈ [${policy.cRange.min}, ${policy.cRange.max}]`,
    fit: `infit/outfit ∈ [${policy.fitRange.min}, ${policy.fitRange.max}] when available; r_pbis ≥ ${policy.minPointBiserial}; IQS ≥ ${policy.minIqs}`,
    stability: `|Δb| ≤ ${policy.maxDeltaB} vs last stable estimate; drift class ${policy.blockingDriftClass} blocks auto-publish`,
  };
}
