import { describe, expect, it } from "vitest";
import { DECISIONS } from "../scripts/jobs/apply-pre-a1-age-review";

describe("PRE_A1 age review decisions (2026-11-22)", () => {
  it("covers 66 distinct items: 53 approved for Primary, 13 sent to review", () => {
    const ids = DECISIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(66);
    expect(DECISIONS.filter((d) => d.decision === "APPROVE")).toHaveLength(53);
    expect(DECISIONS.filter((d) => d.decision === "REVISE")).toHaveLength(13);
  });

  it("gives every revision a reason and every wording fix a real change", () => {
    for (const d of DECISIONS) {
      if (d.decision === "REVISE") expect(d.reason.length).toBeGreaterThan(10);
      if (d.decision === "APPROVE" && d.fix) expect(d.fix.to).not.toBe(d.fix.from);
    }
  });
});
