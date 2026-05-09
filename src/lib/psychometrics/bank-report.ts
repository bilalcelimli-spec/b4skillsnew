/**
 * Item Bank Baseline Report
 *
 * Produces a psychometric snapshot of the live item bank suitable for
 * display in the admin dashboard and for archiving as a periodic baseline.
 *
 * Metrics included:
 *   - Item counts by skill / CEFR / status
 *   - IRT parameter distributions (mean, SD, range) per skill
 *   - Items flagged as "at-risk" (low discrimination or high guessing)
 *   - Overall classical reliability proxy (Spearman-Brown based on bank size)
 *   - Exposure health (requires callers to pass exposure rates)
 *
 * References:
 *   Kolen & Brennan (2014), Test Equating, Scaling, and Linking, §2
 *   ALTE Code of Practice (2011), §3 Item Banking
 */

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface IrtParamStats {
  mean: number;
  sd: number;
  min: number;
  max: number;
  n: number;
}

export interface SkillBankSummary {
  skill: string;
  totalItems: number;
  activeItems: number;
  pretestItems: number;
  retiredItems: number;
  /** IRT discrimination (a-parameter) stats across ACTIVE + PRETEST items */
  discrimination: IrtParamStats;
  /** IRT difficulty (b-parameter) stats */
  difficulty: IrtParamStats;
  /** IRT guessing (c-parameter) stats */
  guessing: IrtParamStats;
  /** Count of items with a < AT_RISK_DISCRIMINATION_THRESHOLD */
  atRiskLowDiscrimination: number;
  /** Count of items with c > AT_RISK_GUESSING_THRESHOLD */
  atRiskHighGuessing: number;
}

export interface CefrCoverage {
  cefrLevel: string;
  totalActive: number;
  /** True if each skill has at least MIN_ITEMS_PER_CELL active items at this level */
  adequate: boolean;
  /** Per-skill breakdown */
  bySkill: Record<string, number>;
}

export interface ExposureHealthSummary {
  /** Number of items with exposure rate > maxRate */
  overexposedCount: number;
  /** Number of items never exposed (rate === 0) */
  neverExposedCount: number;
  maxRate: number;
  /** Mean exposure rate across all items */
  meanRate: number;
}

