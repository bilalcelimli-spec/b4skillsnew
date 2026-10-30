/**
 * Version service tests on an in-memory stand-in for the Prisma client.
 * Covers the state machine (DRAFT → PUBLISHED → SUPERSEDED / REJECTED), the
 * Item cache refresh, PRETEST promotion and the gate / force rules.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { calibratedShare, createDraftVersion, publishVersion, rejectVersion, type VersionClient } from "../item-parameter-versions";

type Row = Record<string, any>;

function fakeClient(items: Row[]) {
  const versions: Row[] = [];
  let seq = 0;
  const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => {
    if (key === "gateReasons" && value && typeof value === "object" && "isEmpty" in value) return (row.gateReasons.length === 0) === value.isEmpty;
    if (value && typeof value === "object" && "in" in value) return (value.in as unknown[]).includes(row[key]);
    return row[key] === value;
  });
  const sortBy = (rows: Row[], orderBy?: Row) => {
    if (!orderBy) return rows;
    const [[key, dir]] = Object.entries(orderBy);
    return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : -1) * (dir === "desc" ? -1 : 1));
  };
  const pick = (row: Row, select?: Row) => (select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : { ...row });
  const versionModel = {
    findFirst: async ({ where, orderBy, select }: Row) => { const r = sortBy(versions.filter((v) => matches(v, where)), orderBy)[0]; return r ? pick(r, select) : null; },
    findUnique: async ({ where, select }: Row) => { const r = versions.find((v) => v.id === where.id); return r ? pick(r, select) : null; },
    findMany: async ({ where, select }: Row = {}) => versions.filter((v) => matches(v, where)).map((v) => pick(v, select)),
    create: async ({ data, select }: Row) => { const row = { id: `v${++seq}`, createdAt: new Date(), publishedAt: null, notes: null, thresholds: [], ...data }; versions.push(row); return pick(row, select); },
    update: async ({ where, data }: Row) => { const row = versions.find((v) => v.id === where.id)!; Object.assign(row, data); return { ...row }; },
  };
  const itemModel = {
    findUnique: async ({ where, select }: Row) => { const r = items.find((i) => i.id === where.id); return r ? pick(r, select) : null; },
    findMany: async ({ where, select }: Row = {}) => items.filter((i) => matches(i, where)).map((i) => pick(i, select)),
    update: async ({ where, data }: Row) => { const row = items.find((i) => i.id === where.id)!; Object.assign(row, data); return { ...row }; },
  };
  const client = {
    itemParameterVersion: versionModel,
    item: itemModel,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  } as unknown as VersionClient;
  return { client, versions, items };
}

const draftInput = (itemId: string, over: Row = {}) => ({
  itemId, a: 1.3, b: 0.4, c: 0.15, bSe: 0.2, n: 260, method: "STOCKING_EM" as const, iqScore: 80, deltaB: 0.05, ...over,
});

describe("item parameter versions", () => {
  let db: ReturnType<typeof fakeClient>;
  beforeEach(() => {
    db = fakeClient([
      { id: "pre", status: "PRETEST", isPretest: true, discrimination: 1, difficulty: 0, guessing: 0.2, metadata: { paramSource: "prior" } },
      { id: "act", status: "ACTIVE", isPretest: false, discrimination: 1, difficulty: 0, guessing: 0.2, metadata: {} },
    ]);
  });

  it("numbers drafts per item and stores the gate verdict", async () => {
    const first = await createDraftVersion(db.client, draftInput("pre"));
    const second = await createDraftVersion(db.client, draftInput("pre", { n: 90 }));
    expect(first).toMatchObject({ version: 1, gate: { eligible: true, reasons: [] }, driftClass: null });
    expect(second).toMatchObject({ version: 2, gate: { eligible: false, reasons: ["N_BELOW_200"] } });
    expect(db.items[0]).toMatchObject({ discrimination: 1, difficulty: 0, status: "PRETEST" }); // untouched
  });

  it("publishing refreshes the Item cache, promotes PRETEST and supersedes the previous version", async () => {
    const v1 = await createDraftVersion(db.client, draftInput("pre"));
    const result = await publishVersion(db.client, v1.id, { publishedBy: "tester" });
    expect(result).toMatchObject({ promotedToActive: true, supersededId: null, forced: false });
    expect(db.items[0]).toMatchObject({ discrimination: 1.3, difficulty: 0.4, guessing: 0.15, status: "ACTIVE", isPretest: false });
    expect(db.items[0].metadata).toMatchObject({ paramSource: "calibrated", parameterVersionId: v1.id, statusChange: { from: "PRETEST", to: "ACTIVE" } });

    const v2 = await createDraftVersion(db.client, draftInput("pre", { b: 0.55 }));
    expect(v2.driftClass).toMatch(/^[ABC]$/); // drift measured against the published version
    const second = await publishVersion(db.client, v2.id, { publishedBy: "tester" });
    expect(second.supersededId).toBe(v1.id);
    expect(db.versions.find((v) => v.id === v1.id)?.status).toBe("SUPERSEDED");
    expect(db.versions.find((v) => v.id === v2.id)?.status).toBe("PUBLISHED");
  });

  it("refuses to publish a draft that failed the gate unless forced, and never promotes a forced draft", async () => {
    const weak = await createDraftVersion(db.client, draftInput("pre", { n: 50 }));
    await expect(publishVersion(db.client, weak.id, { publishedBy: "tester" })).rejects.toThrow(/N_BELOW_200/);
    const forced = await publishVersion(db.client, weak.id, { publishedBy: "tester", force: true });
    expect(forced).toMatchObject({ forced: true, promotedToActive: false });
    expect(db.items[0].status).toBe("PRETEST");
    expect(db.versions.find((v) => v.id === weak.id)?.notes).toMatch(/FORCED despite: N_BELOW_200/);
  });

  it("rejects only drafts and keeps a note", async () => {
    const v = await createDraftVersion(db.client, draftInput("act"));
    await rejectVersion(db.client, v.id, "reviewer", "content changed");
    expect(db.versions[0]).toMatchObject({ status: "REJECTED" });
    expect(db.versions[0].notes).toMatch(/REJECTED by reviewer/);
    await expect(rejectVersion(db.client, v.id, "reviewer")).rejects.toThrow(/not DRAFT/);
    await expect(publishVersion(db.client, v.id, { publishedBy: "x" })).rejects.toThrow(/not DRAFT/);
  });

  it("publishing a GRM draft copies the thresholds to Item.metadata.grm", async () => {
    const v = await createDraftVersion(db.client, draftInput("act", { method: "GRM_PML", thresholds: [-1.5, -0.5, 0.4, 1.6], c: 0 }));
    await publishVersion(db.client, v.id, { publishedBy: "tester" });
    expect(db.items[1].metadata.grm).toEqual({ a: 1.3, b: [-1.5, -0.5, 0.4, 1.6], categories: 5 });
    expect(db.items[1].discrimination).toBe(1.3);
    expect(db.versions[0].thresholds).toEqual([-1.5, -0.5, 0.4, 1.6]);
  });

  it("reports coverage from published empirical versions only", async () => {
    const v = await createDraftVersion(db.client, draftInput("act"));
    await createDraftVersion(db.client, draftInput("pre", { n: 10 }));
    let share = await calibratedShare(db.client);
    expect(share).toMatchObject({ activeItems: 1, publishedCalibrated: 0, draftsPending: 2, draftsEligible: 1 });
    await publishVersion(db.client, v.id, { publishedBy: "tester" });
    share = await calibratedShare(db.client);
    expect(share).toMatchObject({ activeItems: 1, publishedCalibrated: 1, legacyCalibrated: 0, draftsPending: 1 });
  });
});
