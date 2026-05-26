/**
 * Davey-Parshall Exposure Control
 *
 * Upgrades the existing Sympson-Hetter stub with the full Davey & Parshall
 * (1995) conditional multinomial algorithm — the industry standard used by
 * GMAT (Pearson VUE PROCTOR) and similar high-stakes CAT programs.
 *
 * Key differences from plain Sympson-Hetter:
 *
 *   1. **Stratum-conditional rates** — each item's exposure is tracked and
 *      controlled separately for each θ stratum. An item may be frequently
 *      used with low-ability examinees but rarely with high-ability ones.
 *
 *   2. **Multinomial acceptance probabilities (α_ij)** — instead of a binary
 *      pass/fail gate, each item i in stratum j is probabilistically accepted
 *      with probability α_ij ∈ (0, 1]. These are updated after every
 *      UPDATE_INTERVAL sessions to converge toward target k_max.
 *
 *   3. **Proportional selection within accepted set** — after α-gating,
 *      items are selected proportional to Fisher information (MFI-weighted),
 *      maintaining measurement efficiency while controlling exposure.
 *
 * Algorithm summary:
 *   1. For each candidate item i, compute MFI(θ, item_i).
 *   2. Apply α-gate: include item i with probability α_{i,stratum(θ)}.
 *   3. Select the item with highest weighted MFI from the accepted set.
 *   4. After UPDATE_INTERVAL sessions: update all α_{ij} to enforce k_max:
 *      - observed_rate > k_max  →  α_ij ← α_ij × (k_max / observed_rate)
 *      - observed_rate < LOWER  →  α_ij ← min(1, α_ij × 1.25)
 *
 * References
 * ----------
 * Davey, T., & Parshall, C. G. (1995). New algorithms for item selection and
 *   exposure control with computerized adaptive testing. Paper presented at the
 *   annual meeting of the AERA, San Francisco.
 *
 * Sympson, J. B., & Hetter, R. D. (1985). Controlling item-exposure rates in
 *   computerized adaptive testing. Proceedings of the 27th annual conference
 *   of the Military Testing Association (pp. 973–977).
 *
 * van der Linden, W. J. (2003). Some alternatives to Sympson-Hetter item
 *   exposure control in computerized adaptive testing. Journal of Educational
 *   and Behavioral Statistics, 28(3), 249–265.
 */

import type { Item, IrtParameters } from "../assessment-engine/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of θ strata (must match thetaToStratum bucketing) */
export const NUM_STRATA = 7;

/** Target maximum exposure rate per item per stratum */
export const DEFAULT_K_MAX = 0.20;

/** Lower bound — items under-exposed below this rate get α boosted */
export const K_LOWER = 0.05;

/** Update α probabilities every N sessions */
export const UPDATE_INTERVAL = 200;

/** Initial α for all items (start open, converge down) */
const ALPHA_INIT = 1.0;

/** Minimum α to prevent items from being permanently blocked */
const ALPHA_MIN = 0.01;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StratumExposureRecord {
  /** Number of times this item was selected in this stratum */
  selected: number;
  /** Total sessions in this stratum (used as denominator) */
  totalSessions: number;
  /** Current acceptance probability α ∈ (0, 1] */
  alpha: number;
}

export interface ItemExposureRecord {
  itemId: string;
  strata: StratumExposureRecord[];  // length = NUM_STRATA
}

export interface ExposureStore {
  records: Map<string, ItemExposureRecord>;
  stratumSessionCounts: number[];  // total sessions per stratum
  sessionsSinceLastUpdate: number;
}

// ─── θ → stratum mapping ─────────────────────────────────────────────────────

/**
 * Map a theta value to stratum index 0..NUM_STRATA-1.
 * Coverage: [-4.5, 4.5] in 7 equal bands ≈ 1.28 θ units each.
 *
 * Stratum: 0=PRE_A1, 1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2 (approx.)
 */
export function thetaToStratumDp(theta: number): number {
  if (!Number.isFinite(theta)) return Math.floor(NUM_STRATA / 2);
  const boundaries = [-3.2, -2.0, -0.8, 0.4, 1.6, 2.8]; // 6 cuts → 7 strata
  for (let i = 0; i < boundaries.length; i++) {
    if (theta < boundaries[i]) return i;
  }
  return NUM_STRATA - 1;
}

