/**
 * Validation orchestrator — runs every Phase 1 gate, aggregates per-gate
 * results into a single {@link ValidationReport}, and decides the overall
 * verdict (PUBLISH / REVIEW / REJECT).
 *
 * Aggregation rules:
 *  — Any gate FAIL with a CRITICAL issue → overall REJECT
 *  — Any gate FAIL without CRITICALs → overall REVIEW
 *  — Any gate WARN (or any MAJOR/MINOR issue across gates) → overall REVIEW
 *  — All gates PASS / SKIPPED → overall PUBLISH
 *  — Gate ERRORs are surfaced but don't block by themselves; if every
 *    blocking gate errored we downgrade to REVIEW
 *
 * Score weighting (sums to 1.00):
 *   structural      0.20
 *   readability     0.15
 *   distractor      0.20
 *   key-uniqueness  0.15
 *   duplicate       0.15
 *   bias-fairness   0.10
 *   plagiarism      0.05
 *
 * Gates run in parallel where they don't share API resources; LLM-backed
 * gates (key-uniqueness, bias-fairness's judge half) share a Gemini quota
 * but the SDK already handles concurrency safely.
 */

import { logger } from "../../observability/logger.js";
import type {
  DraftItem,
  GateIssue,
  GateResult,
  OverallVerdict,
  ValidationOptions,
  ValidationReport,
} from "./types.js";
import { sortIssuesBySeverity, PIPELINE_VERSION } from "./types.js";

import { runStructuralGate } from "./gates/structural.js";
import { runReadabilityGate } from "./gates/readability.js";
import { runDistractorQualityGate } from "./gates/distractor-quality.js";
import { runKeyUniquenessGate } from "./gates/key-uniqueness.js";
import { runDuplicateGate } from "./gates/duplicate.js";
import { runBiasFairnessGate } from "./gates/bias-fairness.js";
import { runPlagiarismGate } from "./gates/plagiarism.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const GATE_WEIGHTS: Record<string, number> = {
  structural: 0.20,
  readability: 0.15,
  "distractor-quality": 0.20,
  "key-uniqueness": 0.15,
  duplicate: 0.15,
  "bias-fairness": 0.10,
  plagiarism: 0.05,
};

const DEFAULT_GATE_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run every Phase 1 validation gate and return an aggregated report.
 * Pure function — no side effects beyond logging.
 */
export async function validateDraftItem(
  item: DraftItem,
  options: ValidationOptions = {}
): Promise<ValidationReport> {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const disabled = new Set(options.disabledGates ?? []);
  const timeoutMs = options.gateTimeoutMs ?? DEFAULT_GATE_TIMEOUT_MS;

  logger.info(
    {
      validation: {
        itemId: item.id,
        skill: item.skill,
        cefrLevel: item.cefrLevel,
        type: item.type,
        bankSize: options.bankItems?.length ?? 0,
        disabled: Array.from(disabled),
        pipelineVersion: PIPELINE_VERSION,
      },
    },
    "validation.start"
  );

  // Run gates — fast, deterministic ones in one batch; LLM-backed in another.
  const fastGates = await Promise.all([
    runWithGuard("structural", disabled, timeoutMs, () => runStructuralGate(item)),
    runWithGuard("readability", disabled, timeoutMs, () => runReadabilityGate(item)),
    runWithGuard("distractor-quality", disabled, timeoutMs, () =>
      runDistractorQualityGate(item, { allowEmbeddings: options.allowEmbeddings })
    ),
    runWithGuard("duplicate", disabled, timeoutMs, () =>
      runDuplicateGate(item, options.bankItems ?? [], { allowEmbeddings: options.allowEmbeddings })
    ),
    runWithGuard("plagiarism", disabled, timeoutMs, () => runPlagiarismGate(item)),
  ]);

  const llmGates = await Promise.all([
    runWithGuard("key-uniqueness", disabled, timeoutMs, () =>
      runKeyUniquenessGate(item, { allowLlmJudge: options.allowLlmJudge })
    ),
    runWithGuard("bias-fairness", disabled, timeoutMs, () =>
      runBiasFairnessGate(item, { allowLlmJudge: options.allowLlmJudge })
    ),
  ]);

  const gates = [...fastGates, ...llmGates];

  // Aggregate
  const issues: GateIssue[] = sortIssuesBySeverity(gates.flatMap((g) => g.issues));
  const counts = {
    critical: issues.filter((i) => i.severity === "CRITICAL").length,
    major: issues.filter((i) => i.severity === "MAJOR").length,
    minor: issues.filter((i) => i.severity === "MINOR").length,
    info: issues.filter((i) => i.severity === "INFO").length,
  };

  const verdict = decideOverallVerdict(gates, counts);
  const score = computeWeightedScore(gates);
  const summary = buildSummary(verdict, counts, gates, item);
  const durationMs = Date.now() - startedAt;

  const report: ValidationReport = {
    itemId: item.id,
    verdict,
    score,
    counts,
    gates,
    issues,
    durationMs,
    startedAt: startedAtIso,
    pipelineVersion: PIPELINE_VERSION,
    summary,
  };

  logger.info(
    {
      validation: {
        itemId: item.id,
        verdict,
        score,
        counts,
        durationMs,
        gateSummary: gates.map((g) => ({ gate: g.gate, verdict: g.verdict, score: g.score })),
      },
    },
    "validation.complete"
  );

  return report;
}

