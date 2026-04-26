/**
 * Construct Validity Audit
 *
 * Pure psychometric utilities for auditing whether the multi-trait analytic
 * rubric (grammar / vocabulary / coherence / taskRelevance / fluency) is
 * actually measuring distinct, coherent constructs — not just one inflated
 * "halo" dimension that the AI scorer collapses everything into.
 *
 * Three diagnostics:
 *   1. Pearson correlation matrix between every trait pair
 *   2. Cronbach's α (internal consistency / reliability of the rubric as a scale)
 *   3. Convergent / discriminant validity summary (MTMM-style):
 *        - convergent r̄ : avg correlation among traits believed to measure the
 *                         same construct (e.g. grammar ↔ vocabulary in
 *                         "linguistic accuracy")
 *        - discriminant r̄ : avg correlation across distinct construct groups
 *      Convergent should be substantially > discriminant for the rubric
 *      to claim multi-dimensionality (Campbell & Fiske, 1959).
 *
 * All functions are pure: no I/O, no randomness. Designed to be called from a
 * reporting layer that loads rubric-score samples from the DB.
 */

export interface TraitSample {
  /** Per-trait scores on the same response (or candidate composite). */
  scores: Record<string, number>;
}

export interface CorrelationMatrix {
  traits: string[];
  /** Square symmetric matrix of Pearson r values. matrix[i][j] = r(trait_i, trait_j) */
  matrix: number[][];
}

export interface ReliabilityReport {
  alpha: number;
  /** Number of items / traits in the scale. */
  k: number;
  /** Sample size. */
  n: number;
  /**
   * Industry-anchored interpretation:
   *  - α ≥ 0.90 : excellent
   *  - α ≥ 0.80 : good
   *  - α ≥ 0.70 : acceptable
   *  - α ≥ 0.60 : questionable
   *  - α  < 0.60 : poor
   */
  interpretation: "excellent" | "good" | "acceptable" | "questionable" | "poor";
}

export interface MtmmGroup {
  /** Human-readable name of the construct group, e.g. "linguistic accuracy". */
  name: string;
  /** Trait keys (must appear in every sample's `scores`). */
  traits: string[];
}

