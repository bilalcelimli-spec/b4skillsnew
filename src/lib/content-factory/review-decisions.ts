/**
 * Turns expert review decisions (exported from the review packet) into item
 * updates. Pure so the rules can be tested.
 *
 *  Approve → pipelineStage APPROVED_FOR_PILOT, status stays DRAFT (listening items still need audio)
 *  Revise  → pipelineStage EDITING, status stays DRAFT
 *  Reject  → status RETIRED
 * An approval needs every checklist box ticked; otherwise it is held back.
 */

export type Decision = "Approve" | "Revise" | "Reject";

export interface ReviewRecord {
  id: string;
  decision: string;
  notes?: string;
  checks?: boolean[];
}

export interface ItemSnapshot {
  id: string;
  status: string;
  metadata: Record<string, unknown> | null;
}

export interface PlannedUpdate {
  id: string;
  status?: "RETIRED";
  pipelineStage?: "APPROVED_FOR_PILOT" | "EDITING";
  metadata: Record<string, unknown>;
}

export interface ReviewPlan {
  updates: PlannedUpdate[];
  skipped: Array<{ id: string; reason: string }>;
}

export const CHECKLIST_LENGTH = 5;

export function planReviewDecisions(records: ReviewRecord[], items: ItemSnapshot[], at = new Date().toISOString()): ReviewPlan {
  const byId = new Map(items.map((i) => [i.id, i]));
  const updates: PlannedUpdate[] = [];
  const skipped: ReviewPlan["skipped"] = [];

  for (const r of records) {
    const item = byId.get(r.id);
    if (!item) { skipped.push({ id: r.id, reason: "item not found" }); continue; }
    if (item.status !== "DRAFT") { skipped.push({ id: r.id, reason: `status is ${item.status}, only DRAFT items are reviewed here` }); continue; }
    if (!["Approve", "Revise", "Reject"].includes(r.decision)) { skipped.push({ id: r.id, reason: `no decision ("${r.decision}")` }); continue; }

    const checks = r.checks ?? [];
    if (r.decision === "Approve" && !(checks.length === CHECKLIST_LENGTH && checks.every(Boolean))) {
      skipped.push({ id: r.id, reason: "approval needs all checklist boxes ticked" });
      continue;
    }
    if (r.decision === "Reject" && !String(r.notes ?? "").trim()) {
      skipped.push({ id: r.id, reason: "rejection needs a note explaining why" });
      continue;
    }

    const review = { decision: r.decision, notes: r.notes ?? "", checks, at };
    const metadata: Record<string, unknown> = { ...(item.metadata ?? {}), review };
    const update: PlannedUpdate = { id: r.id, metadata };
    if (r.decision === "Approve") update.pipelineStage = "APPROVED_FOR_PILOT";
    if (r.decision === "Revise") update.pipelineStage = "EDITING";
    if (r.decision === "Reject") {
      update.status = "RETIRED";
      metadata.statusChange = { from: "DRAFT", to: "RETIRED", reason: `Expert review rejected: ${r.notes}`, at };
    }
    updates.push(update);
  }
  return { updates, skipped };
}
