/**
 * Item-bank capacity targets per product line × skill × CEFR level.
 *
 * `verify:coverage` asks whether a section can start (≥ minItems items). This
 * module asks whether the bank can serve the section *well*: enough distinct
 * material that no item, passage or task has to exceed the profile's exposure
 * ceiling, and enough non-multiple-choice grammar/vocabulary items for the
 * information assumptions in profiles.ts to hold.
 *
 * Sizing rule (Faz 0 of the bank expansion plan, 2026-11-14):
 *
 *   per-candidate demand  d = sectionConfig.maxItems              (items / tasks)
 *                         d = ⌈maxItems / MAX_ITEMS_PER_PASSAGE⌉   (reading / listening: stimuli)
 *   minimum per level       = ⌈d / profile.maxExposureRate⌉
 *   target per level        = ⌈minimum × TARGET_MULTIPLIER⌉
 *
 * Counting per CEFR label is conservative: a candidate near a cut also draws
 * from the neighbouring level. These are planning numbers derived from the
 * exposure rule, not simulation results; `scripts/jobs/bank-baseline-simulation.ts`
 * measures what the current bank actually delivers.
 */

import { SkillType } from "../assessment-engine/types.js";
import { isAdaptiveEligible } from "../assessment-engine/adaptive-policy.js";
import { MAX_ITEMS_PER_PASSAGE } from "../assessment-engine/passage-cap.js";
import type { ProductLineProfile } from "../product-lines/profiles.js";

export const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CapacityCefr = (typeof CEFR_LEVELS)[number];

export const CAPACITY_POLICY = {
  /** Target = minimum × this, so retirement and DIF removals do not drop a cell below its minimum. */
  targetMultiplier: 1.5,
  /** Share of grammar/vocabulary items that should not be 4-option multiple choice (FIB I_peak ≈ 0.91 vs MC 0.52). */
  nonMcShareTarget: 0.3,
} as const;

const STIMULUS_SKILLS = new Set<string>([SkillType.READING, SkillType.LISTENING]);
const PRODUCTIVE_SKILLS = new Set<string>([SkillType.WRITING, SkillType.SPEAKING]);
const FORMAT_SKILLS = new Set<string>([SkillType.GRAMMAR, SkillType.VOCABULARY]);

export type CapacityUnit = "item" | "stimulus" | "task";

/** Bank item as exported by `bank:snapshot` (no content text). */
export interface CapacityItem {
  id: string;
  skill: string;
  cefrLevel: string;
  type: string;
  a: number;
  b: number;
  c: number;
  status?: string;
  isPretest?: boolean;
  tags?: string[];
  passageKey?: string | null;
  productLine?: string | null;
}

export interface CapacityRequirement {
  unit: CapacityUnit;
  /** Units one candidate can consume in this section. */
  perCandidate: number;
  minimum: number;
  target: number;
}

export type CapacityStatus = "BELOW_MINIMUM" | "BELOW_TARGET" | "OK";

export interface CapacityRow {
  profile: string;
  skill: string;
  cefrLevel: CapacityCefr;
  unit: CapacityUnit;
  items: number;
  units: number;
  minimum: number;
  target: number;
  status: CapacityStatus;
  /** Units still needed to reach the target (0 when met). */
  shortfall: number;
  /** Grammar / vocabulary only: share of items that are not MULTIPLE_CHOICE. */
  nonMcShare?: number;
  formatShort?: boolean;
}

export function capacityRequirement(profile: ProductLineProfile, skill: string): CapacityRequirement {
  const maxItems = profile.sectionConfig[skill]?.maxItems ?? 0;
  const unit: CapacityUnit = STIMULUS_SKILLS.has(skill) ? "stimulus" : PRODUCTIVE_SKILLS.has(skill) ? "task" : "item";
  const perCandidate = unit === "stimulus" ? Math.ceil(maxItems / MAX_ITEMS_PER_PASSAGE) : maxItems;
  const exposure = profile.maxExposureRate > 0 ? profile.maxExposureRate : 1;
  const minimum = perCandidate > 0 ? Math.ceil(perCandidate / exposure) : 0;
  return { unit, perCandidate, minimum, target: Math.ceil(minimum * CAPACITY_POLICY.targetMultiplier) };
}

