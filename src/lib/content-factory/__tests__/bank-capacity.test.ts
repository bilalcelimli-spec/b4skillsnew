import { describe, expect, it } from "vitest";
import { getProfile } from "../../product-lines/profiles.js";
import {
  auditProfileCapacity, capacityRequirement, countUnits, summarizeCapacity, type CapacityItem,
} from "../bank-capacity.js";

let seq = 0;
function item(overrides: Partial<CapacityItem>): CapacityItem {
  seq += 1;
  return { id: `i${seq}`, skill: "GRAMMAR", cefrLevel: "B1", type: "MULTIPLE_CHOICE", a: 1.2, b: 0, c: 0.25, status: "ACTIVE", tags: [], ...overrides };
}

describe("capacityRequirement", () => {
  it("derives the minimum from section maxItems and the exposure ceiling", () => {
    const ge = getProfile("General English");
    // VOCABULARY maxItems 13, exposure 0.30 → ⌈13 / 0.30⌉ = 44, target ⌈44 × 1.5⌉ = 66
    expect(capacityRequirement(ge, "VOCABULARY")).toEqual({ unit: "item", perCandidate: 13, minimum: 44, target: 66 });
  });

  it("counts reading and listening in stimuli of two items each", () => {
    const academia = getProfile("Academia");
    // READING maxItems 18 → 9 passages per candidate, exposure 0.20 → 45
    expect(capacityRequirement(academia, "READING")).toMatchObject({ unit: "stimulus", perCandidate: 9, minimum: 45 });
  });

  it("counts writing and speaking in tasks", () => {
    expect(capacityRequirement(getProfile("General English"), "WRITING")).toMatchObject({ unit: "task", perCandidate: 3, minimum: 10 });
  });
});

describe("countUnits", () => {
  it("groups items sharing a passage and counts keyless items singly", () => {
    const items = [item({ passageKey: "p1" }), item({ passageKey: "p1" }), item({ passageKey: "p2" }), item({ passageKey: null })];
    expect(countUnits(items, "stimulus")).toBe(3);
    expect(countUnits(items, "item")).toBe(4);
  });
});

describe("auditProfileCapacity", () => {
  it("applies the live eligibility filter (no pretest, no child items in adult exams)", () => {
    const ge = getProfile("General English");
    const bank = [
      item({ cefrLevel: "B1" }),
      item({ cefrLevel: "B1", isPretest: true }),
      item({ cefrLevel: "B1", tags: ["primary"] }),
      item({ cefrLevel: "B1", status: "PRETEST" }),
    ];
    const row = auditProfileCapacity(ge, bank).find((r) => r.skill === "GRAMMAR" && r.cefrLevel === "B1")!;
    expect(row.items).toBe(1);
    expect(row.status).toBe("BELOW_MINIMUM");
    expect(row.shortfall).toBe(row.target - 1);
  });

  it("covers every skill × level in the profile range", () => {
    const corporate = getProfile("Corporate"); // A2–C1, 6 skills
    expect(auditProfileCapacity(corporate, [])).toHaveLength(6 * 4);
  });

  it("reports the non-MC share for grammar and vocabulary only", () => {
    const ge = getProfile("General English");
    const bank = [
      ...Array.from({ length: 7 }, () => item({ skill: "VOCABULARY", cefrLevel: "B2" })),
      ...Array.from({ length: 3 }, () => item({ skill: "VOCABULARY", cefrLevel: "B2", type: "FILL_IN_BLANKS" })),
      item({ skill: "READING", cefrLevel: "B2", passageKey: "r1" }),
    ];
    const rows = auditProfileCapacity(ge, bank);
    const vocab = rows.find((r) => r.skill === "VOCABULARY" && r.cefrLevel === "B2")!;
    expect(vocab.nonMcShare).toBeCloseTo(0.3);
    expect(vocab.formatShort).toBe(false);
    expect(rows.find((r) => r.skill === "READING" && r.cefrLevel === "B2")!.nonMcShare).toBeUndefined();
  });

  it("marks a cell OK only at the target", () => {
    const ge = getProfile("General English");
    const { minimum, target } = capacityRequirement(ge, "GRAMMAR");
    const at = (n: number) => auditProfileCapacity(ge, Array.from({ length: n }, () => item({ cefrLevel: "C1" })))
      .find((r) => r.skill === "GRAMMAR" && r.cefrLevel === "C1")!.status;
    expect(at(minimum - 1)).toBe("BELOW_MINIMUM");
    expect(at(minimum)).toBe("BELOW_TARGET");
    expect(at(target)).toBe("OK");
  });
});

describe("summarizeCapacity", () => {
  it("adds shortfalls by unit", () => {
    const rows = auditProfileCapacity(getProfile("Academia"), []);
    const summary = summarizeCapacity(rows);
    expect(summary.belowMinimum).toBe(rows.length);
    expect(summary.shortfallByUnit.item).toBe(0);
    expect(summary.shortfallByUnit.stimulus).toBeGreaterThan(0);
    expect(summary.shortfallByUnit.task).toBeGreaterThan(0);
  });
});
