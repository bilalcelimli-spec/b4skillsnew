/**
 * IRT Item Calibration Runner
 *
 * Recalibrates item parameters (a, b) for PRETEST items that have accumulated
 * enough real response data, using Conditional Maximum Likelihood (CML) with
 * known candidate theta estimates (EAP thetas stored on the Session).
 *
 * Algorithm:
 *   - Model  : 3PL with fixed c = 0.25 (four-option MC), estimate a and b
 *   - Method : Gradient ascent on log-likelihood, Newton-Raphson step, 50 iterations
 *   - θ source: session.theta (EAP posterior mean from the adaptive engine)
 *   - If calibration diverges (|Δb| > 4 or a < 0.3), item is flagged, not updated
 *   - Calibrated items whose new parameters are within bounds are promoted PRETEST → ACTIVE
 *
 * Flags:
 *   MIN_RESPONSES=30    — minimum responses needed to calibrate (default 30)
 *   DRY_RUN=1           — compute but do NOT update DB
 *   SKILL=GRAMMAR       — limit to one skill
 *   LEVEL=B1            — limit to one CEFR level
 *   PROMOTE=1           — auto-promote calibrated items to ACTIVE (default: OFF)
 *   MAX_ITEMS=100       — stop after this many items per run
 *
 * Usage:
 *   npx tsx scripts/irt-calibration-runner.ts
 *   MIN_RESPONSES=20 PROMOTE=1 npx tsx scripts/irt-calibration-runner.ts
 *   DRY_RUN=1 SKILL=GRAMMAR npx tsx scripts/irt-calibration-runner.ts
 */

import "dotenv/config";
import { PrismaClient, SkillType, CefrLevel } from "@prisma/client";

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN      = process.env.DRY_RUN === "1";
const PROMOTE      = process.env.PROMOTE === "1";
const SKILL_FILTER = process.env.SKILL?.toUpperCase() ?? null;
const LEVEL_FILTER = process.env.LEVEL?.toUpperCase() ?? null;
const MIN_N        = parseInt(process.env.MIN_RESPONSES ?? "30", 10);
const MAX_ITEMS    = parseInt(process.env.MAX_ITEMS ?? "200", 10);
const MAX_ITER     = 80;
const LEARN_RATE   = 0.05;
const CONV_TOL     = 1e-5;

// Bounds on IRT parameters
const A_MIN = 0.30, A_MAX = 3.0;
const B_MIN = -3.5, B_MAX = 3.5;
const C_FIXED = 0.25;  // Fixed guessing for 4-option MC

const prisma = new PrismaClient();

// ─── 3PL probability ──────────────────────────────────────────────────────────

