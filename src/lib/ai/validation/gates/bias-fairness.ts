/**
 * Bias & fairness gate.
 *
 * Two complementary checks:
 *  1. Pattern dictionary — fast regex sweep over content text for known bias
 *     triggers (gendered pronouns, religious holidays, named political
 *     figures, violence, race terms, ableist language, regional stereotypes).
 *     This is conservative — false positives are expected and become MINOR
 *     issues; reviewers triage them.
 *  2. LLM judge — when available, asks Gemini to identify culturally
 *     loaded, regionally specific, or potentially inequitable scenarios that
 *     a rule list can't capture (e.g. assumed knowledge of US sports, baking
 *     measurements in cups, trivia about specific holidays).
 *
 * The Mantel-Haenszel / DIF analysis happens later in the pipeline (post-
 * pretest) — this gate is the *prevention* layer, not the *detection* layer.
 */

import type { DraftItem, GateIssue, GateResult, Severity } from "../types.js";
import { flattenItemText } from "../types.js";
import { isJudgeAvailable, runJudge, JudgeType } from "../prompt-judge.js";

const GATE_NAME = "bias-fairness";

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN DICTIONARY
// ─────────────────────────────────────────────────────────────────────────────

interface BiasPattern {
  code: string;
  pattern: RegExp;
  severity: Severity;
  category: string;
  message: string;
  suggestion: string;
}

