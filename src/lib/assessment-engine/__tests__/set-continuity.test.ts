import { describe, expect, it } from "vitest";
import { countSplitSets, excludeUsedPassages, pretestCandidates, setProgress } from "../passage-cap";
import { evaluateSectionStop, planSetSibling, prepareSelectionPool, shouldAdministerPretest } from "../section-flow";
import { getProfile } from "../../product-lines/profiles";
import { SkillType, type Item } from "../types";

const profile = getProfile("General English");
const listening = (id: string, script?: string, extra: Partial<Item> = {}): Item => ({
  id, skill: SkillType.LISTENING, type: "MULTIPLE_CHOICE", params: { a: 1, b: 0, c: 0.25 },
  metadata: script ? { ttsScript: script } : {}, ...extra,
} as Item);
const standalone = Array.from({ length: 8 }, (_, i) => listening(`solo${i}`, `Recording ${i}`));

function prepare(pool: Item[], administered: Item[], totalOperationalResponses = 10) {
  return prepareSelectionPool({
    profile, skill: SkillType.LISTENING, itemPool: pool, administeredItems: administered,
    ability: { theta: 0, sem: 1 }, totalOperationalResponses, sectionCount: administered.length, sessionId: "s1",
  });
}

describe("setProgress", () => {
  it("offers the remaining questions of the recording just heard", () => {
    const progress = setProgress([listening("a2", "A"), listening("a3", "A"), ...standalone], [listening("a1", "A")], SkillType.LISTENING);
    expect(progress.run).toBe(1);
    expect(progress.siblings.map((item) => item.id)).toEqual(["a2", "a3"]);
  });

  it("closes the set at the per-recording limit, in another section, and after a standalone item", () => {
    const pool = [listening("a3", "A"), ...standalone];
    expect(setProgress(pool, [listening("a1", "A"), listening("a2", "A")], SkillType.LISTENING)).toEqual({ run: 2, siblings: [] });
    expect(setProgress(pool, [listening("a1", "A")], SkillType.READING)).toEqual({ run: 0, siblings: [] });
    expect(setProgress(pool, [listening("a1", "A"), listening("x")], SkillType.LISTENING)).toEqual({ run: 1, siblings: [] });
  });

  it("looks through an unscored pretest item and never continues a set with one", () => {
    const pretest = listening("p1", "A", { isPretest: true });
    const progress = setProgress([listening("a2", "A"), pretest], [listening("a1", "A"), listening("p0", "Z", { isPretest: true })], SkillType.LISTENING);
    expect(progress.siblings.map((item) => item.id)).toEqual(["a2"]);
  });
});

describe("prepareSelectionPool — set continuity", () => {
  it("hands the selector only the open recording's questions, even during warm-up", () => {
    const hard = listening("a2", "A", { params: { a: 1, b: 3, c: 0.25 } });
    const prepared = prepare([hard, ...standalone], [listening("a1", "A")], 0);
    expect(prepared.pool.map((item) => item.id)).toEqual(["a2"]);
    expect(prepared.retryPool!.length).toBeGreaterThan(0);
    expect(prepared.retryPool!.map((item) => item.id)).not.toContain("a2");
  });

  it("does not reopen a recording once another one has started", () => {
    const administered = [listening("a1", "A"), listening("b1", "B"), listening("b2", "B")];
    const prepared = prepare([listening("a2", "A"), listening("b3", "B"), ...standalone], administered);
    expect(prepared.retryPool).toBeUndefined();
    expect(prepared.pool.map((item) => item.id).sort()).toEqual(standalone.map((item) => item.id).sort());
  });

  it("reopens a recording only when the pool is too thin, and says so", () => {
    const thin = excludeUsedPassages([listening("a2", "A"), ...standalone.slice(0, 2)], [listening("a1", "A"), listening("x")]);
    expect(thin.reopened).toBe(true);
    expect(thin.pool.map((item) => item.id)).toContain("a2");
    const prepared = prepare([listening("a2", "A"), ...standalone.slice(0, 2)], [listening("a1", "A"), listening("x")]);
    expect(prepared.fallbacks).toContain("passage_reopened");
  });
});

