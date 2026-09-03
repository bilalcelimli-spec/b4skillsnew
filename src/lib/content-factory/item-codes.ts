/**
 * Item Code Generator
 * Produces human-readable, stable codes: REA-B2-0042, VOC-A2-0007, etc.
 *
 * Format: {SKILL_ABBR}-{CEFR}-{SEQ:04d}
 * Sequence is per (skill, cefrLevel) pair; derived from current DB count + 1.
 *
 * Concurrency: uses a retry loop on unique-constraint violations.
 * At Phase 1 scale (single-writer batch jobs) the optimistic approach is safe.
 * Upgrade path: replace with a DB SEQUENCE per skill+cefr pair if needed.
 */

import { prisma } from "../prisma.js";

// ── Abbreviations ─────────────────────────────────────────────────────────────

const SKILL_ABBR: Record<string, string> = {
  READING:    "REA",
  LISTENING:  "LIS",
  WRITING:    "WRI",
  SPEAKING:   "SPE",
  GRAMMAR:    "GRA",
  VOCABULARY: "VOC",
};

// ── Code format ───────────────────────────────────────────────────────────────

export function formatItemCode(skill: string, cefrLevel: string, seq: number): string {
  const abbr = SKILL_ABBR[skill] ?? skill.slice(0, 3).toUpperCase();
  return `${abbr}-${cefrLevel}-${String(seq).padStart(4, "0")}`;
}

// ── Next code in sequence for a given cell ────────────────────────────────────

/**
 * Derive the next item code for a (skill, cefrLevel) pair.
 * Counts existing items (any status) to determine the next seq number.
 * Returns the code string; caller stores it in Item.itemCode.
 *
 * If the code is already taken (race condition), increments until unique.
 * maxRetries: 10 is far more than needed at Phase 1 batch sizes.
 */
export async function nextItemCode(
  skill: string,
  cefrLevel: string,
  maxRetries = 10,
): Promise<string> {
  const base = await prisma.item.count({
    where: { skill: skill as any, cefrLevel: cefrLevel as any },
  });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seq = base + 1 + attempt;
    const code = formatItemCode(skill, cefrLevel, seq);

    // Check uniqueness
    const existing = await prisma.item.findUnique({ where: { itemCode: code }, select: { id: true } });
    if (!existing) return code;
  }

  // Fallback: use a timestamp suffix to guarantee uniqueness
  const ts = Date.now().toString(36).toUpperCase();
  return formatItemCode(skill, cefrLevel, base + 1) + `-${ts}`;
}

// ── Batch assign: fill null itemCode on existing items ────────────────────────

export async function backfillItemCodes(maxItems = 1000): Promise<{ assigned: number; failed: number }> {
  const items = await prisma.item.findMany({
    where: { itemCode: null },
    select: { id: true, skill: true, cefrLevel: true },
    take: maxItems,
    orderBy: { id: "asc" },
  });

  let assigned = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const code = await nextItemCode(item.skill, item.cefrLevel);
      await prisma.item.update({ where: { id: item.id }, data: { itemCode: code } });
      assigned++;
    } catch {
      failed++;
    }
  }

  return { assigned, failed };
}
