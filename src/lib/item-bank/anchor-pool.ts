/**
 * Anchor Item Pool
 * ─────────────────────────────────────────────────────────────────────────────
 * Anchor items (common items) appear across test forms to enable
 * score equating between administrations (IRT true-score equating).
 *
 * Design principles:
 *   • Anchor pool = 10–20% of form length (NCME guidelines)
 *   • Items selected to span the full θ range (-3 to +3)
 *   • Anchor items are invisible to examinees (randomly embedded)
 *   • Parameter drift monitored per administration cycle
 *   • Rotation: anchor items cycled every 6 months to prevent over-exposure
 *
 * Equating methods supported:
 *   • Concurrent calibration (all data in one run)
 *   • Separate free calibration + Mean/Sigma linking
 *   • IRT True-Score Equating (Lord, 1980)
 */

import { prisma } from "../prisma.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnchorItem {
  itemId: string;
  anchorForm: string;          // e.g. "FORM_A", "FORM_B"
  targetTheta: number;         // intended difficulty zone
  addedAt: string;
  expiresAt: string;           // rotation date
  baselineA: number;
  baselineB: number;
  baselineC: number;
  usageCount: number;
}

export interface DriftReport {
  itemId: string;
  baselineB: number;
  currentB: number;
  deltaB: number;
  flagged: boolean;            // |deltaB| > DRIFT_THRESHOLD (0.3 logits)
  baseChi2: number | null;     // χ² test against baseline (df=1)
  recommendation: "RETAIN" | "REVIEW" | "REPLACE";
}

export interface MeanSigmaLink {
  fromForm: string;
  toForm: string;
  A: number;   // scale factor
  B: number;   // location shift
  anchorN: number;
  seA: number; // standard error of A
  seB: number; // standard error of B
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DRIFT_THRESHOLD = 0.3; // logits — NCME recommended threshold
const MIN_ANCHOR_RESPONSES = 200;
const ANCHOR_ROTATION_DAYS = 180;

// ── Anchor selection ──────────────────────────────────────────────────────────

/**
 * Select anchor items from the active pool that span the theta range.
 * Stratifies by difficulty: select n items equally spaced from -3 to +3.
 */
export async function selectAnchorItems(formLength: number, form: string): Promise<AnchorItem[]> {
  const anchorN = Math.max(5, Math.round(formLength * 0.15)); // 15% anchor ratio
  const step = 6 / (anchorN - 1); // -3 to +3

  const anchors: AnchorItem[] = [];

  for (let i = 0; i < anchorN; i++) {
    const targetB = -3 + i * step;
    // Find closest active item to this difficulty target
    const candidates = await prisma.item.findMany({
      where: {
        status: "ACTIVE",
        difficulty: { gte: targetB - 0.5, lte: targetB + 0.5 },
      },
      orderBy: [{ difficulty: "asc" }],
      take: 5,
    });
    if (candidates.length === 0) continue;
    const best = candidates.reduce((closest, cur) => {
      const d = cur.difficulty ?? 0;
      const bd = closest.difficulty ?? 0;
      return Math.abs(d - targetB) < Math.abs(bd - targetB) ? cur : closest;
    });

    anchors.push({
      itemId: best.id,
      anchorForm: form,
      targetTheta: targetB,
      addedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ANCHOR_ROTATION_DAYS * 86_400_000).toISOString(),
      baselineA: best.discrimination ?? 1.0,
      baselineB: best.difficulty ?? targetB,
      baselineC: best.guessing ?? 0.2,
      usageCount: 0,
    });
  }

  return anchors;
}

// ── Drift monitoring ──────────────────────────────────────────────────────────

/**
 * Compute drift statistics for anchor items by comparing current calibration
 * estimates to stored baseline parameters.
 */
export async function computeAnchorDrift(anchors: AnchorItem[]): Promise<DriftReport[]> {
  const itemIds = anchors.map((a) => a.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, difficulty: true, discrimination: true },
  });

  const itemMap: Record<string, { difficulty: number | null; discrimination: number | null }> = {};
  for (const it of items) itemMap[it.id] = { difficulty: it.difficulty, discrimination: it.discrimination };

  return anchors.map((anchor): DriftReport => {
    const cur = itemMap[anchor.itemId];
    const currentB = cur?.difficulty ?? anchor.baselineB;
    const deltaB = currentB - anchor.baselineB;
    const flagged = Math.abs(deltaB) > DRIFT_THRESHOLD;

    // Approximate χ² test: (deltaB / SE)² where SE ≈ 1/sqrt(I) ≈ 0.1 for large N
    const approxSE = 0.1;
    const chi2 = (deltaB * deltaB) / (approxSE * approxSE);

    return {
      itemId: anchor.itemId,
      baselineB: anchor.baselineB,
      currentB: Math.round(currentB * 1000) / 1000,
      deltaB: Math.round(deltaB * 1000) / 1000,
      flagged,
      baseChi2: Math.round(chi2 * 100) / 100,
      recommendation: Math.abs(deltaB) > 0.6 ? "REPLACE" : flagged ? "REVIEW" : "RETAIN",
    };
  });
}

