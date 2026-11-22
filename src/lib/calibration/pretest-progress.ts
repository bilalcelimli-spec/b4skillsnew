/**
 * Pretest calibration progress: for every item in the pretest pool, which
 * product lines can actually serve it (same rule as live delivery,
 * isPretestEligible), how many pretest responses it has, and how far it is
 * from the calibration thresholds (CALIBRATION_POLICY: estimate n ≥ 80,
 * publish n ≥ 200). Pure — the job script supplies the data.
 */
import { isPretestEligible, type AdaptiveEligibilityItem } from "../assessment-engine/adaptive-policy.js";
import { PRODUCT_LINE_PROFILES, type ProductLineName, type ProductLineProfile } from "../product-lines/profiles.js";
import type { SkillType } from "../assessment-engine/types.js";

export interface PretestItem extends AdaptiveEligibilityItem {
  id: string;
  itemCode: string | null;
}

export interface ResponseCounts {
  /** Pretest responses, all time. */
  total: number;
  /** Pretest responses in the recent window. */
  recent: number;
}

export type ProgressStage =
  /** No product line can serve the item: it will never collect responses. */
  | "NO_ROUTE"
  | "COLLECTING"
  /** Enough responses to estimate parameters (draft version). */
  | "ESTIMABLE"
  /** Enough responses for the publish gate's n requirement (other gates still apply). */
  | "PUBLISH_N_REACHED";

export interface ProgressRow {
  id: string;
  itemCode: string;
  skill: string;
  cefrLevel: string;
  profiles: ProductLineName[];
  n: number;
  recent: number;
  stage: ProgressStage;
  /** Days to the next threshold at the recent rate; null when the rate is zero or it is reached. */
  daysToEstimate: number | null;
  daysToPublish: number | null;
  /** Why no product line can serve the item (NO_ROUTE only). */
  noRouteReason?: string;
}

const LEVEL_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Explains a missing route. Seed parameters and CEFR range are checked here;
 * anything else is the profile's exam-source or age-suitability rule, named
 * with the profiles whose range covers the level.
 */
export function noRouteReason(item: AdaptiveEligibilityItem, profiles: Record<string, ProductLineProfile> = PRODUCT_LINE_PROFILES): string {
  if (!(item.discrimination > 0) || !(item.guessing >= 0 && item.guessing < 1)) return "seed parameters (needs a > 0 and 0 ≤ c < 1)";
  const level = LEVEL_ORDER.indexOf(item.cefrLevel);
  const covering = Object.keys(profiles).filter((name) => {
    const [lo, hi] = profiles[name].cefrRange.map((l) => LEVEL_ORDER.indexOf(l));
    return level >= lo && level <= hi;
  });
  if (!covering.length) return "CEFR level outside every product line";
  return `exam source or age suitability rule of ${covering.join(", ")} (age: ${item.ageSuitability ?? "unknown"}; source tags: ${(item.tags ?? []).filter((t) => t.startsWith("source:")).join(", ") || "none"})`;
}

export interface Thresholds {
  estimateMinN: number;
  publishMinN: number;
  /** Length of the recent window, in days. */
  windowDays: number;
}

const stageOf = (n: number, routes: number, t: Thresholds): ProgressStage =>
  routes === 0 ? "NO_ROUTE" : n >= t.publishMinN ? "PUBLISH_N_REACHED" : n >= t.estimateMinN ? "ESTIMABLE" : "COLLECTING";

const daysTo = (target: number, n: number, recent: number, windowDays: number): number | null => {
  if (n >= target) return 0;
  if (recent <= 0) return null;
  return Math.ceil((target - n) / (recent / windowDays));
};

export function servingProfiles(
  item: AdaptiveEligibilityItem,
  profiles: Record<string, ProductLineProfile> = PRODUCT_LINE_PROFILES,
): ProductLineName[] {
  return (Object.keys(profiles) as ProductLineName[]).filter((name) =>
    isPretestEligible(item, profiles[name], item.skill as SkillType));
}

export function buildPretestProgress(
  items: readonly PretestItem[],
  counts: ReadonlyMap<string, ResponseCounts>,
  thresholds: Thresholds,
  profiles: Record<string, ProductLineProfile> = PRODUCT_LINE_PROFILES,
): ProgressRow[] {
  return items.map((item) => {
    const { total: n, recent } = counts.get(item.id) ?? { total: 0, recent: 0 };
    const serving = servingProfiles(item, profiles);
    return {
      id: item.id,
      itemCode: item.itemCode ?? item.id,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      profiles: serving,
      n,
      recent,
      stage: stageOf(n, serving.length, thresholds),
      daysToEstimate: serving.length ? daysTo(thresholds.estimateMinN, n, recent, thresholds.windowDays) : null,
      daysToPublish: serving.length ? daysTo(thresholds.publishMinN, n, recent, thresholds.windowDays) : null,
      ...(serving.length ? {} : { noRouteReason: noRouteReason(item, profiles) }),
    };
  });
}

