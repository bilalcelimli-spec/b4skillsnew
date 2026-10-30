#!/usr/bin/env tsx
/**
 * Davey–Parshall α tables (roadmap Faz 5) — compute, pre-warm and publish.
 *
 *   npm run db:job:alpha-table                        # observed (90 days) → SystemConfig
 *   npm run db:job:alpha-table -- --simulate 400      # also pre-warm from a harness run on the live bank
 *   npm run db:job:alpha-table -- --days 180 --dry-run
 *
 * Observed table: for each profile, sessions of the last `--days` days are
 * placed in a θ stratum (session θ); an item's exposure rate in a stratum is
 * the share of those sessions that answered it; α = min(1, k_max / rate) with
 * the profile's maxExposureRate as k_max.
 *
 * Simulated table: the production-path harness runs `--simulate N` candidates
 * per profile against the live bank (read only) and the resulting store's α
 * values are extracted. Observed wins where a stratum has ≥ 50 real sessions,
 * simulated fills the rest (alpha-table.mergeAlphaTables).
 *
 * The result is written to the SystemConfig row `dp-alpha-tables`; running
 * instances pick it up within 10 minutes. The bank and sessions are only read.
 */

delete process.env.REDIS_URL;

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PRODUCT_LINE_PROFILES, getProfile } from "../../src/lib/product-lines/profiles.js";
import { thetaToStratumDp, NUM_STRATA } from "../../src/lib/selection/exposure-control-davey-parshall.js";
import {
  alphaForRate, extractAlphaTable, mergeAlphaTables, summarizeAlphaTable,
  type AlphaTable, type AlphaTables,
} from "../../src/lib/selection/alpha-table.js";
import { saveAlphaTables } from "../../src/lib/selection/alpha-table-store.js";
import { _inspectDpStore } from "../../src/lib/selection/cat-selector.js";
import { simulateProfile, type BankSnapshot, type BankSnapshotItem } from "../../src/lib/assessment-engine/simulation-harness.js";
import { passageKey } from "../../src/lib/assessment-engine/passage-cap.js";
import { withJobLease } from "../../src/lib/jobs/job-lease.js";

const flag = (name: string) => process.argv.includes(`--${name}`);
const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};
const days = Number(arg("days", "90"));
const simulateN = Number(arg("simulate", "0"));
const dryRun = flag("dry-run");

const db = new PrismaClient();

async function observedTables(): Promise<AlphaTables> {
  const since = new Date(Date.now() - days * 86_400_000);
  const sessions = await db.session.findMany({
    where: { status: "COMPLETED", completedAt: { gte: since }, theta: { not: null } },
    select: { id: true, theta: true, metadata: true, responses: { where: { isPretest: false }, select: { itemId: true } } },
  });
  const tables: AlphaTables = {};
  for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
    const own = sessions.filter((s) => getProfile((s.metadata as any)?.productLine).name === profile.name);
    const stratumSessions = new Array<number>(NUM_STRATA).fill(0);
    const counts = new Map<string, number[]>();
    for (const session of own) {
      const stratum = thetaToStratumDp(session.theta as number);
      stratumSessions[stratum]!++;
      for (const itemId of new Set(session.responses.map((r) => r.itemId))) {
        const row = counts.get(itemId) ?? new Array<number>(NUM_STRATA).fill(0);
        row[stratum]!++;
        counts.set(itemId, row);
      }
    }
    const alphas: Record<string, number[]> = {};
    for (const [itemId, row] of counts) {
      const alphaRow = row.map((count, s) => (stratumSessions[s]! > 0 ? alphaForRate(count / stratumSessions[s]!, profile.maxExposureRate) : 1));
      if (alphaRow.some((a) => a < 1)) alphas[itemId] = alphaRow.map((a) => Number(a.toFixed(4)));
    }
    tables[profile.name] = { profile: profile.name, kMax: profile.maxExposureRate, source: "observed", computedAt: new Date().toISOString(), stratumSessions, alphas };
  }
  return tables;
}

async function liveBank(): Promise<BankSnapshot> {
  const rows = await db.item.findMany({
    where: { status: { in: ["ACTIVE", "PRETEST"] } },
    select: { id: true, skill: true, cefrLevel: true, type: true, status: true, isPretest: true, isAnchor: true,
      discrimination: true, difficulty: true, guessing: true, iqScore: true, tags: true, content: true },
  });
  const items: BankSnapshotItem[] = rows.map((row) => {
    const content = (row.content ?? {}) as Record<string, unknown>;
    return { id: row.id, skill: row.skill as BankSnapshotItem["skill"], cefrLevel: row.cefrLevel as BankSnapshotItem["cefrLevel"], type: row.type,
      a: row.discrimination, b: row.difficulty, c: row.guessing, status: row.status, isPretest: row.isPretest, isAnchor: row.isAnchor,
      iqScore: row.iqScore, tags: row.tags, passageKey: passageKey({ metadata: content }),
      productLine: typeof content.productLine === "string" ? content.productLine : null };
  });
  return { generatedAt: new Date().toISOString(), source: "database", items };
}

async function simulatedTables(n: number): Promise<AlphaTables> {
  const bank = await liveBank();
  const tables: AlphaTables = {};
  for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
    // isolateStores resets the DP stores; the profile's store then holds this run's α.
    await simulateProfile(bank, { profile, n, seed: 20261030 });
    tables[profile.name] = extractAlphaTable(_inspectDpStore(profile.name), profile.name, profile.maxExposureRate, "simulated");
  }
  return tables;
}

async function main(): Promise<void> {
  const outcome = await withJobLease(db, "exposure-alpha-table", async () => {
    const observed = await observedTables();
    const simulated = simulateN > 0 ? await simulatedTables(simulateN) : null;
    const merged: AlphaTables = {};
    for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
      const table = mergeAlphaTables(observed[profile.name] ?? null, simulated?.[profile.name] ?? null);
      if (table) merged[profile.name] = table;
    }
    for (const table of Object.values(merged) as AlphaTable[]) {
      const summary = summarizeAlphaTable(table);
      console.log(`${table.profile.padEnd(32)} ${table.source.padEnd(9)} sessions/stratum ${JSON.stringify(table.stratumSessions)}  items ${summary.items}  gated cells ${summary.gatedCells}  min α ${summary.minAlpha}`);
    }
    if (dryRun) { console.log("dry run: nothing written"); return merged; }
    await saveAlphaTables(db, merged, "job:exposure-alpha-table");
    console.log(`written SystemConfig/dp-alpha-tables for ${Object.keys(merged).length} profile(s)`);
    return merged;
  });
  if (outcome.status === "skipped") { console.error("another α-table run holds the lease; skipped"); process.exitCode = 3; }
}

main()
  .catch((error) => { console.error("exposure-alpha-table failed:", error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
