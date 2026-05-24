/**
 * ALTE Code of Practice Compliance
 * ─────────────────────────────────────────────────────────────────────────────
 * The Association of Language Testers in Europe (ALTE) Code of Practice
 * defines quality standards for language tests used in high-stakes decisions.
 *
 * This module:
 *   1. Catalogs all 17 ALTE CoP principles with implementation status
 *   2. Provides evidence collection helpers per principle
 *   3. Generates ALTE membership application evidence package
 *   4. Tracks minimum sample requirements for each CEFR level
 *   5. Monitors conformance to ALTE Can-Do Statement alignment
 *
 * ALTE Membership requirements (Full Member):
 *   • Tests at ≥ 3 CEFR levels
 *   • Item bank ≥ 3 forms per level
 *   • Reliability ≥ 0.80 per level
 *   • Validity argument with evidence
 *   • Standard-setting report
 *   • Fairness review (DIF analysis)
 *   • Annual quality monitoring
 *
 * Reference: ALTE Code of Practice (2001, revised 2016)
 * https://www.alte.org/resources/Documents/ALTE%20Code%20of%20Practice%20-%20English.pdf
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ALTEPrincipleArea =
  | "TEST_DESIGN"
  | "TEST_DEVELOPMENT"
  | "ADMINISTRATION"
  | "MARKING_GRADING"
  | "REPORTING"
  | "FAIRNESS"
  | "SECURITY";

export interface ALTEPrinciple {
  id: string;                     // e.g. "CoP-1", "CoP-2"
  area: ALTEPrincipleArea;
  title: string;
  description: string;
  implemented: boolean;
  evidenceArtifacts: string[];    // what evidence satisfies this principle
  minimumSampleSize?: number;     // per CEFR level, if applicable
  implementationNotes: string;
}

export interface ALTECanDoLevel {
  cefrLevel: string;
  receptionCanDo: string[];
  productionCanDo: string[];
  interactionCanDo: string[];
  sampleSize: number;              // candidates tested at this level
  reliabilityAlpha: number | null; // Cronbach's α
  reliabilityMet: boolean;         // ≥ 0.80
}

export interface ALTEMembershipPackage {
  generatedAt: string;
  overallReadiness: "NOT_READY" | "PARTIAL" | "READY_FOR_REVIEW" | "FULL_MEMBER";
  principles: ALTEPrinciple[];
  implementedCount: number;
  totalPrinciples: number;
  coveragePct: number;
  cefrLevels: ALTECanDoLevel[];
  levelsWithAdequateSamples: number;
  levelsWithAdequateReliability: number;
  missingEvidence: string[];
  notes: string;
}

// ── ALTE CoP principles catalog (17 principles) ───────────────────────────────

export const ALTE_PRINCIPLES: ALTEPrinciple[] = [
  // TEST DESIGN
  {
    id: "CoP-1", area: "TEST_DESIGN",
    title: "Construct Definition",
    description: "Tests are based on an explicit and transparent definition of what is being tested.",
    implemented: true,
    evidenceArtifacts: ["docs/cefr-construct-map.md", "docs/validity-argument.md"],
    implementationNotes: "CEFR construct map defines 6 skills (Reading, Listening, Writing, Speaking, Grammar, Vocabulary) with explicit can-do descriptors per level.",
  },
  {
    id: "CoP-2", area: "TEST_DESIGN",
    title: "Test Specification",
    description: "There is a detailed written specification for each test.",
    implemented: true,
    evidenceArtifacts: ["docs/ARCHITECTURE.md", "docs/ADAPTIVE_PLAN.md", "docs/ITEM_BANK_EXPANSION_PLAN.md"],
    implementationNotes: "Test specifications include item type distributions, timing, skill weighting, and CEFR level targets per form.",
  },
  {
    id: "CoP-3", area: "TEST_DESIGN",
    title: "Relationship to CEFR",
    description: "Claims of alignment with the CEFR are substantiated by evidence.",
    implemented: true,
    evidenceArtifacts: ["docs/standard-setting-report.md", "docs/validity-argument.md", "docs/cefr-construct-map.md"],
    implementationNotes: "Standard setting conducted using bookmark method; item b-parameters calibrated to CEFR logit scale (-3 to +3).",
  },
  // TEST DEVELOPMENT
  {
    id: "CoP-4", area: "TEST_DEVELOPMENT",
    title: "Item Writing",
    description: "Items are written by trained personnel and reviewed before use.",
    implemented: true,
    evidenceArtifacts: ["src/lib/language-skills/ai-item-generator.ts", "AI generation with quality gate"],
    implementationNotes: "AI-generated items pass automated quality gate (Flesch score, distractor balance, duplicate detection) and optional human review by trained item writers.",
  },
  {
    id: "CoP-5", area: "TEST_DEVELOPMENT",
    title: "Pretesting",
    description: "Items are pretested before operational use, and results used to improve or eliminate items.",
    implemented: true,
    evidenceArtifacts: ["src/lib/item-bank/expansion-engine.ts (PRETEST status)", "src/lib/psychometrics/realtime-irt-calibration.ts"],
    minimumSampleSize: 200,
    implementationNotes: "All new items enter PRETEST pool. Shadow-test injection routes pretest items to ~5% of examinees. Promotion requires ≥200 responses and stable IRT parameters.",
  },
  {
    id: "CoP-6", area: "TEST_DEVELOPMENT",
    title: "Test Assembly",
    description: "Tests are assembled to specification by trained personnel.",
    implemented: true,
    evidenceArtifacts: ["src/lib/assessment-engine/server-engine.ts", "CAT with IRT-based item selection"],
    implementationNotes: "Adaptive test assembly uses IRT 3PL with α-stratified selection, Sympson-Hetter exposure control, and content balance constraints.",
  },
  {
    id: "CoP-7", area: "TEST_DEVELOPMENT",
    title: "Fairness and Accessibility",
    description: "Tests are reviewed for bias and ensure all groups have fair access.",
    implemented: true,
    evidenceArtifacts: ["src/lib/psychometrics/dif.ts", "WCAG 2.1 AA compliance", "src/components/MobileAssessment.tsx"],
    implementationNotes: "DIF analysis (Mantel-Haenszel) run on all items before promotion. Mobile-first UI with WCAG 2.1 AA compliance. Video items include captions (WCAG 1.2.2).",
  },
  // ADMINISTRATION
  {
    id: "CoP-8", area: "ADMINISTRATION",
    title: "Test Administration Procedures",
    description: "Tests are administered under standardised conditions.",
    implemented: true,
    evidenceArtifacts: ["src/lib/security/browser-lockdown.ts", "src/lib/proctoring/anticheat-ml.ts"],
    implementationNotes: "Browser lockdown for high-stakes mode; anti-cheat ML detects timing anomalies, copy-paste events, and screen-share attempts.",
  },
  {
    id: "CoP-9", area: "ADMINISTRATION",
    title: "Special Arrangements",
    description: "Procedures are in place for candidates who need special arrangements.",
    implemented: false,
    evidenceArtifacts: ["docs/accessibility-statement.md"],
    implementationNotes: "Accessibility statement published. Extended time accommodation planned (Q3 2026). Screen reader compatibility in progress.",
  },
  // MARKING AND GRADING
  {
    id: "CoP-10", area: "MARKING_GRADING",
    title: "Marking Procedures",
    description: "Reliable marking procedures are in place for all responses.",
    implemented: true,
    evidenceArtifacts: ["src/lib/scoring/native-rater-pool.ts", "src/lib/scoring/rating-queue.ts"],
    implementationNotes: "Dual marking by certified native-speaker raters. MFRM severity correction applied. Adjudication protocol for divergent scores (>0.25 spread).",
  },
  {
    id: "CoP-11", area: "MARKING_GRADING",
    title: "Inter-Rater Reliability",
    description: "Inter-rater reliability is regularly monitored and reported.",
    implemented: true,
    evidenceArtifacts: ["src/lib/scoring/native-rater-pool.ts (computeIRRReport)", "Target: Krippendorff α ≥ 0.75"],
    implementationNotes: "IRR computed per marking cycle: Krippendorff's α, weighted Cohen's κ, ICC(2,1). Raters with consistent κ < 0.65 enter re-calibration training.",
  },
  {
    id: "CoP-12", area: "MARKING_GRADING",
    title: "Standard Setting",
    description: "Cut scores are determined using defensible standard-setting procedures.",
    implemented: true,
    evidenceArtifacts: ["docs/standard-setting-report.md", "Bookmark method applied"],
    implementationNotes: "Bookmark standard setting with panel of 12 expert judges; IRT scaling maps performance to CEFR. Annual review of cut-score stability.",
  },
  {
    id: "CoP-13", area: "MARKING_GRADING",
    title: "Score Equating",
    description: "When multiple forms exist, scores are equated to ensure comparability.",
    implemented: true,
    evidenceArtifacts: ["src/lib/psychometrics/concordance.ts", "src/lib/item-bank/anchor-pool.ts"],
    implementationNotes: "Anchor item equating using Mean/Sigma and Stocking-Lord methods. Equating performed with each new form release. SEE monitored against 0.1 logit threshold.",
  },
  // REPORTING
  {
    id: "CoP-14", area: "REPORTING",
    title: "Score Reporting",
    description: "Scores are reported clearly and accurately to candidates and users.",
    implemented: true,
    evidenceArtifacts: ["Certificate reporting (src/lib/certificates/blockchain-cert.ts)", "Skill profile breakdown"],
    implementationNotes: "Certificates report overall CEFR band, per-skill CEFR band, scaled scores, and confidence intervals. Concordance table maps to IELTS/TOEFL/TOEIC.",
  },
  {
    id: "CoP-15", area: "REPORTING",
    title: "Guidance on Use",
    description: "Users receive guidance on appropriate use of test results.",
    implemented: true,
    evidenceArtifacts: ["docs/validity-argument.md", "README.md — appropriate use section"],
    implementationNotes: "Validity argument documents appropriate and inappropriate uses. Organisation admin dashboard includes guidance notes.",
  },
  // FAIRNESS
  {
    id: "CoP-16", area: "FAIRNESS",
    title: "Differential Item Functioning",
    description: "Items are screened for bias against identifiable groups (gender, L1, age).",
    implemented: true,
    evidenceArtifacts: ["src/lib/psychometrics/dif.ts", "Mantel-Haenszel DIF screening"],
    implementationNotes: "DIF analysis run before item promotion. Items with |MH-DIF| > 0.638 (ETS C-level) flagged for content review.",
  },
  // SECURITY
  {
    id: "CoP-17", area: "SECURITY",
    title: "Test Security",
    description: "Measures are in place to protect test content from exposure.",
    implemented: true,
    evidenceArtifacts: ["src/lib/item-bank/exposure-control.ts (Sympson-Hetter)", "src/lib/security/browser-lockdown.ts", "src/lib/proctoring/anticheat-ml.ts"],
    implementationNotes: "Sympson-Hetter exposure control caps item usage at 20% of candidates. CAT item selection randomness prevents form reconstruction. Browser lockdown prevents screenshot/sharing.",
  },
];

// ── CEFR level coverage ───────────────────────────────────────────────────────

export const ALTE_CEFR_LEVELS: ALTECanDoLevel[] = [
  {
    cefrLevel: "A1", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand very simple questions and instructions", "Can recognise familiar words and basic phrases"],
    productionCanDo: ["Can write simple words and phrases on familiar topics"],
    interactionCanDo: ["Can interact in a simple way provided the other person speaks slowly and clearly"],
  },
  {
    cefrLevel: "A2", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand short, simple texts on familiar matters", "Can find specific predictable information in simple everyday material"],
    productionCanDo: ["Can write a series of simple phrases and sentences linked with simple connectors"],
    interactionCanDo: ["Can communicate in simple and routine tasks requiring direct exchange of information on familiar topics"],
  },
  {
    cefrLevel: "B1", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand the main points of clear standard input on familiar matters", "Can read texts that consist mainly of high-frequency language"],
    productionCanDo: ["Can write straightforward connected text on topics familiar or of personal interest"],
    interactionCanDo: ["Can deal with most situations likely to arise whilst travelling in an area where the language is spoken"],
  },
  {
    cefrLevel: "B2", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand the main ideas of complex text on both concrete and abstract topics", "Can read articles and reports concerned with contemporary problems"],
    productionCanDo: ["Can write clear, detailed text on a wide range of subjects related to interests"],
    interactionCanDo: ["Can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible"],
  },
  {
    cefrLevel: "C1", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand a wide range of demanding, longer texts and recognise implicit meaning", "Can understand long complex texts of all kinds"],
    productionCanDo: ["Can express ideas fluently and spontaneously without much obvious searching for expressions"],
    interactionCanDo: ["Can express ideas fluently and spontaneously, using language flexibly and effectively for social, academic and professional purposes"],
  },
  {
    cefrLevel: "C2", sampleSize: 0, reliabilityAlpha: null, reliabilityMet: false,
    receptionCanDo: ["Can understand with ease virtually everything heard or read", "Can read with ease virtually all forms of the written language"],
    productionCanDo: ["Can write complex texts on demanding topics in clear, smooth flowing style"],
    interactionCanDo: ["Can take part effortlessly in any conversation or discussion and have a good familiarity with idiomatic expressions and colloquialisms"],
  },
];

// ── Membership package generator ─────────────────────────────────────────────

export function generateALTEMembershipPackage(): ALTEMembershipPackage {
  const implemented = ALTE_PRINCIPLES.filter((p) => p.implemented).length;
  const total = ALTE_PRINCIPLES.length;
  const coveragePct = Math.round((implemented / total) * 1000) / 10;

  const MIN_SAMPLE = 200; // ALTE minimum per level
  const MIN_RELIABILITY = 0.80;

  const levelsWithAdequateSamples     = ALTE_CEFR_LEVELS.filter((l) => l.sampleSize >= MIN_SAMPLE).length;
  const levelsWithAdequateReliability = ALTE_CEFR_LEVELS.filter((l) => l.reliabilityAlpha !== null && l.reliabilityAlpha >= MIN_RELIABILITY).length;

  const missingEvidence: string[] = [];
  for (const p of ALTE_PRINCIPLES) {
    if (!p.implemented) missingEvidence.push(`${p.id}: ${p.title}`);
  }
  for (const l of ALTE_CEFR_LEVELS) {
    if (l.sampleSize < MIN_SAMPLE) missingEvidence.push(`Sample size ≥ ${MIN_SAMPLE} for ${l.cefrLevel}`);
    if (l.reliabilityAlpha === null || l.reliabilityAlpha < MIN_RELIABILITY) {
      missingEvidence.push(`Reliability α ≥ ${MIN_RELIABILITY} for ${l.cefrLevel}`);
    }
  }

  const overallReadiness: ALTEMembershipPackage["overallReadiness"] =
    implemented === total && levelsWithAdequateSamples >= 3 && levelsWithAdequateReliability >= 3
      ? "READY_FOR_REVIEW"
      : implemented >= 14 && levelsWithAdequateSamples >= 2
      ? "PARTIAL"
      : "NOT_READY";

  return {
    generatedAt: new Date().toISOString(),
    overallReadiness,
    principles: ALTE_PRINCIPLES,
    implementedCount: implemented,
    totalPrinciples: total,
    coveragePct,
    cefrLevels: ALTE_CEFR_LEVELS,
    levelsWithAdequateSamples,
    levelsWithAdequateReliability,
    missingEvidence,
    notes: "ALTE Full Membership requires tests at ≥3 CEFR levels, reliability ≥0.80, valid standard-setting, and successful peer review by ALTE quality panel.",
  };
}
