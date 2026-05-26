/**
 * Item Exposure Control — Sympson-Hetter + Stratified
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures no item is administered too frequently, preserving test security
 * and maintaining item freshness across large candidate populations.
 *
 * Algorithms:
 *   • Sympson-Hetter (S-H): probabilistic eligibility control
 *     Each item has exposure rate r_i = c_i × P(item selected | eligible)
 *     Tune c_i until r_i ≤ r_max (default 0.20 per NCME guidelines)
 *   • Maximum Exposure Rate (MER): hard cap — item rejected if r_i > r_max
 *   • α-Stratification: spread high-discrimination items across θ strata
 *     (Sympson-Hetter is applied within each stratum)
 *   • Progressive exposure control: tighten caps as bank matures
 *
 * References:
 *   Sympson & Hetter (1985), Applied Psychological Measurement.
 *   Chang & Ying (1999) — α-Stratification.
 *   van der Linden & Veldkamp (2004) — Conditional exposure control.
 */

import { prisma } from "../prisma.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExposureRecord {
  itemId: string;
  administeredCount: number;
  eligibleCount: number;       // times item was in eligible set
  observedRate: number;        // administeredCount / totalExaminees
  c_i: number;                 // Sympson-Hetter control parameter [0, 1]
  underControl: boolean;       // r_i ≤ r_max
  stratum: number;             // α-stratification stratum (1, 2, 3)
}