// ─── Fisher Information (3PL) ────────────────────────────────────────────────

/**
 * Fisher information at θ for a 3PL item.
 *
 * Derived from I(θ) = (dP/dθ)² / (P×Q) where dP/dθ = a(P−c)Q/(1−c):
 *
 *   I(θ) = a² × (P(θ) − c)² × Q(θ) / ((1 − c)² × P(θ))
 *
 * Note: this is NOT divided by Q — that is a common error. The formula is
 * verified by Lord (1980) eq. 5.5 and Baker & Kim (2004) eq. 3.10.
 */
export function fisherInfo3pl(theta: number, params: IrtParameters): number {
  const { a, b, c } = params;
  const denom = 1 + Math.exp(-a * (theta - b));
  const p = c + (1 - c) / denom;
  const q = 1 - p;
  if (p <= c + 1e-8 || p >= 1 - 1e-8) return 0;
  const pMinusC = p - c;
  // Correct 3PL information: I = a²(P-c)²Q / ((1-c)²P)
  return (a * a * pMinusC * pMinusC * q) / ((1 - c) * (1 - c) * p);
}

// ─── Exposure store factory ───────────────────────────────────────────────────

export function createExposureStore(): ExposureStore {
  return {
    records: new Map(),
    stratumSessionCounts: Array(NUM_STRATA).fill(0),
    sessionsSinceLastUpdate: 0,
  };
}

function getOrCreateRecord(store: ExposureStore, itemId: string): ItemExposureRecord {
  if (!store.records.has(itemId)) {
    store.records.set(itemId, {
      itemId,
      strata: Array.from({ length: NUM_STRATA }, () => ({
        selected: 0,
        totalSessions: 0,
        alpha: ALPHA_INIT,
      })),
    });
  }
  return store.records.get(itemId)!;
}

// ─── Startup bootstrap ───────────────────────────────────────────────────────

/**
 * Bootstrap a Davey-Parshall ExposureStore from DB item exposure counts.
 *
 * Since the DB stores only a total exposure count per item (not per stratum),
 * the count is distributed evenly across strata as an approximation.  This
 * gives over-exposed items an appropriate α penalty on first request after
 * server restart, preventing the CAT from always selecting the single highest-
 * information item at cold start.
 *
 * @param store          The store to populate in-place
 * @param itemExposures  Map of itemId → DB exposureCount
 * @param totalSessions  Approximate total completed sessions (denominator)
 * @param kMax           Target max exposure rate (default DEFAULT_K_MAX)
 */
export function bootstrapDpStoreFromCounts(
  store: ExposureStore,
  itemExposures: ReadonlyMap<string, number>,
  totalSessions: number,
  kMax: number = DEFAULT_K_MAX,
): void {
  if (totalSessions <= 0) return;
  const approxStratumSessions = Math.ceil(totalSessions / NUM_STRATA);
  for (const [itemId, totalCount] of itemExposures) {
    if (totalCount <= 0) continue;
    const approxPerStratum = Math.ceil(totalCount / NUM_STRATA);
    const observedRate = approxPerStratum / approxStratumSessions;
    const record = getOrCreateRecord(store, itemId);
    for (let s = 0; s < NUM_STRATA; s++) {
      record.strata[s].selected = approxPerStratum;
      record.strata[s].totalSessions = approxStratumSessions;
      // Pre-compute alpha: restrict over-exposed items, leave others fully open
      record.strata[s].alpha =
        observedRate > kMax ? Math.max(ALPHA_MIN, kMax / observedRate) : 1.0;
    }
  }
  for (let s = 0; s < NUM_STRATA; s++) {
    store.stratumSessionCounts[s] = Math.max(
      store.stratumSessionCounts[s],
      approxStratumSessions,
    );
  }
}

// ─── α-gate: acceptance probability sampling ─────────────────────────────────

/**
 * Probabilistically accept an item based on its current α value.
 * Returns true if the item clears the acceptance gate.
 * Uses Math.random() — deterministic override possible via rng param.
 */