export interface ProgressGroup {
  key: string;
  items: number;
  noRoute: number;
  collecting: number;
  estimable: number;
  publishN: number;
  /** Median pretest responses per item. */
  medianN: number;
  /** Pretest responses in the recent window, summed over the group. */
  recent: number;
}

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Groups rows by skill and CEFR level, in CEFR order. */
export function groupProgress(rows: readonly ProgressRow[], keyOf: (row: ProgressRow) => string = (r) => `${r.skill} ${r.cefrLevel}`): ProgressGroup[] {
  const groups = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const order = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const rank = (key: string) => {
    const [skill, level] = key.split(" ");
    return `${skill}:${String(order.indexOf(level)).padStart(2, "0")}`;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a).localeCompare(rank(b)))
    .map(([key, list]) => ({
      key,
      items: list.length,
      noRoute: list.filter((r) => r.stage === "NO_ROUTE").length,
      collecting: list.filter((r) => r.stage === "COLLECTING").length,
      estimable: list.filter((r) => r.stage === "ESTIMABLE").length,
      publishN: list.filter((r) => r.stage === "PUBLISH_N_REACHED").length,
      medianN: median(list.map((r) => r.n)),
      recent: list.reduce((sum, r) => sum + r.recent, 0),
    }));
}

/** Plain Markdown report for the console or a file. */
export function renderProgressMarkdown(
  rows: readonly ProgressRow[],
  thresholds: Thresholds,
  sessionsByProfile: Readonly<Record<string, number>>,
  generatedAt: Date,
): string {
  const groups = groupProgress(rows);
  const total = (stage: ProgressStage) => rows.filter((r) => r.stage === stage).length;
  const lines = [
    `# Pretest calibration progress`,
    ``,
    `Generated ${generatedAt.toISOString()}. Thresholds: estimate n ≥ ${thresholds.estimateMinN}, publish n ≥ ${thresholds.publishMinN} (other publish gates still apply). Recent window: ${thresholds.windowDays} days.`,
    ``,
    `| Items | No route | Collecting | Estimable | Publish n reached |`,
    `|---:|---:|---:|---:|---:|`,
    `| ${rows.length} | ${total("NO_ROUTE")} | ${total("COLLECTING")} | ${total("ESTIMABLE")} | ${total("PUBLISH_N_REACHED")} |`,
    ``,
    `## By skill and level`,
    ``,
    `| Skill · level | Items | No route | Collecting | Estimable | Publish n | Median n | Responses (${thresholds.windowDays} d) |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
    ...groups.map((g) => `| ${g.key} | ${g.items} | ${g.noRoute} | ${g.collecting} | ${g.estimable} | ${g.publishN} | ${g.medianN} | ${g.recent} |`),
    ``,
    `## Completed sessions by product line (${thresholds.windowDays} d)`,
    ``,
    `| Product line | Sessions | Pretest items it can serve |`,
    `|---|---:|---:|`,
    ...(Object.keys(PRODUCT_LINE_PROFILES) as ProductLineName[]).map((name) =>
      `| ${name} | ${sessionsByProfile[name] ?? 0} | ${rows.filter((r) => r.profiles.includes(name)).length} |`),
  ];
  const stuck = rows.filter((r) => r.stage === "NO_ROUTE");
  if (stuck.length) {
    lines.push(``, `## Items no product line can serve (${stuck.length})`, ``,
      `These never receive pretest responses until the reason below is resolved.`, ``,
      `| Reason | Skill · level | Items |`, `|---|---|---:|`,
      ...groupProgress(stuck, (r) => `${r.skill} ${r.cefrLevel}\u0000${r.noRouteReason}`).map((g) => {
        const [where, reason] = g.key.split("\u0000");
        return `| ${reason} | ${where} | ${g.items} |`;
      }),
      ``, `<details><summary>Item codes</summary>`, ``,
      ...stuck.map((r) => `- ${r.itemCode} (${r.skill} ${r.cefrLevel})`),
      ``, `</details>`);
  }
  const soon = rows.filter((r) => r.stage === "COLLECTING" && r.daysToEstimate != null).sort((a, b) => a.daysToEstimate! - b.daysToEstimate!);
  if (soon.length) {
    lines.push(``, `## Closest to the estimate threshold`, ``, `| Item | Skill · level | n | Days to n ≥ ${thresholds.estimateMinN} at recent rate |`, `|---|---|---:|---:|`,
      ...soon.slice(0, 15).map((r) => `| ${r.itemCode} | ${r.skill} ${r.cefrLevel} | ${r.n} | ${r.daysToEstimate} |`));
  }
  return lines.join("\n") + "\n";
}