describe("shouldAdministerPretest — set boundaries", () => {
  const slot = (totalOperationalResponses: number, extra: { setOpen?: boolean; closedSetLength?: number; pretestAdministered?: number } = {}) =>
    shouldAdministerPretest({
      profile: { ...profile, warmupItems: 0 }, skill: SkillType.LISTENING, pretestRatio: 0.2,
      totalOperationalResponses, pretestAdministered: extra.pretestAdministered ?? 0, sectionCount: 1, sectionMaxItems: 10,
      setOpen: extra.setOpen, closedSetLength: extra.closedSetLength,
    });

  it("keeps the every-4th-item rhythm for standalone items", () => {
    expect([3, 4, 5, 8].map((total) => slot(total, { pretestAdministered: total === 8 ? 1 : 0 }))).toEqual([false, true, false, true]);
  });

  it("waits for the end of the recording, then serves the slot once", () => {
    expect(slot(4, { setOpen: true })).toBe(false);
    expect(slot(5, { closedSetLength: 2 })).toBe(true);
    expect(slot(5, { closedSetLength: 2, pretestAdministered: 1 })).toBe(false);
    expect(slot(6, { closedSetLength: 2 })).toBe(false);
  });
});

describe("pretestCandidates", () => {
  it("never offers a pretest question on a recording already heard, even if nothing else is left", () => {
    const heard = [listening("a1", "A")];
    expect(pretestCandidates([listening("pa", "A"), listening("pb", "B"), listening("px")], heard).map((item) => item.id)).toEqual(["pb", "px"]);
    expect(pretestCandidates([listening("pa", "A")], heard)).toEqual([]);
  });
});

describe("countSplitSets", () => {
  it("counts recordings whose questions were separated by another item", () => {
    expect(countSplitSets([listening("a1", "A"), listening("a2", "A"), listening("b1", "B")])).toEqual({ sets: 1, split: 0 });
    expect(countSplitSets([listening("a1", "A"), listening("b1", "B"), listening("a2", "A")])).toEqual({ sets: 1, split: 1 });
    expect(countSplitSets([listening("a1", "A"), listening("x"), listening("a2", "A")])).toEqual({ sets: 1, split: 1 });
  });
});

describe("planSetSibling — the second question is fixed when the recording opens", () => {
  const first = listening("a1", "A");
  const easy = listening("a2", "A", { params: { a: 1, b: -3, c: 0.25 } });
  const fitting = listening("a3", "A", { params: { a: 1.4, b: 0.1, c: 0.2 } });
  const plan = (sectionCount: number, sectionMaxItems: number, chosen: Item = first) =>
    planSetSibling({ itemPool: [first, easy, fitting, ...standalone], administeredItems: [], chosen, theta: 0, sectionCount, sectionMaxItems });

  it("takes the most informative remaining question of the same recording", () => {
    expect(plan(0, 10)?.id).toBe("a3");
  });

  it("promises nothing when the section has no room, for a standalone item or for an unscored pretest", () => {
    expect(plan(9, 10)).toBeNull();
    expect(plan(0, 10, standalone[0])).toBeNull();
    expect(plan(0, 10, listening("p", "A", { isPretest: true }))).toBeNull();
  });

  it("is what the next selection serves, and the set then closes", () => {
    const prepared = prepareSelectionPool({
      profile, skill: SkillType.LISTENING, itemPool: [easy, fitting, ...standalone], administeredItems: [first],
      ability: { theta: 0, sem: 1 }, totalOperationalResponses: 10, sectionCount: 1, sessionId: "s1", plannedItemId: "a3",
    });
    expect(prepared.pool.map((item) => item.id)).toEqual(["a3"]);
    expect(planSetSibling({ itemPool: [easy, ...standalone], administeredItems: [first], chosen: fitting, theta: 0, sectionCount: 1, sectionMaxItems: 10 })).toBeNull();
  });
});

describe("evaluateSectionStop — a promised question is asked", () => {
  const stop = (setOpen: boolean, sectionCount: number) => evaluateSectionStop({
    profile, sectionIndex: profile.sectionOrder.indexOf(SkillType.LISTENING), sectionCount,
    totalOperationalResponses: 30, ability: { theta: 0, sem: 0.05 }, setOpen,
  });
  const config = profile.sectionConfig[SkillType.LISTENING];

  it("early-stop rules wait for the end of the set, the section budget does not", () => {
    expect(stop(false, config.minItems).stop).toBe(true);
    expect(stop(true, config.minItems).stop).toBe(false);
    expect(stop(true, stop(true, config.minItems).sectionMaxItems).stop).toBe(true);
  });
});
