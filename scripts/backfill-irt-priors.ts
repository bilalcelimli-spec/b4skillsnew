#!/usr/bin/env npx tsx
/**
 * Backfill IRT priors for items with synthetic / unassigned parameters.
 *
 * ── Problem ──────────────────────────────────────────────────────────────────
 * A large slice of the seeded bank was created with hand-assigned / synthetic
 * IRT parameters where discrimination `a` was left at 0 (and guessing `c` at 0).
 * Because Fisher information is I(θ) = a²·…, an item with a=0 contributes ZERO
 * information, so the (otherwise state-of-the-art) Maximum-Fisher-Information
 * CAT selector is blind to it — selection silently degrades to
 * exposure/blueprint/random ordering for those items.
 *
 * ── Fix ──────────────────────────────────────────────────────────────────────
 * This is the "collateral-information" / explanatory-IRT cold-start strategy:
 * derive a defensible *prior* for a/b/c from the item's CEFR level using the
 * published norm table (IRT_PARAMETER_NORMS in item-writing-framework.ts), with
 * a small deterministic per-item jitter so items don't all share identical
 * parameters (which would flatten the information landscape).
 *
 * The runtime guard in irt.ts (DEFAULT_A) is the safety net; this script is the
 * real fix that puts sane, varied parameters in the database. Once real response
 * data accumulates, the calibration pipeline (pretest-calibration-pipeline.ts)
 * overwrites these priors with empirically estimated values and re-tags
 * paramSource = "calibrated".
 *
 * ── Scope & safety ───────────────────────────────────────────────────────────
 *  • Only touches items that look synthetic/unassigned:
 *      - a <= 0                              (explicit synthetic a=0), OR
 *      - a===1.0 && c===0 && difficulty===0 (pure Prisma defaults, never set)
 *  • NEVER touches items already tagged metadata.paramSource === "calibrated".
 *  • Preserves a meaningfully hand-assigned `b` (only fills b when it's a default 0).
 *  • Writes metadata.paramSource = "prior" + metadata.paramBackfilledAt.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   DRY_RUN=1 npx tsx scripts/backfill-irt-priors.ts   # preview, no writes
 *   npx tsx scripts/backfill-irt-priors.ts             # apply
 *   ONLY_ACTIVE=0 npx tsx scripts/backfill-irt-priors.ts  # include all statuses
 */

import { prisma } from "../src/lib/prisma.js";
import { getIrtNorm } from "../src/lib/language-skills/item-writing-framework.js";
import * as crypto from "crypto";

const DRY_RUN = process.env.DRY_RUN === "1";
const ONLY_ACTIVE = process.env.ONLY_ACTIVE !== "0"; // default: ACTIVE only

/** CEFR fallback when an item somehow has no norm row. */
const FALLBACK_NORM = { a: { target: 1.0 }, b: { target: 0.0 }, c: { target: 0.2 } };

/**
 * Deterministic jitter in [-1, 1) derived from an item id + salt.
 * Same item always gets the same jitter → re-runnable / idempotent.
 */
function jitter(itemId: string, salt: string): number {
  const h = crypto.createHash("md5").update(itemId + ":" + salt).digest();
  // First 4 bytes → uint32 → map to [-1, 1)
  const u = h.readUInt32BE(0) / 0xffffffff; // [0, 1]
  return u * 2 - 1;
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Does this item have MCQ-style guessing (a non-zero lower asymptote makes sense)? */
function isGuessableType(type: string): boolean {
  return type === "MULTIPLE_CHOICE" || type === "DRAG_DROP" || type === "FILL_IN_BLANKS";
}

interface ItemRow {
  id: string;
  type: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  status: string;
  metadata: any;
}

function needsBackfill(it: ItemRow): boolean {
  const src = (it.metadata as any)?.paramSource;
  if (src === "calibrated") return false; // never overwrite real calibration
  if (it.discrimination <= 0) return true; // synthetic a=0
  // Pure Prisma defaults never explicitly set:
  if (it.discrimination === 1.0 && it.guessing === 0 && it.difficulty === 0) return true;
  return false;
}

async function main() {
  console.log(`\n=== IRT Prior Backfill ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
  console.log(`Scope: ${ONLY_ACTIVE ? "ACTIVE only" : "ALL statuses"}\n`);

  const where: any = {};
  if (ONLY_ACTIVE) where.status = "ACTIVE";

  const items = (await prisma.item.findMany({
    where,
    select: {
      id: true,
      type: true,
      skill: true,
      cefrLevel: true,
      difficulty: true,
      discrimination: true,
      guessing: true,
      status: true,
      metadata: true,
    },
  })) as unknown as ItemRow[];

  console.log(`Total items in scope: ${items.length}`);

  const targets = items.filter(needsBackfill);
  console.log(`Items needing backfill: ${targets.length}\n`);

  let updated = 0;
  const bySkill: Record<string, number> = {};
  const sample: string[] = [];

  for (const it of targets) {
    const norm = getIrtNorm(it.cefrLevel as any) ?? (FALLBACK_NORM as any);

    // ── a (discrimination) ── always replace when needsBackfill, jitter ±0.15
    const aTarget = norm.a.target as number;
    const newA = round(Math.max(0.3, aTarget + 0.15 * jitter(it.id, "a")));

    // ── c (guessing) ── only meaningful for guessable item types
    let newC = it.guessing;
    if (isGuessableType(it.type)) {
      // keep a sensible existing c; otherwise use norm target
      newC = it.guessing > 0 ? it.guessing : round(norm.c.target as number, 2);
    } else {
      newC = 0; // productive / open items: no lower asymptote
    }

    // ── b (difficulty) ── preserve a meaningfully hand-assigned b; fill only defaults
    let newB = it.difficulty;
    if (it.difficulty === 0) {
      // Looks like an unset default → assign from CEFR norm with jitter ±0.25
      newB = round((norm.b.target as number) + 0.25 * jitter(it.id, "b"));
    }

    const newMeta = {
      ...((it.metadata as any) ?? {}),
      paramSource: "prior",
      paramBackfilledAt: new Date().toISOString(),
    };

    if (sample.length < 8) {
      sample.push(
        `  ${it.id.slice(0, 8)} ${it.skill}/${it.cefrLevel} ${it.type}: ` +
          `a ${it.discrimination}→${newA}, b ${it.difficulty}→${newB}, c ${it.guessing}→${newC}`
      );
    }

    if (!DRY_RUN) {
      await prisma.item.update({
        where: { id: it.id },
        data: {
          discrimination: newA,
          difficulty: newB,
          guessing: newC,
          metadata: newMeta as any,
        },
      });
    }
    updated++;
    bySkill[it.skill] = (bySkill[it.skill] ?? 0) + 1;
  }

  console.log("Sample changes:");
  console.log(sample.join("\n") || "  (none)");
  console.log(`\nBy skill:`);
  for (const [s, n] of Object.entries(bySkill).sort()) {
    console.log(`  ${s.padEnd(11)} ${n}`);
  }
  console.log(`\n${DRY_RUN ? "[DRY RUN] Would update" : "✅ Updated"} ${updated} items.`);
  if (DRY_RUN) console.log(`Remove DRY_RUN=1 to apply.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
