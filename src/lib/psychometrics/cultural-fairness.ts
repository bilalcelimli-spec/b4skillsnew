/**
 * Cultural Fairness Review System
 * 
 * Automated + manual checklist for ensuring items are culturally neutral
 * and do not advantage/disadvantage any demographic group.
 * 
 * Based on ETS fairness guidelines and ALTE principles.
 */

export interface FairnessCheckResult {
  itemId: string;
  overallStatus: "PASS" | "FLAG" | "REJECT";
  score: number; // 0-100
  checks: FairnessCheck[];
  recommendations: string[];
}

export interface FairnessCheck {
  category: string;
  criterion: string;
  status: "PASS" | "FLAG" | "REJECT";
  detail: string;
}

const SENSITIVE_TOPICS = [
  "religion", "religious", "church", "mosque", "temple", "prayer", "god", "bible", "quran",
  "political", "democrat", "republican", "conservative", "liberal", "election",
  "alcohol", "beer", "wine", "drinking", "drunk", "bar",
  "pork", "bacon", "ham",
  "christmas", "easter", "halloween", "thanksgiving",
  "boyfriend", "girlfriend", "dating", "marriage", "divorce",
  "war", "military", "weapon", "gun", "bomb",
  "death", "funeral", "cemetery",
  "gambling", "casino", "lottery",
  "tobacco", "smoking", "cigarette",
];

const WESTERN_CULTURAL_REFERENCES = [
  "baseball", "american football", "super bowl", "nfl", "nba",
  "prom", "homecoming", "sorority", "fraternity",
  "thanksgiving", "fourth of july", "memorial day",
  "walmart", "target", "costco",
  "fahrenheit", "miles", "pounds", "ounces", "gallons",
  "social security", "401k", "irs",
];

const GENDER_STEREOTYPES = [
  { pattern: /\bnurse\b.*\bshe\b/i, issue: "Assumes nurses are female" },
  { pattern: /\bdoctor\b.*\bhe\b/i, issue: "Assumes doctors are male" },
  { pattern: /\bengineer\b.*\bhe\b/i, issue: "Assumes engineers are male" },
  { pattern: /\bsecretary\b.*\bshe\b/i, issue: "Assumes secretaries are female" },
  { pattern: /\bpilot\b.*\bhe\b/i, issue: "Assumes pilots are male" },
  { pattern: /\bteacher\b.*\bshe\b/i, issue: "Assumes teachers are female" },
];

/**
 * Run automated fairness checks on an item
 */
