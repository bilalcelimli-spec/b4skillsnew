import { describe, expect, it } from "vitest";
import { itemReviewHash } from "../src/lib/content-factory/item-review-snapshot";
import { buildRubricQueue, renderRubricQueueMarkdown } from "../src/lib/content-factory/rubric-review-queue";

const base = (id: string, over: Record<string, unknown> = {}): any => ({
  id, itemCode: id, version: 1, type: "OPEN_RESPONSE", skill: "WRITING", cefrLevel: "A2", status: "PRETEST", isPretest: true,
  pipelineStage: "AI_DRAFT", tags: [], content: { prompt: "Write an email to a friend about your weekend plans." }, metadata: {}, itemReviews: [], ...over,
});
const approve = (item: any) => {
  item.itemReviews = ["LANGUAGE_REVIEW", "CEFR_REVIEW", "FAIRNESS_REVIEW", "MODERATION"].map((reviewType, i) => ({
    id: `r${i}`, reviewType, reviewerId: `reviewer-${i % 2}`, verdict: "APPROVE", itemVersion: item.version,
    contentHash: itemReviewHash(item), createdAt: new Date(2026, 10, i + 1),
  }));
  return item;
};

describe("writing and speaking review queue", () => {
  it("lists the four missing reviews for an unreviewed parked item, without the stage it sits at", () => {
    const [row] = buildRubricQueue([base("w1")]);
    expect(row.readyToPromote).toBe(false);
    expect(row.contentBlockers).toEqual([]);
    expect(row.outstanding).toEqual(expect.arrayContaining(["LANGUAGE_REVIEW_APPROVAL_MISSING", "MODERATION_APPROVAL_MISSING", "INDEPENDENT_REVIEWERS_MISSING"]));
    expect(row.outstanding).not.toContain("STAGE_CHANGED");
  });

  it("marks an approved item at APPROVED_FOR_PILOT ready, and puts it first", () => {
    const rows = buildRubricQueue([base("w1"), approve(base("w2", { pipelineStage: "APPROVED_FOR_PILOT" }))]);
    expect(rows[0]).toMatchObject({ id: "w2", readyToPromote: true, outstanding: [] });
  });

  it("separates content blockers from missing reviews", () => {
    const [row] = buildRubricQueue([base("s1", { skill: "SPEAKING", content: { prompt: "" } })]);
    expect(row.contentBlockers).toContain("PROMPT_MISSING");
    expect(row.outstanding.some((r) => r === "PROMPT_MISSING")).toBe(false);
  });

  it("renders totals and orders levels from PRE_A1 to C2", () => {
    const md = renderRubricQueueMarkdown(buildRubricQueue([base("c", { cefrLevel: "C1" }), base("p", { cefrLevel: "PRE_A1" })]), new Date("2026-11-22T00:00:00Z"));
    expect(md).toContain("| 2 | 0 | 2 | 0 |");
    expect(md.indexOf("| WRITING PRE_A1 |")).toBeLessThan(md.indexOf("| WRITING C1 |"));
  });
});
