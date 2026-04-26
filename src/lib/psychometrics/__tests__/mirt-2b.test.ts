import { describe, it, expect } from "vitest";
import { itemTo2BParams, estimate2BTheta, select2BItem, probability2B } from "../mirt-2b";
import { SkillType, type Item } from "../../assessment-engine/types";

const makeItem = (overrides: Partial<Item> & { skill: Item["skill"] }): Item => ({
  id: "i1",
  params: { a: 1, b: 0, c: 0.2 },
  ...overrides,
});

describe("mirt-2b", () => {
  it("splits unidimensional a,b into receptive/productive heuristics", () => {
    const r = makeItem({ skill: SkillType.READING });
    const p = itemTo2BParams(r);
    expect(p.aR).toBeGreaterThan(p.aP);
    const w = makeItem({ skill: SkillType.WRITING });
    const p2 = itemTo2BParams(w);
    expect(p2.aP).toBeGreaterThan(p2.aR);
    expect(p.d).toBeCloseTo(-1 * 0, 5);
  });

  it("uses explicit aReceptive / aProductive when present", () => {
    const it = makeItem({
      skill: SkillType.GRAMMAR,
      params: { a: 1, b: 0.5, c: 0, aReceptive: 0.4, aProductive: 0.6 },
    });
    const p = itemTo2BParams(it);
    expect(p.aR).toBe(0.4);
    expect(p.aP).toBe(0.6);
    expect(p.d).toBeCloseTo(-0.5 * 0.5 * 1, 5);
  });

  it("estimate2BTheta returns prior when empty", () => {
    const e = estimate2BTheta([], 0, 1);
    expect(e.thetaR).toBe(0);
    expect(e.thetaP).toBe(0);
  });

  it("select2BItem picks an unused operational item", () => {
    const pool: Item[] = [
      makeItem({ id: "a", skill: SkillType.READING }),
      makeItem({ id: "b", skill: SkillType.LISTENING }),
    ];
    const prof = { thetaR: 0, thetaP: 0, semR: 0.5, semP: 0.5 };
    const s = select2BItem(pool, prof, new Set());
    expect(s).not.toBeNull();
    expect(s?.id).toMatch(/a|b/);
  });

  it("probability2B is between c and 1", () => {
    const it = makeItem({ skill: SkillType.READING });
    const p = itemTo2BParams(it);
    const pr = probability2B(0, 0, p);
    expect(pr).toBeGreaterThanOrEqual(p.c);
    expect(pr).toBeLessThanOrEqual(1);
  });
});
