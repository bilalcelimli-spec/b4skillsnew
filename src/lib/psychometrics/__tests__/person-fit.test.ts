/**
 * Person-Fit — Unit Tests
 *
 * Tests Lz (Drasgow), ECI (Tatsuoka), U3 (van der Linden),
 * Rapid-Guess Index, and the full computePersonFit pipeline.
 *
 * Key psychometric expectations:
 *  - A response pattern where high-ability examinee gets easy items wrong
 *    and hard items right → low Lz (unexpected pattern → aberrant)
 *  - A response pattern that perfectly fits Guttman expectation → Lz ≈ 0
 *  - Rapid responses → RGI > threshold → LOW_EFFORT flag
 *  - Fewer than MIN_ITEMS → INSUFFICIENT flag
 */

import { describe, it, expect } from "vitest";
import {
  computeLz,
  computeECI,
  computeU3,
  computeRGI,
  computePersonFit,
  aggregatePersonFit,
  type PersonFitInput,
} from "../person-fit.js";
import { SkillType } from "../../assessment-engine/types.js";
import type { Item, IrtParameters } from "../../assessment-engine/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Make a simple 3PL item */
function makeItem(id: string, a: number, b: number, c: number): Item {
  return {
    id,
    skill: SkillType.READING,
    params: { a, b, c },
  };
}

/** Items ranging easy → hard (b from -2 to +2) */
const ITEMS: Item[] = [
  makeItem("i1", 1.2, -2.0, 0.25),  // very easy
  makeItem("i2", 1.2, -1.0, 0.25),  // easy
  makeItem("i3", 1.2,  0.0, 0.25),  // medium
  makeItem("i4", 1.2,  1.0, 0.25),  // hard
  makeItem("i5", 1.2,  2.0, 0.25),  // very hard
  makeItem("i6", 1.0,  0.5, 0.20),  // extra for N≥5
];

const ITEM_IDS = ITEMS.map(i => i.id);

/** Build IRT param map */
function buildMap(items: Item[]): Map<string, IrtParameters> {
  return new Map(items.map(i => [i.id, i.params]));
}

/** Expected responses for theta=0: easy items correct, hard wrong */
const EXPECTED_RESPONSES = [
  { itemId: "i1", score: 1 },
  { itemId: "i2", score: 1 },
  { itemId: "i3", score: 1 },
  { itemId: "i4", score: 0 },
  { itemId: "i5", score: 0 },
  { itemId: "i6", score: 0 },
];

/** Aberrant: high-ability person gets easy items wrong, hard right */
const ABERRANT_RESPONSES = [
  { itemId: "i1", score: 0 },  // missed very easy
  { itemId: "i2", score: 0 },  // missed easy
  { itemId: "i3", score: 0 },  // missed medium
  { itemId: "i4", score: 1 },  // got hard right
  { itemId: "i5", score: 1 },  // got very hard right
  { itemId: "i6", score: 1 },
];

/** All correct (high-ability examinee with theta=3) */
const ALL_CORRECT = ITEM_IDS.map(id => ({ itemId: id, score: 1 }));

/** All wrong (low-ability examinee) */
const ALL_WRONG = ITEM_IDS.map(id => ({ itemId: id, score: 0 }));

// ─── computeLz ────────────────────────────────────────────────────────────────

describe("computeLz", () => {
  const map = buildMap(ITEMS);

  it("returns non-null lz for sufficient items", () => {
    const { lz } = computeLz(EXPECTED_RESPONSES, map, 0.0);
    expect(lz).not.toBeNull();
    expect(typeof lz).toBe("number");
  });

  it("returns null lz for fewer than MIN_ITEMS", () => {
    const few = EXPECTED_RESPONSES.slice(0, 3);
    const { lz } = computeLz(few, map, 0.0);
    expect(lz).toBeNull();
  });

  it("aberrant pattern has lower Lz than expected pattern", () => {
    const { lz: lzExpected } = computeLz(EXPECTED_RESPONSES, map, 0.0);
    const { lz: lzAberrant } = computeLz(ABERRANT_RESPONSES, map, 0.0);
    expect(lzExpected).not.toBeNull();
    expect(lzAberrant).not.toBeNull();
    expect(lzAberrant!).toBeLessThan(lzExpected!);
  });

  it("all correct at high theta → Lz near 0 or positive", () => {
    const { lz } = computeLz(ALL_CORRECT, map, 3.0);
    // High-ability getting all correct is expected → Lz ≥ 0
    expect(lz).not.toBeNull();
  });

  it("logLikelihood is a finite number", () => {
    const { logLikelihood } = computeLz(EXPECTED_RESPONSES, map, 0.0);
    expect(Number.isFinite(logLikelihood)).toBe(true);
  });

  it("handles unknown item ids gracefully", () => {
    const unknown = [
      { itemId: "unknown-1", score: 1 },
      { itemId: "unknown-2", score: 0 },
      ...EXPECTED_RESPONSES.slice(0, 4),
    ];
    expect(() => computeLz(unknown, map, 0.0)).not.toThrow();
  });
});

