/**
 * Section stop rules — the single place where a live adaptive section decides
 * whether it has measured a skill well enough.
 *
 * Faz 1 (docs/ADAPTIVE_ENGINE_ROADMAP_2026_10.md, F2): the former
 * `AssessmentEngine.shouldStop` carried SPRT, posterior classification
 * confidence, conditional boundary SEM and an information criterion, but the
 * live section flow never called it. Those rules now live here as explicit,
 * per-profile opt-ins so the behaviour of every exam is readable from its
 * profile instead of from a dead code path.
 *
 * Structural limits (always enforced, not rules):
 *   - `minItems` floor: no early stop below it.
 *   - `maxItems` ceiling (the section budget): always stops.
 *
 * Early-stop rules (evaluated in the listed order, first hit wins):
 *   SEM_THRESHOLD              skill SEM ≤ section semThreshold
 *   BOUNDARY_SEM               tighter SEM tiers near a CEFR cut (0.16 within
 *                              ±0.50 logit, 0.12 within ±0.25)
 *   CLASSIFICATION_CONFIDENCE  P(current CEFR band | θ̂, SEM) ≥ threshold
 *   SPRT                       Wald SPRT at the nearest CEFR cut (needs items)
 *
 * The default rule set reproduces the pre-Faz-1 live behaviour exactly:
 * SEM_THRESHOLD only. Profiles opt into the others once simulation evidence
 * supports them (roadmap Faz 3).
 */

import { CEFR_THETA_THRESHOLDS, thetaToCefr, type CefrLevel } from "../cefr/cefr-framework.js";
import { evaluateSprtStop, cefrCutValues, type SprtConfig } from "./sequential-sprt.js";
import type { Item, Response, SkillProfile } from "./types.js";

export type StopRule =
  | "SEM_THRESHOLD"
  | "BOUNDARY_SEM"
  | "CLASSIFICATION_CONFIDENCE"
  | "SPRT";

export const DEFAULT_SECTION_STOP_RULES: readonly StopRule[] = ["SEM_THRESHOLD"];

export const DEFAULT_CLASSIFICATION_CONFIDENCE = 0.90;
export const BOUNDARY_TIERS = [
  { withinLogits: 0.25, maxSem: 0.12, reason: "SEM_BOUNDARY_TIGHT" },
  { withinLogits: 0.50, maxSem: 0.16, reason: "SEM_BOUNDARY_REACHED" },
] as const;

export interface StopRuleInput {
  /** Rules enabled for this section; defaults to DEFAULT_SECTION_STOP_RULES. */
  rules?: readonly StopRule[];
  /** Skill-level ability estimate for the section being evaluated. */
  ability: SkillProfile;
  /** Operational items answered in this section. */
  sectionCount: number;
  /** Section floor (no early stop below) and ceiling (always stop at). */
  minItems: number;
  maxItems: number;
  /** Section SEM target for SEM_THRESHOLD. */
  semThreshold: number;
  /** Org-level CEFR cut overrides (same shape as EngineConfig.cefrThresholds). */
  cefrThresholds?: Partial<Record<CefrLevel, number>> | Record<string, number>;
  /** Threshold for CLASSIFICATION_CONFIDENCE (default 0.90). */
  classificationConfidenceThreshold?: number;
  /** SPRT configuration; the rule is skipped unless `enabled`. */
  sprt?: SprtConfig;
  /** Section responses and their items; required for SPRT only. */
  responses?: Response[];
  items?: Record<string, Item>;
  /** A served-but-unanswered item keeps the section open regardless of rules. */
  hasOutstandingItem?: boolean;
}

export interface StopDecision {
  stop: boolean;
  reason: string | null;
}

/** Standard normal CDF (Abramowitz & Stegun 26.2.17). */
export function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p =
    d * Math.exp((-x * x) / 2) *
    t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

type Cuts = { a1: number; a2: number; b1: number; b2: number; c1: number; c2: number };

/** Resolve the six CEFR cut points from org overrides or the canonical framework. */
export function resolveCefrCuts(thresholds?: StopRuleInput["cefrThresholds"]): Cuts {
  const t = (thresholds ?? {}) as Record<string, number | undefined>;
  return {
    a1: t.A1 ?? CEFR_THETA_THRESHOLDS.PRE_A1,
    a2: t.A2 ?? CEFR_THETA_THRESHOLDS.A1,
    b1: t.B1 ?? CEFR_THETA_THRESHOLDS.A2,
    b2: t.B2 ?? CEFR_THETA_THRESHOLDS.B1,
    c1: t.C1 ?? CEFR_THETA_THRESHOLDS.B2,
    c2: t.C2 ?? CEFR_THETA_THRESHOLDS.C1,
  };
}

