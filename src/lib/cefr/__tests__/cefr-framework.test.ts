import { describe, it, expect } from "vitest";
import {
  CEFR_LEVELS,
  CEFR_META,
  CEFR_THETA_THRESHOLDS,
  thetaToCefr,
  cefrToTheta,
  getCanDo,
  getRubric,
  nextCefrLevel,
  cefrDistance,
  thetaToPercent,
  cefrToIelts,
  cefrToToefl,
  buildCefrRubricPrompt,
  CEFR_DIFFICULTY_MAP,
} from "../cefr-framework.js";
import type { CefrLevel } from "../cefr-framework.js";

const ALL_LEVELS: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

// ─── CEFR_LEVELS ─────────────────────────────────────────────────────────────

describe("CEFR_LEVELS", () => {
  it("contains all 7 levels", () => {
    expect(CEFR_LEVELS).toHaveLength(7);
    const levels = CEFR_LEVELS.map((l) => l.level);
    for (const l of ALL_LEVELS) expect(levels).toContain(l);
  });

  it("each level has required fields", () => {
    for (const l of CEFR_LEVELS) {
      expect(typeof l.label).toBe("string");
      expect(typeof l.hex).toBe("string");
      expect(l.theta).toBeDefined();
    }
  });

  it("theta ranges are ordered (min < max)", () => {
    for (const l of CEFR_LEVELS) {
      expect(l.theta.min).toBeLessThanOrEqual(l.theta.max);
    }
  });
});

// ─── CEFR_META lookup ────────────────────────────────────────────────────────

describe("CEFR_META", () => {
  it("has entries for all 7 levels", () => {
    for (const l of ALL_LEVELS) {
      expect(CEFR_META[l]).toBeDefined();
    }
  });
});

// ─── thetaToCefr ─────────────────────────────────────────────────────────────

describe("thetaToCefr", () => {
  it("maps theta below -3.0 to PRE_A1", () => {
    expect(thetaToCefr(-4)).toBe("PRE_A1");
    expect(thetaToCefr(-3.1)).toBe("PRE_A1");
  });

  it("maps midpoints correctly", () => {
    expect(thetaToCefr(-2.5)).toBe("A1");
    expect(thetaToCefr(-1.1)).toBe("A2");
    expect(thetaToCefr(0)).toBe("B1");
    expect(thetaToCefr(1)).toBe("B2");
    expect(thetaToCefr(2)).toBe("C1");
    expect(thetaToCefr(3)).toBe("C2");
  });

  it("maps exactly at thresholds to next level", () => {
    expect(thetaToCefr(CEFR_THETA_THRESHOLDS.PRE_A1)).toBe("A1");
    expect(thetaToCefr(CEFR_THETA_THRESHOLDS.B1)).toBe("B2");
  });

  it("maps very high theta to C2", () => {
    expect(thetaToCefr(10)).toBe("C2");
  });

  it("covers all 7 levels across a full range", () => {
    const mapped = new Set([-4, -2.5, -1.1, 0, 1, 2, 3].map(thetaToCefr));
    expect(mapped.size).toBe(7);
  });
});

// ─── cefrToTheta ─────────────────────────────────────────────────────────────

describe("cefrToTheta", () => {
  it("returns a finite number for all levels", () => {
    for (const l of ALL_LEVELS) {
      const t = cefrToTheta(l);
      expect(Number.isFinite(t)).toBe(true);
    }
  });

  it("ordering is preserved: PRE_A1 < A1 < ... < C2", () => {
    const thetas = ALL_LEVELS.map(cefrToTheta);
    for (let i = 1; i < thetas.length; i++) {
      expect(thetas[i]).toBeGreaterThan(thetas[i - 1]);
    }
  });
});

// ─── getCanDo ─────────────────────────────────────────────────────────────────