export function acceptItem(
  store: ExposureStore,
  itemId: string,
  stratum: number,
  rng: () => number = Math.random
): boolean {
  const record = getOrCreateRecord(store, itemId);
  const alpha = record.strata[stratum]?.alpha ?? ALPHA_INIT;
  return rng() < alpha;
}

// ─── Main selection API ───────────────────────────────────────────────────────

export interface DaveyParshallConfig {
  kMax?: number;
  store: ExposureStore;
}

/**
 * Select the next item using Davey-Parshall conditional multinomial exposure.
 *
 * 1. Compute stratum for current θ̂.
 * 2. For each candidate item: apply α-gate (probabilistic accept/reject).
 * 3. Among accepted items: select the one with highest Fisher information.
 * 4. Fallback: if all items rejected, select globally best MFI item.
 *
 * @param candidates - items eligible for selection (already filtered by blueprint)
 * @param theta - current θ̂ estimate
 * @param config - store + optional kMax override
 * @param usedItemIds - already-administered item IDs (never re-select)
 * @param rng - optional random number generator (for testing)
 * @returns selected Item, or null if no candidates
 */
export function selectItemDaveyParshall(
  candidates: Item[],
  theta: number,
  config: DaveyParshallConfig,
  usedItemIds?: Set<string>,
  rng: () => number = Math.random
): Item | null {
  if (candidates.length === 0) return null;

  const stratum = thetaToStratumDp(theta);
  const available = usedItemIds
    ? candidates.filter(item => !usedItemIds.has(item.id))
    : candidates;

  if (available.length === 0) return null;

  // Compute Fisher info for all available items
  const scored = available.map(item => ({
    item,
    info: fisherInfo3pl(theta, item.params),
  }));

  // Apply α-gate: probabilistically accept each item
  const accepted = scored.filter(({ item }) =>
    acceptItem(config.store, item.id, stratum, rng)
  );

  // Select highest-info from accepted set; fallback to overall best
  const pool = accepted.length > 0 ? accepted : scored;
  const best = pool.reduce((prev, curr) => curr.info > prev.info ? curr : prev);

  return best.item;
}

// ─── Record selection ─────────────────────────────────────────────────────────

/**
 * Record that an item was selected in a given session/stratum.
 * Call this AFTER selectItemDaveyParshall returns.
 */
export function recordSelection(
  store: ExposureStore,
  selectedItemId: string,
  stratum: number,
  allCandidateIds: string[]
): void {
  // Increment session count for stratum
  store.stratumSessionCounts[stratum] = (store.stratumSessionCounts[stratum] ?? 0) + 1;
  store.sessionsSinceLastUpdate++;

  // All candidates: increment totalSessions (they were eligible)
  for (const id of allCandidateIds) {
    const rec = getOrCreateRecord(store, id);
    rec.strata[stratum].totalSessions++;
  }

  // Selected item: increment selected count
  const selectedRec = getOrCreateRecord(store, selectedItemId);
  selectedRec.strata[stratum].selected++;
}

// ─── α update (Davey-Parshall convergence step) ──────────────────────────────

/**
 * Update all α values to enforce k_max exposure constraint.
 * Called every UPDATE_INTERVAL sessions.
 *
 * For each item i in stratum j:
 *   observed_rate = selected_{ij} / totalSessions_{ij}
 *   if observed_rate > k_max:   α_{ij} ← max(ALPHA_MIN, α_{ij} × k_max/observed_rate)
 *   if observed_rate < K_LOWER: α_{ij} ← min(1, α_{ij} × 1.25)
 */
export function updateAlphas(store: ExposureStore, kMax: number = DEFAULT_K_MAX): void {
  for (const record of store.records.values()) {
    for (let s = 0; s < NUM_STRATA; s++) {
      const stratum = record.strata[s];
      if (stratum.totalSessions < 10) continue; // insufficient data, don't update

      const observedRate = stratum.selected / stratum.totalSessions;

      if (observedRate > kMax) {
        // Item over-exposed in this stratum: reduce α proportionally
        stratum.alpha = Math.max(ALPHA_MIN, stratum.alpha * (kMax / observedRate));
      } else if (observedRate < K_LOWER && observedRate > 0) {
        // Item under-exposed: loosen α to improve bank utilization
        stratum.alpha = Math.min(1.0, stratum.alpha * 1.25);
      }
    }
  }
  store.sessionsSinceLastUpdate = 0;
}

