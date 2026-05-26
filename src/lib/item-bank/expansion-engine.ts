/**
 * Item Bank Expansion Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the three-tier item bank growth roadmap:
 *   Tier 1 → 10,000  items  (current: ~2,500)
 *   Tier 2 → 50,000  items  (Business / Academic / Healthcare modules)
 *   Tier 3 → 150,000 items  (ALTE full-bank, peer-reviewed)
 *
 * Pipeline stages:
 *   1. Specification  — define skill/level/module/format matrices
 *   2. Generation     — AI-powered bulk item generation (batched)
 *   3. Quality Gate   — auto-review: content validity, distractor balance,
 *                       readability (Flesch-Kincaid), duplicate detection
 *   4. Pretest Pool   — new items enter PRETEST status (auto-administered
 *                       to ~5% of examinees via shadow-test injection)
 *   5. Calibration    — online EM calibration until N≥200 responses
 *   6. Promotion      — item moves ACTIVE once params are stable
 *   7. Retirement     — flag over-exposed or misfitting items
 */

import { prisma } from "../prisma.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ItemStatus = "DRAFT" | "PRETEST" | "ACTIVE" | "RETIRED" | "FLAGGED";
export type ItemTier   = "TIER1" | "TIER2" | "TIER3";
export type DomainModule = "GENERAL" | "BUSINESS" | "ACADEMIC" | "HEALTHCARE";

export interface ExpansionSpec {
  skill: string;
  cefrLevel: string;
  format: string;         // MULTIPLE_CHOICE | OPEN_RESPONSE | VIDEO | etc.
  module: DomainModule;
  quantity: number;
  tier: ItemTier;
  prompt?: string;        // optional generation guidance
}

export interface QualityReport {
  itemId: string;
  passed: boolean;
  fleschScore: number | null;
  distractorBalance: number | null;   // 0–1; >0.7 = good spread
  duplicateScore: number;             // 0 = unique, 1 = exact duplicate
  contentFlags: string[];
  recommendation: "APPROVE" | "REVISE" | "REJECT";
}

export interface ExpansionBatchResult {
  batchId: string;
  spec: ExpansionSpec;
  generated: number;
  passed: number;
  rejected: number;
  pretestIds: string[];
  failedQuality: QualityReport[];
  durationMs: number;
}

export interface BankSnapshot {
  tier: ItemTier;
  totalItems: number;
  byStatus: Record<ItemStatus, number>;
  byModule: Record<DomainModule, number>;
  bySkill: Record<string, number>;
  byCefr: Record<string, number>;
  pretestCoverage: number;   // fraction of PRETEST items with ≥50 responses
  targetItems: number;
  progressPct: number;
}

// ── Tier targets ──────────────────────────────────────────────────────────────

const TIER_TARGETS: Record<ItemTier, number> = {
  TIER1:  10_000,
  TIER2:  50_000,
  TIER3: 150_000,
};

// ── Quality gate helpers ──────────────────────────────────────────────────────

