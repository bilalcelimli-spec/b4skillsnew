#!/usr/bin/env tsx

/**
 * Routine quality tour. Runs the read-only code and item-bank audits, records
 * one summary per day and reports what moved since the previous run.
 * Writes nothing to the database.
 *
 *   npx tsx scripts/jobs/quality-tour.ts                 # everything
 *   npx tsx scripts/jobs/quality-tour.ts --skip-code     # bank audits only
 *   npx tsx scripts/jobs/quality-tour.ts --only=coverage,irt-health
 *   npx tsx scripts/jobs/quality-tour.ts --no-write      # do not save the run
 *
 * Output: scripts/jobs/.out/quality-runs/YYYY-MM-DD.json (+ latest-comparison.json)
 * Exit code: 0 = all steps ran, 1 = at least one step crashed. Findings do not
 * fail the tour; they are the report.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config, parse } from "dotenv";
import {
  TOUR_STEPS, classifyStep, compareRuns, describeDatabaseTarget, redactConnectionStrings,
  type StepResult, type TourRun,
} from "../../src/lib/quality/quality-tour.js";

// Same source as server.ts and most audit scripts. Children inherit this value,
// so every step reads the same database even where a script prefers .env.local.
config({ quiet: true });

const OUT_DIR = "scripts/jobs/.out/quality-runs";
const STEP_TIMEOUT_MS = 15 * 60 * 1000;
const args = process.argv.slice(2);
const only = args.find(a => a.startsWith("--only="))?.slice("--only=".length).split(",").filter(Boolean);
const skipCode = args.includes("--skip-code");
const noWrite = args.includes("--no-write");

function git(...gitArgs: string[]): string | null {
  const result = spawnSync("git", gitArgs, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function lastLines(text: string, count: number): string {
  return redactConnectionStrings(text.trim().split(/\r?\n/).slice(-count).join("\n"));
}

function runStep(step: (typeof TOUR_STEPS)[number], hasDatabase: boolean): StepResult {
  const base = { id: step.id, title: step.title, metrics: {} };
  if (step.needsDatabase && !hasDatabase) {
    return { ...base, status: "skipped", exitCode: null, durationMs: 0, note: "DATABASE_URL is not set" };
  }
  const started = Date.now();
  const result = spawnSync(step.command[0], step.command.slice(1), {
    encoding: "utf8", env: process.env, timeout: STEP_TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024,
  });
  const durationMs = Date.now() - started;
  const metrics = step.metrics?.(result.stdout ?? "") ?? {};
  const status = classifyStep(step, result.status, metrics);
  const note = status !== "error" ? undefined
    : result.error ? result.error.message
    : lastLines(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, 12);
  return { ...base, status, exitCode: result.status, durationMs, metrics, ...(note ? { note } : {}) };
}

function previousRun(today: string): TourRun | null {
  if (!existsSync(OUT_DIR)) return null;
  const file = readdirSync(OUT_DIR).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name) && name < `${today}.json`).sort().at(-1);
  return file ? JSON.parse(readFileSync(path.join(OUT_DIR, file), "utf8")) : null;
}

function main() {
  const unknown = only?.filter(id => !TOUR_STEPS.some(step => step.id === id)) ?? [];
  if (unknown.length) {
    console.error(`Unknown step(s): ${unknown.join(", ")}. Available: ${TOUR_STEPS.map(s => s.id).join(", ")}`);
    process.exit(2);
  }
  const steps = TOUR_STEPS.filter(step => (only ? only.includes(step.id) : !(skipCode && step.group === "code")));
  const database = describeDatabaseTarget(process.env.DATABASE_URL);
  const startedAt = new Date();
  // Local calendar day, so an evening run is not filed under the next UTC date.
  const date = [startedAt.getFullYear(), startedAt.getMonth() + 1, startedAt.getDate()].map(n => String(n).padStart(2, "0")).join("-");

  console.log(`Quality tour ${date}`);
  console.log(database
    ? `Database: ${database.host}/${database.database}${database.isLocal ? " (local)" : " (REMOTE — read-only audits only)"}`
    : "Database: not configured — bank audits will be skipped");
  if (existsSync(".env.local")) {
    const other = describeDatabaseTarget(parse(readFileSync(".env.local")).DATABASE_URL);
    if (other && database && (other.host !== database.host || other.database !== database.database)) {
      console.log(`Note: .env.local points at ${other.host}/${other.database}; the tour uses the target above for every step.`);
    }
  }

  const results: StepResult[] = [];
  for (const step of steps) {
    process.stdout.write(`  ${step.id.padEnd(16)} `);
    const result = runStep(step, Boolean(database));
    results.push(result);
    console.log(`${result.status.padEnd(9)} ${(result.durationMs / 1000).toFixed(1)}s`);
  }

  const run: TourRun = {
    date, startedAt: startedAt.toISOString(),
    gitCommit: git("rev-parse", "--short", "HEAD"),
    gitDirty: Boolean(git("status", "--porcelain")),
    database, steps: results,
  };
  const previous = previousRun(date);
  // A partial run would look like every omitted step disappeared.
  const comparison = previous && !only ? compareRuns(previous, run) : null;

  if (!noWrite) {
    mkdirSync(OUT_DIR, { recursive: true });
    // Partial runs go to a separate file so they never replace the day's full record.
    const file = path.join(OUT_DIR, only ? `${date}.partial.json` : `${date}.json`);
    writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
    if (comparison) writeFileSync(path.join(OUT_DIR, "latest-comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
    console.log(`\nSaved ${file}`);
  }

  for (const result of results.filter(r => r.status === "findings")) {
    const step = TOUR_STEPS.find(s => s.id === result.id)!;
    const shown = (step.findingMetrics ?? []).filter(name => result.metrics[name]).map(name => `${name}=${result.metrics[name]}`);
    console.log(`\nFindings — ${result.title}: ${shown.join(", ") || `exit code ${result.exitCode}`}`);
  }
  for (const result of results.filter(r => r.status === "error")) {
    console.log(`\nERROR — ${result.title} (exit ${result.exitCode ?? "none"})\n${result.note ?? ""}`);
  }

  if (comparison) {
    console.log(`\nChanges since ${comparison.previousDate}:`);
    if (!comparison.statusChanges.length && !comparison.metricChanges.length) console.log("  none");
    for (const change of comparison.statusChanges) {
      console.log(`  ${change.step}: ${change.previous} → ${change.current}`);
    }
    for (const change of comparison.metricChanges) {
      const delta = change.delta === null ? "" : ` (${change.delta > 0 ? "+" : ""}${change.delta})`;
      console.log(`  ${change.step}.${change.metric}: ${change.previous ?? "—"} → ${change.current ?? "—"}${delta}`);
    }
  } else if (!only) {
    console.log("\nNo earlier run to compare against; this run is the baseline.");
  }

  process.exit(results.some(r => r.status === "error") ? 1 : 0);
}

main();