export function checkItemFairness(
  itemId: string,
  stemText: string,
  options: string[],
  passageText?: string
): FairnessCheckResult {
  const allText = [stemText, ...options, passageText || ""].join(" ").toLowerCase();
  const checks: FairnessCheck[] = [];
  const recommendations: string[] = [];

  // 1. Sensitive topic check
  const foundSensitive = SENSITIVE_TOPICS.filter(topic => allText.includes(topic));
  checks.push({
    category: "Content Sensitivity",
    criterion: "No sensitive/taboo topics for international test-takers",
    status: foundSensitive.length === 0 ? "PASS" : foundSensitive.length <= 1 ? "FLAG" : "REJECT",
    detail: foundSensitive.length > 0
      ? `Found sensitive terms: ${foundSensitive.join(", ")}`
      : "No sensitive topics detected",
  });
  if (foundSensitive.length > 0) {
    recommendations.push(`Review and possibly rephrase content containing: ${foundSensitive.join(", ")}`);
  }

  // 2. Cultural specificity check
  const foundWestern = WESTERN_CULTURAL_REFERENCES.filter(ref => allText.includes(ref));
  checks.push({
    category: "Cultural Neutrality",
    criterion: "No culture-specific references that disadvantage non-Western test-takers",
    status: foundWestern.length === 0 ? "PASS" : "FLAG",
    detail: foundWestern.length > 0
      ? `Found culture-specific references: ${foundWestern.join(", ")}`
      : "No culture-specific references detected",
  });
  if (foundWestern.length > 0) {
    recommendations.push("Replace culture-specific references with universally familiar alternatives");
  }

  // 3. Gender stereotype check
  const fullText = [stemText, ...options, passageText || ""].join(" ");
  const genderIssues = GENDER_STEREOTYPES.filter(gs => gs.pattern.test(fullText));
  checks.push({
    category: "Gender Fairness",
    criterion: "No gender stereotyping in professional/social roles",
    status: genderIssues.length === 0 ? "PASS" : "FLAG",
    detail: genderIssues.length > 0
      ? `Potential stereotypes: ${genderIssues.map(g => g.issue).join("; ")}`
      : "No gender stereotypes detected",
  });
  if (genderIssues.length > 0) {
    recommendations.push("Use gender-neutral language or alternate pronoun usage");
  }

  // 4. Name diversity check
  const westernNames = /\b(john|mary|james|jennifer|robert|sarah|michael|elizabeth|david|emily)\b/i;
  const hasWesternNames = westernNames.test(allText);
  checks.push({
    category: "Name Diversity",
    criterion: "Names should reflect global diversity",
    status: hasWesternNames ? "FLAG" : "PASS",
    detail: hasWesternNames
      ? "Only Western names detected; consider using diverse names"
      : "No naming bias detected",
  });
  if (hasWesternNames) {
    recommendations.push("Use names from diverse cultural backgrounds (e.g., Yuki, Ahmed, Priya, Carlos)");
  }

  // 5. Socioeconomic assumption check
  const socioTerms = /\b(luxury|expensive|yacht|mansion|private school|country club|chauffeur|butler)\b/i;
  const hasSocio = socioTerms.test(allText);
  checks.push({
    category: "Socioeconomic Neutrality",
    criterion: "No assumptions about socioeconomic status",
    status: hasSocio ? "FLAG" : "PASS",
    detail: hasSocio
      ? "References to wealth/luxury may disadvantage some test-takers"
      : "No socioeconomic bias detected",
  });

  // 6. Readability of stem (not unnecessarily complex)
  const wordCount = stemText.split(/\s+/).length;
  const avgWordLength = stemText.replace(/\s+/g, "").length / wordCount;
  checks.push({
    category: "Accessibility",
    criterion: "Item stem should not be unnecessarily complex",
    status: avgWordLength > 7 ? "FLAG" : "PASS",
    detail: `Average word length: ${avgWordLength.toFixed(1)} characters, Word count: ${wordCount}`,
  });

  // 7. Option balance check (for MC items)
  if (options.length >= 3) {
    const optionLengths = options.map(o => o.length);
    const maxLen = Math.max(...optionLengths);
    const minLen = Math.min(...optionLengths);
    const ratio = maxLen / Math.max(1, minLen);
    checks.push({
      category: "Option Balance",
      criterion: "Options should be similar in length and complexity",
      status: ratio > 3 ? "FLAG" : "PASS",
      detail: `Length ratio (max/min): ${ratio.toFixed(1)}`,
    });
    if (ratio > 3) {
      recommendations.push("Balance option lengths to prevent cueing the correct answer");
    }
  }

  // Calculate overall score
  const rejectCount = checks.filter(c => c.status === "REJECT").length;
  const flagCount = checks.filter(c => c.status === "FLAG").length;
  const passCount = checks.filter(c => c.status === "PASS").length;
  const total = checks.length;

  const score = Math.round((passCount / total) * 100 - flagCount * 5 - rejectCount * 20);
  const overallStatus = rejectCount > 0 ? "REJECT" : flagCount >= 3 ? "FLAG" : "PASS";

  return {
    itemId,
    overallStatus,
    score: Math.max(0, Math.min(100, score)),
    checks,
    recommendations,
  };
}

/**
 * Batch check all items
 */
export function batchFairnessCheck(
  items: { id: string; stem: string; options: string[]; passage?: string }[]
): { results: FairnessCheckResult[]; flaggedCount: number; rejectedCount: number } {
  const results = items.map(item =>
    checkItemFairness(item.id, item.stem, item.options, item.passage)
  );

  return {
    results,
    flaggedCount: results.filter(r => r.overallStatus === "FLAG").length,
    rejectedCount: results.filter(r => r.overallStatus === "REJECT").length,
  };
}