export function profileLevels(profile: ProductLineProfile): CapacityCefr[] {
  const lo = CEFR_LEVELS.indexOf(profile.cefrRange[0] as CapacityCefr);
  const hi = CEFR_LEVELS.indexOf(profile.cefrRange[1] as CapacityCefr);
  return lo < 0 || hi < lo ? [] : CEFR_LEVELS.slice(lo, hi + 1);
}

/** Distinct stimuli; an item without a passage/recording key counts as its own stimulus. */
export function countUnits(items: CapacityItem[], unit: CapacityUnit): number {
  if (unit !== "stimulus") return items.length;
  const keys = new Set<string>();
  let singles = 0;
  for (const item of items) {
    if (item.passageKey) keys.add(item.passageKey);
    else singles++;
  }
  return keys.size + singles;
}

function eligible(item: CapacityItem, profile: ProductLineProfile, skill: string): boolean {
  return isAdaptiveEligible(
    {
      skill: item.skill, status: item.status ?? "ACTIVE", isPretest: item.isPretest ?? false,
      cefrLevel: item.cefrLevel, discrimination: item.a, guessing: item.c, tags: item.tags ?? [],
      content: item.productLine ? { productLine: item.productLine } : {},
    },
    profile,
    skill as SkillType,
  );
}

export function auditProfileCapacity(profile: ProductLineProfile, bank: CapacityItem[]): CapacityRow[] {
  const rows: CapacityRow[] = [];
  const levels = profileLevels(profile);
  for (const skill of profile.sectionOrder.map(String)) {
    const req = capacityRequirement(profile, skill);
    const pool = bank.filter((item) => eligible(item, profile, skill));
    for (const cefrLevel of levels) {
      const cell = pool.filter((item) => item.cefrLevel === cefrLevel);
      const units = countUnits(cell, req.unit);
      const status: CapacityStatus = units < req.minimum ? "BELOW_MINIMUM" : units < req.target ? "BELOW_TARGET" : "OK";
      const row: CapacityRow = {
        profile: profile.name, skill, cefrLevel, unit: req.unit, items: cell.length, units,
        minimum: req.minimum, target: req.target, status, shortfall: Math.max(0, req.target - units),
      };
      if (FORMAT_SKILLS.has(skill)) {
        const nonMc = cell.filter((item) => item.type !== "MULTIPLE_CHOICE").length;
        row.nonMcShare = cell.length ? nonMc / cell.length : 0;
        row.formatShort = row.nonMcShare < CAPACITY_POLICY.nonMcShareTarget;
      }
      rows.push(row);
    }
  }
  return rows;
}

export interface CapacitySummary {
  cells: number;
  belowMinimum: number;
  belowTarget: number;
  ok: number;
  formatShort: number;
  /** Sum of shortfalls, by unit — an upper bound, since profiles share items. */
  shortfallByUnit: Record<CapacityUnit, number>;
}

export function summarizeCapacity(rows: CapacityRow[]): CapacitySummary {
  const summary: CapacitySummary = {
    cells: rows.length, belowMinimum: 0, belowTarget: 0, ok: 0, formatShort: 0,
    shortfallByUnit: { item: 0, stimulus: 0, task: 0 },
  };
  for (const row of rows) {
    if (row.status === "BELOW_MINIMUM") summary.belowMinimum++;
    else if (row.status === "BELOW_TARGET") summary.belowTarget++;
    else summary.ok++;
    if (row.formatShort) summary.formatShort++;
    summary.shortfallByUnit[row.unit] += row.shortfall;
  }
  return summary;
}
