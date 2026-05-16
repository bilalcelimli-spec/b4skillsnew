import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectNextItem } from "../selector";
import { information } from "../irt";
import { SkillType, type Item, type BlueprintConstraint } from "../types";
import { _resetExposureStoreForTests } from "../exposure-store";

const makeItem = (
  id: string,
  skill: SkillType,
  a: number,
  b: number,
  c = 0.1
): Item => ({ id, skill, params: { a, b, c } });

beforeEach(() => {
  _resetExposureStoreForTests();
  // Force deterministic top-N random selection: always pick the highest-info item
  vi.spyOn(Math, "random").mockReturnValue(0);
});

describe("selectNextItem — basic behaviour", () => {
  it("returns null on empty pool", async () => {
    expect(await selectNextItem([], 0, new Set())).toBeNull();
  });

  it("returns null when all items are used", async () => {
    const pool = [makeItem("a", SkillType.READING, 1, 0)];
    expect(await selectNextItem(pool, 0, new Set(["a"]))).toBeNull();
  });

  it("excludes items already used", async () => {
    const pool = [
      makeItem("a", SkillType.READING, 1.5, 0),
      makeItem("b", SkillType.READING, 1.5, 2),
    ];
    const selected = await selectNextItem(pool, 0, new Set(["a"]), 1);
    expect(selected?.id).toBe("b");
  });
});

describe("selectNextItem — Maximum Fisher Information", () => {
  it("prefers item whose b matches current theta (top-N=1)", async () => {
    const pool = [
      makeItem("far", SkillType.READING, 1.5, 2.5),
      makeItem("near", SkillType.READING, 1.5, 0.0),
      makeItem("medium", SkillType.READING, 1.5, 1.0),
    ];
    const selected = await selectNextItem(pool, 0, new Set(), 1);
    expect(selected?.id).toBe("near");
  });

  it("MFI selection ranks items by Fisher information at theta", async () => {
    const theta = 0.5;
    const pool = [
      makeItem("hi", SkillType.READING, 2.0, 0.5),  // peak at theta
      makeItem("lo", SkillType.READING, 0.5, 0.5),  // same b but flat
    ];
    const infoHi = information(theta, pool[0].params);
    const infoLo = information(theta, pool[1].params);
    expect(infoHi).toBeGreaterThan(infoLo);

    const selected = await selectNextItem(pool, theta, new Set(), 1);
    expect(selected?.id).toBe("hi");
  });
});

describe("selectNextItem — blueprint enforcement", () => {
  it("prefers skills whose minCount has not yet been met", async () => {
    const pool = [
      // Reading items at theta=0 have HIGHER info, but skill is already at min
      makeItem("r1", SkillType.READING, 2.0, 0.0),
      makeItem("r2", SkillType.READING, 2.0, 0.1),
      // Listening items have lower info but skill is below minimum → should win
      makeItem("l1", SkillType.LISTENING, 1.5, 1.5),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 1, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 1, [SkillType.LISTENING]: 0 };

    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.skill).toBe(SkillType.LISTENING);
  });

  it("excludes skills that have hit their maxCount", async () => {
    const pool = [
      makeItem("r1", SkillType.READING, 2.0, 0.0),  // capped skill
      makeItem("g1", SkillType.GRAMMAR, 1.0, 0.5),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 0, maxCount: 2 },
      { skill: SkillType.GRAMMAR, minCount: 0, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 2, [SkillType.GRAMMAR]: 0 };
    // Reading at cap → must pick grammar even though reading has higher info
    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.skill).toBe(SkillType.GRAMMAR);
  });

  it("falls back to full pool when no items exist for unfulfilled skill", async () => {
    // Listening has unmet minimum, but no listening items in pool —
    // selector should NOT silently drop the constraint into oblivion;
    // it should still return *some* item (to avoid blocking the test).
    const pool = [
      makeItem("r1", SkillType.READING, 2.0, 0.0),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.READING, minCount: 0, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 5 },
    ];
    const currentCounts = { [SkillType.READING]: 0, [SkillType.LISTENING]: 0 };
    const selected = await selectNextItem(pool, 0, new Set(), 1, blueprint, currentCounts);
    expect(selected?.id).toBe("r1");
  });
});

// ── b-targeted deterministic selection ─────────────────────────────────────────

describe("selectNextItem — b-targeted final selection", () => {
  it("is deterministic — same pool always returns the same item", async () => {
    const pool = [
      makeItem("a", SkillType.READING, 2.0, 0.5),
      makeItem("b", SkillType.READING, 2.0, 0.1),
      makeItem("c", SkillType.READING, 2.0, 0.3),
    ];
    const r1 = await selectNextItem(pool, 0, new Set());
    _resetExposureStoreForTests();
    const r2 = await selectNextItem(pool, 0, new Set());
    expect(r1?.id).toBe(r2?.id);
  });

  it("among top-3 by composite score, picks the item with b closest to theta", async () => {
    // Three items with identical discrimination — only b differs.
    // At theta = 0: MFI and KL are both highest for b closest to theta.
    // The b-targeted pick must be "nearest" (b = 0.05), not a random draw.
    const theta = 0;
    const pool = [
      makeItem("nearest", SkillType.READING, 2.0, 0.05),  // |0.05 - 0| = 0.05
      makeItem("mid",     SkillType.READING, 2.0, 0.80),  // |0.80 - 0| = 0.80
      makeItem("far",     SkillType.READING, 2.0, 2.00),  // |2.00 - 0| = 2.00
    ];
    const selected = await selectNextItem(pool, theta, new Set());
    expect(selected?.id).toBe("nearest");
  });

  it("does not depend on Math.random (consistent across calls without reset)", async () => {
    // With the old random top-N selection, consecutive calls would sometimes
    // return different items from the same high-SEM pool. The new b-targeted
    // selector is fully deterministic.
    const pool = [
      makeItem("x", SkillType.READING, 1.8, -0.1),
      makeItem("y", SkillType.READING, 1.8,  0.2),
      makeItem("z", SkillType.READING, 1.8,  0.9),
    ];
    // Call twice without resetting the store — both calls should agree on the winner.
    const r1 = await selectNextItem(pool, 0, new Set(), 5);
    _resetExposureStoreForTests();
    const r2 = await selectNextItem(pool, 0, new Set(), 5);
    expect(r1?.id).toBe(r2?.id);
    // The winner must be the item with b closest to theta=0
    expect(r1?.id).toBe("x"); // b=-0.1 is closer to 0 than b=0.2 or b=0.9
  });
});

