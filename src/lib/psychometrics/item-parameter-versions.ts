/**
 * Item parameter versions (Faz 2).
 *
 * Calibration jobs never touch `Item.discrimination/difficulty/guessing`
 * directly any more. They record a DRAFT `ItemParameterVersion`; publishing a
 * draft (admin API, or the calibration job with `--publish-eligible --yes`)
 * supersedes the previous PUBLISHED version, copies a/b/c into the Item cache,
 * tags `metadata.paramSource = "calibrated"` and — for PRETEST items that pass
 * the policy gate — promotes the item to ACTIVE.
 *
 * Drift (item-parameter-drift.ts) is evaluated between the draft and the
 * currently published version at creation time, so a Class-C change is visible
 * before anyone publishes it.
 */

import type { PrismaClient } from "@prisma/client";
import { computeItemDrift, type IrtSnapshot } from "./item-parameter-drift.js";
import { evaluatePublishGate, type GateDecision, type PublishCandidate } from "./calibration-policy.js";

/** Subset of PrismaClient the service needs (keeps tests free of a database). */
export type VersionClient = Pick<PrismaClient, "itemParameterVersion" | "item" | "$transaction">;

export interface DraftVersionInput {
  itemId: string;
  a: number;
  b: number;
  c: number;
  aSe?: number | null;
  bSe?: number | null;
  cSe?: number | null;
  n: number;
  method: "STOCKING_EM" | "RASCH_MMLE" | "GRM_PML" | "PRIOR" | "SEED" | "MANUAL";
  /** GRM category thresholds for writing/speaking tasks (b = their mean, c = 0). */
  thresholds?: number[] | null;
  infit?: number | null;
  outfit?: number | null;
  pointBiserial?: number | null;
  /** |b − last stable estimate| when known. */
  deltaB?: number | null;
  iqScore?: number | null;
  sourceRunId?: string | null;
  createdBy?: string | null;
  notes?: string | null;
}

export interface DraftVersionResult {
  id: string;
  version: number;
  gate: GateDecision;
  driftClass: string | null;
}

/** The currently published version for an item, or null (seed / prior parameters in use). */
export async function publishedVersion(db: VersionClient, itemId: string) {
  return db.itemParameterVersion.findFirst({ where: { itemId, status: "PUBLISHED" } });
}

/**
 * Record a draft estimate. Evaluates drift against the published version and
 * the publish gate, storing both so operators can review drafts in bulk.
 */
export async function createDraftVersion(db: VersionClient, input: DraftVersionInput): Promise<DraftVersionResult> {
  const [latest, published] = await Promise.all([
    db.itemParameterVersion.findFirst({ where: { itemId: input.itemId }, orderBy: { version: "desc" }, select: { version: true } }),
    publishedVersion(db, input.itemId),
  ]);
  let driftClass: string | null = null;
  if (published) {
    const prev: IrtSnapshot = { itemId: input.itemId, window: "previous", a: published.a, b: published.b, c: published.c, calibratedAt: published.publishedAt?.toISOString() ?? published.createdAt.toISOString() };
    const curr: IrtSnapshot = { itemId: input.itemId, window: "current", a: input.a, b: input.b, c: input.c, calibratedAt: new Date().toISOString() };
    driftClass = computeItemDrift(prev, curr).driftClass;
  }
  const candidate: PublishCandidate = {
    n: input.n, a: input.a, b: input.b, c: input.c, bSe: input.bSe, infit: input.infit, outfit: input.outfit,
    pointBiserial: input.pointBiserial, iqScore: input.iqScore, deltaB: input.deltaB, driftClass,
  };
  const gate = evaluatePublishGate(candidate);
  const row = await db.itemParameterVersion.create({
    data: {
      itemId: input.itemId,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      a: input.a, b: input.b, c: input.c,
      aSe: input.aSe ?? null, bSe: input.bSe ?? null, cSe: input.cSe ?? null,
      n: input.n,
      method: input.method,
      infit: input.infit ?? null, outfit: input.outfit ?? null, pointBiserial: input.pointBiserial ?? null,
      deltaB: input.deltaB ?? null,
      thresholds: input.thresholds ?? [],
      driftClass,
      gateReasons: gate.reasons,
      sourceRunId: input.sourceRunId ?? null,
      createdBy: input.createdBy ?? null,
      notes: input.notes ?? null,
    },
    select: { id: true, version: true },
  });
  return { id: row.id, version: row.version, gate, driftClass };
}

export interface PublishOptions {
  publishedBy: string;
  /** Publish even when the stored gate reasons are non-empty (operator decision, recorded in notes). */
  force?: boolean;
  /** Promote a PRETEST item to ACTIVE when the gate passes (default true). */
  promotePretest?: boolean;
  notes?: string | null;
}

export interface PublishResult {
  versionId: string;
  itemId: string;
  supersededId: string | null;
  promotedToActive: boolean;
  forced: boolean;
}