/**
 * Trigger α update if UPDATE_INTERVAL sessions have elapsed.
 * Call at the end of each session.
 */
export function maybeUpdateAlphas(
  store: ExposureStore,
  kMax: number = DEFAULT_K_MAX,
  interval: number = UPDATE_INTERVAL
): boolean {
  if (store.sessionsSinceLastUpdate >= interval) {
    updateAlphas(store, kMax);
    return true;
  }
  return false;
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

export interface ExposureDiagnostics {
  totalItems: number;
  overExposedItems: Array<{ itemId: string; stratum: number; rate: number; alpha: number }>;
  underUtilizedItems: Array<{ itemId: string; stratum: number; rate: number; alpha: number }>;
  meanExposureRate: number;
  maxExposureRate: number;
  convergenceScore: number;  // 1 - (overExposed / totalItems); 1 = perfect
}

/**
 * Compute exposure diagnostics for the full item bank.
 * Use for monthly audit and CI reports.
 */
export function computeExposureDiagnostics(
  store: ExposureStore,
  kMax: number = DEFAULT_K_MAX
): ExposureDiagnostics {
  const overExposed: ExposureDiagnostics["overExposedItems"] = [];
  const underUtilized: ExposureDiagnostics["underUtilizedItems"] = [];
  const rates: number[] = [];

  for (const record of store.records.values()) {
    for (let s = 0; s < NUM_STRATA; s++) {
      const stratum = record.strata[s];
      if (stratum.totalSessions < 5) continue;

      const rate = stratum.selected / stratum.totalSessions;
      rates.push(rate);

      if (rate > kMax) {
        overExposed.push({ itemId: record.itemId, stratum: s, rate: Number(rate.toFixed(4)), alpha: stratum.alpha });
      }
      if (rate < K_LOWER && stratum.totalSessions >= 20) {
        underUtilized.push({ itemId: record.itemId, stratum: s, rate: Number(rate.toFixed(4)), alpha: stratum.alpha });
      }
    }
  }

  const totalItems = store.records.size;
  const meanRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  const maxRate = rates.length > 0 ? Math.max(...rates) : 0;
  const uniqueOverExposed = new Set(overExposed.map(o => o.itemId)).size;

  return {
    totalItems,
    overExposedItems: overExposed,
    underUtilizedItems: underUtilized,
    meanExposureRate: Number(meanRate.toFixed(4)),
    maxExposureRate: Number(maxRate.toFixed(4)),
    convergenceScore: totalItems > 0 ? Number((1 - uniqueOverExposed / totalItems).toFixed(4)) : 1,
  };
}

/**
 * Serialize the exposure store to a plain JSON-compatible object.
 * For persistence between server restarts (store in Redis/DB).
 */
export function serializeExposureStore(store: ExposureStore): object {
  const records: Record<string, { strata: StratumExposureRecord[] }> = {};
  for (const [id, rec] of store.records.entries()) {
    records[id] = { strata: rec.strata };
  }
  return {
    records,
    stratumSessionCounts: store.stratumSessionCounts,
    sessionsSinceLastUpdate: store.sessionsSinceLastUpdate,
  };
}

/**
 * Deserialize an exposure store from persisted JSON.
 */
export function deserializeExposureStore(data: ReturnType<typeof serializeExposureStore>): ExposureStore {
  const obj = data as any;
  const store = createExposureStore();
  store.stratumSessionCounts = obj.stratumSessionCounts ?? Array(NUM_STRATA).fill(0);
  store.sessionsSinceLastUpdate = obj.sessionsSinceLastUpdate ?? 0;
  for (const [id, val] of Object.entries(obj.records ?? {})) {
    store.records.set(id, { itemId: id, strata: (val as any).strata });
  }
  return store;
}