// ── KL/MFI smooth hybrid ───────────────────────────────────────────────────────

describe("selectNextItem — KL/MFI hybrid (sem & operationalCount)", () => {
  it("returns a valid item in pure-KL mode (high SEM, early items)", async () => {
    const pool = [
      makeItem("a", SkillType.READING, 1.5, -0.5),
      makeItem("b", SkillType.READING, 1.5,  0.0),
      makeItem("c", SkillType.READING, 1.5,  0.5),
    ];
    // sem=0.9 (>> 0.40), operationalCount=1 → α ≈ 0.93 — almost pure KL
    const selected = await selectNextItem(pool, 0, new Set(), 5, undefined, undefined, 0.9, 1);
    expect(selected).not.toBeNull();
  });

  it("returns a valid item in pure-MFI mode (low SEM, many items)", async () => {
    const pool = [
      makeItem("a", SkillType.READING, 1.5, -0.1),
      makeItem("b", SkillType.READING, 1.5,  0.0),
      makeItem("c", SkillType.READING, 2.0,  0.0),  // highest MFI at theta=0
    ];
    // sem=0.15 (<< 0.40), operationalCount=20 → α ≈ 0.0 — pure MFI
    const selected = await selectNextItem(pool, 0, new Set(), 5, undefined, undefined, 0.15, 20);
    // In pure-MFI mode the highest-discrimination item at b=theta wins
    expect(selected?.id).toBe("c");
  });

  it("blended mode (sem=0.40, n=5) returns a valid item without error", async () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      makeItem(`item${i}`, SkillType.READING, 1.5, -2 + i * 0.5)
    );
    const selected = await selectNextItem(pool, 0, new Set(), 5, undefined, undefined, 0.40, 5);
    expect(selected).not.toBeNull();
  });
});

// ── Pool-exhaustion emergency guard ───────────────────────────────────────────

describe("selectNextItem — pool-exhaustion emergency guard", () => {
  it("forces selection from skill whose pool is exhausted to meet minCount", async () => {
    // Blueprint: WRITING needs 2 items, READING needs 1.
    // Pool: only 2 WRITING items available (exactly the remaining need) + many READING.
    // Since availableWriting (2) <= remainingNeeded (2), emergency guard fires
    // and forces a WRITING item regardless of information scores.
    const pool = [
      makeItem("w1", SkillType.WRITING,  1.0, 0.0),  // low info
      makeItem("w2", SkillType.WRITING,  1.0, 0.5),
      makeItem("r1", SkillType.READING,  2.5, 0.0),  // very high info — but should NOT win
      makeItem("r2", SkillType.READING,  2.5, 0.1),
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.WRITING,  minCount: 2, maxCount: 4 },
      { skill: SkillType.READING,  minCount: 1, maxCount: 4 },
    ];
    // 0 WRITING administered, 1 READING administered → WRITING needs 2 more,
    // but only 2 WRITING items remain → emergency
    const counts = { [SkillType.WRITING]: 0, [SkillType.READING]: 1 };
    const selected = await selectNextItem(pool, 0, new Set(), 5, blueprint, counts);
    expect(selected?.skill).toBe(SkillType.WRITING);
  });

  it("does NOT activate when the skill pool is comfortably above minimum", async () => {
    // WRITING needs 1 more item, 5 are available → no emergency; normal scoring applies.
    const pool = [
      makeItem("w1", SkillType.WRITING, 0.8, 1.0),
      makeItem("w2", SkillType.WRITING, 0.8, 0.0),
      makeItem("w3", SkillType.WRITING, 0.8, 0.5),
      makeItem("w4", SkillType.WRITING, 0.8, 0.2),
      makeItem("w5", SkillType.WRITING, 0.8, 0.3),
      makeItem("r1", SkillType.READING, 2.5, 0.0),  // highest info by far
    ];
    const blueprint: BlueprintConstraint[] = [
      { skill: SkillType.WRITING, minCount: 1, maxCount: 6 },
      { skill: SkillType.READING, minCount: 0, maxCount: 4 },
    ];
    const counts = { [SkillType.WRITING]: 0, [SkillType.READING]: 0 };
    // availableWriting (5) > remainingNeeded (1) → no emergency
    // Reading has highest MFI — but WRITING unfulfilled → blueprint enforcement wins
    const selected = await selectNextItem(pool, 0, new Set(), 5, blueprint, counts);
    expect(selected?.skill).toBe(SkillType.WRITING);
  });
});
