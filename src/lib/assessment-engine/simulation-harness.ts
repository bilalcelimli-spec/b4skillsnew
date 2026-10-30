/**
 * Production-path simulation harness.
 *
 * Runs simulated candidates through the SAME code a live adaptive session
 * uses — `prepareSelectionPool` → `CATSelector.selectNext` →
 * `AssessmentEngine.processResponse` → `evaluateSectionStop`, section by
 * section per product-line profile — against an in-memory item bank, and
 * reports recovery and operational statistics:
 *
 *   bias, RMSE, mean SEM, SEM calibration (RMSE / mean SEM)
 *   CEFR classification accuracy (exact, adjacent, boundary band)
 *   test length, section stop reasons, pool fallbacks
 *   item exposure (max rate, share over the profile ceiling)
 *   selection latency (p50 / p95)
 *
 * The only things the harness does NOT exercise are the database, the
 * cross-session item exclusion (one session per simulee) and asynchronous
 * productive scoring (grades are sampled from the GRM immediately).
 *
 * Bank sources:
 *   buildSyntheticBank()    deterministic bank spanning every skill × CEFR cell
 *   loadBankSnapshot(path)  anonymised export from scripts/export-bank-snapshot.ts
 *
 * Used by test/simulation/production-path.test.ts (CI gate),
 * scripts/simulate-adaptive.ts (reports, A/B) and scripts/audit-adaptive-delivery.ts.
 */

import { readFileSync } from "node:fs";
import { CEFR_META, type CefrLevel } from "../cefr/cefr-framework.js";
import type { ProductLineProfile } from "../product-lines/profiles.js";
import { allCategoryProbabilities, rubricToGrmParams } from "../psychometrics/graded-response-model.js";
import { CATSelector, _resetDpStoreForTests, type ShadowItem, type ShadowStrategy } from "../selection/cat-selector.js";
import type { SequencingContext } from "../selection/sequencing-rules.js";
import { crossSkillPriors, isAdaptiveEligible, isPretestEligible, profileAbilityPrior, profileThetaRange, sectionAbility } from "./adaptive-policy.js";
import { selectPretestItem } from "./pretest-selection.js";
import { prepareSelectionPool, evaluateSectionStop, shouldAdministerPretest } from "./section-flow.js";
import { AssessmentEngine } from "./engine.js";
import { getExposureStore, resetExposureStoreForSimulation } from "./exposure-store.js";
import { probability } from "./irt.js";
import { distanceToNearestCut, type StopRule } from "./stop-rules.js";
import type { SprtConfig } from "./sequential-sprt.js";
import { SkillType, type EngineConfig, type Item, type SessionState } from "./types.js";
import { CALIBRATION_POLICY } from "../psychometrics/calibration-policy.js";

// ─── Bank snapshot ────────────────────────────────────────────────────────────

export interface BankSnapshotItem {
  id: string;
  skill: SkillType;
  cefrLevel: CefrLevel;
  type: string;
  a: number;
  b: number;
  c: number;
  status?: string;
  isPretest?: boolean;
  isAnchor?: boolean;
  iqScore?: number | null;
  tags?: string[];
  /** Stable hash of the reading passage / recording script (passage-cap). */
  passageKey?: string | null;
  /** `content.productLine` when the item is pinned to a product line. */
  productLine?: string | null;
}

export interface BankSnapshot {
  generatedAt: string;
  source: "synthetic" | "database";
  items: BankSnapshotItem[];
}

export function loadBankSnapshot(path: string): BankSnapshot {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as BankSnapshot;
  if (!Array.isArray(parsed.items)) throw new Error(`Bank snapshot ${path} has no items array`);
  return parsed;
}

// ─── Deterministic RNG ────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function randn(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Synthetic bank ───────────────────────────────────────────────────────────

const ALL_LEVELS: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const RECEPTIVE: SkillType[] = [SkillType.GRAMMAR, SkillType.VOCABULARY, SkillType.READING, SkillType.LISTENING];
const PRODUCTIVE: SkillType[] = [SkillType.WRITING, SkillType.SPEAKING];

/** Band centre on the θ scale; open-ended bands are centred 0.6 logit beyond the cut. */
export function cefrBandCentre(level: CefrLevel): number {
  const { min, max } = CEFR_META[level].theta;
  if (min === -Infinity) return max - 0.6;
  if (max === Infinity) return min + 0.6;
  return (min + max) / 2;
}