/**
 * Publish a draft: supersede the previous published version, copy parameters
 * into the Item cache and tag the item as calibrated. Refuses drafts that
 * failed the gate unless `force` is set.
 */
export async function publishVersion(db: VersionClient, versionId: string, options: PublishOptions): Promise<PublishResult> {
  return db.$transaction(async (tx) => {
    const draft = await tx.itemParameterVersion.findUnique({ where: { id: versionId } });
    if (!draft) throw new Error(`Parameter version ${versionId} not found`);
    if (draft.status !== "DRAFT") throw new Error(`Parameter version ${versionId} is ${draft.status}, not DRAFT`);
    const forced = draft.gateReasons.length > 0;
    if (forced && !options.force) {
      throw new Error(`Parameter version ${versionId} failed the publish gate: ${draft.gateReasons.join(", ")}`);
    }
    const item = await tx.item.findUnique({ where: { id: draft.itemId }, select: { id: true, status: true, metadata: true } });
    if (!item) throw new Error(`Item ${draft.itemId} not found`);
    const previous = await tx.itemParameterVersion.findFirst({ where: { itemId: draft.itemId, status: "PUBLISHED" } });
    const now = new Date();
    if (previous) {
      await tx.itemParameterVersion.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
    }
    await tx.itemParameterVersion.update({
      where: { id: draft.id },
      data: {
        status: "PUBLISHED",
        publishedAt: now,
        publishedBy: options.publishedBy,
        supersedesId: previous?.id ?? null,
        notes: [draft.notes, options.notes, forced ? `FORCED despite: ${draft.gateReasons.join(", ")}` : null].filter(Boolean).join(" | ") || null,
      },
    });
    const promote = (options.promotePretest ?? true) && item.status === "PRETEST" && !forced;
    const metadata = { ...((item.metadata as Record<string, unknown> | null) ?? {}) };
    metadata.paramSource = "calibrated";
    metadata.calibratedAt = now.toISOString();
    metadata.parameterVersionId = draft.id;
    // GRM thresholds: the estimator prefers Item.metadata.grm over the synthetic fallback.
    if (draft.thresholds.length > 0) {
      metadata.grm = { a: draft.a, b: draft.thresholds, categories: draft.thresholds.length + 1 };
    }
    if (promote) {
      metadata.statusChange = { from: "PRETEST", to: "ACTIVE", reason: "PARAMETER_VERSION_PUBLISHED", at: now.toISOString(), source: options.publishedBy };
    }
    await tx.item.update({
      where: { id: draft.itemId },
      data: {
        discrimination: draft.a,
        difficulty: draft.b,
        guessing: draft.c,
        ...(promote ? { status: "ACTIVE", isPretest: false } : {}),
        metadata: metadata as object,
      },
    });
    return { versionId: draft.id, itemId: draft.itemId, supersededId: previous?.id ?? null, promotedToActive: promote, forced };
  });
}

export async function rejectVersion(db: VersionClient, versionId: string, rejectedBy: string, notes?: string): Promise<void> {
  const draft = await db.itemParameterVersion.findUnique({ where: { id: versionId }, select: { status: true, notes: true } });
  if (!draft) throw new Error(`Parameter version ${versionId} not found`);
  if (draft.status !== "DRAFT") throw new Error(`Parameter version ${versionId} is ${draft.status}, not DRAFT`);
  await db.itemParameterVersion.update({
    where: { id: versionId },
    data: { status: "REJECTED", notes: [draft.notes, `REJECTED by ${rejectedBy}`, notes].filter(Boolean).join(" | ") },
  });
}

export interface CalibratedShare {
  activeItems: number;
  /** ACTIVE items whose live parameters come from a PUBLISHED empirical version. */
  publishedCalibrated: number;
  /** ACTIVE items tagged metadata.paramSource = "calibrated" without a published version (legacy). */
  legacyCalibrated: number;
  draftsPending: number;
  draftsEligible: number;
}

/** Coverage summary for verify:irt and the admin console. */
export async function calibratedShare(db: VersionClient): Promise<CalibratedShare> {
  const active = await db.item.findMany({ where: { status: "ACTIVE" }, select: { id: true, metadata: true } });
  const published = await db.itemParameterVersion.findMany({
    where: { status: "PUBLISHED", method: { in: ["STOCKING_EM", "RASCH_MMLE"] } },
    select: { itemId: true },
  });
  const publishedIds = new Set(published.map((row) => row.itemId));
  const drafts = await db.itemParameterVersion.findMany({ where: { status: "DRAFT" }, select: { gateReasons: true } });
  return {
    activeItems: active.length,
    publishedCalibrated: active.filter((item) => publishedIds.has(item.id)).length,
    legacyCalibrated: active.filter((item) => !publishedIds.has(item.id) && (item.metadata as any)?.paramSource === "calibrated").length,
    draftsPending: drafts.length,
    draftsEligible: drafts.filter((draft) => draft.gateReasons.length === 0).length,
  };
}
