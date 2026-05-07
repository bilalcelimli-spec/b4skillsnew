/**
 * Triage REVIEW items by issue type.
 *
 * After running reeval-items-with-cefr-kb.ts, this script reads the
 * cefrQualityReview metadata from all REVIEW-flagged items and produces:
 *   • Counts by skill × level × verdict
 *   • Most common issue codes + severities
 *   • Items that can be "salvaged" (REVIEW, score 40-60) vs must be replaced (REJECTED or score < 40)
 *   • Per-skill shortage: how many ACTIVE items remain after removing REVIEW items
 *
 * Flags:
 *   SKILL=GRAMMAR     — limit output to one skill
 *   LEVEL=B1          — limit output to one level
 *   OUTPUT=json       — dump machine-readable JSON instead of table
 *   ACTION=retire     — actually retire all REJECTED items (score < 40) without REVIEW (use carefully)
 *
 * Usage:
 *   npx tsx scripts/triage-review-items.ts
 *   SKILL=GRAMMAR npx tsx scripts/triage-review-items.ts
 *   OUTPUT=json npx tsx scripts/triage-review-items.ts > triage.json
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILL_FILTER = process.env.SKILL?.toUpperCase() ?? null;
const LEVEL_FILTER = process.env.LEVEL?.toUpperCase() ?? null;
const OUTPUT_FORMAT = process.env.OUTPUT?.toLowerCase() ?? "table";
const ACTION = process.env.ACTION?.toLowerCase() ?? null;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CefrQualityReview {
  overallScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  cefrAlignment: number;
  distractorQuality: number;
  clarity: number;
  grammarScope?: number;
  vocabularyFit?: number;
  issues: Array<{ code: string; severity: "CRITICAL" | "MAJOR" | "MINOR"; message: string }>;
  feedback: string;
  evaluatedAt?: string;
}

interface TriageRecord {
  id: string;
  itemCode: string | null;
  skill: string;
  level: string;
  status: string;
  score: number;
  verdict: "APPROVED" | "REVIEW" | "REJECTED";
  issues: Array<{ code: string; severity: string }>;
  isAmbiguous: boolean; // multiple correct answers, ill-formed prompt
  suggestedAction: "KEEP" | "REVISE" | "RETIRE" | "REPLACE";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function suggestAction(review: CefrQualityReview): TriageRecord["suggestedAction"] {
  if (review.overallScore >= 70) return "KEEP";
  if (review.overallScore >= 50) return "REVISE";
  if (review.overallScore >= 30) return "REPLACE";
  return "RETIRE";
}

function isAmbiguous(review: CefrQualityReview): boolean {
  return review.issues.some(
    (i) =>
      i.code.includes("AMBIGUOUS") ||
      i.code.includes("MULTIPLE_CORRECT") ||
      i.code.includes("DISTRACTOR_IS_CORRECT")
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const whereClause: Record<string, unknown> = {
    status: { in: ["REVIEW", "ACTIVE", "DRAFT"] },
    metadata: { not: null },
  };
  if (SKILL_FILTER) whereClause.skill = SKILL_FILTER;
  if (LEVEL_FILTER) whereClause.cefrLevel = LEVEL_FILTER;

  const items = await prisma.item.findMany({
    where: whereClause as Parameters<typeof prisma.item.findMany>[0]["where"],
    select: {
      id: true,
      itemCode: true,
      skill: true,
      cefrLevel: true,
      status: true,
      metadata: true,
    },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
  });

  // Filter to items that have been evaluated
  const evaluated: TriageRecord[] = [];
  let noReview = 0;

  for (const item of items) {
    const meta = item.metadata as Record<string, unknown> | null;
    const review = meta?.cefrQualityReview as CefrQualityReview | undefined;
    if (!review) { noReview++; continue; }

    evaluated.push({
      id: item.id,
      itemCode: item.itemCode,
      skill: item.skill,
      level: item.cefrLevel,
      status: item.status,
      score: review.overallScore,
      verdict: review.status,
      issues: review.issues.map((i) => ({ code: i.code, severity: i.severity })),
      isAmbiguous: isAmbiguous(review),
      suggestedAction: suggestAction(review),
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const byVerdict = {
    APPROVED: evaluated.filter((e) => e.verdict === "APPROVED").length,
    REVIEW: evaluated.filter((e) => e.verdict === "REVIEW").length,
    REJECTED: evaluated.filter((e) => e.verdict === "REJECTED").length,
  };

  const byAction = {
    KEEP: evaluated.filter((e) => e.suggestedAction === "KEEP").length,
    REVISE: evaluated.filter((e) => e.suggestedAction === "REVISE").length,
    REPLACE: evaluated.filter((e) => e.suggestedAction === "REPLACE").length,
    RETIRE: evaluated.filter((e) => e.suggestedAction === "RETIRE").length,
  };

  // Issue frequency
  const issueFreq: Record<string, number> = {};
  for (const rec of evaluated) {
    for (const issue of rec.issues) {
      issueFreq[issue.code] = (issueFreq[issue.code] ?? 0) + 1;
    }
  }
  const topIssues = Object.entries(issueFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Per skill × level breakdown
  const matrix: Record<string, Record<string, { total: number; approved: number; review: number; rejected: number; keep: number; replace: number }>> = {};
  for (const rec of evaluated) {
    matrix[rec.skill] ??= {};
    matrix[rec.skill][rec.level] ??= { total: 0, approved: 0, review: 0, rejected: 0, keep: 0, replace: 0 };
    const cell = matrix[rec.skill][rec.level];
    cell.total++;
    cell[rec.verdict.toLowerCase() as "approved" | "review" | "rejected"]++;
    if (rec.suggestedAction === "KEEP") cell.keep++;
    if (rec.suggestedAction === "REPLACE" || rec.suggestedAction === "RETIRE") cell.replace++;
  }

  // Pool health: active items after removing non-KEEP
  const activeTotal = evaluated.filter((e) => e.status === "ACTIVE").length;
  const activeKeep = evaluated.filter((e) => e.status === "ACTIVE" && e.suggestedAction === "KEEP").length;
  const ambiguousCount = evaluated.filter((e) => e.isAmbiguous).length;

  // ── Output ─────────────────────────────────────────────────────────────────

  if (OUTPUT_FORMAT === "json") {
    console.log(JSON.stringify({ evaluated: evaluated.length, noReview, byVerdict, byAction, topIssues, matrix }, null, 2));
    await prisma.$disconnect();
    return;
  }

  // Table output
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("  ITEM TRIAGE REPORT — CEFR Quality Review");
  if (SKILL_FILTER) console.log(`  Filter: skill=${SKILL_FILTER}${LEVEL_FILTER ? ` level=${LEVEL_FILTER}` : ""}`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log(`  Total items with cefrQualityReview : ${evaluated.length}`);
  console.log(`  Items not yet evaluated             : ${noReview}`);
  console.log(`  Ambiguous items (multi-correct etc) : ${ambiguousCount}\n`);

  console.log("  ── Verdict ──");
  console.log(`    ✓ APPROVED   : ${byVerdict.APPROVED}`);
  console.log(`    ~ REVIEW     : ${byVerdict.REVIEW}`);
  console.log(`    ✗ REJECTED   : ${byVerdict.REJECTED}\n`);

  console.log("  ── Suggested Actions ──");
  console.log(`    KEEP    (score ≥ 70) : ${byAction.KEEP}`);
  console.log(`    REVISE  (50–69)      : ${byAction.REVISE}`);
  console.log(`    REPLACE (30–49)      : ${byAction.REPLACE}`);
  console.log(`    RETIRE  (< 30)       : ${byAction.RETIRE}\n`);

  console.log(`  ── Pool Health ──`);
  console.log(`    ACTIVE items evaluated  : ${activeTotal}`);
  console.log(`    ACTIVE items to KEEP    : ${activeKeep}`);
  console.log(`    ACTIVE items to replace : ${activeTotal - activeKeep}`);
  const pct = activeTotal > 0 ? Math.round(((activeTotal - activeKeep) / activeTotal) * 100) : 0;
  console.log(`    Replacement needed      : ${pct}% of active bank\n`);

  console.log("  ── Skill × Level Matrix ──");
  for (const skill of Object.keys(matrix).sort()) {
    console.log(`\n  ${skill}:`);
    const levelOrder = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
    for (const level of levelOrder) {
      if (!matrix[skill][level]) continue;
      const c = matrix[skill][level];
      const health = c.total > 0 ? Math.round((c.keep / c.total) * 100) : 100;
      const bar = "█".repeat(Math.round(health / 10)) + "░".repeat(10 - Math.round(health / 10));
      console.log(
        `    ${level.padEnd(6)}  total=${String(c.total).padStart(3)}  ` +
          `✓${String(c.approved).padStart(3)}  ~${String(c.review).padStart(3)}  ✗${String(c.rejected).padStart(3)}  ` +
          `→keep=${String(c.keep).padStart(3)}  replace=${String(c.replace).padStart(3)}  [${bar}] ${health}%`
      );
    }
  }

  console.log("\n  ── Top 20 Issue Codes ──");
  for (const [code, count] of topIssues) {
    console.log(`    ${String(count).padStart(4)}×  ${code}`);
  }

  // ── Items needing immediate attention ──────────────────────────────────────
  const critical = evaluated.filter(
    (e) => e.isAmbiguous || e.verdict === "REJECTED"
  );
  if (critical.length > 0) {
    console.log(`\n  ── Immediate Action Required (${critical.length} items) ──`);
    for (const rec of critical.slice(0, 50)) {
      const flag = rec.isAmbiguous ? "⚡AMBIGUOUS" : "✗REJECTED";
      console.log(
        `    ${flag}  ${rec.skill.padEnd(12)} ${rec.level.padEnd(7)} score=${rec.score}  id=${rec.id}  ${rec.itemCode ?? ""}`
      );
    }
    if (critical.length > 50) console.log(`    ... and ${critical.length - 50} more`);
  }

  // ── ACTION: retire all score < 30 ─────────────────────────────────────────
  if (ACTION === "retire") {
    const toRetire = evaluated.filter(
      (e) => e.score < 30 && e.status !== "RETIRED"
    );
    if (toRetire.length === 0) {
      console.log("\n  No items qualify for automatic retirement (score < 30).");
    } else {
      console.log(`\n  ── Retiring ${toRetire.length} items with score < 30 ──`);
      let retired = 0;
      for (const rec of toRetire) {
        await prisma.item.update({
          where: { id: rec.id },
          data: {
            status: "RETIRED",
            retiredAt: new Date(),
            retiredBy: "triage-script",
            retirementReason: "CEFR quality review: score < 30 — critical misalignment",
          },
        });
        retired++;
        process.stdout.write(`\r    Retired ${retired}/${toRetire.length}...`);
      }
      console.log(`\n  Done. ${retired} items retired.`);
    }
  }

  console.log();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
