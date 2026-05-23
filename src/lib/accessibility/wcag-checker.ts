/**
 * b4skills WCAG 2.1 AA Accessibility Checker
 *
 * Audits HTML content / component structure for accessibility issues.
 * Returns an accessibility score (0-100) and a list of violations.
 */

export type WCAGLevel = "A" | "AA" | "AAA";
export type Severity = "critical" | "serious" | "moderate" | "minor";

export interface WCAGViolation {
  rule: string;
  wcagCriteria: string;
  level: WCAGLevel;
  severity: Severity;
  description: string;
  element?: string;
  fix: string;
}

export interface AccessibilityAuditResult {
  score: number; // 0-100
  violations: WCAGViolation[];
  passes: string[];
  warnings: string[];
  totalChecks: number;
  passRate: number;
}

// ---------------------------------------------------------------------------
// WCAG rules registry
// ---------------------------------------------------------------------------

interface WCAGRule {
  id: string;
  criteria: string;
  level: WCAGLevel;
  severity: Severity;
  description: string;
  fix: string;
  check: (html: string) => boolean; // true = violation found
}

const WCAG_RULES: WCAGRule[] = [
  {
    id: "img-alt",
    criteria: "1.1.1",
    level: "A",
    severity: "critical",
    description: "Images must have alt text",
    fix: "Add descriptive alt attribute to all <img> elements",
    check: (html) => /<img(?![^>]*\balt=)[^>]*>/i.test(html),
  },
  {
    id: "form-label",
    criteria: "1.3.1",
    level: "A",
    severity: "serious",
    description: "Form inputs must have associated labels",
    fix: "Wrap inputs in <label> or use aria-label/aria-labelledby",
    check: (html) => /<input(?![^>]*\baria-label)[^>]*>(?![\s\S]*?<\/label>)/i.test(html),
  },
  {
    id: "fieldset-legend",
    criteria: "1.3.1",
    level: "A",
    severity: "serious",
    description: "Radio groups should be wrapped in <fieldset> with <legend>",
    fix: "Wrap radio button groups in <fieldset><legend>Description</legend>...</fieldset>",
    check: (html) => {
      const hasRadios = /type="radio"/i.test(html);
      const hasFieldset = /<fieldset/i.test(html);
      return hasRadios && !hasFieldset;
    },
  },
  {
    id: "color-contrast",
    criteria: "1.4.3",
    level: "AA",
    severity: "serious",
    description: "Text must have sufficient colour contrast (4.5:1 for normal text)",
    fix: "Use colours with contrast ratio ≥ 4.5:1. Check with browser dev tools.",
    check: (html) => {
      // Detect inline light-grey text on white (common mistake)
      return /color:\s*(#[ef][ef][ef]|#ddd|#ccc|lightgrey|lightgray)/i.test(html);
    },
  },
  {
    id: "keyboard-focus",
    criteria: "2.1.1",
    level: "A",
    severity: "critical",
    description: "All interactive elements must be keyboard accessible",
    fix: "Ensure interactive elements have tabindex or are native focusable elements",
    check: (html) => /onclick="[^"]*"(?![^>]*tabindex)/i.test(html) && !/button|a\s|input/i.test(html),
  },
  {
    id: "focus-visible",
    criteria: "2.4.7",
    level: "AA",
    severity: "serious",
    description: "Keyboard focus must be visible",
    fix: "Do not use outline: none without a custom focus indicator",
    check: (html) => /outline:\s*none|outline:\s*0/i.test(html),
  },
  {
    id: "page-title",
    criteria: "2.4.2",
    level: "A",
    severity: "moderate",
    description: "Page must have a descriptive title",
    fix: "Add a <title> element with a descriptive name",
    check: (html) => /<html/i.test(html) && !/<title/i.test(html),
  },
  {
    id: "language",
    criteria: "3.1.1",
    level: "A",
    severity: "moderate",
    description: "Page language must be specified",
    fix: "Add lang attribute to <html> element (e.g., lang='en')",
    check: (html) => /<html/i.test(html) && !/<html[^>]*\blang=/i.test(html),
  },
  {
    id: "aria-roles",
    criteria: "4.1.2",
    level: "A",
    severity: "serious",
    description: "ARIA roles must be used correctly",
    fix: "Use valid ARIA roles and ensure required attributes are present",
    check: (html) => /role="(button|checkbox|radio)"/i.test(html) && !/(aria-label|aria-labelledby)/i.test(html),
  },
  {
    id: "link-purpose",
    criteria: "2.4.4",
    level: "A",
    severity: "moderate",
    description: "Link text should describe the destination",
    fix: "Replace generic 'click here' or 'read more' with descriptive link text",
    check: (html) => /<a[^>]*>\s*(click here|read more|here)\s*<\/a>/i.test(html),
  },
  {
    id: "skip-link",
    criteria: "2.4.1",
    level: "A",
    severity: "moderate",
    description: "Page should have skip navigation link",
    fix: "Add a 'Skip to main content' link at the top of the page",
    check: (html) => /<nav/i.test(html) && !/skip.*main|skip.*content/i.test(html),
  },
  {
    id: "heading-order",
    criteria: "1.3.1",
    level: "A",
    severity: "moderate",
    description: "Headings should be in logical order",
    fix: "Don't skip heading levels (e.g., h1 → h3 without h2)",
    check: (html) => /<h1/i.test(html) && /<h3/i.test(html) && !/<h2/i.test(html),
  },
  {
    id: "autocomplete",
    criteria: "1.3.5",
    level: "AA",
    severity: "minor",
    description: "Form fields for personal information should have autocomplete attributes",
    fix: "Add autocomplete attributes to name/email/phone inputs",
    check: (html) => /type="(email|tel)"/i.test(html) && !/(autocomplete=)/i.test(html),
  },
];