/** Map θ to a CEFR level under the resolved cuts (same convention as the engine). */
export function thetaToCefrWithCuts(theta: number, thresholds?: StopRuleInput["cefrThresholds"]): CefrLevel {
  if (!thresholds || Object.keys(thresholds).length === 0) return thetaToCefr(theta);
  const c = resolveCefrCuts(thresholds);
  if (theta < c.a1) return "PRE_A1";
  if (theta < c.a2) return "A1";
  if (theta < c.b1) return "A2";
  if (theta < c.b2) return "B1";
  if (theta < c.c1) return "B2";
  if (theta < c.c2) return "C1";
  return "C2";
}

function bandBounds(level: CefrLevel, c: Cuts): { lower: number; upper: number } {
  switch (level) {
    case "PRE_A1": return { lower: -Infinity, upper: c.a1 };
    case "A1":     return { lower: c.a1, upper: c.a2 };
    case "A2":     return { lower: c.a2, upper: c.b1 };
    case "B1":     return { lower: c.b1, upper: c.b2 };
    case "B2":     return { lower: c.b2, upper: c.c1 };
    case "C1":     return { lower: c.c1, upper: c.c2 };
    case "C2":     return { lower: c.c2, upper: Infinity };
  }
}

/** P(θ lies in the band currently assigned to θ̂ | N(θ̂, SEM²)). */
export function classificationConfidence(
  theta: number,
  sem: number,
  thresholds?: StopRuleInput["cefrThresholds"]
): number {
  if (!(sem > 0)) return 1;
  const cuts = resolveCefrCuts(thresholds);
  const { lower, upper } = bandBounds(thetaToCefrWithCuts(theta, thresholds), cuts);
  const pLower = lower === -Infinity ? 0 : normalCDF((lower - theta) / sem);
  const pUpper = upper === Infinity ? 1 : normalCDF((upper - theta) / sem);
  return pUpper - pLower;
}

/** Distance from θ̂ to the nearest CEFR cut under the resolved cuts. */
export function distanceToNearestCut(theta: number, thresholds?: StopRuleInput["cefrThresholds"]): number {
  const cuts = Object.values(resolveCefrCuts(thresholds)).filter(Number.isFinite);
  return Math.min(...cuts.map((cut) => Math.abs(theta - cut)));
}

/**
 * Decide whether a section should stop.
 * Pure: no I/O, deterministic for a given input.
 */
export function evaluateSectionStopRules(input: StopRuleInput): StopDecision {
  const rules = input.rules ?? DEFAULT_SECTION_STOP_RULES;
  const { ability, sectionCount, minItems, maxItems, semThreshold } = input;

  if (input.hasOutstandingItem) return { stop: false, reason: null };
  if (sectionCount >= maxItems) return { stop: true, reason: "ITEM_BUDGET_REACHED" };
  if (sectionCount < minItems) return { stop: false, reason: null };
  if (!Number.isFinite(ability.sem) || !(ability.sem > 0)) return { stop: false, reason: null };

  for (const rule of rules) {
    switch (rule) {
      case "SEM_THRESHOLD": {
        if (ability.sem <= semThreshold) return { stop: true, reason: "SEM_THRESHOLD_REACHED" };
        break;
      }
      case "BOUNDARY_SEM": {
        const dist = distanceToNearestCut(ability.theta, input.cefrThresholds);
        for (const tier of BOUNDARY_TIERS) {
          if (dist < tier.withinLogits && ability.sem <= tier.maxSem) {
            return { stop: true, reason: tier.reason };
          }
        }
        break;
      }
      case "CLASSIFICATION_CONFIDENCE": {
        const threshold = input.classificationConfidenceThreshold ?? DEFAULT_CLASSIFICATION_CONFIDENCE;
        const confidence = classificationConfidence(ability.theta, ability.sem, input.cefrThresholds);
        if (confidence >= threshold) return { stop: true, reason: "CLASSIFICATION_CONFIDENCE_REACHED" };
        break;
      }
      case "SPRT": {
        if (!input.sprt?.enabled || !input.responses || !input.items) break;
        const cuts = cefrCutValues(input.cefrThresholds as Record<string, number> | undefined);
        const out = evaluateSprtStop(
          { theta: ability.theta, sem: ability.sem, responses: input.responses },
          input.sprt,
          cuts,
          input.items,
          { useGrmProductive: true }
        );
        if (out.stop) return out;
        break;
      }
    }
  }
  return { stop: false, reason: null };
}