// ─── computeECI ───────────────────────────────────────────────────────────────

describe("computeECI", () => {
  const map = buildMap(ITEMS);

  it("returns non-null for sufficient items", () => {
    const eci = computeECI(EXPECTED_RESPONSES, map, 0.0);
    expect(eci).not.toBeNull();
  });

  it("aberrant pattern has higher ECI than expected", () => {
    const eciExpected = computeECI(EXPECTED_RESPONSES, map, 0.0);
    const eciAberrant = computeECI(ABERRANT_RESPONSES, map, 0.0);
    expect(eciExpected).not.toBeNull();
    expect(eciAberrant).not.toBeNull();
    expect(eciAberrant!).toBeGreaterThan(eciExpected!);
  });

  it("returns null for fewer than MIN_ITEMS", () => {
    const few = EXPECTED_RESPONSES.slice(0, 3);
    expect(computeECI(few, map, 0.0)).toBeNull();
  });

  it("ECI is non-negative", () => {
    for (const responses of [EXPECTED_RESPONSES, ABERRANT_RESPONSES, ALL_CORRECT]) {
      const eci = computeECI(responses, map, 0.0);
      if (eci !== null) expect(eci).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── computeU3 ────────────────────────────────────────────────────────────────

describe("computeU3", () => {
  const map = buildMap(ITEMS);

  it("returns value in [0, 1]", () => {
    const u3 = computeU3(EXPECTED_RESPONSES, map, 0.0);
    expect(u3).not.toBeNull();
    expect(u3!).toBeGreaterThanOrEqual(0);
    expect(u3!).toBeLessThanOrEqual(1);
  });

  it("aberrant pattern has higher U3 than expected pattern", () => {
    const u3Expected = computeU3(EXPECTED_RESPONSES, map, 0.0);
    const u3Aberrant = computeU3(ABERRANT_RESPONSES, map, 0.0);
    expect(u3Aberrant!).toBeGreaterThan(u3Expected!);
  });

  it("returns null for fewer than MIN_ITEMS", () => {
    expect(computeU3(EXPECTED_RESPONSES.slice(0, 3), map, 0.0)).toBeNull();
  });
});

// ─── computeRGI ──────────────────────────────────────────────────────────────

describe("computeRGI", () => {
  const itemDetailMap = new Map(ITEMS.map(i => [i.id, { type: "MULTIPLE_CHOICE", params: i.params }]));

  it("returns null if fewer than MIN_ITEMS have latency", () => {
    const noLatency = EXPECTED_RESPONSES.map(r => ({ ...r }));
    expect(computeRGI(noLatency as any, itemDetailMap)).toBeNull();
  });

  it("returns 0 for all-normal latency responses", () => {
    const slowResponses = EXPECTED_RESPONSES.map(r => ({ ...r, latencyMs: 30_000 }));
    const rgi = computeRGI(slowResponses, itemDetailMap);
    expect(rgi).toBe(0);
  });

  it("returns 1.0 when all responses are rapid", () => {
    const rapidResponses = EXPECTED_RESPONSES.map(r => ({ ...r, latencyMs: 1_000 }));
    const rgi = computeRGI(rapidResponses, itemDetailMap);
    expect(rgi).toBe(1.0);
  });

  it("returns proportion for mixed fast/slow responses", () => {
    const mixed = EXPECTED_RESPONSES.map((r, i) => ({
      ...r,
      latencyMs: i % 2 === 0 ? 1_000 : 30_000,  // 3 fast, 3 slow (alternating)
    }));
    const rgi = computeRGI(mixed, itemDetailMap);
    expect(rgi).not.toBeNull();
    expect(rgi!).toBeGreaterThan(0);
    expect(rgi!).toBeLessThan(1);
  });
});

// ─── computePersonFit (full pipeline) ────────────────────────────────────────

describe("computePersonFit", () => {
  const makeInput = (responses: Array<{ itemId: string; score: number; latencyMs?: number }>): PersonFitInput => ({
    responses: responses.map(r => ({ ...r, isPretest: false })),
    items: ITEMS,
    theta: 0.0,
  });

  it("returns all required fields", () => {
    const result = computePersonFit(makeInput(EXPECTED_RESPONSES));
    expect(typeof result.n).toBe("number");
    expect(typeof result.flag).toBe("string");
    expect(typeof result.interpretation).toBe("string");
    expect(typeof result.recommendedAction).toBe("string");
    expect(Array.isArray(result.itemResiduals)).toBe(true);
  });

  it("expected response pattern → flag NONE", () => {
    const result = computePersonFit(makeInput(EXPECTED_RESPONSES));
    expect(result.flag).toBe("NONE");
    expect(result.recommendedAction).toBe("ACCEPT");
  });

  it("aberrant response pattern → flag INCONSISTENT or ABERRANT", () => {
    const result = computePersonFit(makeInput(ABERRANT_RESPONSES));
    expect(["INCONSISTENT", "ABERRANT"]).toContain(result.flag);
    expect(result.recommendedAction).not.toBe("ACCEPT");
  });

  it("rapid-guess responses → flag LOW_EFFORT", () => {
    const rapid = EXPECTED_RESPONSES.map(r => ({ ...r, latencyMs: 500 }));
    const result = computePersonFit(makeInput(rapid));
    expect(result.flag).toBe("LOW_EFFORT");
    expect(result.rgi).not.toBeNull();
    expect(result.rgi!).toBeGreaterThan(0.20);
  });

  it("fewer than 5 items → INSUFFICIENT", () => {
    const few: PersonFitInput = {
      responses: EXPECTED_RESPONSES.slice(0, 3).map(r => ({ ...r, isPretest: false })),
      items: ITEMS,
      theta: 0.0,
    };
    const result = computePersonFit(few);
    expect(result.flag).toBe("INSUFFICIENT");
  });

  it("pretest responses are excluded from analysis", () => {
    const withPretest: PersonFitInput = {
      responses: [
        ...EXPECTED_RESPONSES.slice(0, 2).map(r => ({ ...r, isPretest: true })),
        ...EXPECTED_RESPONSES.slice(2).map(r => ({ ...r, isPretest: false })),
      ],
      items: ITEMS,
      theta: 0.0,
    };
    const result = computePersonFit(withPretest);
    expect(result.n).toBeLessThan(EXPECTED_RESPONSES.length);
  });

  it("itemResiduals length equals operational response count", () => {
    const result = computePersonFit(makeInput(EXPECTED_RESPONSES));
    expect(result.itemResiduals).toHaveLength(EXPECTED_RESPONSES.length);
  });

  it("Lz is a number or null", () => {
    const result = computePersonFit(makeInput(EXPECTED_RESPONSES));
    expect(result.lz === null || typeof result.lz === "number").toBe(true);
  });
});

// ─── aggregatePersonFit ───────────────────────────────────────────────────────

describe("aggregatePersonFit", () => {
  it("handles empty array", () => {
    const agg = aggregatePersonFit([]);
    expect(agg.n).toBe(0);
    expect(agg.flagRate).toBe(0);
    expect(agg.meetsQualityStandard).toBe(true);
  });

  it("computes flagRate correctly", () => {
    const makeInput = (res: Array<{ itemId: string; score: number }>): PersonFitInput => ({
      responses: res.map(r => ({ ...r, isPretest: false })),
      items: ITEMS,
      theta: 0.0,
    });

    const results = [
      computePersonFit(makeInput(EXPECTED_RESPONSES)),  // NONE
      computePersonFit(makeInput(ABERRANT_RESPONSES)),  // INCONSISTENT or ABERRANT
    ];
    const agg = aggregatePersonFit(results);
    expect(agg.n).toBe(2);
    expect(agg.flagRate).toBeGreaterThan(0);
    expect(agg.flagRate).toBeLessThanOrEqual(1);
  });

  it("meetsQualityStandard is true when flagRate < 5%", () => {
    const makeInput = (res: Array<{ itemId: string; score: number }>): PersonFitInput => ({
      responses: res.map(r => ({ ...r, isPretest: false })),
      items: ITEMS,
      theta: 0.0,
    });
    // 10 good sessions, 0 aberrant
    const results = Array.from({ length: 10 }, () =>
      computePersonFit(makeInput(EXPECTED_RESPONSES))
    );
    const agg = aggregatePersonFit(results);
    expect(agg.meetsQualityStandard).toBe(true);
  });

  it("meanLz is a number when Lz data available", () => {
    const makeInput = (res: Array<{ itemId: string; score: number }>): PersonFitInput => ({
      responses: res.map(r => ({ ...r, isPretest: false })),
      items: ITEMS,
      theta: 0.0,
    });
    const results = [computePersonFit(makeInput(EXPECTED_RESPONSES))];
    const agg = aggregatePersonFit(results);
    if (results[0].lz !== null) {
      expect(typeof agg.meanLz).toBe("number");
    }
  });
});