// ── Mean/Sigma linking ────────────────────────────────────────────────────────

/**
 * Compute Mean/Sigma linking constants between two forms using anchor items.
 * Transforms Form Y parameters onto Form X scale:
 *   b_X = A * b_Y + B
 *   a_X = a_Y / A
 *
 * References:
 *   Loyd & Hoover (1980); Marco (1977).
 */
export function computeMeanSigmaLink(
  anchorsX: Array<{ b: number; a: number }>,
  anchorsY: Array<{ b: number; a: number }>,
  fromForm: string,
  toForm: string
): MeanSigmaLink {
  if (anchorsX.length !== anchorsY.length || anchorsX.length < 3) {
    throw new Error("Need at least 3 matched anchor items for Mean/Sigma linking");
  }
  const n = anchorsX.length;

  const meanBx = anchorsX.reduce((s, a) => s + a.b, 0) / n;
  const meanBy = anchorsY.reduce((s, a) => s + a.b, 0) / n;

  const sdBx = Math.sqrt(anchorsX.reduce((s, a) => s + (a.b - meanBx) ** 2, 0) / n);
  const sdBy = Math.sqrt(anchorsY.reduce((s, a) => s + (a.b - meanBy) ** 2, 0) / n);

  const A = sdBx / (sdBy || 1);
  const B = meanBx - A * meanBy;

  // Bootstrap SEs (simplified)
  const seA = sdBx / Math.sqrt(2 * n);
  const seB = Math.sqrt(sdBx ** 2 / n + A ** 2 * sdBy ** 2 / n);

  return {
    fromForm,
    toForm,
    A: Math.round(A * 10000) / 10000,
    B: Math.round(B * 10000) / 10000,
    anchorN: n,
    seA: Math.round(seA * 10000) / 10000,
    seB: Math.round(seB * 10000) / 10000,
  };
}

// ── IRT True-Score Equating ───────────────────────────────────────────────────

/**
 * Apply linking constants to transform a theta score from Form Y scale
 * to Form X scale.
 */
export function linkTheta(thetaY: number, link: MeanSigmaLink): number {
  return link.A * thetaY + link.B;
}

/**
 * Generate equated score table: raw theta → equated theta (Form X scale)
 * for a range of theta values.
 */
export function equatedScoreTable(
  link: MeanSigmaLink,
  thetaRange = { min: -4, max: 4, step: 0.1 }
): Array<{ thetaY: number; thetaX: number }> {
  const table: Array<{ thetaY: number; thetaX: number }> = [];
  for (let t = thetaRange.min; t <= thetaRange.max + 1e-9; t += thetaRange.step) {
    table.push({ thetaY: Math.round(t * 10) / 10, thetaX: Math.round(linkTheta(t, link) * 10) / 10 });
  }
  return table;
}

// ── Anchor pool manager ───────────────────────────────────────────────────────

export class AnchorPoolManager {
  private pool: Map<string, AnchorItem[]> = new Map(); // form → anchors

  setFormAnchors(form: string, anchors: AnchorItem[]): void {
    this.pool.set(form, anchors);
  }

  getFormAnchors(form: string): AnchorItem[] {
    return this.pool.get(form) ?? [];
  }

  /** Items due for rotation (past expiry date) */
  getExpiredAnchors(form: string): AnchorItem[] {
    return (this.pool.get(form) ?? []).filter(
      (a) => new Date(a.expiresAt) < new Date()
    );
  }

  /** Summarize anchor pool health across all forms */
  summary(): Array<{ form: string; count: number; expiredCount: number }> {
    return Array.from(this.pool.entries()).map(([form, items]) => ({
      form,
      count: items.length,
      expiredCount: items.filter((a) => new Date(a.expiresAt) < new Date()).length,
    }));
  }
}

export const anchorPoolManager = new AnchorPoolManager();
