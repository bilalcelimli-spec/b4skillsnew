/**
 * Phase 1 Validation Gate System — Shared Types
 *
 * A "gate" is a single-purpose validator that produces a verdict on one
 * dimension of item quality. The orchestrator runs every gate and aggregates
 * their outputs into a single decision (PUBLISH / REVIEW / REJECT).
 *
 * Design principles:
 *  — Gates are independent: any gate can be enabled / disabled / replaced
 *  — Gates fail soft: a gate that hits an error returns "ERROR" verdict but
 *    does not crash the pipeline
 *  — Gates are deterministic where possible; LLM-backed gates report their
 *    confidence and are subject to retry
 *  — Output is structured & machine-readable: every issue has a code,
 *    severity, category, and (where applicable) a suggested fix
 */

import type { CefrLevel, SkillType, ItemType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────────────────────

/** Severity of a single validation finding. */
export type Severity = "CRITICAL" | "MAJOR" | "MINOR" | "INFO";

/** Per-gate verdict (independent of severity counts). */
export type GateVerdict =
  | "PASS"        // gate is fully satisfied
  | "WARN"        // gate produced minor issues but is not blocking
  | "FAIL"        // gate produced blocking issues
  | "ERROR"       // gate could not run (missing dep / API failure)
  | "SKIPPED";    // gate explicitly skipped (config or N/A)

/** Final orchestrator verdict, derived from per-gate results. */
export type OverallVerdict =
  | "PUBLISH"     // all gates PASS or WARN — auto-publish to PRETEST
  | "REVIEW"      // 1+ gate WARN or single MINOR FAIL — human reviewer queue
  | "REJECT";     // 1+ gate FAIL with CRITICAL/MAJOR — block

export interface GateIssue {
  /** Stable code (e.g. "DISTR-OVERLAP-01") for analytics + i18n */
  code: string;
  severity: Severity;
  /** Short machine-readable category */
  category: string;
  /** Human-readable message */
  message: string;
  /** Optional content path that triggered the issue */
  field?: string;
  /** Concrete fix the writer can apply */
  suggestion?: string;
  /** Arbitrary structured data for UI rendering */
  data?: Record<string, unknown>;
}

export interface GateResult {
  /** Stable gate identifier (e.g. "structural", "distractor-quality") */
  gate: string;
  verdict: GateVerdict;
  /** 0–100 quality contribution from this gate (100 = perfect) */
  score: number;
  durationMs: number;
  issues: GateIssue[];
  /** Optional gate-specific metrics (e.g. embedding distances) */
  metrics?: Record<string, unknown>;
  /** Populated when verdict === "ERROR" */
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical shape of an item under review. Both fresh AI drafts and existing
 * bank items can be coerced into this shape via {@link toDraftItem}.
 */
export interface DraftItem {
  /** Optional: only set for existing items. New drafts have no id yet. */
  id?: string;
  type: ItemType;
  skill: SkillType;
  cefrLevel: CefrLevel;
  /** Free-form content payload (matches Prisma Item.content shape) */
  content: ItemContent;
  /** IRT a-parameter, if known */
  discrimination?: number | null;
  /** IRT b-parameter, if known */
  difficulty?: number | null;
  /** IRT c-parameter, if known */
  guessing?: number | null;
  tags?: string[];
}

/**
 * Content payload — superset of all skill / type combinations. Individual
 * gates pick the fields they need; missing fields are tolerated.
 */
export interface ItemContent {
  /** Reading passage / listening transcript / scenario context */
  stimulus?: string;
  /** Task instruction shown to the candidate */
  prompt?: string;
  /** Question stem */
  question?: string;
  stem?: string;
  /** MCQ / matching options */
  options?: string[];
  /** Single canonical correct answer */
  correctAnswer?: string | number;
  /** Multi-answer alternates (for fill-in-blanks etc.) */
  acceptableAnswers?: string[];
  /** Distractor explanations — each maps to one option */
  distractorRationale?: Record<string, string> | string[];
  /** Answer key explanation */
  answerKey?: string;
  /** Sample top-band response (for productive items) */
  sampleResponse?: string;
  /** Scoring rubric */
  rubric?: unknown;
  /** Anything else the writer wants to attach */
  [k: string]: unknown;
}

/**
 * Per-run configuration. Lets callers disable expensive gates (e.g. semantic
 * duplicate check) when an embedding API is unavailable, or when running in
 * fast-path mode.
 */
export interface ValidationOptions {
  /**
   * Compare against existing bank items for duplicate detection.
   * Pass [] to skip the bank comparison entirely.
   */
  bankItems?: DraftItem[];
  /** Disable specific gates by name. */
  disabledGates?: string[];
  /** Skip embedding-backed gates if no GEMINI_API_KEY is configured. */
  allowEmbeddings?: boolean;
  /** Skip LLM-judge-backed gates if no GEMINI_API_KEY is configured. */
  allowLlmJudge?: boolean;
  /** Override the embedding model name. */
  embeddingModel?: string;
  /** Override the judge model name. */
  judgeModel?: string;
  /** Per-gate timeout (ms). Defaults to 15s. */
  gateTimeoutMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationReport {
  itemId?: string;
  verdict: OverallVerdict;
  /** 0–100 weighted composite score */
  score: number;
  /** Counts aggregated across every gate */
  counts: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  /** Per-gate results in the order they were executed */
  gates: GateResult[];
  /** Flat issue list across every gate (sorted by severity) */
  issues: GateIssue[];
  /** Total wall-clock runtime in ms */
  durationMs: number;
  /** ISO-8601 timestamp when the run started */
  startedAt: string;
  /** Pipeline version used (bump on breaking gate changes) */
  pipelineVersion: string;
  /** Concise reviewer-facing summary */
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
  INFO: 3,
};

export function sortIssuesBySeverity(issues: GateIssue[]): GateIssue[] {
  return [...issues].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Convert a Prisma Item row into a DraftItem (best-effort). */
export function toDraftItem(row: {
  id: string;
  type: ItemType;
  skill: SkillType;
  cefrLevel: CefrLevel;
  content: unknown;
  discrimination?: number | null;
  difficulty?: number | null;
  guessing?: number | null;
  tags?: string[];
}): DraftItem {
  const content = (row.content && typeof row.content === "object")
    ? (row.content as ItemContent)
    : {};
  return {
    id: row.id,
    type: row.type,
    skill: row.skill,
    cefrLevel: row.cefrLevel,
    content,
    discrimination: row.discrimination,
    difficulty: row.difficulty,
    guessing: row.guessing,
    tags: row.tags ?? [],
  };
}

/** Pull every text segment out of an item content payload. */
export function flattenItemText(c: ItemContent): string {
  const parts: string[] = [];
  if (c.stimulus) parts.push(String(c.stimulus));
  if (c.prompt) parts.push(String(c.prompt));
  if (c.question) parts.push(String(c.question));
  if (c.stem) parts.push(String(c.stem));
  if (Array.isArray(c.options)) parts.push(...c.options.map(String));
  if (typeof c.correctAnswer === "string") parts.push(c.correctAnswer);
  if (Array.isArray(c.acceptableAnswers)) parts.push(...c.acceptableAnswers.map(String));
  if (c.answerKey) parts.push(String(c.answerKey));
  return parts.filter(Boolean).join("\n\n");
}

/** Pipeline version — bump when adding/removing gates or changing thresholds. */
export const PIPELINE_VERSION = "1.0.0";
