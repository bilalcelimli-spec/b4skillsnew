/**
 * Content integrity gate (deterministic).
 *
 * Catches items whose key can be found without the intended skill:
 * word-matching against the passage, style-identifiable keys, and
 * cognitive demand below what the CEFR level requires.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import { calculateContentIqs } from "../../../psychometrics/content-iqs.js";

const GATE_NAME = "content-integrity";

const SEVERITY: Record<string, GateIssue["severity"]> = {
  LEXICAL_LIFT: "MAJOR",
  TEST_WISENESS: "MAJOR",
  DEMAND_BELOW_LEVEL: "MAJOR",
  DEMAND_ABOVE_LEVEL: "MINOR",
  STRUCTURE: "CRITICAL",
};

const SUGGESTION: Record<string, string> = {
  LEXICAL_LIFT: "Paraphrase the key and make every distractor reuse comparable wording from the text.",
  TEST_WISENESS: "Remove absolutes from distractors and equalise length and hedging across all options.",
  DEMAND_BELOW_LEVEL: "Rewrite the question to require inference, stance or synthesis rather than locating a detail.",
  DEMAND_ABOVE_LEVEL: "Lower the demand or raise the CEFR label.",
  STRUCTURE: "Mark exactly one correct option.",
};

export async function runContentIntegrityGate(item: DraftItem): Promise<GateResult> {
  const startedAt = Date.now();
  const c = item.content as Record<string, any>;
  const meta = typeof c.cognitiveDemand === "string" ? { cognitiveDemand: c.cognitiveDemand } : undefined;

  const result = calculateContentIqs({
    skill: item.skill,
    cefrLevel: item.cefrLevel,
    type: item.type,
    content: c,
    metadata: meta,
  }, { absolutesThreshold: 1 });

  const issues: GateIssue[] = result.flags.map((f) => ({
    code: `INTEG-${f.code}`,
    severity: SEVERITY[f.code] ?? "MINOR",
    category: "content-integrity",
    message: f.message,
    suggestion: SUGGESTION[f.code],
  }));

  // Heuristic flags route to human review (WARN); only a structural defect blocks.
  const hasCritical = issues.some((i) => i.severity === "CRITICAL");
  return {
    gate: GATE_NAME,
    verdict: issues.length === 0 ? "PASS" : hasCritical ? "FAIL" : "WARN",
    score: result.score,
    durationMs: Date.now() - startedAt,
    issues,
    metrics: { flags: result.flags.map((f) => f.code) },
  };
}