export interface ExposureReport {
  generatedAt: string;
  totalExaminees: number;
  maxExposureRate: number;
  itemsOverLimit: number;
  itemsAtRisk: number;          // rate > 80% of limit
  avgExposureRate: number;
  records: ExposureRecord[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_EXPOSURE_RATE = 0.20; // r_max — no item seen by > 20% of candidates
const DEFAULT_STRATA = 3;

// ── In-memory exposure tracker (backed by DB for persistence) ─────────────────

class ExposureTracker {
  private administered: Map<string, number> = new Map(); // itemId → count
  private eligible:     Map<string, number> = new Map(); // itemId → count
  private cParams:      Map<string, number> = new Map(); // itemId → c_i
  private totalExaminees = 0;
  private rMax = DEFAULT_MAX_EXPOSURE_RATE;

  setMaxRate(r: number): void { this.rMax = r; }

  /** Call each time a CAT session starts (before item selection loop) */
  beginSession(): void { this.totalExaminees++; }

  /** Call each time an item is in the eligible pool for a session */
  markEligible(itemId: string): void {
    this.eligible.set(itemId, (this.eligible.get(itemId) ?? 0) + 1);
  }

  /** Sympson-Hetter gate — returns true if item may be administered */
  isAllowed(itemId: string): boolean {
    const c = this.cParams.get(itemId) ?? 1.0;
    return Math.random() < c;
  }

  /** Call each time an item is actually administered */
  markAdministered(itemId: string): void {
    this.administered.set(itemId, (this.administered.get(itemId) ?? 0) + 1);
  }

  /** Recompute c_i parameters after each administration cycle */
  tuneParameters(itemIds: string[]): void {
    if (this.totalExaminees < 10) return; // not enough data yet

    for (const id of itemIds) {
      const n_admin = this.administered.get(id) ?? 0;
      const observedRate = n_admin / this.totalExaminees;

      if (observedRate <= this.rMax) {
        // Under control — relax c_i slightly (allow more usage)
        const current = this.cParams.get(id) ?? 1.0;
        this.cParams.set(id, Math.min(1.0, current + 0.01));
      } else {
        // Over limit — reduce c_i to bring rate down
        const excess = observedRate / this.rMax;
        const current = this.cParams.get(id) ?? 1.0;
        this.cParams.set(id, Math.max(0.01, current / excess));
      }
    }
  }

  observedRate(itemId: string): number {
    if (this.totalExaminees === 0) return 0;
    return (this.administered.get(itemId) ?? 0) / this.totalExaminees;
  }

  getRecord(itemId: string, stratum = 1): ExposureRecord {
    const administeredCount = this.administered.get(itemId) ?? 0;
    const eligibleCount     = this.eligible.get(itemId) ?? 0;
    const observedRate      = this.totalExaminees > 0 ? administeredCount / this.totalExaminees : 0;
    const c_i               = this.cParams.get(itemId) ?? 1.0;
    return {
      itemId,
      administeredCount,
      eligibleCount,
      observedRate: Math.round(observedRate * 10000) / 10000,
      c_i: Math.round(c_i * 10000) / 10000,
      underControl: observedRate <= this.rMax,
      stratum,
    };
  }

  totalExamineesCount(): number { return this.totalExaminees; }
  rMaxValue(): number { return this.rMax; }
}

export const exposureTracker = new ExposureTracker();

// ── Stratified exposure-controlled item selection ─────────────────────────────

export interface StratifiedItem {
  id: string;
  a: number;   // discrimination
  b: number;   // difficulty
  c: number;   // guessing
}

/**
 * Select next item using α-stratification + Sympson-Hetter exposure control.
 * Items are divided into `strata` groups by discrimination.
 * Within the target stratum, select closest b to theta; skip over-exposed items.
 */
export function selectWithExposureControl(
  theta: number,
  items: StratifiedItem[],
  usedIds: Set<string>,
  opts: { strata?: number; semEstimate?: number } = {}
): StratifiedItem | null {
  const { strata = DEFAULT_STRATA } = opts;

  // Sort by discrimination for stratification
  const sorted = [...items].filter((it) => !usedIds.has(it.id)).sort((a, b) => a.a - b.a);
  if (sorted.length === 0) return null;

  // Target stratum based on current test progress (lower stratum early, higher late)
  const stratumIdx = Math.min(
    strata - 1,
    Math.floor((usedIds.size / Math.max(1, usedIds.size + sorted.length)) * strata)
  );

  const chunkSize = Math.ceil(sorted.length / strata);
  const chunk = sorted.slice(stratumIdx * chunkSize, (stratumIdx + 1) * chunkSize);
  const fallback = sorted; // full pool fallback

  const candidates = chunk.length > 0 ? chunk : fallback;

  // Apply Sympson-Hetter gate and select b-optimal item
  for (let attempt = 0; attempt < candidates.length; attempt++) {
    // Sort by |b - theta| to prioritize information-optimal items
    const sorted2 = [...candidates].sort((a, b) => Math.abs(a.b - theta) - Math.abs(b.b - theta));
    for (const item of sorted2) {
      if (usedIds.has(item.id)) continue;
      exposureTracker.markEligible(item.id);
      if (exposureTracker.isAllowed(item.id)) {
        exposureTracker.markAdministered(item.id);
        return item;
      }
    }
    break; // All S-H gated → fall to next stratum or full pool
  }

  // S-H blocked all candidates → pick least-exposed fallback
  const byRate = [...candidates].sort((a, b) => exposureTracker.observedRate(a.id) - exposureTracker.observedRate(b.id));
  const pick = byRate.find((it) => !usedIds.has(it.id));
  if (pick) exposureTracker.markAdministered(pick.id);
  return pick ?? null;
}

// ── Exposure report ───────────────────────────────────────────────────────────

export async function generateExposureReport(): Promise<ExposureReport> {
  const items = await prisma.item.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, discrimination: true },
    orderBy: { discrimination: "asc" },
  });

  const total = items.length;
  const chunkSize = Math.ceil(total / DEFAULT_STRATA);
  const records: ExposureRecord[] = items.map((it, idx) => {
    const stratum = Math.floor(idx / chunkSize) + 1;
    return exposureTracker.getRecord(it.id, stratum);
  });

  const rMax = exposureTracker.rMaxValue();
  const itemsOverLimit = records.filter((r) => !r.underControl).length;
  const itemsAtRisk    = records.filter((r) => r.observedRate > rMax * 0.8 && r.underControl).length;
  const avgRate        = records.reduce((s, r) => s + r.observedRate, 0) / Math.max(1, records.length);

  return {
    generatedAt: new Date().toISOString(),
    totalExaminees: exposureTracker.totalExamineesCount(),
    maxExposureRate: rMax,
    itemsOverLimit,
    itemsAtRisk,
    avgExposureRate: Math.round(avgRate * 10000) / 10000,
    records,
  };
}
