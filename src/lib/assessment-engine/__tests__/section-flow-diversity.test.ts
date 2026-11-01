import { describe, expect, it } from "vitest";
import { MIN_ROTATION_ALTERNATIVES, MIN_ROTATION_FAMILIES, prepareSelectionPool } from "../section-flow";
import { MIN_POOL_AFTER_FAMILY_CAP, distinctFamilies, taskFamilyKey } from "../task-family";
import { getProfile } from "../../product-lines/profiles";
import { SkillType, type Item } from "../types";

type PoolItem = Item & { tags?: string[] };

function item(id: string, extra: Partial<PoolItem> = {}): PoolItem {
  return { id, skill: SkillType.LISTENING, type: "MULTIPLE_CHOICE", params: { a: 1, b: 0, c: 0.25 }, metadata: {}, tags: [], ...extra };
}
const worksheet = (id: string, taskId = "MOVERS_L_PART1") =>
  item(id, { type: "FILL_IN_BLANKS", metadata: { cambridge_task_id: taskId, ttsScript: `script ${id}` } });

function prepare(pool: PoolItem[], administered: PoolItem[]) {
  return prepareSelectionPool({
    profile: getProfile("General English"), skill: SkillType.LISTENING, itemPool: pool, administeredItems: administered,
    ability: { theta: 0, sem: 1 },
    totalOperationalResponses: 10, sectionCount: administered.length, sessionId: "s1",
  }).pool;
}

describe("taskFamilyKey", () => {
  it("reads a family: tag first, then cambridge_task_id, else none", () => {
    expect(taskFamilyKey(item("a", { tags: ["family:notes-worksheet"], metadata: { cambridge_task_id: "X" } }))).toBe("family:notes-worksheet");
    expect(taskFamilyKey(worksheet("b"))).toBe("cambridge:MOVERS_L_PART1");
    expect(taskFamilyKey(item("c"))).toBeNull();
    expect(distinctFamilies([worksheet("1"), worksheet("2"), worksheet("3", "FLYERS_L_PART1"), item("4"), item("5")])).toBe(4);
  });
});

describe("prepareSelectionPool — task-family diversity and gated rotation", () => {
  const mcqs = Array.from({ length: 8 }, (_, i) => item(`m${i}`));
  const sheets = Array.from({ length: 6 }, (_, i) => worksheet(`w${i}`));

  // Same sectionCount → same shuffle seed; the only difference between the two
  // runs is whether the rotation condition (two MCQs just served) holds.
  const twoMcqs = [item("x1"), item("x2")];
  const mixed = [item("x1"), item("x2", { type: "DRAG_DROP" })];

  it("does not rotate to a non-MCQ format when every alternative comes from one or two templates", () => {
    expect(sheets.length).toBeGreaterThanOrEqual(MIN_ROTATION_ALTERNATIVES);
    expect(distinctFamilies(sheets)).toBeLessThan(MIN_ROTATION_FAMILIES);
    const rotated = prepare([...mcqs, ...sheets], twoMcqs).map((p) => p.id);
    const plain = prepare([...mcqs, ...sheets], mixed).map((p) => p.id);
    expect(rotated).toEqual(plain);
  });

  it("still rotates when the alternatives are varied", () => {
    const varied = Array.from({ length: MIN_ROTATION_ALTERNATIVES }, (_, i) => item(`d${i}`, { type: "DRAG_DROP" }));
    const pool = prepare([...mcqs, ...varied], twoMcqs);
    expect(pool[0].type).toBe("DRAG_DROP");
  });

  it("demotes items of a task family served among the last three", () => {
    const pool = prepare([...sheets, ...mcqs], [worksheet("seen")]);
    const firstSheet = pool.findIndex((p) => p.type === "FILL_IN_BLANKS");
    expect(firstSheet).toBe(mcqs.length); // every worksheet now sits behind all MCQs
    expect(pool).toHaveLength(mcqs.length + sheets.length); // soft rule: nothing removed
  });

  it("caps a task family at MAX_ITEMS_PER_FAMILY per section", () => {
    const served = [worksheet("s1"), worksheet("s2")]; // two from MOVERS already
    const pool = prepare([...sheets, ...mcqs], served);
    expect(pool.some((p) => p.type === "FILL_IN_BLANKS")).toBe(false);
    expect(pool).toHaveLength(mcqs.length);
    // other skills' items do not count toward this section's cap
    const otherSkill = served.map((s) => ({ ...s, skill: SkillType.READING }));
    expect(prepare([...sheets, ...mcqs], otherSkill).some((p) => p.type === "FILL_IN_BLANKS")).toBe(true);
  });

  it("lifts the family cap when it would leave fewer than MIN_POOL_AFTER_FAMILY_CAP items", () => {
    const thin = [...sheets, item("m0"), item("m1")];
    expect(MIN_POOL_AFTER_FAMILY_CAP).toBeGreaterThan(2);
    const pool = prepare(thin, [worksheet("s1"), worksheet("s2")]);
    expect(pool).toHaveLength(thin.length);
  });

  it("leaves a pool with no families untouched", () => {
    const pool = prepare(mcqs, [item("x1")]);
    expect(pool.map((p) => p.id).sort()).toEqual(mcqs.map((p) => p.id).sort());
  });
});
