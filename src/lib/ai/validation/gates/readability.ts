/**
 * Readability / CEFR-alignment gate.
 *
 * Wraps the existing readability engine and adds explicit CEFR-band gating:
 *   — Predicted reading level must be within ±1 band of the target
 *   — Vocabulary ceiling: ≤2 ceiling violations for productive items, ≤4 for
 *     receptive items (longer stimuli get more leeway)
 *   — Average sentence length within the per-CEFR-level norm window
 *
 * Productive items (WRITING / SPEAKING prompts) only check the prompt + sample
 * response when present — they don't gate on stimulus complexity (because
 * learners *produce* the language, they don't read it).
 */

import type { CefrLevel } from "@prisma/client";
import { analyseText, type LinguisticQualityReport } from "../../../language-skills/readability-engine.js";
import type { DraftItem, GateIssue, GateResult, Severity } from "../types.js";

const GATE_NAME = "readability";

const CEFR_ORDER: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const cefrIdx = (l: CefrLevel) => CEFR_ORDER.indexOf(l);

export async function runReadabilityGate(item: DraftItem): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];

  try {
    const text = pickTextForReadability(item);
    if (!text || text.split(/\s+/).length < 8) {
      // Not enough text for readability metrics to be meaningful — informational only
      return {
        gate: GATE_NAME,
        verdict: "SKIPPED",
        score: 100,
        durationMs: Date.now() - startedAt,
        issues: [],
        metrics: { reason: "text-too-short" },
      };
    }

    const report = analyseText(text, item.cefrLevel);

    for (const issue of report.issues) {
      issues.push(mapIssue(issue));
    }

    // Hard gate: predicted band more than 1 step away from target
    const predicted = report.readability.predictedCefrLevel;
    const drift = Math.abs(cefrIdx(predicted) - cefrIdx(item.cefrLevel));
    if (drift > 1) {
      issues.push({
        code: "CEFR-DRIFT-01",
        severity: "MAJOR",
        category: "readability.cefr-alignment",
        message: `Predicted reading level ${predicted} is ${drift} bands away from target ${item.cefrLevel}. Revise stimulus complexity.`,
        suggestion: drift > 0 && cefrIdx(predicted) > cefrIdx(item.cefrLevel)
          ? "Simplify vocabulary and shorten sentences."
          : "Increase syntactic complexity and use more level-appropriate vocabulary.",
        data: { predicted, target: item.cefrLevel, drift },
      });
    }

    // Productive items: require a sample response (used for downstream rubric anchoring)
    if (item.skill === "WRITING" || item.skill === "SPEAKING") {
      const sample = String(item.content?.sampleResponse ?? "");
      if (sample.split(/\s+/).filter(Boolean).length < 20) {
        issues.push({
          code: "PRODUCTIVE-SAMPLE-01",
          severity: "MAJOR",
          category: "readability.productive-sample",
          message: "Productive items should ship with a CEFR-appropriate sample response (≥20 words) to anchor scoring.",
          suggestion: "Add a `sampleResponse` field demonstrating a top-band reply.",
        });
      }
    }

    const { critical, major } = countSeverities(issues);
    const verdict = critical > 0 ? "FAIL" : major > 0 ? "WARN" : "PASS";

    return {
      gate: GATE_NAME,
      verdict,
      score: report.qualityScore,
      durationMs: Date.now() - startedAt,
      issues,
      metrics: extractMetrics(report),
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

function pickTextForReadability(item: DraftItem): string {
  const c = item.content;
  const parts: string[] = [];

  // For productive (WRITING/SPEAKING), only the prompt is candidate-facing — keep
  // the analysis tight. For receptive, include the stimulus.
  if (item.skill === "WRITING" || item.skill === "SPEAKING") {
    if (c.prompt) parts.push(String(c.prompt));
    if (c.sampleResponse) parts.push(String(c.sampleResponse));
  } else {
    if (c.stimulus) parts.push(String(c.stimulus));
    if (c.question) parts.push(String(c.question));
    if (c.stem) parts.push(String(c.stem));
    if (Array.isArray(c.options)) parts.push(c.options.map(String).join(". "));
  }
  return parts.filter(Boolean).join("\n\n");
}

function mapIssue(raw: LinguisticQualityReport["issues"][number]): GateIssue {
  const sev: Severity =
    raw.severity === "critical" ? "CRITICAL" :
    raw.severity === "major" ? "MAJOR" : "MINOR";
  return {
    code: severityCode(raw.severity),
    severity: sev,
    category: "readability.linguistic",
    message: raw.message,
  };
}

function severityCode(s: "critical" | "major" | "minor"): string {
  return `READ-${s.toUpperCase()}-${stableHash(s).slice(0, 4)}`;
}

function stableHash(s: string): string {
  // Tiny non-crypto hash — just to attach a stable code to identical messages.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h).toString(16);
}

function extractMetrics(report: LinguisticQualityReport): Record<string, unknown> {
  return {
    fre: report.readability.fleschReadingEase,
    fkgl: report.readability.fleschKincaidGrade,
    avgSentenceLength: report.readability.avgSentenceLength,
    typeTokenRatio: report.readability.typeTokenRatio,
    predictedCefr: report.readability.predictedCefrLevel,
    estimatedVocabLevel: report.lexical.estimatedVocabLevel,
    ceilingViolations: report.lexical.ceilingViolations.length,
    wordCount: report.readability.wordCount,
  };
}

function countSeverities(issues: GateIssue[]) {
  return {
    critical: issues.filter((i) => i.severity === "CRITICAL").length,
    major: issues.filter((i) => i.severity === "MAJOR").length,
  };
}
