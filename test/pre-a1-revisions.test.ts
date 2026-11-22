import { describe, expect, it } from "vitest";
import { DECISIONS } from "../scripts/jobs/apply-pre-a1-age-review";
import { REVISIONS, revisionProblems } from "../scripts/jobs/apply-pre-a1-revisions";

describe("PRE_A1 revisions (2026-11-22)", () => {
  it("cover exactly the 13 items the age review sent to REVIEW", () => {
    const revised = DECISIONS.filter((d) => d.decision === "REVISE").map((d) => d.id).sort();
    expect(REVISIONS.map((r) => r.id).sort()).toEqual(revised);
    expect(REVISIONS.filter((r) => r.action === "RETIRE")).toHaveLength(1);
  });

  it("rewrite speaking prompts so they need no picture and pass the content checks", () => {
    for (const r of REVISIONS.filter((r) => r.action === "REWRITE" && r.content?.rubric)) {
      expect(r.drop).toContain("imageUrl");
      // The script merges the rewrite into the stored item, which keeps its timings.
      const merged = { prepTime: 20, responseTime: 45, timeLimitSeconds: 45, ...r.content };
      expect(revisionProblems("SPEAKING", "SPEAKING_PROMPT", merged), r.id).toEqual([]);
    }
  });

  it("give the reading item exactly one correct answer, matching correctAnswer", () => {
    const reading = REVISIONS.find((r) => r.id === "cmp4fe3hn0001o79bqbpnzhi0")!.content!;
    const options = reading.options as { id: string; isCorrect: boolean }[];
    expect(options.filter((o) => o.isCorrect).map((o) => o.id)).toEqual([reading.correctAnswer]);
    expect(revisionProblems("READING", "MULTIPLE_CHOICE", reading)).toEqual([]);
  });
});