export interface ItemBankReport {
  generatedAt: string; // ISO-8601
  grandTotal: number;
  bySkill: SkillBankSummary[];
  cefrCoverage: CefrCoverage[];
  exposure?: ExposureHealthSummary;
  /** Spearman-Brown predicted reliability for a k-item adaptive test */
  predictedReliability: Record<number, number>; // { 10: 0.82, 20: 0.90, 30: 0.93 }
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

const AT_RISK_DISCRIMINATION_THRESHOLD = 0.4; // a < 0.4 → low discriminating
const AT_RISK_GUESSING_THRESHOLD = 0.35;      // c > 0.35 → very high guessing
const MIN_ITEMS_PER_CELL = 5;                 // minimum active items per skill×CEFR cell

const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stats(values: number[]): IrtParamStats {
  if (values.length === 0) {
    return { mean: 0, sd: 0, min: 0, max: 0, n: 0 };
  }
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return {
    mean: Number(mean.toFixed(4)),
    sd: Number(Math.sqrt(variance).toFixed(4)),
    min: Number(Math.min(...values).toFixed(4)),
    max: Number(Math.max(...values).toFixed(4)),
    n,
  };
}

/**
 * Spearman-Brown formula: r_kk = k * r_11 / (1 + (k-1) * r_11)
 * We estimate the unit-item reliability r_11 from the mean item information
 * under the 3PL model, translated via: r ≈ I_mean / (I_mean + 1).
 */
function spearmanBrown(itemInformation: number, k: number): number {
  const r11 = Math.min(0.99, itemInformation / (itemInformation + 1));
  const rkk = (k * r11) / (1 + (k - 1) * r11);
  return Number(Math.min(0.99, Math.max(0, rkk)).toFixed(4));
}

/**
 * Approximate mean item information under 3PL at θ = 0.
 * I(θ=0) = a² * (P(θ)-c)² / ((1-c)² * P(θ) * (1-P(θ)))
 */
function meanItemInformation(
  items: Array<{ discrimination: number; difficulty: number; guessing: number }>
): number {
  if (items.length === 0) return 0.5;
  const THETA = 0;
  const infos = items.map(({ discrimination: a, difficulty: b, guessing: c }) => {
    const exp = Math.exp(-1.7 * a * (THETA - b));
    const P = c + (1 - c) / (1 + exp);
    const num = a * a * (P - c) * (P - c);
    const den = (1 - c) * (1 - c) * P * (1 - P);
    return den < 1e-9 ? 0 : num / den;
  });
  return infos.reduce((s, v) => s + v, 0) / infos.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN API
// ─────────────────────────────────────────────────────────────────────────────

export interface RawItemRecord {
  skill: string;
  cefrLevel: string;
  status: string;
  discrimination: number;
  difficulty: number;
  guessing: number;
}

export interface ExposureRecord {
  itemId: string;
  rate: number;
}

/**
 * Build a full item bank baseline report from raw DB rows.
 *
 * @param items   - Flat list of all items from the DB (select minimal fields)
 * @param exposure - Optional per-item exposure rates (from exposure-store)
 */
export function buildBankReport(
  items: RawItemRecord[],
  exposure?: ExposureRecord[]
): ItemBankReport {
  // ── Per-skill summaries ────────────────────────────────────────────────────
  const bySkill: SkillBankSummary[] = SKILLS.map((skill) => {
    const skillItems = items.filter((i) => i.skill === skill);
    const operationalItems = skillItems.filter(
      (i) => i.status === "ACTIVE" || i.status === "PRETEST"
    );

    const as = operationalItems.map((i) => i.discrimination);
    const bs = operationalItems.map((i) => i.difficulty);
    const cs = operationalItems.map((i) => i.guessing);

    return {
      skill,
      totalItems: skillItems.length,
      activeItems: skillItems.filter((i) => i.status === "ACTIVE").length,
      pretestItems: skillItems.filter((i) => i.status === "PRETEST").length,
      retiredItems: skillItems.filter((i) => i.status === "RETIRED").length,
      discrimination: stats(as),
      difficulty: stats(bs),
      guessing: stats(cs),
      atRiskLowDiscrimination: as.filter((a) => a < AT_RISK_DISCRIMINATION_THRESHOLD).length,
      atRiskHighGuessing: cs.filter((c) => c > AT_RISK_GUESSING_THRESHOLD).length,
    };
  });

  // ── CEFR coverage ─────────────────────────────────────────────────────────
  const cefrCoverage: CefrCoverage[] = CEFR_LEVELS.map((cefrLevel) => {
    const bySkillCounts: Record<string, number> = {};
    for (const skill of SKILLS) {
      bySkillCounts[skill] = items.filter(
        (i) => i.cefrLevel === cefrLevel && i.skill === skill && i.status === "ACTIVE"
      ).length;
    }
    const totalActive = Object.values(bySkillCounts).reduce((s, c) => s + c, 0);
    const adequate = Object.values(bySkillCounts).every((c) => c >= MIN_ITEMS_PER_CELL);
    return { cefrLevel, totalActive, adequate, bySkill: bySkillCounts };
  });

  // ── Exposure health ────────────────────────────────────────────────────────
  let exposureSummary: ExposureHealthSummary | undefined;
  if (exposure && exposure.length > 0) {
    const maxRate = 0.20; // Sympson-Hetter default cap
    const rates = exposure.map((e) => e.rate);
    exposureSummary = {
      overexposedCount: rates.filter((r) => r > maxRate).length,
      neverExposedCount: rates.filter((r) => r === 0).length,
      maxRate,
      meanRate: Number((rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(4)),
    };
  }

  // ── Reliability projection ─────────────────────────────────────────────────
  const activeOperational = items.filter(
    (i) => i.status === "ACTIVE" || i.status === "PRETEST"
  );
  const meanInfo = meanItemInformation(activeOperational);
  const predictedReliability: Record<number, number> = {};
  for (const k of [5, 10, 15, 20, 25, 30]) {
    predictedReliability[k] = spearmanBrown(meanInfo, k);
  }

  return {
    generatedAt: new Date().toISOString(),
    grandTotal: items.length,
    bySkill,
    cefrCoverage,
    exposure: exposureSummary,
    predictedReliability,
  };
}
