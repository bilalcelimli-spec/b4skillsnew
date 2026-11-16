#!/usr/bin/env tsx
/**
 * Read-only. Bank capacity per product line × skill × CEFR level against the
 * exposure-derived targets in src/lib/content-factory/bank-capacity.ts.
 *
 *   npm run verify:capacity
 *   npx tsx scripts/verify-bank-capacity.ts --json
 *   npx tsx scripts/verify-bank-capacity.ts --bank test/simulation/fixtures/bank-snapshot.json
 *   npx tsx scripts/verify-bank-capacity.ts --with-queue      # also count PRETEST/REVIEW/DRAFT as if live
 *   npx tsx scripts/verify-bank-capacity.ts --profile Corporate --skill LISTENING
 *
 * Reading/listening count distinct passages/recordings, writing/speaking count
 * tasks, grammar/vocabulary count items and report the non-MC share.
 * `--with-queue` answers "how far would the items already in the pipeline get
 * us"; it changes nothing in the database.
 *
 * Exit code 1 when any cell is below its minimum (0 with --report-only).
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PRODUCT_LINE_PROFILES } from "../src/lib/product-lines/profiles.js";
import { passageKey } from "../src/lib/assessment-engine/passage-cap.js";
import {
  auditProfileCapacity, summarizeCapacity, type CapacityItem, type CapacityRow,
} from "../src/lib/content-factory/bank-capacity.js";

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1]!.startsWith("--") ? args[i + 1] : undefined;
};
const JSON_OUTPUT = args.includes("--json");
const WITH_QUEUE = args.includes("--with-queue");
const REPORT_ONLY = args.includes("--report-only");
const bankPath = arg("bank");
const profileFilter = arg("profile")?.toLowerCase();
const skillFilter = arg("skill")?.toUpperCase();

const QUEUE_STATUSES = ["PRETEST", "REVIEW", "DRAFT"];

async function loadFromDatabase(): Promise<CapacityItem[]> {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const statuses = WITH_QUEUE ? ["ACTIVE", ...QUEUE_STATUSES] : ["ACTIVE"];
    const rows = await db.item.findMany({
      where: { status: { in: statuses as never[] }, isSuspended: false, isCompromised: false },
      select: { id: true, skill: true, cefrLevel: true, type: true, status: true, isPretest: true,
        discrimination: true, difficulty: true, guessing: true, tags: true, content: true },
    });
    return rows.map((row) => {
      const content = (row.content ?? {}) as Record<string, unknown>;
      return {
        id: row.id, skill: row.skill, cefrLevel: row.cefrLevel, type: row.type,
        a: row.discrimination, b: row.difficulty, c: row.guessing,
        status: row.status, isPretest: row.isPretest, tags: row.tags,
        passageKey: passageKey({ metadata: content }),
        productLine: typeof content.productLine === "string" ? content.productLine : null,
      };
    });
  } finally {
    await db.$disconnect();
  }
}

function loadFromSnapshot(path: string): CapacityItem[] {
  const snapshot = JSON.parse(readFileSync(path, "utf8")) as { items: CapacityItem[] };
  return snapshot.items.filter((item) => WITH_QUEUE || (item.status ?? "ACTIVE") === "ACTIVE");
}

/** Queue items are counted as if they were live operational items. */
function asLive(items: CapacityItem[]): CapacityItem[] {
  return WITH_QUEUE ? items.map((item) => ({ ...item, status: "ACTIVE", isPretest: false })) : items;
}

const MARK: Record<CapacityRow["status"], string> = { BELOW_MINIMUM: "❌", BELOW_TARGET: "⚠️ ", OK: "✅" };

async function main(): Promise<void> {
  const bank = asLive(bankPath ? loadFromSnapshot(bankPath) : await loadFromDatabase());
  const profiles = Object.values(PRODUCT_LINE_PROFILES)
    .filter((p) => !profileFilter || p.name.toLowerCase().includes(profileFilter));

  const reports = profiles.map((profile) => {
    const rows = auditProfileCapacity(profile, bank).filter((r) => !skillFilter || r.skill === skillFilter);
    return { profile: profile.name, maxExposureRate: profile.maxExposureRate, summary: summarizeCapacity(rows), rows };
  });
  const all = reports.flatMap((r) => r.rows);
  const totals = summarizeCapacity(all);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(), source: bankPath ? "snapshot" : "database", withQueue: WITH_QUEUE,
      bankItems: bank.length, ...totals, reports,
    }, null, 2));
  } else {
    console.log(`bank: ${bankPath ?? "database"} (${bank.length} items${WITH_QUEUE ? ", queue counted as live" : ", ACTIVE only"})`);
    for (const report of reports) {
      const s = report.summary;
      console.log(`\n📋 ${report.profile}  exposure ≤ ${report.maxExposureRate}  ` +
        `(${s.belowMinimum} below minimum, ${s.belowTarget} below target, ${s.ok} ok)`);
      for (const row of report.rows) {
        const fmt = row.nonMcShare !== undefined ? `  non-MC ${(row.nonMcShare * 100).toFixed(0)}%${row.formatShort ? " ↓" : ""}` : "";
        console.log(`  ${MARK[row.status]} ${`${row.skill}/${row.cefrLevel}`.padEnd(18)} ` +
          `${String(row.units).padStart(4)} ${row.unit.padEnd(8)} (${String(row.items).padStart(3)} items)  ` +
          `min ${String(row.minimum).padStart(3)}  target ${String(row.target).padStart(3)}${fmt}`);
      }
    }
    console.log(`\n${"═".repeat(70)}`);
    console.log(`cells ${totals.cells}: ${totals.belowMinimum} below minimum, ${totals.belowTarget} below target, ${totals.ok} ok; ` +
      `${totals.formatShort} grammar/vocab cells under the non-MC share`);
    console.log(`shortfall to target (summed over profiles, shared items counted per profile): ` +
      `${totals.shortfallByUnit.item} items, ${totals.shortfallByUnit.stimulus} stimuli, ${totals.shortfallByUnit.task} tasks`);
  }
  if (totals.belowMinimum > 0 && !REPORT_ONLY) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Capacity audit failed; the database was only read.", error);
  process.exitCode = 2;
});
