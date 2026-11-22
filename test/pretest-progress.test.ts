import { describe, expect, it } from "vitest";
import { buildPretestProgress, groupProgress, renderProgressMarkdown, servingProfiles, type PretestItem } from "../src/lib/calibration/pretest-progress";

const T = { estimateMinN: 80, publishMinN: 200, windowDays: 30 };
const item = (over: Partial<PretestItem> = {}): PretestItem => ({
  id: "i1", itemCode: "GRA-B1-0001", skill: "GRAMMAR", cefrLevel: "B1", status: "PRETEST", isPretest: true,
  discrimination: 1, guessing: 0.2, tags: [], content: {}, ageSuitability: "UNIVERSAL", ...over,
});

describe("pretest progress", () => {
  it("uses the live delivery rule to find the product lines that can serve an item", () => {
    expect(servingProfiles(item()).length).toBeGreaterThan(0);
    // Seed parameters outside the delivery rule mean no route.
    expect(servingProfiles(item({ discrimination: 0 }))).toEqual([]);
    expect(servingProfiles(item({ status: "DRAFT", isPretest: false }))).toEqual([]);
  });

  it("assigns stages against the thresholds and projects days at the recent rate", () => {
    const rows = buildPretestProgress(
      [item({ id: "a" }), item({ id: "b" }), item({ id: "c" }), item({ id: "d", discrimination: 0 }), item({ id: "e" })],
      new Map([["a", { total: 20, recent: 30 }], ["b", { total: 120, recent: 0 }], ["c", { total: 250, recent: 10 }], ["d", { total: 0, recent: 0 }]]),
      T,
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.a).toMatchObject({ stage: "COLLECTING", daysToEstimate: 60, daysToPublish: 180 });
    expect(byId.b).toMatchObject({ stage: "ESTIMABLE", daysToEstimate: 0, daysToPublish: null });
    expect(byId.c).toMatchObject({ stage: "PUBLISH_N_REACHED", daysToPublish: 0 });
    expect(byId.d).toMatchObject({ stage: "NO_ROUTE", profiles: [], daysToEstimate: null });
    expect(byId.d.noRouteReason).toMatch(/seed parameters/);
    expect(byId.a.noRouteReason).toBeUndefined();
    expect(byId.e).toMatchObject({ stage: "COLLECTING", n: 0, daysToEstimate: null });
  });

  it("groups by skill and level in CEFR order with a median", () => {
    const rows = buildPretestProgress(
      [item({ id: "x", cefrLevel: "B1" }), item({ id: "y", cefrLevel: "PRE_A1", discrimination: 0 }), item({ id: "z", cefrLevel: "B1" })],
      new Map([["x", { total: 10, recent: 1 }], ["z", { total: 30, recent: 2 }]]),
      T,
    );
    const groups = groupProgress(rows);
    expect(groups.map((g) => g.key)).toEqual(["GRAMMAR PRE_A1", "GRAMMAR B1"]);
    expect(groups[1]).toMatchObject({ items: 2, collecting: 2, medianN: 20, recent: 3 });
    expect(groups[0]).toMatchObject({ noRoute: 1 });
  });

  it("renders a report that lists items without a route", () => {
    const rows = buildPretestProgress([item({ id: "d", itemCode: "GRA-X", discrimination: 0 })], new Map(), T);
    const md = renderProgressMarkdown(rows, T, { "General English": 4 }, new Date("2026-11-22T00:00:00Z"));
    expect(md).toContain("# Pretest calibration progress");
    expect(md).toContain("| 1 | 1 | 0 | 0 | 0 |");
    expect(md).toContain("- GRA-X (GRAMMAR B1)");
    expect(md).toContain("| seed parameters (needs a > 0 and 0 ≤ c < 1) | GRAMMAR B1 | 1 |");
    expect(md).toContain("| General English | 4 |");
  });
});