export interface SyntheticBankOptions {
  seed?: number;
  /** Items per skill × level cell for grammar/vocabulary/reading/listening (default 40). */
  receptivePerCell?: number;
  /** Items per skill × level cell for writing/speaking (default 12). */
  productivePerCell?: number;
  /** Share of reading/listening items that belong to multi-item passages (default 0.6). */
  passageShare?: number;
  /** PRETEST items per receptive skill × level cell (default 8). */
  pretestPerCell?: number;
}

/**
 * Deterministic bank with realistic 3PL parameters: b ~ N(band centre, 0.45),
 * a ~ N(1.2, 0.3) clipped to [0.6, 2.2], c ∈ [0.10, 0.25] for MCQ, 0 otherwise.
 * Reading/listening items are grouped into 3-item passages so passage-cap and
 * set-integrity rules see realistic structure.
 */
export function buildSyntheticBank(options: SyntheticBankOptions = {}): BankSnapshot {
  const rng = mulberry32(options.seed ?? 20261030);
  const receptivePerCell = options.receptivePerCell ?? 40;
  const productivePerCell = options.productivePerCell ?? 12;
  const passageShare = options.passageShare ?? 0.6;
  const pretestPerCell = options.pretestPerCell ?? 8;
  const items: BankSnapshotItem[] = [];
  let n = 0;
  for (const skill of [...RECEPTIVE, ...PRODUCTIVE]) {
    const productive = PRODUCTIVE.includes(skill);
    for (const level of ALL_LEVELS) {
      if (productive && level === "PRE_A1") continue;
      const perCell = productive ? productivePerCell : receptivePerCell;
      const centre = cefrBandCentre(level);
      let passageCounter = 0;
      for (let k = 0; k < perCell; k++) {
        const isMcq = !productive && rng() < 0.75;
        const type = productive
          ? (skill === SkillType.WRITING ? "WRITING_PROMPT" : "SPEAKING_PROMPT")
          : isMcq ? "MULTIPLE_CHOICE" : "FILL_IN_BLANKS";
        const b = Math.max(-3.8, Math.min(3.8, centre + 0.45 * randn(rng)));
        const a = Math.max(0.6, Math.min(2.2, 1.2 + 0.3 * randn(rng)));
        const c = isMcq ? 0.10 + 0.15 * rng() : 0;
        const inPassage = (skill === SkillType.READING || skill === SkillType.LISTENING) && rng() < passageShare;
        const passageKey = inPassage ? `${skill}-${level}-p${Math.floor(passageCounter++ / 3)}` : null;
        items.push({
          id: `syn_${n++}`,
          skill,
          cefrLevel: level,
          type,
          a: Number(a.toFixed(3)),
          b: Number(b.toFixed(3)),
          c: Number(c.toFixed(3)),
          status: "ACTIVE",
          isPretest: false,
          iqScore: 70 + Math.round(rng() * 30),
          tags: [],
          passageKey,
        });
      }
      if (!productive) {
        for (let k = 0; k < pretestPerCell; k++) {
          // Seed parameters (CEFR prior) differ from the generating truth so the
          // calibration pipeline has something to recover; both stay in range.
          const trueB = Math.max(-3.8, Math.min(3.8, centre + 0.45 * randn(rng)));
          items.push({
            id: `syn_pre_${n++}`,
            skill,
            cefrLevel: level,
            type: rng() < 0.75 ? "MULTIPLE_CHOICE" : "FILL_IN_BLANKS",
            a: Number(Math.max(0.6, Math.min(2.2, 1.2 + 0.3 * randn(rng))).toFixed(3)),
            b: Number(trueB.toFixed(3)),
            c: 0.2,
            status: "PRETEST",
            isPretest: true,
            iqScore: 70 + Math.round(rng() * 30),
            tags: [],
            passageKey: null,
          });
        }
      }
    }
  }
  return { generatedAt: new Date(0).toISOString(), source: "synthetic", items };
}

/**
 * Default candidate-ability sampler for a profile: normal around the centre of
 * the profile's CEFR range with SD = range / 4, so a Primary (PRE_A1–A2) cohort
 * is not simulated with B2 adults and a General English cohort spans A1–C1.
 */
export { profileThetaRange };