/** Convenience: run multiple drafts (e.g. a batch from `bulkGenerate`). */
export async function validateDraftItemBatch(
  items: DraftItem[],
  options: ValidationOptions = {}
): Promise<ValidationReport[]> {
  // Run sequentially to respect API rate limits — embedding/judge calls fan
  // out per item, and parallel batches blow through quota fast.
  const reports: ValidationReport[] = [];
  for (const it of items) {
    reports.push(await validateDraftItem(it, options));
  }
  return reports;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNALS
// ─────────────────────────────────────────────────────────────────────────────

async function runWithGuard(
  name: string,
  disabled: Set<string>,
  timeoutMs: number,
  fn: () => Promise<GateResult>
): Promise<GateResult> {
  if (disabled.has(name)) {
    return {
      gate: name,
      verdict: "SKIPPED",
      score: 100,
      durationMs: 0,
      issues: [],
      metrics: { reason: "disabled" },
    };
  }
  const startedAt = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<GateResult>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`gate ${name} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return await Promise.race([fn(), timeout]);
  } catch (err) {
    return {
      gate: name,
      verdict: "ERROR",
      score: 0,
      durationMs: Date.now() - startedAt,
      issues: [],
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function decideOverallVerdict(
  gates: GateResult[],
  counts: { critical: number; major: number; minor: number; info: number }
): OverallVerdict {
  // Critical issue anywhere → REJECT
  if (counts.critical > 0) return "REJECT";

  const failGates = gates.filter((g) => g.verdict === "FAIL");
  const warnGates = gates.filter((g) => g.verdict === "WARN");
  const errorGates = gates.filter((g) => g.verdict === "ERROR");
  const blockingGates = gates.filter((g) => g.gate !== "plagiarism");

  // Any FAIL → REJECT (critical-free FAIL is unusual; treat as serious)
  if (failGates.length > 0) return "REJECT";

  // If every blocking gate errored → can't make a decision, push to REVIEW
  if (errorGates.length >= blockingGates.length) return "REVIEW";

  // WARN or any MAJOR/MINOR present → REVIEW
  if (warnGates.length > 0 || counts.major > 0 || counts.minor > 0) return "REVIEW";

  return "PUBLISH";
}

function computeWeightedScore(gates: GateResult[]): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const g of gates) {
    if (g.verdict === "SKIPPED" || g.verdict === "ERROR") continue;
    const w = GATE_WEIGHTS[g.gate] ?? 0;
    totalWeight += w;
    weightedSum += g.score * w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

function buildSummary(
  verdict: OverallVerdict,
  counts: { critical: number; major: number; minor: number; info: number },
  gates: GateResult[],
  item: DraftItem
): string {
  const head = `[${verdict}] ${item.skill} / ${item.cefrLevel} / ${item.type}`;
  const counts_str = `criticals=${counts.critical} majors=${counts.major} minors=${counts.minor}`;
  const failedGates = gates
    .filter((g) => g.verdict === "FAIL")
    .map((g) => g.gate);
  const warnedGates = gates
    .filter((g) => g.verdict === "WARN")
    .map((g) => g.gate);

  const tail =
    verdict === "PUBLISH"
      ? "All gates passed — eligible for auto-publish to PRETEST."
      : verdict === "REJECT"
      ? `Blocking issues in: ${failedGates.join(", ") || "(see issues)"}.`
      : `Reviewer attention needed: ${[...failedGates, ...warnedGates].join(", ") || "(see issues)"}.`;

  return `${head} | ${counts_str} | ${tail}`;
}
