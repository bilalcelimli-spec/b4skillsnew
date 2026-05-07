/**
 * Distractor Analytics Runner
 *
 * Runs Classical Test Theory + IRT distractor analysis across the item bank
 * and surfaces items that need revision (non-functioning distractors, low
 * point-biserial, poor IRT fit, etc.).
 *
 * Flags:
 *   SKILL=GRAMMAR          — filter to one skill
 *   LEVEL=B1               — filter to one CEFR level
 *   MIN_RESPONSES=10       — skip items with fewer responses (default 10)
 *   GRADE=D,F              — show only items at/below this grade
 *   OUTPUT=json            — print full JSON to stdout
 *   PATCH_DB=1             — write flags into item.metadata.distractorFlags
 *   RETIRE_POOR=1          — retire items graded F with NEGATIVE_DISCRIMINATION
 *
 * Usage:
 *   npx tsx scripts/distractor-analytics.ts
 *   SKILL=GRAMMAR GRADE=D,F PATCH_DB=1 npx tsx scripts/distractor-analytics.ts
 *   MIN_RESPONSES=5 OUTPUT=json npx tsx scripts/distractor-analytics.ts > report.json
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DistractorAnalysisService, ItemAnalysisReport } from "../src/lib/item-analysis/distractor-analysis.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SKILL_FILTER  = process.env.SKILL?.toUpperCase() ?? null;
const LEVEL_FILTER  = process.env.LEVEL?.toUpperCase() ?? null;
const MIN_RESPONSES = parseInt(process.env.MIN_RESPONSES ?? "10", 10);
const OUTPUT_JSON   = process.env.OUTPUT === "json";
const PATCH_DB      = process.env.PATCH_DB === "1";
const RETIRE_POOR   = process.env.RETIRE_POOR === "1";
const GRADE_FILTER  = process.env.GRADE
  ? new Set(process.env.GRADE.toUpperCase().split(",").map((g) => g.trim()))
  : null;

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_ORDER: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
const gradeEmoji = (g: string) => ({ A: "🟢", B: "🟡", C: "🟠", D: "🔴", F: "⛔" })[g] ?? "  ";

function bar(value: number, max: number, width = 20): string {
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function fmtPct(v: number) {
  return (v * 100).toFixed(1).padStart(5) + "%";
}

function fmtFloat(v: number, digits = 3) {
  return v.toFixed(digits);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("  Distractor Analytics — Classical + IRT Item Analysis");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Fetch items matching filter
  const whereClause: Record<string, unknown> = {
    status: { in: ["ACTIVE", "PRETEST"] },
  };
  if (SKILL_FILTER) whereClause.skill = SKILL_FILTER;
  if (LEVEL_FILTER) whereClause.cefrLevel = LEVEL_FILTER;

  const items = await prisma.item.findMany({
    where: whereClause as Parameters<typeof prisma.item.findMany>[0]["where"],
    select: { id: true, skill: true, cefrLevel: true, _count: { select: { responses: true } } },
  });

  const eligible = items.filter((i) => i._count.responses >= MIN_RESPONSES);
  console.log(`  Total ACTIVE/PRETEST items  : ${items.length}`);
  console.log(`  With ≥${MIN_RESPONSES} responses       : ${eligible.length}`);
  console.log(`  PATCH_DB                   : ${PATCH_DB}`);
  console.log(`  RETIRE_POOR (F + neg pbis) : ${RETIRE_POOR}\n`);

  if (eligible.length === 0) {
    console.log("  No items have enough responses yet. Come back after real test data.\n");
    await prisma.$disconnect();
    return;
  }

  // Analyze
  const reports: ItemAnalysisReport[] = [];
  process.stdout.write("  Analyzing items: ");
  let done = 0;
  for (const item of eligible) {
    try {
      const report = await DistractorAnalysisService.analyzeItem(item.id);
      reports.push(report);
      if (++done % 20 === 0) process.stdout.write(`${done}/${eligible.length} `);
    } catch (e) {
      // skip
    }
  }
  console.log(`done (${reports.length})\n`);

  if (OUTPUT_JSON) {
    console.log(JSON.stringify(reports, null, 2));
    await prisma.$disconnect();
    return;
  }

  // ── Bank Summary ──────────────────────────────────────────────────────────
  const total = reports.length;
  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let sumPBis = 0, sumPValue = 0, flaggedCount = 0;
  for (const r of reports) {
    gradeCount[r.grade] = (gradeCount[r.grade] ?? 0) + 1;
    sumPBis += r.pointBiserial;
    sumPValue += r.pValue;
    if (r.flags.length > 0) flaggedCount++;
  }

  console.log("  ── Bank Summary ────────────────────────────────────────────");
  console.log(`  Items analyzed      : ${total}`);
  console.log(`  Mean p-value        : ${fmtFloat(sumPValue / total)} (target 0.30–0.70)`);
  console.log(`  Mean point-biserial : ${fmtFloat(sumPBis / total)} (target ≥ 0.20)`);
  console.log(`  Items with flags    : ${flaggedCount} (${fmtPct(flaggedCount / total)})`);
  console.log("\n  Grade Distribution:");
  const maxGradeCount = Math.max(...Object.values(gradeCount));
  for (const [g, count] of Object.entries(gradeCount).sort((a, b) => GRADE_ORDER[b[0]] - GRADE_ORDER[a[0]])) {
    console.log(`    ${gradeEmoji(g)} ${g}  ${bar(count, Math.max(maxGradeCount, 1))}  ${count} items (${fmtPct(count / total)})`);
  }

  // ── Skill × Level Health Matrix ───────────────────────────────────────────
  const LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const matrixKey = (r: ItemAnalysisReport) => `${r.skill}|${r.cefrLevel}`;
  const matrix: Record<string, { count: number; sumGrade: number; flagged: number }> = {};
  for (const r of reports) {
    const k = matrixKey(r);
    if (!matrix[k]) matrix[k] = { count: 0, sumGrade: 0, flagged: 0 };
    matrix[k].count++;
    matrix[k].sumGrade += GRADE_ORDER[r.grade] ?? 1;
    if (r.flags.length > 0) matrix[k].flagged++;
  }

  const skills = [...new Set(reports.map((r) => r.skill))].sort();
  if (skills.length > 0) {
    console.log("\n  ── Skill × Level Health Matrix ─────────────────────────────");
    const header = "  SKILL".padEnd(14) + LEVELS.map((l) => l.padEnd(9)).join("");
    console.log(header);
    for (const skill of skills) {
      let row = `  ${skill}`.padEnd(14);
      for (const level of LEVELS) {
        const k = `${skill}|${level}`;
        const cell = matrix[k];
        if (!cell) { row += "  —      "; continue; }
        const avgGrade = cell.sumGrade / cell.count;
        const g = Object.entries(GRADE_ORDER).reduce((best, [grade, order]) =>
          Math.abs(order - avgGrade) < Math.abs(GRADE_ORDER[best] - avgGrade) ? grade : best, "A");
        row += `  ${gradeEmoji(g)}${String(cell.count).padStart(3)}    `;
      }
      console.log(row);
    }
  }

  // ── Top Flag Codes ────────────────────────────────────────────────────────
  const flagCounts: Record<string, number> = {};
  for (const r of reports) {
    for (const f of r.flags) {
      const base = f.split(":")[0];
      flagCounts[base] = (flagCounts[base] ?? 0) + 1;
    }
  }
  const topFlags = Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (topFlags.length > 0) {
    console.log("\n  ── Top Flag Codes ──────────────────────────────────────────");
    for (const [code, count] of topFlags) {
      console.log(`    ${String(count).padStart(4)}  ${code}`);
    }
  }

  // ── Non-Functioning Distractor Detail ────────────────────────────────────
  const nfdItems = reports.filter((r) =>
    r.flags.some((f) => f.startsWith("NON_FUNCTIONING"))
  );
  if (nfdItems.length > 0) {
    console.log(`\n  ── Non-Functioning Distractors (${nfdItems.length} items) ──────────────`);
    for (const r of nfdItems.slice(0, 20)) {
      const nfd = r.distractorAnalysis.filter((d) => !d.isCorrect && d.quality === "non-functioning");
      console.log(`    ${r.skill} ${r.cefrLevel} [${r.grade}] id=${r.itemId}  p=${fmtFloat(r.pValue)}  pbis=${fmtFloat(r.pointBiserial)}`);
      for (const d of nfd) {
        console.log(`      Option ${String.fromCharCode(65 + d.optionIndex)}: "${d.optionText.slice(0, 50)}"  sel=${fmtPct(d.selectionRate)}`);
      }
    }
    if (nfdItems.length > 20) console.log(`    ... and ${nfdItems.length - 20} more`);
  }

  // ── Grade D/F items ───────────────────────────────────────────────────────
  const poorItems = reports
    .filter((r) => r.grade === "D" || r.grade === "F")
    .filter((r) => !GRADE_FILTER || GRADE_FILTER.has(r.grade))
    .sort((a, b) => a.pointBiserial - b.pointBiserial)
    .slice(0, 30);

  if (poorItems.length > 0) {
    console.log(`\n  ── Grade D/F Items (worst first by pbis) ───────────────────`);
    console.log("  " + "SKILL/LEVEL".padEnd(18) + "GRADE  p-val  pbis  infit  outfit  FLAGS");
    for (const r of poorItems) {
      const flagStr = r.flags.map((f) => f.split(":")[0]).join(", ").slice(0, 45);
      const line = [
        `  ${r.skill} ${r.cefrLevel}`.padEnd(20),
        `${gradeEmoji(r.grade)}${r.grade}`.padEnd(7),
        fmtFloat(r.pValue).padEnd(7),
        fmtFloat(r.pointBiserial).padEnd(7),
        fmtFloat(r.irtFit.infit, 2).padEnd(7),
        fmtFloat(r.irtFit.outfit, 2).padEnd(8),
        flagStr,
      ].join("");
      console.log(line);
    }
  }

  // ── DB Patching ───────────────────────────────────────────────────────────
  if (PATCH_DB) {
    console.log("\n  Patching item.metadata.distractorFlags...");
    let patched = 0;
    for (const r of reports) {
      if (r.flags.length === 0 && r.grade === "A") continue;
      const item = await prisma.item.findUnique({ where: { id: r.itemId }, select: { metadata: true } });
      const existingMeta = (item?.metadata ?? {}) as Record<string, unknown>;
      await prisma.item.update({
        where: { id: r.itemId },
        data: {
          metadata: {
            ...existingMeta,
            distractorAnalysis: {
              grade: r.grade,
              pValue: r.pValue,
              pointBiserial: r.pointBiserial,
              irtFit: r.irtFit,
              flags: r.flags,
              sampleSize: r.sampleSize,
              analyzedAt: new Date().toISOString(),
            },
          },
        },
      });
      patched++;
    }
    console.log(`  Patched ${patched} items with distractor analysis metadata.`);
  }

  // ── Retire F items with negative point-biserial ───────────────────────────
  if (RETIRE_POOR) {
    const toRetire = reports.filter(
      (r) => r.grade === "F" && r.flags.includes("NEGATIVE_DISCRIMINATION")
    );
    console.log(`\n  Retiring ${toRetire.length} items with grade F + NEGATIVE_DISCRIMINATION...`);
    for (const r of toRetire) {
      await prisma.item.update({
        where: { id: r.itemId },
        data: {
          status: "RETIRED",
          retiredAt: new Date(),
          retiredBy: "distractor-analytics",
          retirementReason: `Grade F, pbis=${r.pointBiserial.toFixed(3)} (NEGATIVE_DISCRIMINATION), p=${r.pValue.toFixed(3)}`,
        },
      });
    }
    console.log(`  Retired ${toRetire.length} items.`);
  }

  console.log("\n  Done.\n");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
