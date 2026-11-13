import { describe, it, expect } from "vitest";
import {
  waldLogThresholds,
  glrTwoPointStatistic,
  nearestThetaCut,
  evaluateSprtStop,
  cefrCutValues,
} from "../sequential-sprt";
import type { Item } from "../types";
import { SkillType } from "../types";

const sampleItem = (id: string, a = 1, b = 0, c = 0): Item => ({
  id,
  skill: SkillType.READING,
  params: { a, b, c },
});

describe("sequential-sprt", () => {
  it("waldLogThresholds matches common α, β=0.05", () => {
    const { logA, logB } = waldLogThresholds(0.05, 0.05);
    expect(logA).toBeCloseTo(Math.log(19), 5);
    expect(logB).toBeCloseTo(Math.log(1 / 19), 5);
  });

  it("cefrCutValues falls back to ordered defaults", () => {
    const d = cefrCutValues(undefined);
    expect(d).toEqual([-1.75, -0.5, 0.5, 1.5, 2.5]);
  });

  it("nearestThetaCut picks closest threshold", () => {
    const cuts = cefrCutValues({ A1: -2, A2: -1, B1: 0, B2: 1, C1: 2, C2: 3 });
    expect(nearestThetaCut(0.1, cuts)).toBe(0);
    expect(nearestThetaCut(2.4, cuts)).toBe(2);
  });

  it("glrTwoPointStatistic is 2|Δlog L| for 3PL", () => {
    const data = [
      { score: 1, params: { a: 1.2, b: 0, c: 0 } },
      { score: 1, params: { a: 1.2, b: 0, c: 0 } },
    ];
    const g = glrTwoPointStatistic(data, -0.2, 1.1);
    expect(g).toBeGreaterThan(0);
    expect(Number.isFinite(g)).toBe(true);
  });

  it("evaluateSprtStop does nothing when disabled", () => {
    const st = {
      theta: 0,
      sem: 0.3,
      responses: Array.from({ length: 8 }, (_, i) => ({
        itemId: `x${i}`,
        score: 1,
        isPretest: false,
      })),
    };
    const items: Record<string, Item> = Object.fromEntries(
      st.responses.map((r) => [r.itemId, sampleItem(r.itemId)])
    );
    expect(
      evaluateSprtStop(
        st,
        { enabled: false },
        [-1.75, 0, 1.5],
        items
      )
    ).toEqual({ stop: false, reason: null });
  });

  it("evaluateSprtStop requires min operational items and item map", () => {
    const st = { theta: 0, sem: 0.5, responses: [] as { itemId: string; score: number; isPretest?: boolean }[] };
    for (let i = 0; i < 5; i++) {
      st.responses.push({ itemId: `i${i}`, score: 1, isPretest: false });
    }
    const items = Object.fromEntries(
      st.responses.map((r) => [r.itemId, sampleItem(r.itemId)])
    );
    expect(
      evaluateSprtStop(
        st as { theta: number; sem: number; responses: { itemId: string; score: number; isPretest?: boolean }[] },
        { enabled: true, minItems: 8 },
        cefrCutValues(undefined),
        items
      ).stop
    ).toBe(false);
    expect(
      evaluateSprtStop(
        {
          ...st,
          responses: [
            ...st.responses,
            { itemId: "x6", score: 1, isPretest: false },
            { itemId: "x7", score: 1, isPretest: false },
            { itemId: "x8", score: 1, isPretest: false },
          ],
        },
        { enabled: true, minItems: 8 },
        cefrCutValues(undefined),
        undefined
      ).stop
    ).toBe(false);
  });

  describe("Wald boundaries (regression: 2026-11-14, every section stopped FAVOR_LOW at minItems)", () => {
    const cfg = { enabled: true, alpha: 0.05, beta: 0.05, halfWidth: 0.18, minItems: 5 };
    const cuts = [-1.75, -0.5, 0.5, 1.5, 2.5];
    const run = (scores: number[], theta = 0.5) => {
      const responses = scores.map((score, i) => ({ itemId: `w${i}`, score, isPretest: false }));
      const items = Object.fromEntries(responses.map((r) => [r.itemId, sampleItem(r.itemId, 1.2, 0.5, 0)]));
      return evaluateSprtStop({ theta, sem: 0.5, responses }, cfg, cuts, items);
    };

    it("does not stop while the evidence near the cut is mixed", () => {
      expect(run([1, 0, 1, 0, 1, 0])).toEqual({ stop: false, reason: null });
    });

    it("stops for the low hypothesis only once the log ratio reaches ln(β/(1−α))", () => {
      expect(run([0, 0, 0, 0, 0]).stop).toBe(false); // logR = −1.08 > −2.94
      expect(run(Array(14).fill(0))).toEqual({ stop: true, reason: "SPRT_FAVOR_LOW_THETA" });
    });

    it("stops for the high hypothesis symmetrically", () => {
      expect(run([1, 1, 1, 1, 1]).stop).toBe(false);
      expect(run(Array(14).fill(1))).toEqual({ stop: true, reason: "SPRT_FAVOR_HIGH_THETA" });
    });
  });
});