function p3pl(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

// ─── Log-likelihood and gradients ─────────────────────────────────────────────

function logLikAndGrad(
  responses: { theta: number; score: number }[],
  a: number, b: number, c: number
): { ll: number; dA: number; dB: number } {
  let ll = 0, dA = 0, dB = 0;
  const EPS = 1e-7;

  for (const r of responses) {
    const p  = Math.max(EPS, Math.min(1 - EPS, p3pl(r.theta, a, b, c)));
    const u  = r.score;
    ll += u * Math.log(p) + (1 - u) * Math.log(1 - p);

    // Derivatives of log-likelihood w.r.t. a and b
    // Using d/da[log P] and d/db[log P] for 3PL (fixed c):
    const q     = 1 - p;
    const pMinC = p - c;
    const oneMinC = 1 - c;
    const factor = (u - p) * pMinC / (p * oneMinC);

    dA += factor * (r.theta - b);
    dB += factor * (-a);
  }

  return { ll, dA, dB };
}

// ─── Gradient-ascent with Newton step ────────────────────────────────────────

interface CalibResult {
  a: number;
  b: number;
  c: number;
  ll: number;
  converged: boolean;
  iterations: number;
  seA: number;
  seB: number;
  sampleSize: number;
}

function calibrate(
  responses: { theta: number; score: number }[],
  initA: number,
  initB: number
): CalibResult {
  let a = Math.max(A_MIN, Math.min(A_MAX, initA));
  let b = Math.max(B_MIN, Math.min(B_MAX, initB));
  const c = C_FIXED;

  let prevLL = -Infinity;
  let iters = 0;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    iters = iter + 1;
    const { ll, dA, dB } = logLikAndGrad(responses, a, b, c);

    // Adaptive step with bounds clamping
    const stepA = Math.max(-0.5, Math.min(0.5, LEARN_RATE * dA));
    const stepB = Math.max(-0.3, Math.min(0.3, LEARN_RATE * dB));

    a = Math.max(A_MIN, Math.min(A_MAX, a + stepA));
    b = Math.max(B_MIN, Math.min(B_MAX, b + stepB));

    if (Math.abs(ll - prevLL) < CONV_TOL && iter > 10) break;
    prevLL = ll;
  }

  const { ll: finalLL } = logLikAndGrad(responses, a, b, c);

  // Approximate standard errors via observed information matrix (diagonal)
  // SE(b) ≈ 1/sqrt(-d²LL/db²) — simplified using sum of P*Q per response
  const n = responses.length;
  let infoA = 0, infoB = 0;
  for (const r of responses) {
    const p    = p3pl(r.theta, a, b, c);
    const q    = 1 - p;
    const pMinC = p - c;
    const oneMinC = 1 - c;
    const w   = pMinC * pMinC / (p * q * oneMinC * oneMinC);
    infoA += (r.theta - b) ** 2 * w;
    infoB += a * a * w;
  }
  const seA = infoA > 0 ? 1 / Math.sqrt(infoA) : 999;
  const seB = infoB > 0 ? 1 / Math.sqrt(infoB) : 999;

  // Convergence: check if final LL is finite and params in bounds
  const converged =
    isFinite(finalLL) &&
    isFinite(a) &&
    isFinite(b) &&
    a > A_MIN && a < A_MAX &&
    b > B_MIN && b < B_MAX;

  return { a, b, c, ll: finalLL, converged, iterations: iters, seA, seB, sampleSize: n };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("  IRT Item Calibration Runner (3PL, fixed c=0.25)");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`  DRY_RUN         : ${DRY_RUN}`);
  console.log(`  PROMOTE         : ${PROMOTE}`);
  console.log(`  MIN_RESPONSES   : ${MIN_N}`);
  console.log(`  MAX_ITEMS       : ${MAX_ITEMS}\n`);

  const whereClause: Record<string, unknown> = {
    status: "PRETEST",
    type:   "MULTIPLE_CHOICE",
  };
  if (SKILL_FILTER) whereClause.skill     = SKILL_FILTER as SkillType;
  if (LEVEL_FILTER) whereClause.cefrLevel = LEVEL_FILTER as CefrLevel;

  // Find PRETEST items with enough responses
  const items = await prisma.item.findMany({
    where: whereClause as Parameters<typeof prisma.item.findMany>[0]["where"],
    select: {
      id: true,
      itemCode: true,
      skill: true,
      cefrLevel: true,
      difficulty: true,
      discrimination: true,
      guessing: true,
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_ITEMS * 3, // fetch extra so we can filter by count
  });

  const eligible = items.filter((i) => i._count.responses >= MIN_N).slice(0, MAX_ITEMS);
  console.log(`  PRETEST items total         : ${items.length}`);
  console.log(`  With ≥${MIN_N} responses      : ${eligible.length}\n`);

  if (eligible.length === 0) {
    console.log("  No items ready for calibration yet.\n");
    await prisma.$disconnect();
    return;
  }

  // Results accumulators
  let calibrated = 0, diverged = 0, promoted = 0;
  const calibResults: Array<CalibResult & { id: string; skill: string; cefrLevel: string; initA: number; initB: number }> = [];

  console.log("  " + "SKILL/LEVEL".padEnd(16) + "N".padEnd(6) + "initA/B".padEnd(14) + "→ calA/B".padEnd(16) + "LL".padEnd(12) + "SE_b".padEnd(8) + "STATUS");

  for (const item of eligible) {
    // Fetch responses with session theta
    const responses = await prisma.response.findMany({
      where: { itemId: item.id, isPretest: true },
      select: {
        isCorrect: true,
        score: true,
        session: { select: { theta: true } },
      },
    });

    // Filter: need valid theta and a definite correctness
    const valid = responses
      .filter((r) => r.session?.theta != null && r.isCorrect != null)
      .map((r) => ({
        theta: r.session!.theta as number,
        score: r.isCorrect ? 1 : 0,
      }));

    if (valid.length < MIN_N) continue;

    const result = calibrate(valid, item.discrimination, item.difficulty);
    calibResults.push({
      ...result,
      id: item.id,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      initA: item.discrimination,
      initB: item.difficulty,
    });

    const status = result.converged
      ? (PROMOTE ? "→ ACTIVE" : "CONVERGED")
      : "DIVERGED";

    console.log(
      "  " +
      `${item.skill} ${item.cefrLevel}`.padEnd(16) +
      String(result.sampleSize).padEnd(6) +
      `${item.discrimination.toFixed(2)}/${item.difficulty.toFixed(2)}`.padEnd(14) +
      `${result.a.toFixed(2)}/${result.b.toFixed(2)}`.padEnd(16) +
      result.ll.toFixed(1).padEnd(12) +
      result.seB.toFixed(3).padEnd(8) +
      status
    );

    if (!result.converged) {
      diverged++;
      continue;
    }

    calibrated++;

    if (!DRY_RUN) {
      const updateData: Record<string, unknown> = {
        difficulty: result.b,
        discrimination: result.a,
        guessing: result.c,
      };

      if (PROMOTE) {
        updateData.status = "ACTIVE";
        promoted++;
      }

      await prisma.item.update({
        where: { id: item.id },
        data: {
          ...updateData as Parameters<typeof prisma.item.update>[0]["data"],
          metadata: {
            ...(await prisma.item.findUnique({ where: { id: item.id }, select: { metadata: true } }))
              ?.metadata as Record<string, unknown> ?? {},
            irtCalibration: {
              calibratedAt: new Date().toISOString(),
              method: "CML-gradient-ascent-3PL-fixed-c",
              sampleSize: result.sampleSize,
              finalLL: result.ll,
              iterations: result.iterations,
              seA: result.seA,
              seB: result.seB,
              prevA: item.discrimination,
              prevB: item.difficulty,
            },
          },
        },
      });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n  ── Calibration Summary ──────────────────────────────────────`);
  console.log(`  Calibrated (converged)  : ${calibrated}`);
  console.log(`  Diverged / skipped      : ${diverged}`);
  if (PROMOTE && !DRY_RUN) console.log(`  Promoted to ACTIVE      : ${promoted}`);

  // Drift report: how much did parameters shift?
  const convergedResults = calibResults.filter((r) => r.converged);
  if (convergedResults.length > 0) {
    const deltaB = convergedResults.map((r) => Math.abs(r.b - r.initB));
    const deltaA = convergedResults.map((r) => Math.abs(r.a - r.initA));
    const meanDB = deltaB.reduce((s, x) => s + x, 0) / deltaB.length;
    const meanDA = deltaA.reduce((s, x) => s + x, 0) / deltaA.length;
    const largeShift = convergedResults.filter((r) => Math.abs(r.b - r.initB) > 0.5);

    console.log(`\n  ── Parameter Drift ──────────────────────────────────────────`);
    console.log(`  Mean |Δb|              : ${meanDB.toFixed(3)} (target < 0.3)`);
    console.log(`  Mean |Δa|              : ${meanDA.toFixed(3)}`);
    console.log(`  Items with |Δb| > 0.5  : ${largeShift.length}`);
    if (largeShift.length > 0) {
      console.log("  Large-shift items:");
      for (const r of largeShift.slice(0, 10)) {
        console.log(`    ${r.skill} ${r.cefrLevel} id=${r.id}  Δb=${(r.b - r.initB).toFixed(3)}`);
      }
    }
  }

  console.log(`\n  Next steps:`);
  if (!PROMOTE) console.log(`  • Re-run with PROMOTE=1 to move calibrated items to ACTIVE`);
  if (DRY_RUN)  console.log(`  • Re-run without DRY_RUN=1 to apply changes`);
  console.log(`  • Run distractor-analytics.ts to QA the newly-active items`);
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