/**
 * Default candidate-ability sampler: N(centre of the profile's CEFR range, cohortSd).
 * cohortSd defaults to 1 — the dispersion the EAP prior assumes. Wider cohorts
 * (e.g. 1.4) are a sensitivity analysis: the reported SEM then understates error
 * because the N(·, 1) prior is misspecified (roadmap F22).
 */
export function defaultThetaSampler(profile: ProductLineProfile, cohortSd = 1): (rng: () => number) => number {
  const { centre } = profileThetaRange(profile);
  return (rng) => centre + cohortSd * randn(rng);
}

// ─── Snapshot → engine items ──────────────────────────────────────────────────

function toEngineItem(row: BankSnapshotItem): Item & { tags: string[]; cefrLevel: string } {
  const metadata: Record<string, unknown> = {};
  // passage-cap derives its key from passage/ttsScript text; a stable surrogate keeps it active.
  if (row.passageKey) {
    metadata.passage = `passage:${row.passageKey}`;
    metadata.setId = row.passageKey;
  }
  if (row.productLine) metadata.productLine = row.productLine;
  return {
    id: row.id,
    skill: row.skill,
    type: row.type,
    status: (row.status as Item["status"]) ?? "ACTIVE",
    isPretest: row.isPretest ?? false,
    params: { a: row.a, b: row.b, c: row.c },
    iqScore: row.iqScore ?? null,
    metadata,
    tags: row.tags ?? [],
    cefrLevel: row.cefrLevel,
  };
}

/** Items a live session of this profile could draw for the skill (adaptiveItemWhere mirror). */
export function eligibleBankItems(bank: BankSnapshot, profile: ProductLineProfile, skill: SkillType): Item[] {
  return bank.items
    .filter((row) => isAdaptiveEligible({
      skill: row.skill, status: row.status ?? "ACTIVE", isPretest: row.isPretest ?? false,
      cefrLevel: row.cefrLevel, discrimination: row.a, guessing: row.c, tags: row.tags ?? [],
      content: row.productLine ? { productLine: row.productLine } : {},
    }, profile, skill))
    .map(toEngineItem);
}

/** Pretest (calibration) items a live session of this profile could embed for the skill. */
export function eligiblePretestItems(bank: BankSnapshot, profile: ProductLineProfile, skill: SkillType): Item[] {
  return bank.items
    .filter((row) => isPretestEligible({
      skill: row.skill, status: row.status ?? "ACTIVE", isPretest: row.isPretest ?? false,
      cefrLevel: row.cefrLevel, discrimination: row.a, guessing: row.c, tags: row.tags ?? [],
      content: row.productLine ? { productLine: row.productLine } : {},
    }, profile, skill))
    .map((row) => ({ ...toEngineItem(row), isPretest: true }));
}

// ─── Response simulation ──────────────────────────────────────────────────────

function isGrmItem(item: Item): boolean {
  return (item.skill === SkillType.WRITING || item.skill === SkillType.SPEAKING) &&
    item.type !== "FILL_IN_BLANKS" && item.type !== "MULTIPLE_CHOICE" && item.type !== "DRAG_DROP";
}