const PATTERNS: BiasPattern[] = [
  // Gender pronouns (informational — only flagged if both genders aren't represented)
  {
    code: "BIAS-GENDER-01",
    pattern: /\b(he|him|his)\b/gi,
    severity: "INFO",
    category: "bias.gender",
    message: "Masculine third-person pronoun present.",
    suggestion: "Consider using 'they/their' or balancing with feminine pronouns elsewhere in the bank.",
  },
  {
    code: "BIAS-GENDER-02",
    pattern: /\b(she|her|hers)\b/gi,
    severity: "INFO",
    category: "bias.gender",
    message: "Feminine third-person pronoun present.",
    suggestion: "Consider using 'they/their' or balancing with masculine pronouns elsewhere in the bank.",
  },

  // Religion / cultural holidays
  {
    code: "BIAS-RELIGION-01",
    pattern: /\b(christmas|easter|ramadan|eid|diwali|hanukkah|hannukah|passover|yom kippur|lent|good friday)\b/gi,
    severity: "MAJOR",
    category: "bias.religion",
    message: "Religious or culturally specific holiday referenced.",
    suggestion: "Use a culturally neutral context, or balance representation across the bank.",
  },

  // Political figures
  {
    code: "BIAS-POLITICAL-01",
    pattern: /\b(trump|obama|biden|putin|xi jinping|erdoğan|erdogan|macron|johnson|merkel|modi|netanyahu|zelensky|harris)\b/gi,
    severity: "MAJOR",
    category: "bias.political",
    message: "Named political figure detected.",
    suggestion: "Replace with a fictional or historically distant figure to avoid date-stamping the item.",
  },

  // Violence / trauma
  {
    code: "BIAS-VIOLENCE-01",
    pattern: /\b(murder|kill|assault|terrorist|bomb|gun|weapon|war|massacre|genocide|rape|abuse|torture)\b/gi,
    severity: "MAJOR",
    category: "bias.violence",
    message: "Violence/trauma keyword detected.",
    suggestion: "Avoid distressing content unless the construct explicitly requires it.",
  },

  // Race / ethnicity stereotypes
  {
    code: "BIAS-RACE-01",
    pattern: /\b(white|black|asian|hispanic|latino|latina|arab|jewish|muslim|christian|hindu|buddhist) (people|men|women|culture|community)\b/gi,
    severity: "MAJOR",
    category: "bias.race",
    message: "Racial/ethnic group reference detected.",
    suggestion: "Avoid generalisations; use specific, individual scenarios where possible.",
  },

  // Ableist language
  {
    code: "BIAS-ABLEISM-01",
    pattern: /\b(crippled|retarded|insane|crazy|psycho|dumb|lame)\b/gi,
    severity: "MAJOR",
    category: "bias.ableism",
    message: "Potentially ableist term detected.",
    suggestion: "Replace with respectful, person-first language.",
  },

  // Western-only assumptions
  {
    code: "BIAS-WESTERN-01",
    pattern: /\b(thanksgiving|prom|homecoming|fraternity|sorority|cheerleader|spring break|tailgate)\b/gi,
    severity: "MAJOR",
    category: "bias.cultural",
    message: "Culturally specific (Western/US-centric) reference detected.",
    suggestion: "Use a globally accessible scenario, or define the term in context.",
  },

  // Socioeconomic assumptions
  {
    code: "BIAS-SES-01",
    pattern: /\b(yacht|country club|private jet|mansion|nanny|housekeeper|trust fund)\b/gi,
    severity: "MINOR",
    category: "bias.socioeconomic",
    message: "Wealth-assuming reference detected.",
    suggestion: "Use a context accessible to candidates of varied socioeconomic backgrounds.",
  },

  // Idioms / sports trivia (often assumed Western)
  {
    code: "BIAS-IDIOM-01",
    pattern: /\b(home run|touchdown|hat trick|grand slam|hail mary|slam dunk|foul ball)\b/gi,
    severity: "MAJOR",
    category: "bias.idiom",
    message: "Sports-specific idiom detected (assumes US/UK cultural knowledge).",
    suggestion: "Replace with a culture-neutral expression or define in context.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LLM JUDGE
// ─────────────────────────────────────────────────────────────────────────────

interface JudgeBiasVerdict {
  hasBias: boolean;
  findings: Array<{
    type: "cultural" | "gender" | "race" | "religion" | "ableism" | "socioeconomic" | "regional" | "other";
    severity: "low" | "medium" | "high";
    description: string;
    snippet: string;
  }>;
  reasoning: string;
}

const RESPONSE_SCHEMA = {
  type: JudgeType.OBJECT,
  properties: {
    hasBias: { type: JudgeType.BOOLEAN },
    findings: {
      type: JudgeType.ARRAY,
      items: {
        type: JudgeType.OBJECT,
        properties: {
          type: { type: JudgeType.STRING },
          severity: { type: JudgeType.STRING },
          description: { type: JudgeType.STRING },
          snippet: { type: JudgeType.STRING },
        },
        required: ["type", "severity", "description", "snippet"],
      },
    },
    reasoning: { type: JudgeType.STRING },
  },
  required: ["hasBias", "findings", "reasoning"],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export async function runBiasFairnessGate(
  item: DraftItem,
  options: { allowLlmJudge?: boolean } = {}
): Promise<GateResult> {
  const startedAt = Date.now();
  const issues: GateIssue[] = [];
  const metrics: Record<string, unknown> = {};

  try {
    const text = flattenItemText(item.content);
    if (!text) {
      return {
        gate: GATE_NAME,
        verdict: "SKIPPED",
        score: 100,
        durationMs: Date.now() - startedAt,
        issues: [],
        metrics: { reason: "empty-text" },
      };
    }

    // 1. Pattern sweep
    for (const p of PATTERNS) {
      p.pattern.lastIndex = 0;
      const matches = text.match(p.pattern);
      if (matches && matches.length > 0) {
        issues.push({
          code: p.code,
          severity: p.severity,
          category: p.category,
          message: `${p.message} Match(es): ${unique(matches).slice(0, 3).join(", ")}.`,
          suggestion: p.suggestion,
          data: { matchCount: matches.length, samples: unique(matches).slice(0, 5) },
        });
      }
    }
    metrics.patternMatches = issues.filter((i) => i.code.startsWith("BIAS-")).length;

    // 2. LLM judge (optional)
    if (options.allowLlmJudge !== false && isJudgeAvailable()) {
      const verdict = await runJudgeOnText(text, item);
      if (verdict) {
        metrics.judgeUsed = true;
        metrics.judgeReasoning = verdict.reasoning;
        for (const f of verdict.findings) {
          const sev: Severity =
            f.severity === "high" ? "MAJOR" :
            f.severity === "medium" ? "MINOR" : "INFO";
          issues.push({
            code: `BIAS-LLM-${f.type.toUpperCase()}`,
            severity: sev,
            category: `bias.${f.type}`,
            message: `${f.description}${f.snippet ? ` ("${truncate(f.snippet, 80)}")` : ""}`,
            data: { judgeFinding: f },
          });
        }
      } else {
        metrics.judgeUsed = false;
      }
    } else {
      metrics.judgeUsed = false;
    }

    return finalize(issues, metrics, startedAt);
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

// ─────────────────────────────────────────────────────────────────────────────

async function runJudgeOnText(text: string, item: DraftItem): Promise<JudgeBiasVerdict | null> {
  const prompt = `You are a fairness reviewer for an internationally distributed CEFR-aligned English assessment.

Candidates take this test from many countries (Turkey, Brazil, China, India, Germany, Saudi Arabia, Nigeria, Mexico…) with diverse cultural, religious, and socioeconomic backgrounds.

Review the following item content for any bias or fairness concern that could disadvantage a subset of test-takers:
  — Cultural specificity (assumed knowledge of one country's customs, holidays, sports, food)
  — Gender, race, religion, ability, or socioeconomic stereotyping
  — Region-locked vocabulary (e.g. "fries" vs "chips", "elevator" vs "lift") presented as if universal
  — Loaded political or historical references

Item skill: ${item.skill}
Target CEFR: ${item.cefrLevel}

Item content:
"""
${truncate(text, 4000)}
"""

Return JSON with:
  - hasBias: boolean
  - findings: array of { type, severity (low/medium/high), description, snippet }
  - reasoning: 1-2 sentence summary

If no bias is found, return hasBias=false and an empty findings array.`;

  return runJudge<JudgeBiasVerdict>({
    prompt,
    responseSchema: RESPONSE_SCHEMA,
    options: { temperature: 0.2, timeoutMs: 25_000 },
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function finalize(
  issues: GateIssue[],
  metrics: Record<string, unknown>,
  startedAt: number
): GateResult {
  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const major = issues.filter((i) => i.severity === "MAJOR").length;
  const minor = issues.filter((i) => i.severity === "MINOR").length;
  let score = 100 - critical * 25 - major * 8 - minor * 2;
  score = Math.max(0, score);
  // Bias is a soft gate: even MAJOR triggers WARN (not FAIL) — bias is a
  // judgment call and reviewers should adjudicate.
  const verdict =
    critical > 0 ? "FAIL" :
    major > 1 ? "WARN" :
    major === 1 || minor > 0 ? "WARN" : "PASS";
  return {
    gate: GATE_NAME,
    verdict,
    score,
    durationMs: Date.now() - startedAt,
    issues,
    metrics,
  };
}
