/**
 * qwk-monitor.ts
 *
 * Rolling QWK (Quadratic Weighted Kappa) monitor for human rater agreement.
 *
 * Usage:
 *   npx tsx scripts/qwk-monitor.ts [--days 30] [--threshold 0.75] [--alert]
 *
 * --days        Look-back window in days   (default: 30)
 * --threshold   Alert below this QWK value (default: 0.75)
 * --alert       POST alert to /api/admin/alerts if threshold breached
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argVal = (flag: string, def: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : def;

const DAYS        = parseInt(argVal("--days",      "30"),   10);
const THRESHOLD   = parseFloat(argVal("--threshold","0.75"));
const SHOULD_ALERT = args.includes("--alert");

// ─── QWK implementation ───────────────────────────────────────────────────────

/**
 * Compute quadratic weighted kappa for two rating arrays.
 * Ratings must be integers; max rating is inferred from the data.
 */
function qwk(r1: number[], r2: number[]): number {
  if (r1.length !== r2.length || r1.length === 0) return 0;

  const n = r1.length;
  const maxRating = Math.max(...r1, ...r2);
  const size = maxRating + 1;

  // Observed matrix
  const O: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (let i = 0; i < n; i++) {
    O[r1[i]][r2[i]] += 1;
  }

  // Marginal distributions
  const row = Array(size).fill(0);
  const col = Array(size).fill(0);
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      row[i] += O[i][j];
      col[j] += O[i][j];
    }

  // Expected matrix
  const E: number[][] = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (__, j) => (row[i] * col[j]) / n)
  );

  // Numerator/denominator using quadratic weights w_ij = (i-j)^2 / (maxRating)^2
  const denom = (maxRating) ** 2;
  let num = 0;
  let den = 0;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const w = ((i - j) ** 2) / (denom || 1);
      num += w * O[i][j];
      den += w * E[i][j];
    }

  if (den === 0) return 1;
  return 1 - num / den;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  console.log(`\n📊  QWK Monitor — look-back: ${DAYS} days | threshold: ${THRESHOLD}\n`);

  // Load dual-rated tasks completed in the window
  const tasks = await (prisma as any).ratingTask.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: since },
      score: { not: null },
      secondRaterScore: { not: null },
    },
    select: {
      id: true,
      skill: true,
      score: true,
      secondRaterScore: true,
      qwk: true,
      completedAt: true,
    },
  });

  if (tasks.length === 0) {
    console.log("ℹ️  No dual-rated tasks found in the window.");
    await prisma.$disconnect();
    return;
  }

  // Group by skill
  const bySkill: Record<string, { r1: number[]; r2: number[]; stored: number[] }> = {};
  for (const t of tasks) {
    if (!bySkill[t.skill]) bySkill[t.skill] = { r1: [], r2: [], stored: [] };
    bySkill[t.skill].r1.push(Math.round(t.score));
    bySkill[t.skill].r2.push(Math.round(t.secondRaterScore));
    if (typeof t.qwk === "number") bySkill[t.skill].stored.push(t.qwk);
  }

  const alerts: string[] = [];

  for (const [skill, data] of Object.entries(bySkill)) {
    const computed = qwk(data.r1, data.r2);
    const storedMean =
      data.stored.length > 0
        ? data.stored.reduce((a, b) => a + b, 0) / data.stored.length
        : null;
    const display = computed;
    const n = data.r1.length;
    const flag = display < THRESHOLD ? "⚠️  BELOW THRESHOLD" : "✅";

    console.log(
      `  ${skill.padEnd(14)}  QWK=${display.toFixed(3)}  n=${n.toString().padStart(4)}  ${flag}` +
        (storedMean !== null ? `  (stored mean: ${storedMean.toFixed(3)})` : "")
    );

    if (display < THRESHOLD) {
      alerts.push(`${skill}: QWK=${display.toFixed(3)} < ${THRESHOLD} (n=${n})`);
    }
  }

  // Overall
  const allR1 = tasks.map((t: any) => Math.round(t.score));
  const allR2 = tasks.map((t: any) => Math.round(t.secondRaterScore));
  const overall = qwk(allR1, allR2);
  console.log(`\n  ${"OVERALL".padEnd(14)}  QWK=${overall.toFixed(3)}  n=${tasks.length}`);

  if (alerts.length > 0) {
    console.log(`\n⚠️  ALERTS (${alerts.length}):`);
    for (const a of alerts) console.log(`  - ${a}`);

    if (SHOULD_ALERT) {
      try {
        const res = await fetch(`${process.env.APP_URL ?? "http://localhost:5174"}/api/admin/alerts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "QWK_BELOW_THRESHOLD",
            message: `Rolling ${DAYS}-day QWK alert: ${alerts.join("; ")}`,
            severity: "HIGH",
            metadata: { alerts, overall, days: DAYS, threshold: THRESHOLD },
          }),
        });
        if (res.ok) console.log("\n📨  Alert posted to admin.");
        else console.warn("\n⚠️  Alert endpoint returned:", res.status);
      } catch (err) {
        console.error("Failed to post alert:", err);
      }
    }
  } else {
    console.log("\n✅  All skills within acceptable QWK range.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
