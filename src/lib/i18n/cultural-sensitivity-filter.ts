/**
 * b4skills Cultural Sensitivity Filter
 * Detects potentially offensive or culturally inappropriate content in assessment items.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export interface SensitivityViolation {
  category: string;
  severity: Severity;
  match: string;
  suggestion: string;
}

export interface SensitivityReport {
  overallScore: number; // 0-100, higher = safer
  violations: SensitivityViolation[];
  safeForRegions: string[];
  blockedForRegions: string[];
  flaggedForReview: boolean;
}

interface SensitivityRule {
  category: string;
  severity: Severity;
  pattern: RegExp;
  suggestion: string;
  blocksRegions?: string[];
}

const GLOBAL_RULES: SensitivityRule[] = [
  { category: "racial_slur", severity: "critical", pattern: /\b(n-word|chink|spic|kike|wog)\b/gi, suggestion: "Remove racial slurs immediately" },
  { category: "disability_slur", severity: "critical", pattern: /\b(retard|cripple|moron|idiot)\b/gi, suggestion: "Use person-first respectful language" },
  { category: "gender_stereotype", severity: "high", pattern: /\b(girls? (are|can't)|boys? don't (cry|show))\b/gi, suggestion: "Avoid gender stereotypes" },
  { category: "ethnic_stereotype", severity: "high", pattern: /\b(all (asian|african|arab|hispanic|muslim|jewish) (people|men|women) are)\b/gi, suggestion: "Avoid ethnic generalisations" },
  { category: "ableist_language", severity: "medium", pattern: /\b(deaf and dumb|confined to a wheelchair|suffers? from)\b/gi, suggestion: "Use inclusive disability language" },
  { category: "dated_terminology", severity: "low", pattern: /\b(mankind|man-made|stewardess|policeman)\b/gi, suggestion: "Use gender-neutral terms (humankind, artificial, flight attendant, police officer)" },
];

const REGION_RULES: Record<string, SensitivityRule[]> = {
  TR: [
    { category: "political_sensitivity", severity: "high", pattern: /\b(armenian genocide|kurdish state|cyprus invasion)\b/gi, suggestion: "Avoid politically sensitive historical references for Turkey", blocksRegions: ["TR"] },
  ],
  CN: [
    { category: "political_sensitivity", severity: "critical", pattern: /\b(taiwan independence|tiananmen|free tibet|uyghur)\b/gi, suggestion: "Content may violate Chinese content policies", blocksRegions: ["CN"] },
  ],
  TR_food: [
    { category: "food_sensitivity", severity: "medium", pattern: /\b(pork|bacon|ham|lard)\b/gi, suggestion: "Consider halal dietary requirements", blocksRegions: ["TR"] },
  ],
  CONSERVATIVE: [
    { category: "alcohol_reference", severity: "medium", pattern: /\b(beer|wine|whisky|vodka|drunk|pub|bar)\b/gi, suggestion: "Consider alcohol-free content for conservative regions", blocksRegions: ["SA", "IR"] },
  ],
  SECULAR: [
    { category: "religious_content", severity: "low", pattern: /\b(pray|church|mosque|temple|god|allah)\b/gi, suggestion: "Consider secular alternatives for contexts requiring religious neutrality" },
  ],
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3 };

export class CulturalSensitivityFilter {
  evaluate(text: string, targetRegions: string[] = []): SensitivityReport {
    const violations: SensitivityViolation[] = [];

    // Global rules
    for (const rule of GLOBAL_RULES) {
      const matches = [...text.matchAll(rule.pattern)].map((m) => m[0]);
      for (const match of matches) {
        violations.push({ category: rule.category, severity: rule.severity, match, suggestion: rule.suggestion });
      }
    }

    // Region-specific rules
    const blockedRegions = new Set<string>();
    for (const rules of Object.values(REGION_RULES)) {
      for (const rule of rules) {
        if (rule.pattern.test(text)) {
          violations.push({ category: rule.category, severity: rule.severity, match: "(detected)", suggestion: rule.suggestion });
          if (rule.blocksRegions) rule.blocksRegions.forEach((r) => blockedRegions.add(r));
        }
      }
    }

    const totalPenalty = violations.reduce((sum, v) => sum + SEVERITY_WEIGHT[v.severity], 0);
    const overallScore = Math.max(0, 100 - totalPenalty);

    const safeRegions = targetRegions.filter((r) => !blockedRegions.has(r));
    const blockedForRegions = targetRegions.filter((r) => blockedRegions.has(r));
    const flaggedForReview = overallScore < 70 || violations.some((v) => v.severity === "critical" || v.severity === "high");

    return { overallScore, violations, safeForRegions: safeRegions, blockedForRegions, flaggedForReview };
  }

  isSafeForRegion(text: string, region: string): boolean {
    const report = this.evaluate(text, [region]);
    return !report.blockedForRegions.includes(region) && report.overallScore >= 70;
  }

  generateSafetyReport(text: string, regions: string[]): string {
    const report = this.evaluate(text, regions);
    const lines = [
      `Safety Score: ${report.overallScore}/100`,
      `Safe for: ${report.safeForRegions.join(", ") || "All"}`,
      report.blockedForRegions.length > 0 ? `Blocked for: ${report.blockedForRegions.join(", ")}` : "",
      ...report.violations.map((v) => `[${v.severity.toUpperCase()}] ${v.category}: "${v.match}" → ${v.suggestion}`),
    ].filter(Boolean);
    return lines.join("\n");
  }
}

export const culturalSensitivityFilter = new CulturalSensitivityFilter();