export interface MtmmReport {
  groups: MtmmGroup[];
  convergentMean: number;
  discriminantMean: number;
  /** Higher = better discriminant validity. Target: ≥ 0.10. */
  separation: number;
  /** Per-group internal mean r (within-construct convergence). */
  perGroup: { group: string; convergent: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function variance(xs: number[], sample = true): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (xs.length - (sample ? 1 : 0));
}

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Correlation Matrix
// ─────────────────────────────────────────────────────────────────────────────

function extractColumns(samples: TraitSample[], traits: string[]): Record<string, number[]> {
  const cols: Record<string, number[]> = {};
  for (const t of traits) cols[t] = [];
  for (const s of samples) {
    for (const t of traits) {
      const v = s.scores[t];
      cols[t].push(typeof v === "number" && Number.isFinite(v) ? v : 0);
    }
  }
  return cols;
}

export function correlationMatrix(
  samples: TraitSample[],
  traits: string[]
): CorrelationMatrix {
  const cols = extractColumns(samples, traits);
  const k = traits.length;
  const matrix: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < k; j++) {
      const r = pearson(cols[traits[i]], cols[traits[j]]);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }
  return { traits, matrix };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cronbach's α
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cronbach's alpha:
 *   α = (k / (k - 1)) · (1 − Σ σ²_i / σ²_total)
 * where σ²_i is the variance of trait i across samples and σ²_total is the
 * variance of the per-sample sum of all traits.
 */
export function cronbachAlpha(
  samples: TraitSample[],
  traits: string[]
): ReliabilityReport {
  const k = traits.length;
  const n = samples.length;
  if (k < 2 || n < 2) {
    return {
      alpha: 0,
      k,
      n,
      interpretation: "poor",
    };
  }
  const cols = extractColumns(samples, traits);
  const itemVarSum = traits.reduce((s, t) => s + variance(cols[t]), 0);

  const totals = samples.map(s =>
    traits.reduce((acc, t) => acc + (s.scores[t] ?? 0), 0)
  );
  const totalVar = variance(totals);
  if (totalVar === 0) {
    return { alpha: 0, k, n, interpretation: "poor" };
  }

  const alpha = (k / (k - 1)) * (1 - itemVarSum / totalVar);
  return {
    alpha,
    k,
    n,
    interpretation: interpretAlpha(alpha),
  };
}

function interpretAlpha(a: number): ReliabilityReport["interpretation"] {
  if (a >= 0.90) return "excellent";
  if (a >= 0.80) return "good";
  if (a >= 0.70) return "acceptable";
  if (a >= 0.60) return "questionable";
  return "poor";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MTMM convergent / discriminant validity
// ─────────────────────────────────────────────────────────────────────────────

export function mtmmReport(
  samples: TraitSample[],
  groups: MtmmGroup[]
): MtmmReport {
  const allTraits = groups.flatMap(g => g.traits);
  const cm = correlationMatrix(samples, allTraits);
  const idx: Record<string, number> = {};
  allTraits.forEach((t, i) => (idx[t] = i));

  // Convergent: pairs WITHIN the same group (excluding diagonal)
  const convergentPairs: number[] = [];
  const perGroup: { group: string; convergent: number }[] = [];
  for (const g of groups) {
    const groupRs: number[] = [];
    for (let i = 0; i < g.traits.length; i++) {
      for (let j = i + 1; j < g.traits.length; j++) {
        const r = cm.matrix[idx[g.traits[i]]][idx[g.traits[j]]];
        groupRs.push(r);
        convergentPairs.push(r);
      }
    }
    perGroup.push({
      group: g.name,
      convergent: groupRs.length > 0 ? mean(groupRs) : 0,
    });
  }

  // Discriminant: pairs ACROSS different groups
  const discriminantPairs: number[] = [];
  for (let gi = 0; gi < groups.length; gi++) {
    for (let gj = gi + 1; gj < groups.length; gj++) {
      for (const ti of groups[gi].traits) {
        for (const tj of groups[gj].traits) {
          discriminantPairs.push(cm.matrix[idx[ti]][idx[tj]]);
        }
      }
    }
  }

  const convergentMean = convergentPairs.length > 0 ? mean(convergentPairs) : 0;
  const discriminantMean = discriminantPairs.length > 0 ? mean(discriminantPairs) : 0;
  return {
    groups,
    convergentMean,
    discriminantMean,
    separation: convergentMean - discriminantMean,
    perGroup,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level audit (one-call summary used by reporting endpoints)
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstructValidityAudit {
  sampleSize: number;
  correlation: CorrelationMatrix;
  reliability: ReliabilityReport;
  mtmm?: MtmmReport;
  /** Auto-generated warnings for the admin dashboard. */
  warnings: string[];
}

const DEFAULT_TRAIT_GROUPS: MtmmGroup[] = [
  { name: "Linguistic Accuracy", traits: ["grammar", "vocabulary"] },
  { name: "Discourse / Communication", traits: ["coherence", "taskRelevance"] },
];

export function auditConstructValidity(
  samples: TraitSample[],
  traits: string[],
  groups: MtmmGroup[] = DEFAULT_TRAIT_GROUPS
): ConstructValidityAudit {
  const correlation = correlationMatrix(samples, traits);
  const reliability = cronbachAlpha(samples, traits);

  const warnings: string[] = [];
  if (samples.length < 30) {
    warnings.push(
      `Sample size n=${samples.length} is below the recommended minimum (30) ` +
        `for stable correlation estimates.`
    );
  }
  if (reliability.alpha < 0.70) {
    warnings.push(
      `Cronbach α=${reliability.alpha.toFixed(2)} indicates ${reliability.interpretation} ` +
        `internal consistency; the rubric may not be measuring a coherent scale.`
    );
  }
  // Halo warning: any off-diagonal r > 0.95 suggests two traits are
  // collapsing onto the same dimension.
  for (let i = 0; i < correlation.traits.length; i++) {
    for (let j = i + 1; j < correlation.traits.length; j++) {
      const r = correlation.matrix[i][j];
      if (r > 0.95) {
        warnings.push(
          `Halo risk: ${correlation.traits[i]} ↔ ${correlation.traits[j]} ` +
            `r=${r.toFixed(2)} — these traits may be redundant.`
        );
      }
    }
  }

  let mtmm: MtmmReport | undefined;
  if (groups.length >= 2 && groups.every(g => g.traits.every(t => traits.includes(t)))) {
    mtmm = mtmmReport(samples, groups);
    if (mtmm.separation < 0.10) {
      warnings.push(
        `MTMM separation ${mtmm.separation.toFixed(2)} is below 0.10 — convergent ` +
          `and discriminant correlations are too close, weakening multi-dimensional claims.`
      );
    }
  }

  return {
    sampleSize: samples.length,
    correlation,
    reliability,
    mtmm,
    warnings,
  };
}