// ---------------------------------------------------------------------------
// Checker
// ---------------------------------------------------------------------------

export class WCAGChecker {
  /**
   * Audit HTML content for WCAG 2.1 AA compliance.
   */
  audit(html: string, targetLevel: WCAGLevel = "AA"): AccessibilityAuditResult {
    const applicableRules = WCAG_RULES.filter((r) =>
      targetLevel === "A"
        ? r.level === "A"
        : targetLevel === "AA"
          ? r.level === "A" || r.level === "AA"
          : true
    );

    const violations: WCAGViolation[] = [];
    const passes: string[] = [];
    const warnings: string[] = [];

    for (const rule of applicableRules) {
      try {
        if (rule.check(html)) {
          violations.push({
            rule: rule.id,
            wcagCriteria: rule.criteria,
            level: rule.level,
            severity: rule.severity,
            description: rule.description,
            fix: rule.fix,
          });
        } else {
          passes.push(`${rule.id} (WCAG ${rule.criteria})`);
        }
      } catch {
        warnings.push(`Rule ${rule.id} could not be evaluated`);
      }
    }

    const totalChecks = applicableRules.length;
    const passCount = passes.length;
    const passRate = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 100;

    // Score: weighted by severity
    const severityWeight: Record<Severity, number> = {
      critical: 4,
      serious: 3,
      moderate: 2,
      minor: 1,
    };
    const totalPenalty = violations.reduce((sum, v) => sum + severityWeight[v.severity], 0);
    const maxPenalty = applicableRules.reduce((sum, r) => sum + severityWeight[r.severity], 0);
    const score = maxPenalty === 0 ? 100 : Math.round(((maxPenalty - totalPenalty) / maxPenalty) * 100);

    return { score, violations, passes, warnings, totalChecks, passRate };
  }

  /**
   * Check a list of component descriptions (for server-side analysis).
   */
  auditComponents(components: Array<{ name: string; html: string }>): Array<{
    component: string;
    result: AccessibilityAuditResult;
  }> {
    return components.map((c) => ({
      component: c.name,
      result: this.audit(c.html),
    }));
  }

  /**
   * Generate a human-readable report.
   */
  generateReport(result: AccessibilityAuditResult): string {
    const lines = [
      `WCAG Accessibility Audit Report`,
      `Score: ${result.score}/100 (${result.passRate}% pass rate)`,
      ``,
      `Violations (${result.violations.length}):`,
      ...result.violations.map(
        (v) => `  ❌ [${v.severity.toUpperCase()}] WCAG ${v.wcagCriteria}: ${v.description}\n     Fix: ${v.fix}`
      ),
      ``,
      `Passed (${result.passes.length}):`,
      ...result.passes.map((p) => `  ✅ ${p}`),
    ];
    return lines.join("\n");
  }
}

export const wcagChecker = new WCAGChecker();
