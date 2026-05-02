/**
 * Structural gate — wraps the existing ItemQualityValidator with the unified
 * GateResult shape. This catches:
 *   — Missing fields (skill, cefrLevel, content, options)
 *   — IRT parameter plausibility (a/b/c vs CEFR norms)
 *   — Item writing guidelines (negation emphasis, "all of the above", option
 *     length variability, missing answer-key rationale)
 *
 * Bias heuristics from the legacy validator are intentionally NOT invoked
 * here — bias is handled by the dedicated bias-fairness gate.
 */

import type { DraftItem, GateIssue, GateResult } from "../types.js";
import {
  ItemQualityValidator,
  type QualityIssue,
  type ItemToValidate,
} from "../../../language-skills/item-quality-validator.js";

const GATE_NAME = "structural";

/** Issue codes from the legacy validator that we route to the bias gate. */
const BIAS_CODE_PREFIXES = ["BIAS-"];

export async function runStructuralGate(item: DraftItem): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];

  try {
    const input: ItemToValidate = {
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      type: item.type,
      discrimination: item.discrimination ?? null,
      difficulty: item.difficulty ?? null,
      guessing: item.guessing ?? null,
      content: item.content as Record<string, unknown>,
      tags: item.tags ?? null,
    };

    const report = ItemQualityValidator.validate(input);

    for (const raw of report.issues) {
      if (BIAS_CODE_PREFIXES.some((p) => raw.code.startsWith(p))) continue;
      issues.push(mapIssue(raw));
    }

    const { critical, major } = countSeverities(issues);
    const verdict = critical > 0 ? "FAIL" : major > 0 ? "WARN" : "PASS";

    return {
      gate: GATE_NAME,
      verdict,
      score: report.qualityScore,
      durationMs: Date.now() - startedAt,
      issues,
      metrics: {
        legacyStatus: report.status,
        legacyScore: report.qualityScore,
        criticalCount: critical,
        majorCount: major,
      },
    };
  } catch (err) {
    return {
      gate: GATE_NAME,
      verdict: "ERROR",
      score: 0,
      durationMs: Date.now() - startedAt,
      issues,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function mapIssue(raw: QualityIssue): GateIssue {
  return {
    code: raw.code,
    severity: raw.severity === "INFO" ? "INFO" : raw.severity,
    category: `structural.${raw.category}`,
    message: raw.message,
    field: raw.field,
    suggestion: raw.suggestion,
  };
}

function countSeverities(issues: GateIssue[]) {
  return {
    critical: issues.filter((i) => i.severity === "CRITICAL").length,
    major: issues.filter((i) => i.severity === "MAJOR").length,
    minor: issues.filter((i) => i.severity === "MINOR").length,
  };
}
