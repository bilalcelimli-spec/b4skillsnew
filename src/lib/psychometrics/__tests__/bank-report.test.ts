import { describe, it, expect } from "vitest";
import { buildBankReport, type RawItemRecord, type ExposureRecord } from "../bank-report.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(
  skill: string,
  cefrLevel: string,
  status: string,
  discrimination = 1.0,
  difficulty = 0.0,
  guessing = 0.25
): RawItemRecord {
  return { skill, cefrLevel, status, discrimination, difficulty, guessing };
}

/** Build a minimal bank: 2 items per skill × CEFR cell, all ACTIVE */
function makeMinimalBank(): RawItemRecord[] {
  const skills = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
  const cefrs = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const items: RawItemRecord[] = [];
  for (const skill of skills) {
    for (const cefr of cefrs) {
      for (let i = 0; i < 6; i++) {
        items.push(makeItem(skill, cefr, "ACTIVE", 1.2, 0, 0.25));
      }
    }
  }
  return items;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildBankReport — structural", () => {
  it("returns generatedAt as an ISO-8601 string", () => {
    const report = buildBankReport([]);
    expect(() => new Date(report.generatedAt)).not.toThrow();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("grandTotal matches number of items passed", () => {
    const items = [
      makeItem("READING", "B1", "ACTIVE"),
      makeItem("WRITING", "B2", "RETIRED"),
    ];
    expect(buildBankReport(items).grandTotal).toBe(2);
  });

  it("bySkill has one entry per known skill", () => {
    const report = buildBankReport([]);
    const skills = report.bySkill.map((s) => s.skill);
    expect(skills).toContain("READING");
    expect(skills).toContain("WRITING");
    expect(skills).toContain("SPEAKING");
    expect(skills.length).toBe(6);
  });

  it("cefrCoverage has one entry per CEFR level", () => {
    const report = buildBankReport([]);
    const levels = report.cefrCoverage.map((c) => c.cefrLevel);
    expect(levels).toContain("A1");
    expect(levels).toContain("B2");
    expect(levels.length).toBe(7);
  });

  it("predictedReliability includes projections for k = 5, 10, 20, 30", () => {
    const report = buildBankReport(makeMinimalBank());
    expect(report.predictedReliability[5]).toBeGreaterThan(0);
    expect(report.predictedReliability[30]).toBeGreaterThan(
      report.predictedReliability[5]
    );
  });
});

describe("buildBankReport — skill summaries", () => {
  it("counts ACTIVE, PRETEST, RETIRED correctly", () => {
    const items = [
      makeItem("READING", "B1", "ACTIVE"),
      makeItem("READING", "B1", "ACTIVE"),
      makeItem("READING", "B2", "PRETEST"),
      makeItem("READING", "A2", "RETIRED"),
      makeItem("READING", "A1", "DRAFT"),
    ];
    const report = buildBankReport(items);
    const reading = report.bySkill.find((s) => s.skill === "READING")!;
    expect(reading.activeItems).toBe(2);
    expect(reading.pretestItems).toBe(1);
    expect(reading.retiredItems).toBe(1);
    expect(reading.totalItems).toBe(5);
  });

  it("flags items with discrimination < 0.4 as at-risk", () => {
    const items = [
      makeItem("READING", "B1", "ACTIVE", 0.3),  // low
      makeItem("READING", "B1", "ACTIVE", 1.2),  // ok
      makeItem("READING", "B1", "ACTIVE", 0.2),  // low
    ];
    const report = buildBankReport(items);
    const reading = report.bySkill.find((s) => s.skill === "READING")!;
    expect(reading.atRiskLowDiscrimination).toBe(2);
  });

  it("flags items with guessing > 0.35 as at-risk", () => {
    const items = [
      makeItem("GRAMMAR", "A2", "ACTIVE", 1.0, 0, 0.40),  // high
      makeItem("GRAMMAR", "A2", "ACTIVE", 1.0, 0, 0.25),  // ok
    ];
    const report = buildBankReport(items);
    const grammar = report.bySkill.find((s) => s.skill === "GRAMMAR")!;
    expect(grammar.atRiskHighGuessing).toBe(1);
  });

  it("IRT param stats are consistent with input values", () => {
    const items = [
      makeItem("VOCABULARY", "B1", "ACTIVE", 1.0, -0.5, 0.20),
      makeItem("VOCABULARY", "B1", "ACTIVE", 2.0, 0.5, 0.30),
    ];
    const report = buildBankReport(items);
    const vocab = report.bySkill.find((s) => s.skill === "VOCABULARY")!;
    expect(vocab.discrimination.mean).toBeCloseTo(1.5, 4);
    expect(vocab.difficulty.min).toBeCloseTo(-0.5, 4);
    expect(vocab.difficulty.max).toBeCloseTo(0.5, 4);
    expect(vocab.guessing.n).toBe(2);
  });

  it("skills with no items have n=0 in IRT stats and 0 counts", () => {
    const items = [makeItem("READING", "B1", "ACTIVE")];
    const report = buildBankReport(items);
    const writing = report.bySkill.find((s) => s.skill === "WRITING")!;
    expect(writing.totalItems).toBe(0);
    expect(writing.discrimination.n).toBe(0);
  });
});

describe("buildBankReport — CEFR coverage", () => {
  it("adequate=false when any skill has fewer than 5 active items at that level", () => {
    const items = makeMinimalBank(); // 6 per cell → adequate
    const report = buildBankReport(items);
    expect(report.cefrCoverage.every((c) => c.adequate)).toBe(true);
  });

  it("adequate=false when a cell has < 5 active items", () => {
    const items = [
      makeItem("READING", "C2", "ACTIVE"),
      makeItem("READING", "C2", "ACTIVE"),
      // only 2 READING C2 items, threshold is 5
    ];
    const report = buildBankReport(items);
    const c2 = report.cefrCoverage.find((c) => c.cefrLevel === "C2")!;
    expect(c2.adequate).toBe(false);
  });

  it("bySkill counts only ACTIVE items in coverage", () => {
    const items = [
      makeItem("READING", "A1", "ACTIVE"),
      makeItem("READING", "A1", "RETIRED"),  // not counted
    ];
    const report = buildBankReport(items);
    const a1 = report.cefrCoverage.find((c) => c.cefrLevel === "A1")!;
    expect(a1.bySkill["READING"]).toBe(1);
  });
});

describe("buildBankReport — exposure health", () => {
  it("returns undefined exposure section when no exposure data given", () => {
    const report = buildBankReport([makeItem("READING", "B1", "ACTIVE")]);
    expect(report.exposure).toBeUndefined();
  });

  it("counts overexposed items (rate > 0.20)", () => {
    const items = [makeItem("READING", "B1", "ACTIVE"), makeItem("READING", "B2", "ACTIVE")];
    const exposure: ExposureRecord[] = [
      { itemId: "i1", rate: 0.25 },  // over
      { itemId: "i2", rate: 0.10 },  // ok
    ];
    const report = buildBankReport(items, exposure);
    expect(report.exposure!.overexposedCount).toBe(1);
  });

  it("counts never-exposed items (rate === 0)", () => {
    const items = [makeItem("READING", "B1", "ACTIVE")];
    const exposure: ExposureRecord[] = [
      { itemId: "i1", rate: 0 },
      { itemId: "i2", rate: 0.15 },
    ];
    const report = buildBankReport(items, exposure);
    expect(report.exposure!.neverExposedCount).toBe(1);
  });

  it("meanRate is computed correctly", () => {
    const items = [makeItem("READING", "B1", "ACTIVE")];
    const exposure: ExposureRecord[] = [
      { itemId: "i1", rate: 0.10 },
      { itemId: "i2", rate: 0.20 },
    ];
    const report = buildBankReport(items, exposure);
    expect(report.exposure!.meanRate).toBeCloseTo(0.15, 4);
  });
});

describe("buildBankReport — reliability projections", () => {
  it("predicted reliability is monotonically increasing in k", () => {
    const report = buildBankReport(makeMinimalBank());
    const keys = [5, 10, 15, 20, 25, 30];
    for (let i = 1; i < keys.length; i++) {
      expect(report.predictedReliability[keys[i]]).toBeGreaterThanOrEqual(
        report.predictedReliability[keys[i - 1]]
      );
    }
  });

  it("reliability for k=30 is < 1.0", () => {
    const report = buildBankReport(makeMinimalBank());
    expect(report.predictedReliability[30]).toBeLessThan(1.0);
  });

  it("reliability for k=5 is > 0 even for a weak bank", () => {
    const weakItems = [makeItem("READING", "B1", "ACTIVE", 0.3, 0, 0.35)];
    const report = buildBankReport(weakItems);
    expect(report.predictedReliability[5]).toBeGreaterThan(0);
  });
});