describe("getCanDo", () => {
  it("returns descriptors for a valid level", () => {
    const result = getCanDo("B2");
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by domain when provided", () => {
    const reading = getCanDo("B1", "reading");
    expect(reading.every((d) => d.domain === "reading")).toBe(true);
  });

  it("returns empty array for PRE_A1 (no descriptors defined)", () => {
    const result = getCanDo("PRE_A1");
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── getRubric ────────────────────────────────────────────────────────────────

describe("getRubric", () => {
  it("returns a rubric for B1 writing", () => {
    const rubric = getRubric("B1", "writing");
    expect(rubric).toBeDefined();
    expect(rubric?.level).toBe("B1");
    expect(rubric?.domain).toBe("writing");
  });

  it("returns a rubric for C1 speaking", () => {
    const rubric = getRubric("C1", "speaking");
    expect(rubric).toBeDefined();
    expect(rubric?.fluency).toBeTruthy();
    expect(rubric?.pronunciation).toBeTruthy();
  });

  it("returns undefined for PRE_A1 (no rubric defined)", () => {
    const rubric = getRubric("PRE_A1", "writing");
    expect(rubric).toBeUndefined();
  });
});

// ─── nextCefrLevel ────────────────────────────────────────────────────────────

describe("nextCefrLevel", () => {
  it("returns A1 for PRE_A1", () => {
    expect(nextCefrLevel("PRE_A1")).toBe("A1");
  });

  it("returns undefined for C2", () => {
    expect(nextCefrLevel("C2")).toBeUndefined();
  });

  it("chains all levels correctly", () => {
    const chain: CefrLevel[] = ["PRE_A1"];
    let current: CefrLevel | undefined = "PRE_A1";
    while ((current = nextCefrLevel(current as CefrLevel))) {
      chain.push(current);
    }
    expect(chain).toEqual(ALL_LEVELS);
  });
});

// ─── cefrDistance ────────────────────────────────────────────────────────────

describe("cefrDistance", () => {
  it("returns 0 for same level", () => {
    expect(cefrDistance("B1", "B1")).toBe(0);
  });

  it("returns positive for forward direction", () => {
    expect(cefrDistance("A1", "C1")).toBe(4);
  });

  it("returns negative for backward direction", () => {
    expect(cefrDistance("C2", "A1")).toBe(-5);
  });

  it("returns 6 from PRE_A1 to C2", () => {
    expect(cefrDistance("PRE_A1", "C2")).toBe(6);
  });
});

// ─── thetaToPercent ──────────────────────────────────────────────────────────

describe("thetaToPercent", () => {
  it("returns 50 near theta = 0", () => {
    expect(thetaToPercent(0)).toBeCloseTo(50, 0);
  });

  it("is within [0, 100]", () => {
    for (const t of [-10, -3, -1, 0, 1, 3, 10]) {
      const pct = thetaToPercent(t);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it("is monotonically increasing", () => {
    const pcts = [-3, -1, 0, 1, 3].map(thetaToPercent);
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeGreaterThanOrEqual(pcts[i - 1]);
    }
  });
});

// ─── cefrToIelts / cefrToToefl ───────────────────────────────────────────────

describe("cefrToIelts", () => {
  it("returns N/A for PRE_A1", () => {
    expect(cefrToIelts("PRE_A1")).toBe("N/A");
  });

  it("returns a range string for B2", () => {
    const result = cefrToIelts("B2");
    expect(result).toContain("–");
  });
});

describe("cefrToToefl", () => {
  it("returns N/A for PRE_A1", () => {
    expect(cefrToToefl("PRE_A1")).toBe("N/A");
  });

  it("returns a range string for C1", () => {
    const result = cefrToToefl("C1");
    expect(result).toContain("–");
  });
});

// ─── buildCefrRubricPrompt ────────────────────────────────────────────────────

describe("buildCefrRubricPrompt", () => {
  it("returns a non-empty string for B1 writing", () => {
    const prompt = buildCefrRubricPrompt("B1", "writing");
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain("B1");
    expect(prompt).toContain("WRITING");
  });

  it("includes Can-Do descriptors", () => {
    const prompt = buildCefrRubricPrompt("A2", "writing");
    expect(prompt).toContain("Can-Do");
  });

  it("returns empty string for level with no rubric (PRE_A1)", () => {
    const prompt = buildCefrRubricPrompt("PRE_A1", "writing");
    expect(prompt).toBe("");
  });

  it("includes fluency for speaking rubrics", () => {
    const prompt = buildCefrRubricPrompt("C1", "speaking");
    expect(prompt).toContain("Fluency");
  });
});

// ─── CEFR_DIFFICULTY_MAP ──────────────────────────────────────────────────────

describe("CEFR_DIFFICULTY_MAP", () => {
  it("has entries for all levels", () => {
    for (const l of ALL_LEVELS) {
      expect(CEFR_DIFFICULTY_MAP[l]).toBeDefined();
    }
  });

  it("difficulties are ordered A1 < A2 < B1 < B2 < C1 < C2", () => {
    const ordered: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    for (let i = 1; i < ordered.length; i++) {
      expect(CEFR_DIFFICULTY_MAP[ordered[i]]).toBeGreaterThan(CEFR_DIFFICULTY_MAP[ordered[i - 1]]);
    }
  });
});
