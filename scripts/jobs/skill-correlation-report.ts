#!/usr/bin/env tsx
/**
 * Inter-skill correlation report (roadmap Faz 5) — the evidence needed before
 * enabling `profile.crossSkillPrior`.
 *
 *   npm run report:skill-correlation [-- --days 365 --min-sessions 300 --output path.json]
 *
 * Reads completed sessions' per-skill estimates (Session.metadata.skillProfiles),
 * computes the observed correlation matrix of skill θ̂ and a disattenuated one
 * (observed covariance minus the mean squared SEM on the diagonal), per profile
 * and overall. Read only. The recommendation line states whether the sample is
 * large enough to set a profile correlation and what the conservative value is.
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getProfile } from "../../src/lib/product-lines/profiles.js";

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};
const days = Number(arg("days", "365"));
const minSessions = Number(arg("min-sessions", "300"));
const output = arg("output", "");

type Profiles = Record<string, { theta: number; sem: number }>;

export function correlationReport(rows: Profiles[]): {
  n: number; skills: string[]; observed: number[][]; disattenuated: number[][]; meanOffDiagonal: number | null; minOffDiagonal: number | null;
} {
  const skills = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  const complete = rows.filter((r) => skills.every((k) => r[k] && Number.isFinite(r[k]!.theta) && Number.isFinite(r[k]!.sem)));
  const n = complete.length;
  const k = skills.length;
  const mean = skills.map((s) => complete.reduce((sum, r) => sum + r[s]!.theta, 0) / Math.max(1, n));
  const cov = skills.map((a, i) => skills.map((b, j) =>
    n > 1 ? complete.reduce((sum, r) => sum + (r[a]!.theta - mean[i]!) * (r[b]!.theta - mean[j]!), 0) / (n - 1) : 0));
  const errVar = skills.map((s) => complete.reduce((sum, r) => sum + r[s]!.sem ** 2, 0) / Math.max(1, n));
  const observed = cov.map((row, i) => row.map((c, j) => (cov[i]![i]! > 0 && cov[j]![j]! > 0 ? c / Math.sqrt(cov[i]![i]! * cov[j]![j]!) : 0)));
  const trueVar = cov.map((row, i) => Math.max(1e-6, row[i]! - errVar[i]!));
  const disattenuated = cov.map((row, i) => row.map((c, j) => (i === j ? 1 : Math.max(-1, Math.min(1, c / Math.sqrt(trueVar[i]! * trueVar[j]!))))));
  const off: number[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) off.push(disattenuated[i]![j]!);
  return {
    n, skills, observed, disattenuated,
    meanOffDiagonal: off.length ? off.reduce((s, v) => s + v, 0) / off.length : null,
    minOffDiagonal: off.length ? Math.min(...off) : null,
  };
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const since = new Date(Date.now() - days * 86_400_000);
    const sessions = await db.session.findMany({
      where: { status: "COMPLETED", completedAt: { gte: since }, scoreReport: { isVerified: true } },
      select: { metadata: true },
    });
    const byProfile = new Map<string, Profiles[]>();
    const all: Profiles[] = [];
    for (const session of sessions) {
      const meta = (session.metadata ?? {}) as { productLine?: string; skillProfiles?: Profiles };
      if (!meta.skillProfiles || Object.keys(meta.skillProfiles).length < 2) continue;
      const name = getProfile(meta.productLine).name;
      byProfile.set(name, [...(byProfile.get(name) ?? []), meta.skillProfiles]);
      all.push(meta.skillProfiles);
    }
    const report = {
      generatedAt: new Date().toISOString(),
      days,
      minSessions,
      overall: correlationReport(all),
      perProfile: Object.fromEntries([...byProfile].map(([name, rows]) => [name, correlationReport(rows)])),
      recommendation: "",
    };
    const overall = report.overall;
    if (overall.n < minSessions) {
      report.recommendation = `Only ${overall.n} verified sessions with ≥ 2 skill estimates (need ${minSessions}); keep crossSkillPrior off.`;
    } else {
      const conservative = Math.max(0, Math.floor(((overall.minOffDiagonal ?? 0) - 0.05) * 20) / 20);
      report.recommendation = `n=${overall.n}; disattenuated inter-skill correlation mean ${overall.meanOffDiagonal?.toFixed(2)}, min ${overall.minOffDiagonal?.toFixed(2)}. ` +
        `If enabling crossSkillPrior, use the conservative value ${conservative.toFixed(2)} (minimum − 0.05) and re-run the harness A/B with --rho set to the observed mean.`;
    }
    console.log(JSON.stringify({ ...report, perProfile: Object.fromEntries(Object.entries(report.perProfile).map(([k, v]) => [k, { n: v.n, meanOffDiagonal: v.meanOffDiagonal, minOffDiagonal: v.minOffDiagonal }])) }, null, 2));
    if (output) { mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2)); console.log(`written: ${output}`); }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("skill-correlation-report.ts")) {
  main().catch((error) => { console.error("skill-correlation-report failed:", error); process.exitCode = 1; });
}