/** Sample a response from the true ability: Bernoulli(3PL) or a GRM category (score = k/10). */
export function simulateResponse(item: Item, trueTheta: number, rng: () => number): number {
  if (isGrmItem(item)) {
    const grm = rubricToGrmParams(item.params.a, item.params.b, 11);
    const probs = allCategoryProbabilities(trueTheta, grm);
    let u = rng();
    for (let k = 0; k < probs.length; k++) {
      u -= probs[k]!;
      if (u <= 0) return k / (probs.length - 1);
    }
    return 1;
  }
  return rng() < probability(trueTheta, item.params) ? 1 : 0;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimulationOptions {
  profile: ProductLineProfile;
  /** Number of simulated candidates. */
  n: number;
  seed?: number;
  shadowStrategy?: ShadowStrategy;
  /** Correlation between a candidate's general θ and each skill θ (default 0.85; cohort-centred deviations). */
  skillCorrelation?: number;
  /** Cohort SD for the default sampler (default 1; see defaultThetaSampler). */
  cohortSd?: number;
  /** Sampler for the general θ; default `defaultThetaSampler(profile, cohortSd)`. */
  sampleTheta?: (rng: () => number) => number;
  /**
   * Seed Math.random for the run (α-gate and near-optimal lottery use it), so a
   * report is reproducible for a given seed. Default true; restored afterwards.
   */
  deterministic?: boolean;
  /** Engine config overrides (defaults mirror server-engine DEFAULT_CONFIG without MIRT; `priorMean` acts as an org prior). */
  engineConfig?: Partial<EngineConfig>;
  /** Reset the in-process exposure stores before the run (default true). */
  isolateStores?: boolean;
  /** Share of the exam that may be pretest items (SystemConfig.pretestRatio; default 0.1 as in production). */
  pretestRatio?: number;
  /** Override the profile's section stop rules for an A/B run (undefined = profile value). */
  stopRules?: readonly StopRule[];
  /** Override the profile's budget flex for an A/B run (undefined = profile value). */
  sectionBudgetFlex?: boolean;
  /** Override the CLASSIFICATION_CONFIDENCE threshold for an A/B run. */
  classificationConfidenceThreshold?: number;
  /** SPRT settings for an A/B run (only used when the SPRT rule is listed). */
  sprt?: SprtConfig;
  /** Cross-skill informative prior override: a correlation enables it, `null` disables it. */
  crossSkillPrior?: { correlation: number } | null;
}

export interface PretestSummary {
  /** Pretest items eligible across the profile's sections. */
  eligibleItems: number;
  /** Mean pretest items embedded per session. */
  meanPerSession: number;
  /** Mean responses accumulated per pretest item that was served at least once. */
  meanResponsesPerServedItem: number;
  /** Pretest items that reached the estimation threshold (CALIBRATION_POLICY.estimateMinN). */
  itemsAtEstimateMinN: number;
  /** Pretest items that reached the publish threshold (CALIBRATION_POLICY.publishMinN). */
  itemsAtPublishMinN: number;
  /** Expected sessions for the least-served eligible item to reach estimateMinN at this traffic mix. */
  sessionsToEstimateAll: number | null;
}

export interface SimuleeResult {
  trueTheta: number;
  /** Item-count-weighted mean of the skill θs — what the pooled unidimensional EAP estimates. */
  compositeTrueTheta: number;
  trueSkillTheta: Partial<Record<SkillType, number>>;
  estimatedTheta: number;
  estimatedSem: number;
  skillProfiles: Partial<Record<SkillType, { theta: number; sem: number }>>;
  trueCefr: CefrLevel;
  estimatedCefr: CefrLevel;
  itemsAdministered: number;
  pretestAdministered: number;
  sectionStops: Array<{ skill: SkillType; items: number; reason: string }>;
}

export interface SkillSummary {
  bias: number;
  rmse: number;
  meanSem: number;
  meanItems: number;
  stopReasons: Record<string, number>;
  eligibleItems: number;
  itemsUsed: number;
  maxExposureRate: number;
  shareOverCeiling: number;
}

export interface SimulationReport {
  profile: string;
  shadowStrategy: ShadowStrategy;
  stopRules: string[];
  sectionBudgetFlex: boolean;
  n: number;
  seed: number;
  bias: number;
  rmse: number;
  meanSem: number;
  /** RMSE / mean SEM against the general θ — ≈1 means the reported SEM is honest. */
  semCalibration: number;
  /**
   * Same statistics against the item-weighted mean of skill θs (the construct the
   * pooled EAP actually estimates). The gap to the general-θ figures measures
   * how much multidimensionality the single overall SEM hides.
   */
  compositeBias: number;
  compositeRmse: number;
  compositeSemCalibration: number;
  /**
   * Equal-weight mean of the skill estimates (the "profile mean" the report
   * exposes as compositeProfile) against the mean of the true skill θs, with
   * SEM = √Σ SEM_k² / K. Honest by construction when skill SEMs are honest.
   */
  skillMeanBias: number;
  skillMeanRmse: number;
  skillMeanSemCalibration: number;
  /** Share of simulees whose skill profile is flagged uneven (dispersion beyond measurement error). */
  profileUnevenRate: number;
  cefrExactAccuracy: number;
  cefrAdjacentAccuracy: number;
  /** Exact accuracy for simulees within 0.25 logit of a CEFR cut. */
  boundaryBandAccuracy: number;
  boundaryBandN: number;
  meanLength: number;
  minLength: number;
  maxLength: number;
  poolFallbacks: Record<string, number>;
  selectionLatencyMs: { p50: number; p95: number; max: number; calls: number };
  maxExposureRate: number;
  shareOverCeiling: number;
  perSkill: Partial<Record<SkillType, SkillSummary>>;
  pretest: PretestSummary;
  simulees: SimuleeResult[];
}

const CEFR_ORDER: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

/** χ² 95th percentile for df = 1…6 (dispersion test of a skill profile). */
export function chiSquare95(df: number): number {
  const table = [0, 3.841, 5.991, 7.815, 9.488, 11.070, 12.592];
  return table[Math.max(0, Math.min(6, df))] ?? 12.592;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index]!;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

const DEFAULT_ENGINE: EngineConfig = {
  minItems: 3,
  maxItems: 200,
  semThreshold: 0.3,
  startingTheta: 0,
  startingSem: 1,
  pretestRatio: 0,
  useMirt: false,
  useGrmProductive: true,
  useRtIrt: false,
};

/**
 * Simulate `n` candidates on one profile through the live selection path.
 */
export async function simulateProfile(bank: BankSnapshot, options: SimulationOptions): Promise<SimulationReport> {
  const { n } = options;
  // Stop-rule / budget-flex overrides produce an A/B variant of the profile.
  const profile: ProductLineProfile = {
    ...options.profile,
    ...(options.stopRules ? { stopRules: options.stopRules } : {}),
    ...(options.sectionBudgetFlex !== undefined ? { sectionBudgetFlex: options.sectionBudgetFlex } : {}),
    ...(options.classificationConfidenceThreshold !== undefined ? { classificationConfidenceThreshold: options.classificationConfidenceThreshold } : {}),
    ...(options.sprt ? { sprt: options.sprt } : {}),
    ...(options.crossSkillPrior !== undefined ? { crossSkillPrior: options.crossSkillPrior ?? undefined } : {}),
  };
  const seed = options.seed ?? 20261030;
  const rng = mulberry32(seed);
  const rho = options.skillCorrelation ?? 0.85;
  const cohortSd = options.cohortSd ?? 1;
  const sampleTheta = options.sampleTheta ?? defaultThetaSampler(profile, cohortSd);
  const thetaSd = cohortSd;
  const shadowStrategy = options.shadowStrategy ?? "greedy";
  if (options.isolateStores !== false) {
    resetExposureStoreForSimulation();
    _resetDpStoreForTests();
  }
  // Production parity: the live flow resolves the prior per profile (getEngineForProfile).
  const prior = profileAbilityPrior(profile, options.engineConfig);
  const engine = new AssessmentEngine({ ...DEFAULT_ENGINE, ...options.engineConfig, priorMean: prior.mean, priorSd: prior.sd });
  const originalRandom = Math.random;
  if (options.deterministic !== false) Math.random = mulberry32(seed ^ 0x5bd1e995);
  try {
    return await runSimulation();
  } finally {
    Math.random = originalRandom;
  }

  async function runSimulation(): Promise<SimulationReport> {
  const priorMean = engine.getConfig().priorMean ?? 0;
  const priorSd = engine.getConfig().priorSd ?? 1;
  const selector = new CATSelector(profile, { shadowStrategy });

  const bankBySkill = new Map<SkillType, Item[]>();
  const pretestBySkill = new Map<SkillType, Array<Item & { exposureCount: number }>>();
  const itemMap: Record<string, Item> = {};
  const pretestRatio = options.pretestRatio ?? 0.1;
  for (const skill of profile.sectionOrder) {
    const items = eligibleBankItems(bank, profile, skill);
    bankBySkill.set(skill, items);
    for (const item of items) itemMap[item.id] = item;
    const pretests = eligiblePretestItems(bank, profile, skill).map((item) => ({ ...item, exposureCount: 0 }));
    pretestBySkill.set(skill, pretests);
    for (const item of pretests) itemMap[item.id] = item;
  }
  const pretestResponses = new Map<string, number>();

  const exposures = new Map<string, number>();
  const latencies: number[] = [];
  const poolFallbacks: Record<string, number> = {};
  const simulees: SimuleeResult[] = [];

  for (let i = 0; i < n; i++) {
    const trueTheta = sampleTheta(rng);
    // Skill θ = general θ + cohort-centred deviation δ, Var(δ) = σ²(1−ρ²)/ρ² so that
    // corr(skill θ, θ) = ρ while E[skill θ | θ] = θ. (A regression-style model
    // ρθ + √(1−ρ²)ε would pull every skill toward 0 and fake a cohort bias.)
    const trueSkillTheta: Partial<Record<SkillType, number>> = {};
    const deviationSd = rho >= 1 ? 0 : thetaSd * Math.sqrt((1 - rho * rho) / (rho * rho));
    for (const skill of profile.sectionOrder) {
      trueSkillTheta[skill] = trueTheta + deviationSd * randn(rng);
    }

    // New-candidate warm start: ±0.2 uniform jitter, as in server-engine.launchSession.
    let state: SessionState = { ...engine.initializeSession(), theta: priorMean + (rng() - 0.5) * 0.4 };
    const administered: Item[] = [];
    const sectionStops: SimuleeResult["sectionStops"] = [];
    const sessionId = `sim-${seed}-${i}`;
    // Live sessions register a test start at launch (global exposure denominator).
    await (await getExposureStore()).recordTestStart();

    for (let sectionIndex = 0; sectionIndex < profile.sectionOrder.length; sectionIndex++) {
      const skill = profile.sectionOrder[sectionIndex]!;
      const sectionItems = bankBySkill.get(skill) ?? [];
      let sectionCount = 0;
      // Every exit from the loop below assigns the reason (stop rule or empty pool).
      let reason: string;
      for (;;) {
        const totalOperational = state.responses.filter((r) => !r.isPretest).length;
        const ability = sectionAbility(state, skill, totalOperational === 0 ? state.theta : priorMean, priorSd, { profile });
        const sectionDict: Record<string, Item> = {};
        for (const item of administered) if (item.skill === skill) sectionDict[item.id] = item;
        const stop = evaluateSectionStop({
          profile, sectionIndex, sectionCount, totalOperationalResponses: totalOperational, ability,
          responses: state.responses.filter((r) => !r.isPretest && sectionDict[r.itemId]),
          items: sectionDict,
        });
        if (stop.stop) { reason = stop.reason ?? "STOP"; break; }

        // Pretest slot (same policy as the live flow); unscored, outside the budget.
        const pretestsSoFar = state.responses.filter((r) => r.isPretest).length;
        if (shouldAdministerPretest({
          profile, skill, pretestRatio, totalOperationalResponses: totalOperational,
          pretestAdministered: pretestsSoFar, sectionCount, sectionMaxItems: stop.sectionMaxItems,
        })) {
          const pool = (pretestBySkill.get(skill) ?? []).filter((item) => !state.usedItemIds.has(item.id));
          const pretest = selectPretestItem(pool, ability.theta);
          if (pretest) {
            const score = simulateResponse(pretest, trueSkillTheta[skill]!, rng);
            state = engine.processResponse(state, { itemId: pretest.id, score, latencyMs: 10_000, isPretest: true }, itemMap);
            administered.push(pretest);
            (pretest as Item & { exposureCount: number }).exposureCount++;
            pretestResponses.set(pretest.id, (pretestResponses.get(pretest.id) ?? 0) + 1);
            continue;
          }
        }

        const itemPool = sectionItems.filter((item) => !state.usedItemIds.has(item.id));
        const prepared = prepareSelectionPool({
          profile, skill, itemPool, administeredItems: administered, ability,
          totalOperationalResponses: totalOperational, sectionCount, sessionId,
        });
        for (const fb of prepared.fallbacks) poolFallbacks[fb] = (poolFallbacks[fb] ?? 0) + 1;
        const seqCtx: SequencingContext = {
          administeredItems: administered,
          responses: state.responses,
          plannedTotal: profile.globalMaxItems,
          totalAdministeredAcrossAllSections: state.responses.length,
          profile,
          sessionId,
        };
        const started = process.hrtime.bigint();
        const result = await selector.selectNext(prepared.pool as ShadowItem[], { ...state, ...ability }, seqCtx, profile.blueprint);
        latencies.push(Number(process.hrtime.bigint() - started) / 1e6);
        if (!result) {
          poolFallbacks.pool_exhausted = (poolFallbacks.pool_exhausted ?? 0) + 1;
          reason = "POOL_EXHAUSTED";
          break;
        }
        const item = result.item;
        const score = simulateResponse(item, trueSkillTheta[skill]!, rng);
        const skillPriors = crossSkillPriors(state, profile, prior);
        state = engine.processResponse(state, { itemId: item.id, score, latencyMs: 10_000 }, itemMap, { skillPriors });
        administered.push(item);
        exposures.set(item.id, (exposures.get(item.id) ?? 0) + 1);
        sectionCount++;
      }
      sectionStops.push({ skill, items: sectionCount, reason });
    }

    const weighted = sectionStops.reduce((acc, stop) => {
      acc.sum += stop.items * (trueSkillTheta[stop.skill] ?? trueTheta);
      acc.n += stop.items;
      return acc;
    }, { sum: 0, n: 0 });
    simulees.push({
      trueTheta,
      compositeTrueTheta: weighted.n > 0 ? weighted.sum / weighted.n : trueTheta,
      trueSkillTheta,
      estimatedTheta: state.theta,
      estimatedSem: state.sem,
      skillProfiles: state.skillProfiles ?? {},
      trueCefr: engine.mapToCefr(trueTheta),
      estimatedCefr: engine.mapToCefr(state.theta),
      itemsAdministered: state.responses.filter((r) => !r.isPretest).length,
      pretestAdministered: state.responses.filter((r) => r.isPretest).length,
      sectionStops,
    });
  }

  // ── Aggregates ──
  const errors = simulees.map((s) => s.estimatedTheta - s.trueTheta);
  const bias = mean(errors);
  const rmse = Math.sqrt(mean(errors.map((e) => e * e)));
  const meanSem = mean(simulees.map((s) => s.estimatedSem));
  const compositeErrors = simulees.map((s) => s.estimatedTheta - s.compositeTrueTheta);
  const skillMeanRows = simulees.map((s) => {
    const skills = profile.sectionOrder.filter((k) => s.skillProfiles[k] && s.trueSkillTheta[k] !== undefined);
    if (skills.length === 0) return null;
    const estMean = skills.reduce((sum, k) => sum + s.skillProfiles[k]!.theta, 0) / skills.length;
    const trueMean = skills.reduce((sum, k) => sum + s.trueSkillTheta[k]!, 0) / skills.length;
    const sem = Math.sqrt(skills.reduce((sum, k) => sum + s.skillProfiles[k]!.sem ** 2, 0)) / skills.length;
    const dispersion = skills.reduce((sum, k) => sum + ((s.skillProfiles[k]!.theta - estMean) ** 2) / (s.skillProfiles[k]!.sem ** 2), 0);
    return { error: estMean - trueMean, sem, uneven: dispersion > chiSquare95(skills.length - 1) };
  }).filter((r): r is { error: number; sem: number; uneven: boolean } => r !== null);
  const skillMeanBias = mean(skillMeanRows.map((r) => r.error));
  const skillMeanRmse = Math.sqrt(mean(skillMeanRows.map((r) => r.error ** 2)));
  const skillMeanSem = mean(skillMeanRows.map((r) => r.sem));
  const compositeBias = mean(compositeErrors);
  const compositeRmse = Math.sqrt(mean(compositeErrors.map((e) => e * e)));
  const exact = simulees.filter((s) => s.estimatedCefr === s.trueCefr).length;
  const adjacent = simulees.filter((s) =>
    Math.abs(CEFR_ORDER.indexOf(s.estimatedCefr) - CEFR_ORDER.indexOf(s.trueCefr)) <= 1).length;
  const boundary = simulees.filter((s) => distanceToNearestCut(s.trueTheta) < 0.25);
  const boundaryExact = boundary.filter((s) => s.estimatedCefr === s.trueCefr).length;
  const lengths = simulees.map((s) => s.itemsAdministered);
  const sortedLatency = [...latencies].sort((a, b) => a - b);

  const allEligible = new Set<string>();
  for (const items of bankBySkill.values()) for (const item of items) allEligible.add(item.id);
  const rates = [...exposures.values()].map((count) => count / n);
  const maxExposureRate = rates.length ? Math.max(...rates) : 0;
  const shareOverCeiling = allEligible.size
    ? rates.filter((rate) => rate > profile.maxExposureRate).length / allEligible.size : 0;

  const perSkill: Partial<Record<SkillType, SkillSummary>> = {};
  for (const skill of profile.sectionOrder) {
    const items = bankBySkill.get(skill) ?? [];
    const pairs = simulees
      .map((s) => ({ est: s.skillProfiles[skill], truth: s.trueSkillTheta[skill] }))
      .filter((p): p is { est: { theta: number; sem: number }; truth: number } => !!p.est && p.truth !== undefined);
    const errs = pairs.map((p) => p.est.theta - p.truth);
    const stopReasons: Record<string, number> = {};
    const sectionLengths: number[] = [];
    for (const s of simulees) for (const stop of s.sectionStops) if (stop.skill === skill) {
      stopReasons[stop.reason] = (stopReasons[stop.reason] ?? 0) + 1;
      sectionLengths.push(stop.items);
    }
    const skillRates = items.map((item) => (exposures.get(item.id) ?? 0) / n);
    perSkill[skill] = {
      bias: mean(errs),
      rmse: Math.sqrt(mean(errs.map((e) => e * e))),
      meanSem: mean(pairs.map((p) => p.est.sem)),
      meanItems: mean(sectionLengths),
      stopReasons,
      eligibleItems: items.length,
      itemsUsed: items.filter((item) => exposures.has(item.id)).length,
      maxExposureRate: skillRates.length ? Math.max(...skillRates) : 0,
      shareOverCeiling: items.length ? skillRates.filter((r) => r > profile.maxExposureRate).length / items.length : 0,
    };
  }

  const pretestEligible = [...pretestBySkill.values()].reduce((sum, items) => sum + items.length, 0);
  const servedCounts = [...pretestResponses.values()];
  const meanPretestPerSession = mean(simulees.map((s) => s.pretestAdministered));
  const totalPretestResponses = servedCounts.reduce((sum, v) => sum + v, 0);
  // Least-served eligible item sets the pace: responses per session spread over the eligible pool.
  const perItemPerSession = pretestEligible > 0 && n > 0 ? totalPretestResponses / pretestEligible / n : 0;
  const pretest: PretestSummary = {
    eligibleItems: pretestEligible,
    meanPerSession: meanPretestPerSession,
    meanResponsesPerServedItem: mean(servedCounts),
    itemsAtEstimateMinN: servedCounts.filter((v) => v >= CALIBRATION_POLICY.estimateMinN).length,
    itemsAtPublishMinN: servedCounts.filter((v) => v >= CALIBRATION_POLICY.publishMinN).length,
    sessionsToEstimateAll: perItemPerSession > 0 ? Math.ceil(CALIBRATION_POLICY.estimateMinN / perItemPerSession) : null,
  };

  return {
    profile: profile.name,
    shadowStrategy,
    stopRules: [...(profile.stopRules ?? ["SEM_THRESHOLD"])],
    sectionBudgetFlex: profile.sectionBudgetFlex === true,
    n,
    seed,
    bias,
    rmse,
    meanSem,
    semCalibration: meanSem > 0 ? rmse / meanSem : 0,
    compositeBias,
    compositeRmse,
    compositeSemCalibration: meanSem > 0 ? compositeRmse / meanSem : 0,
    skillMeanBias,
    skillMeanRmse,
    skillMeanSemCalibration: skillMeanSem > 0 ? skillMeanRmse / skillMeanSem : 0,
    profileUnevenRate: skillMeanRows.length ? skillMeanRows.filter((r) => r.uneven).length / skillMeanRows.length : 0,
    cefrExactAccuracy: n ? exact / n : 0,
    cefrAdjacentAccuracy: n ? adjacent / n : 0,
    boundaryBandAccuracy: boundary.length ? boundaryExact / boundary.length : 0,
    boundaryBandN: boundary.length,
    meanLength: mean(lengths),
    minLength: lengths.length ? Math.min(...lengths) : 0,
    maxLength: lengths.length ? Math.max(...lengths) : 0,
    poolFallbacks,
    selectionLatencyMs: {
      p50: percentile(sortedLatency, 0.5),
      p95: percentile(sortedLatency, 0.95),
      max: sortedLatency.length ? sortedLatency[sortedLatency.length - 1]! : 0,
      calls: sortedLatency.length,
    },
    maxExposureRate,
    shareOverCeiling,
    perSkill,
    pretest,
    simulees,
  };
  }
}

/** Compact, log-friendly view of a report (drops per-simulee rows). */
export function summarizeReport(report: SimulationReport): Omit<SimulationReport, "simulees"> {
  const { simulees: _drop, ...rest } = report;
  return rest;
}