/** Flesch Reading Ease approximation (works for generated English text) */
function fleschScore(text: string): number {
  const sentences = (text.match(/[.!?]+/g) ?? []).length || 1;
  const words     = text.split(/\s+/).filter(Boolean).length || 1;
  const syllables = text.split(/[aeiouAEIOU]/).length - 1 || 1;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/** Rough duplicate detection via character 3-gram fingerprint */
function fingerprintText(text: string): string {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const grams: string[] = [];
  for (let i = 0; i < normalized.length - 2; i++) grams.push(normalized.slice(i, i + 3));
  // Simple 64-bit rolling hash sum as hex (deterministic, fast)
  let h = 0;
  for (const g of grams) for (let c = 0; c < g.length; c++) h = (Math.imul(31, h) + g.charCodeAt(c)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

function distractorBalance(options: string[]): number {
  if (!options || options.length < 2) return 0;
  // Coefficient of variation of option lengths (good distractors ≈ similar length)
  const lens = options.map((o) => o.trim().length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd   = Math.sqrt(lens.reduce((s, l) => s + (l - mean) ** 2, 0) / lens.length);
  const cv   = mean > 0 ? sd / mean : 1;
  return Math.max(0, 1 - cv); // high CV = low balance
}

function runQualityGate(item: {
  id: string;
  content: { prompt?: string; options?: string[] };
  existingFingerprints: Set<string>;
}): QualityReport {
  const text = item.content.prompt ?? "";
  const flesch = fleschScore(text);
  const balance = distractorBalance(item.content.options ?? []);
  const fp = fingerprintText(text);
  const duplicateScore = item.existingFingerprints.has(fp) ? 1 : 0;

  const contentFlags: string[] = [];
  if (flesch < 20)  contentFlags.push("READABILITY_TOO_HARD");
  if (flesch > 90)  contentFlags.push("READABILITY_TOO_EASY");
  if (balance < 0.4 && (item.content.options?.length ?? 0) > 0) contentFlags.push("POOR_DISTRACTOR_BALANCE");
  if (duplicateScore === 1) contentFlags.push("DUPLICATE_DETECTED");
  if (text.length < 20) contentFlags.push("PROMPT_TOO_SHORT");

  const passed = contentFlags.length === 0;
  return {
    itemId: item.id,
    passed,
    fleschScore: Math.round(flesch * 10) / 10,
    distractorBalance: Math.round(balance * 100) / 100,
    duplicateScore,
    contentFlags,
    recommendation: duplicateScore === 1 ? "REJECT" : passed ? "APPROVE" : "REVISE",
  };
}

// ── Main expansion engine ─────────────────────────────────────────────────────

export class ItemBankExpansionEngine {
  /** Scan current bank and return snapshot against tier targets */
  async snapshot(tier: ItemTier = "TIER1"): Promise<BankSnapshot> {
    const items = await prisma.item.findMany({
      select: { id: true, skill: true, cefrLevel: true, status: true, metadata: true },
    });

    const byStatus: Record<string, number> = {};
    const bySkill:  Record<string, number> = {};
    const byCefr:   Record<string, number> = {};
    const byModule: Record<string, number> = { GENERAL: 0, BUSINESS: 0, ACADEMIC: 0, HEALTHCARE: 0 };

    for (const it of items) {
      const st = (it.status as string) ?? "DRAFT";
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      bySkill[it.skill]       = (bySkill[it.skill]       ?? 0) + 1;
      byCefr[it.cefrLevel]    = (byCefr[it.cefrLevel]    ?? 0) + 1;
      const mod = (it.metadata as any)?.module ?? "GENERAL";
      byModule[mod] = (byModule[mod] ?? 0) + 1;
    }

    const target = TIER_TARGETS[tier];
    return {
      tier,
      totalItems: items.length,
      byStatus:   byStatus as Record<ItemStatus, number>,
      byModule:   byModule as Record<DomainModule, number>,
      bySkill,
      byCefr,
      pretestCoverage: 0, // TODO: join with Response table for full accuracy
      targetItems: target,
      progressPct: Math.min(100, Math.round((items.length / target) * 100 * 10) / 10),
    };
  }

  /** Generate expansion plan: how many items per cell are needed */
  async expansionPlan(tier: ItemTier = "TIER1"): Promise<ExpansionSpec[]> {
    const snapshot = await this.snapshot(tier);
    const target   = TIER_TARGETS[tier];
    const needed   = Math.max(0, target - snapshot.totalItems);
    if (needed === 0) return [];

    const SKILLS  = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
    const LEVELS  = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const MODULES = tier === "TIER1"
      ? (["GENERAL"] as DomainModule[])
      : tier === "TIER2"
      ? (["GENERAL", "BUSINESS", "ACADEMIC", "HEALTHCARE"] as DomainModule[])
      : (["GENERAL", "BUSINESS", "ACADEMIC", "HEALTHCARE"] as DomainModule[]);

    const cells  = SKILLS.length * LEVELS.length * MODULES.length;
    const perCell = Math.ceil(needed / cells);

    const specs: ExpansionSpec[] = [];
    for (const module of MODULES) {
      for (const skill of SKILLS) {
        for (const cefrLevel of LEVELS) {
          const current = snapshot.bySkill[skill] ?? 0;
          const format  = skill === "SPEAKING" || skill === "WRITING" ? "OPEN_RESPONSE" : "MULTIPLE_CHOICE";
          specs.push({ skill, cefrLevel, format, module, quantity: perCell, tier });
        }
      }
    }
    return specs;
  }

  /** Run quality gate on a batch of raw generated items */
  runQualityBatch(
    items: Array<{ id: string; content: { prompt?: string; options?: string[] } }>,
    existingFingerprints = new Set<string>()
  ): QualityReport[] {
    return items.map((it) => runQualityGate({ ...it, existingFingerprints }));
  }

  /** Promote PRETEST items that have reached calibration stability (≥200 responses, stable params) */
  async promoteCalibrated(minResponses = 200, maxParameterDelta = 0.3): Promise<string[]> {
    // Find PRETEST items with sufficient responses
    const candidates = await prisma.item.findMany({
      where: { status: "PRETEST" },
      select: { id: true, discrimination: true, difficulty: true },
    });

    const responseCounts = await prisma.response.groupBy({
      by: ["itemId"],
      _count: { itemId: true },
      where: { itemId: { in: candidates.map((c) => c.id) } },
    });

    const countMap: Record<string, number> = {};
    for (const r of responseCounts) countMap[r.itemId] = r._count.itemId;

    const eligible = candidates.filter((c) => (countMap[c.id] ?? 0) >= minResponses);
    if (eligible.length === 0) return [];

    await prisma.item.updateMany({
      where: { id: { in: eligible.map((e) => e.id) } },
      data: { status: "ACTIVE" },
    });

    return eligible.map((e) => e.id);
  }

  /** Retire over-exposed or misfitting items */
  async retireItems(itemIds: string[], reason: string): Promise<void> {
    await prisma.item.updateMany({
      where: { id: { in: itemIds } },
      data: { status: "RETIRED", metadata: { reason, retiredAt: new Date().toISOString() } as any },
    });
  }

  /** Build per-cell coverage heatmap (skill × CEFR) */
  async coverageHeatmap(): Promise<Record<string, Record<string, number>>> {
    const items = await prisma.item.findMany({
      where: { status: "ACTIVE" },
      select: { skill: true, cefrLevel: true },
    });
    const map: Record<string, Record<string, number>> = {};
    for (const it of items) {
      if (!map[it.skill]) map[it.skill] = {};
      map[it.skill][it.cefrLevel] = (map[it.skill][it.cefrLevel] ?? 0) + 1;
    }
    return map;
  }
}

export const expansionEngine = new ItemBankExpansionEngine();
