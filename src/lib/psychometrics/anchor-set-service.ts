/**
 * Anchor Set Service — Phase I: IRT Anchor Items for Equating & Standard Setting
 *
 * An "anchor set" in this context refers to a curated collection of items
 * that have:
 *   (a) stable, empirically-calibrated IRT parameters (a, b, c)
 *   (b) expert content review confirming CEFR-level alignment
 *   (c) sufficient response data (N ≥ 100) for reliable parameter estimates
 *
 * These anchor items serve two purposes:
 *   1. **Test equating (Phase II)**: Anchor items appear in multiple test forms,
 *      enabling CINEG (Common-Item Nonequivalent Groups) equating across forms.
 *   2. **Standard setting (Phase I)**: Panelists use anchor items as reference
 *      points when estimating Angoff probabilities.
 *
 * Target: ≥ 10 anchor items per skill × CEFR cell (6 skills × 7 levels = 420 items).
 * Phase I bootstrap target: ≥ 5 anchor items per cell for 3 priority skills
 * (READING, LISTENING, GRAMMAR) at B1/B2 (highest traffic).
 *
 * Stored in: SystemConfig (key = "anchorSet") as JSON.
 * Future: migrate to dedicated AnchorItem table once volume exceeds 1,000 items.
 */

import { prisma } from "../prisma.js";
import type { CefrLevel, SkillType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AnchorItem {
  /** Prisma Item.id */
  itemId: string;
  skill: SkillType;
  cefrLevel: CefrLevel;
  /** IRT 3PL: discrimination */
  a: number;
  /** IRT 3PL: difficulty (θ scale) */
  b: number;
  /** IRT 3PL: guessing */
  c: number;
  /** Number of real candidate responses used to compute these parameters */
  calibrationN: number;
  /** Whether an expert reviewer has confirmed CEFR-level alignment */
  expertVerified: boolean;
  expertReviewerId?: string;
  expertReviewedAt?: string;
  /** Notes from expert reviewer */
  expertNotes?: string;
  addedAt: string;
  addedBy: string;
}

export interface AnchorSetSummary {
  totalItems: number;
  bySkill: Record<string, number>;
  byCefr: Record<string, number>;
  /** skill → cefrLevel → count */
  matrix: Record<string, Record<string, number>>;
  /** Cells with < MIN_ANCHOR_ITEMS items */
  gaps: Array<{ skill: string; cefrLevel: string; count: number }>;
  expertVerifiedCount: number;
  lastUpdated: string;
}

export interface AnchorEquatingLinkage {
  formA: string;
  formB: string;
  commonAnchorItemIds: string[];
  /** Computed after equating: θ offset between forms */
  thetaOffset?: number;
  slopeRatio?: number;
  equatingMethod?: "mean-sigma" | "haebara" | "stocking-lord";
  computedAt?: string;
}

/** Minimum anchor items per cell for robust equating */
const MIN_ANCHOR_ITEMS = 5;
/** Target anchor items per cell for production */
const TARGET_ANCHOR_ITEMS = 10;

// ─────────────────────────────────────────────────────────────────────────────
// ANCHOR SET SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const AnchorSetService = {
  // ─── Anchor Item Management ────────────────────────────────────────────────

  /** Add an item to the anchor set. Item must be ACTIVE with calibrated IRT params. */
  async addAnchorItem(params: {
    itemId: string;
    addedBy: string;
    expertVerified?: boolean;
    expertReviewerId?: string;
    expertNotes?: string;
  }): Promise<AnchorItem> {
    const item = await prisma.item.findUnique({
      where: { id: params.itemId },
      select: { id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true, status: true },
    });
    if (!item) throw new Error(`Item ${params.itemId} not found`);
    if (item.status !== "ACTIVE") {
      throw new Error(`Item ${params.itemId} must be ACTIVE to be added to the anchor set (current: ${item.status})`);
    }

    // Count existing responses for calibration quality check
    const calibrationN = await prisma.response.count({ where: { itemId: params.itemId } });

    const anchorItem: AnchorItem = {
      itemId: params.itemId,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      a: item.discrimination,
      b: item.difficulty,
      c: item.guessing,
      calibrationN,
      expertVerified: params.expertVerified ?? false,
      expertReviewerId: params.expertReviewerId,
      expertNotes: params.expertNotes,
      addedAt: new Date().toISOString(),
      addedBy: params.addedBy,
    };

    const config = await this._getConfig();
    config.items = [
      ...(config.items ?? []).filter((i: AnchorItem) => i.itemId !== params.itemId),
      anchorItem,
    ];
    config.lastUpdated = new Date().toISOString();
    await this._saveConfig(config);
    return anchorItem;
  },

  /** Remove an item from the anchor set */
  async removeAnchorItem(itemId: string): Promise<void> {
    const config = await this._getConfig();
    config.items = (config.items ?? []).filter((i: AnchorItem) => i.itemId !== itemId);
    config.lastUpdated = new Date().toISOString();
    await this._saveConfig(config);
  },

  /** Mark an anchor item as expert-verified */
  async markExpertVerified(itemId: string, reviewerId: string, notes?: string): Promise<void> {
    const config = await this._getConfig();
    const idx = (config.items ?? []).findIndex((i: AnchorItem) => i.itemId === itemId);
    if (idx < 0) throw new Error(`Item ${itemId} not in anchor set`);
    config.items[idx].expertVerified = true;
    config.items[idx].expertReviewerId = reviewerId;
    config.items[idx].expertNotes = notes;
    config.items[idx].expertReviewedAt = new Date().toISOString();
    config.lastUpdated = new Date().toISOString();
    await this._saveConfig(config);
  },

  /** Get all anchor items, optionally filtered by skill/CEFR */
  async getAnchorItems(filter?: { skill?: SkillType; cefrLevel?: CefrLevel }): Promise<AnchorItem[]> {
    const config = await this._getConfig();
    let items: AnchorItem[] = config.items ?? [];
    if (filter?.skill) items = items.filter((i) => i.skill === filter.skill);
    if (filter?.cefrLevel) items = items.filter((i) => i.cefrLevel === filter.cefrLevel);
    return items;
  },

  // ─── Summary & Coverage Analysis ──────────────────────────────────────────

  /** Compute coverage summary and identify gaps */
  async getSummary(): Promise<AnchorSetSummary> {
    const config = await this._getConfig();
    const items: AnchorItem[] = config.items ?? [];

    const SKILLS: SkillType[] = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
    const CEFR: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

    const bySkill: Record<string, number> = {};
    const byCefr: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    for (const s of SKILLS) matrix[s] = Object.fromEntries(CEFR.map((c) => [c, 0]));

    for (const item of items) {
      bySkill[item.skill] = (bySkill[item.skill] ?? 0) + 1;
      byCefr[item.cefrLevel] = (byCefr[item.cefrLevel] ?? 0) + 1;
      if (matrix[item.skill]) {
        matrix[item.skill][item.cefrLevel] = (matrix[item.skill][item.cefrLevel] ?? 0) + 1;
      }
    }

    const gaps: AnchorSetSummary["gaps"] = [];
    for (const s of SKILLS) {
      for (const c of CEFR) {
        const count = matrix[s]?.[c] ?? 0;
        if (count < MIN_ANCHOR_ITEMS) {
          gaps.push({ skill: s, cefrLevel: c, count });
        }
      }
    }
    // Sort by most critical gaps first
    gaps.sort((a, b) => a.count - b.count);

    return {
      totalItems: items.length,
      bySkill,
      byCefr,
      matrix,
      gaps,
      expertVerifiedCount: items.filter((i) => i.expertVerified).length,
      lastUpdated: config.lastUpdated ?? "never",
    };
  },

  // ─── Form Equating Support ─────────────────────────────────────────────────

  /**
   * Identify common anchor items between two named test forms.
   * Forms are identified by a tag stored in item.tags (e.g., "form:A").
   */
  async getEquatingLinkage(formA: string, formB: string): Promise<AnchorEquatingLinkage> {
    const config = await this._getConfig();
    const anchorItemIds = new Set((config.items ?? []).map((i: AnchorItem) => i.itemId));

    const [formAItems, formBItems] = await Promise.all([
      prisma.item.findMany({ where: { tags: { has: `form:${formA}` } }, select: { id: true } }),
      prisma.item.findMany({ where: { tags: { has: `form:${formB}` } }, select: { id: true } }),
    ]);

    const formASet = new Set(formAItems.map((i) => i.id));
    const formBSet = new Set(formBItems.map((i) => i.id));

    const commonAnchorItemIds = ([...anchorItemIds] as string[]).filter(
      (id) => formASet.has(id) && formBSet.has(id)
    );

    // Check if a previously computed equating exists
    const existing = (config.equatingLinkages ?? []).find(
      (l: AnchorEquatingLinkage) =>
        (l.formA === formA && l.formB === formB) || (l.formA === formB && l.formB === formA)
    );

    return {
      formA,
      formB,
      commonAnchorItemIds,
      thetaOffset: existing?.thetaOffset,
      slopeRatio: existing?.slopeRatio,
      equatingMethod: existing?.equatingMethod,
      computedAt: existing?.computedAt,
    };
  },

  /**
   * Seed the anchor set from existing ACTIVE items: selects the top N items per
   * skill × CEFR cell ordered by response count (best-calibrated first).
   *
   * Call this once to bootstrap Phase I from the existing item bank.
   */
  async seedFromActiveItems(
    params: { targetPerCell?: number; addedBy: string; requireMinN?: number }
  ): Promise<{ added: number; skipped: number; summary: AnchorSetSummary }> {
    const { targetPerCell = MIN_ANCHOR_ITEMS, addedBy, requireMinN = 30 } = params;

    const SKILLS: SkillType[] = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
    const CEFR: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

    let added = 0, skipped = 0;

    for (const skill of SKILLS) {
      for (const cefrLevel of CEFR) {
        const existing = await this.getAnchorItems({ skill, cefrLevel });
        if (existing.length >= targetPerCell) { skipped++; continue; }

        const needed = targetPerCell - existing.length;
        const existingIds = new Set(existing.map((i) => i.itemId));

        // Find best-calibrated active items not already in anchor set
        const candidates = await prisma.item.findMany({
          where: {
            skill,
            cefrLevel,
            status: "ACTIVE",
            id: { notIn: [...existingIds] as string[] },
          },
          orderBy: { exposureCount: "desc" },
          take: needed * 3, // oversample then filter by response count
          select: { id: true },
        });

        for (const candidate of candidates) {
          if (added >= needed && existing.length + added >= targetPerCell) break;
          const n = await prisma.response.count({ where: { itemId: candidate.id } });
          if (n < requireMinN) { skipped++; continue; }
          try {
            await this.addAnchorItem({ itemId: candidate.id, addedBy });
            added++;
          } catch { skipped++; }
          if (existing.length + added >= targetPerCell) break;
        }
      }
    }

    const summary = await this.getSummary();
    return { added, skipped, summary };
  },

  // ─── Private helpers ───────────────────────────────────────────────────────

  async _getConfig(): Promise<Record<string, any>> {
    const rec = await prisma.systemConfig.findFirst({
      where: { key: "anchorSet" } as any,
    });
    if (!rec) return { items: [], equatingLinkages: [], lastUpdated: null };
    return (rec.config as Record<string, any>) ?? { items: [], equatingLinkages: [], lastUpdated: null };
  },

  async _saveConfig(config: Record<string, any>): Promise<void> {
    const existing = await prisma.systemConfig.findFirst({
      where: { key: "anchorSet" } as any,
    });
    if (existing) {
      await prisma.systemConfig.update({
        where: { id: existing.id },
        data: { config: config as any },
      });
    } else {
      await (prisma.systemConfig as any).create({
        data: { key: "anchorSet", config: config as any },
      });
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS (re-exported for use by UI / API routes)
// ─────────────────────────────────────────────────────────────────────────────
export { MIN_ANCHOR_ITEMS, TARGET_ANCHOR_ITEMS };
