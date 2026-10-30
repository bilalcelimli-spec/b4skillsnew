#!/usr/bin/env tsx
/**
 * Read-only adaptive delivery audit against the connected item bank.
 *
 *   npm run audit:adaptive [-- --n 40] [--output path.json]
 *
 * Loads the operational bank (ACTIVE items) once, then runs the production
 * selection path (section-flow → CATSelector → AssessmentEngine → stop-rules)
 * for every product-line profile through the simulation harness, and reports:
 *   - coverage gaps: profiles/skills whose eligible pool is below the section
 *     minimum, and CEFR levels with no eligible item
 *   - recovery and exposure statistics per profile (same report as sim:adaptive)
 *
 * Nothing is written to the database. Exposure counters live in process memory
 * only; REDIS_URL is cleared so the audit can never touch deployment exposure
 * state. For offline runs without a database use `npm run sim:adaptive`.
 */

delete process.env.REDIS_URL;

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { PRODUCT_LINE_PROFILES } from "../src/lib/product-lines/profiles.js";
import { adaptiveItemWhere } from "../src/lib/assessment-engine/adaptive-policy.js";
import { passageKey } from "../src/lib/assessment-engine/passage-cap.js";
import {
  eligibleBankItems,
  simulateProfile,
  summarizeReport,
  type BankSnapshot,
  type BankSnapshotItem,
} from "../src/lib/assessment-engine/simulation-harness.js";

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};
const n = Number(arg("n", "40"));
const output = arg("output", "");

const db = new PrismaClient();

async function loadBank(): Promise<BankSnapshot> {
  const rows = await db.item.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, skill: true, cefrLevel: true, type: true, status: true, isPretest: true, isAnchor: true,
      discrimination: true, difficulty: true, guessing: true, iqScore: true, tags: true, content: true,
    },
  });
  const items: BankSnapshotItem[] = rows.map((row) => {
    const content = (row.content ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      skill: row.skill as BankSnapshotItem["skill"],
      cefrLevel: row.cefrLevel as BankSnapshotItem["cefrLevel"],
      type: row.type,
      a: row.discrimination,
      b: row.difficulty,
      c: row.guessing,
      status: row.status,
      isPretest: row.isPretest,
      isAnchor: row.isAnchor,
      iqScore: row.iqScore,
      tags: row.tags,
      passageKey: passageKey({ metadata: content }),
      productLine: typeof content.productLine === "string" ? content.productLine : null,
    };
  });
  return { generatedAt: new Date().toISOString(), source: "database", items };
}

async function main(): Promise<void> {
  const bank = await loadBank();
  const gaps: unknown[] = [];
  const missingLevels: unknown[] = [];
  const reports: unknown[] = [];

  for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
    for (const skill of profile.sectionOrder) {
      const eligible = eligibleBankItems(bank, profile, skill);
      // Cross-check the in-memory mirror against the Prisma filter the live flow uses.
      const dbCount = await db.item.count({ where: adaptiveItemWhere(profile, skill) });
      if (dbCount !== eligible.length) {
        gaps.push({ profile: profile.name, skill, mismatch: { prismaFilter: dbCount, inMemoryMirror: eligible.length } });
      }
      const allowedLevels = (adaptiveItemWhere(profile, skill).cefrLevel as { in: string[] }).in;
      for (const level of allowedLevels) {
        if (!eligible.some((item) => (item as { cefrLevel?: string }).cefrLevel === level)) {
          missingLevels.push({ profile: profile.name, skill, level });
        }
      }
      const required = profile.sectionConfig[skill].minItems;
      if (eligible.length < required) gaps.push({ profile: profile.name, skill, count: eligible.length, required });
    }
    const report = await simulateProfile(bank, { profile, n, seed: 20261030 });
    reports.push(summarizeReport(report));
    console.error(
      `${profile.name.padEnd(32)} compositeCal ${report.compositeSemCalibration.toFixed(2)}  ` +
      `cefr ${report.cefrExactAccuracy.toFixed(2)}  len ${report.meanLength.toFixed(1)}  ` +
      `expMax ${report.maxExposureRate.toFixed(2)}  fallbacks ${JSON.stringify(report.poolFallbacks)}`
    );
  }

  const result = {
    generatedAt: new Date().toISOString(),
    mode: "read_only_memory_simulation",
    bank: { items: bank.items.length },
    n,
    gaps,
    missingLevels,
    reports,
    limitations: [
      "Simulated responses verify software behavior and selection dynamics, not empirical item calibration or CEFR validity.",
      "Productive grades are sampled from the synthetic GRM, not from AI grading.",
      "Fixed diagnostic and Özgün Placement intentionally use fixed forms and are out of scope.",
    ],
  };
  if (output) writeFileSync(output, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => { console.error("Adaptive bank audit failed; no database writes were attempted.", error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
