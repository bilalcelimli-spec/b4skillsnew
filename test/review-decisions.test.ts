import { describe, it, expect } from "vitest";
import { planReviewDecisions } from "../src/lib/content-factory/review-decisions";

const draft = (id: string) => ({ id, status: "DRAFT", metadata: { keep: 1 } });
const allChecked = [true, true, true, true, true];
const AT = "2026-10-05T00:00:00.000Z";

describe("planReviewDecisions", () => {
  it("approves fully checked items without changing status", () => {
    const { updates, skipped } = planReviewDecisions([{ id: "a", decision: "Approve", checks: allChecked }], [draft("a")], AT);
    expect(skipped).toEqual([]);
    expect(updates[0]).toMatchObject({ id: "a", pipelineStage: "APPROVED_FOR_PILOT" });
    expect(updates[0].status).toBeUndefined();
    expect(updates[0].metadata).toMatchObject({ keep: 1, review: { decision: "Approve", at: AT } });
  });

  it("holds back approvals with unticked or missing checklist boxes", () => {
    const r = planReviewDecisions([{ id: "a", decision: "Approve", checks: [true, true, true, true, false] }, { id: "b", decision: "Approve" }], [draft("a"), draft("b")], AT);
    expect(r.updates).toEqual([]);
    expect(r.skipped.map((s) => s.reason)).toEqual(Array(2).fill("approval needs all checklist boxes ticked"));
  });

  it("sends revisions to editing and keeps the note", () => {
    const { updates } = planReviewDecisions([{ id: "a", decision: "Revise", notes: "tighten option C" }], [draft("a")], AT);
    expect(updates[0]).toMatchObject({ pipelineStage: "EDITING" });
    expect((updates[0].metadata.review as any).notes).toBe("tighten option C");
  });

  it("retires rejected items with the reason, and requires a note", () => {
    const ok = planReviewDecisions([{ id: "a", decision: "Reject", notes: "two keys" }], [draft("a")], AT).updates[0];
    expect(ok.status).toBe("RETIRED");
    expect((ok.metadata.statusChange as any).reason).toContain("two keys");
    expect(planReviewDecisions([{ id: "a", decision: "Reject" }], [draft("a")], AT).skipped[0].reason).toContain("note");
  });

  it("only touches existing DRAFT items with a real decision", () => {
    const items = [draft("a"), { id: "live", status: "ACTIVE", metadata: null }];
    const r = planReviewDecisions([{ id: "ghost", decision: "Reject", notes: "x" }, { id: "live", decision: "Reject", notes: "x" }, { id: "a", decision: "—" }], items, AT);
    expect(r.updates).toEqual([]);
    expect(r.skipped.map((s) => s.reason)).toEqual(["item not found", "status is ACTIVE, only DRAFT items are reviewed here", 'no decision ("—")']);
  });
});
