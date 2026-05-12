/**
 * Content Blueprint & Q-Matrix Coverage Engine
 *
 * Implements a systematic content coverage analysis aligned with Cambridge Assessment,
 * Oxford University Press, and Pearson exam blueprints.
 *
 * A Q-matrix (Question-matrix) maps each item to the skills/constructs it measures.
 * Coverage analysis ensures the item bank systematically covers all required constructs.
 *
 * Blueprints derived from:
 *   - Cambridge Assessment English Test Handbooks (FCE/CAE/CPE 2024)
 *   - Oxford Test of English Framework (OTE, 2023)
 *   - Pearson GSE Learning Objectives Framework (2024)
 *   - ALTE Q-Bank Standards for Language Testing
 *   - Weir (2005) Language Testing and Validation Framework
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Q-MATRIX TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SkillDomain = "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "USE_OF_ENGLISH" | "VOCABULARY" | "GRAMMAR";

export type CognitiveProcess =
  | "REMEMBER"         // Recall facts, recognise vocabulary (Bloom L1)
  | "UNDERSTAND"       // Paraphrase, identify main idea (Bloom L2)
  | "APPLY"            // Use grammar in context, transfer (Bloom L3)
  | "ANALYSE"          // Identify writer's purpose, distinguish views (Bloom L4)
  | "EVALUATE"         // Critique arguments, judge quality (Bloom L5)
  | "CREATE";          // Compose, synthesise, generate (Bloom L6)

export type GrammarConstruct =
  // Tense/Aspect
  | "SIMPLE_PRESENT" | "SIMPLE_PAST" | "PRESENT_CONTINUOUS" | "PAST_CONTINUOUS"
  | "PRESENT_PERFECT" | "PAST_PERFECT" | "FUTURE_WILL" | "FUTURE_GOING_TO"
  | "FUTURE_PERFECT" | "CONDITIONAL_ZERO" | "CONDITIONAL_FIRST"
  | "CONDITIONAL_SECOND" | "CONDITIONAL_THIRD" | "MIXED_CONDITIONAL"
  // Modality
  | "MODAL_ABILITY" | "MODAL_PERMISSION" | "MODAL_OBLIGATION"
  | "MODAL_DEDUCTION" | "MODAL_SPECULATION"
  // Voice
  | "PASSIVE_SIMPLE" | "PASSIVE_PERFECT" | "PASSIVE_CONTINUOUS" | "PASSIVE_MODAL"
  // Clauses
  | "RELATIVE_CLAUSE_DEFINING" | "RELATIVE_CLAUSE_NON_DEFINING"
  | "PARTICIPLE_CLAUSE" | "REPORTED_SPEECH" | "CLEFT_SENTENCE" | "INVERSION"
  // Verbals
  | "GERUND" | "INFINITIVE" | "GERUND_VS_INFINITIVE"
  // Other
  | "COMPARATIVE" | "SUPERLATIVE" | "QUANTIFIERS" | "ARTICLES"
  | "PREPOSITIONS" | "CONJUNCTIONS" | "DISCOURSE_MARKERS";

export type VocabularyDomain =
  | "ACADEMIC_VOCABULARY"       // AWL / GSE Academic
  | "OXFORD_3000"               // A1–B2 core
  | "OXFORD_5000"               // A1–C1 extended
  | "COLLOCATIONS"
  | "PHRASAL_VERBS"
  | "IDIOMS"
  | "WORD_FORMATION"            // prefixes, suffixes, conversion
  | "COLLOQUIAL"
  | "FORMAL_REGISTER"
  | "TOPIC_VOCABULARY";         // domain-specific

export interface QMatrixEntry {
  itemId: string;
  cefrLevel: CefrLevel;
  skill: SkillDomain;
  /** Primary grammar construct tested (if any) */
  grammarConstruct?: GrammarConstruct;
  /** Vocabulary domain (if any) */
  vocabularyDomain?: VocabularyDomain;
  /** Cognitive process required */
  cognitiveProcess: CognitiveProcess;
  /** Item format (free-form from item writing framework) */
  itemFormat: string;
  /** Pearson GSE code if available */
  gseCode?: string;
  /** Cambridge construct code if available */
  cambridgeCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXAM BLUEPRINT SPECIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface BlueprintCell {
  skill: SkillDomain;
  cefrLevel: CefrLevel;
  /** Minimum number of items required in this cell */
  minItems: number;
  /** Target number of items */
  targetItems: number;
  /** Maximum acceptable items (to avoid over-sampling) */
  maxItems: number;
  grammarConstructs?: GrammarConstruct[];
  vocabularyDomains?: VocabularyDomain[];
  cognitiveProcesses?: CognitiveProcess[];
  notes?: string;
}

export interface ExamBlueprint {
  examName: string;
  examCode: string;
  cefrTarget: CefrLevel;
  totalItems: number;
  cells: BlueprintCell[];
  /** Minimum proportion of items at each cognitive level */
  cognitiveBalance: Record<CognitiveProcess, number>;
  description: string;
}

/** FCE (B2 First) blueprint — Cambridge Assessment English */
export const FCE_BLUEPRINT: ExamBlueprint = {
  examName: "Cambridge B2 First (FCE)",
  examCode: "FCE",
  cefrTarget: "B2",
  totalItems: 56,
  description: "4-paper exam: Reading/Use of English (42pts), Writing (2 tasks), Listening (30pts), Speaking (collaborative)",
  cognitiveBalance: {
    REMEMBER: 0.05, UNDERSTAND: 0.35, APPLY: 0.35, ANALYSE: 0.15, EVALUATE: 0.08, CREATE: 0.02,
  },
  cells: [
    { skill: "READING", cefrLevel: "B2", minItems: 32, targetItems: 36, maxItems: 42,
      cognitiveProcesses: ["UNDERSTAND", "ANALYSE"], notes: "Parts 1-7: multiple-choice, gapped text, multiple matching" },
    { skill: "USE_OF_ENGLISH", cefrLevel: "B2", minItems: 24, targetItems: 28, maxItems: 32,
      grammarConstructs: ["CONDITIONAL_SECOND", "PASSIVE_PERFECT", "MODAL_DEDUCTION", "RELATIVE_CLAUSE_NON_DEFINING", "REPORTED_SPEECH", "INVERSION"],
      vocabularyDomains: ["COLLOCATIONS", "WORD_FORMATION", "PHRASAL_VERBS"],
      cognitiveProcesses: ["APPLY", "REMEMBER"],
      notes: "Parts 1-4: multiple-choice cloze, open cloze, word formation, key word transformation" },
    { skill: "LISTENING", cefrLevel: "B2", minItems: 25, targetItems: 28, maxItems: 30,
      cognitiveProcesses: ["UNDERSTAND", "ANALYSE"], notes: "Parts 1-4: extracts, sentence completion, MCQ, multiple matching" },
    { skill: "WRITING", cefrLevel: "B2", minItems: 2, targetItems: 2, maxItems: 2,
      cognitiveProcesses: ["CREATE", "EVALUATE"], notes: "Part 1: formal email/letter; Part 2: article/review/report/essay" },
    { skill: "SPEAKING", cefrLevel: "B2", minItems: 4, targetItems: 4, maxItems: 4,
      cognitiveProcesses: ["CREATE", "EVALUATE"], notes: "Parts 1-4: interview, long turn, collaborative task, discussion" },
  ],
};

/** CAE (C1 Advanced) blueprint — Cambridge Assessment English */
export const CAE_BLUEPRINT: ExamBlueprint = {
  examName: "Cambridge C1 Advanced (CAE)",
  examCode: "CAE",
  cefrTarget: "C1",
  totalItems: 55,
  description: "4-paper exam: Reading/Use of English (56pts), Writing (2 tasks), Listening (30pts), Speaking (collaborative)",
  cognitiveBalance: {
    REMEMBER: 0.03, UNDERSTAND: 0.25, APPLY: 0.30, ANALYSE: 0.25, EVALUATE: 0.12, CREATE: 0.05,
  },
  cells: [
    { skill: "READING", cefrLevel: "C1", minItems: 30, targetItems: 34, maxItems: 40,
      cognitiveProcesses: ["ANALYSE", "EVALUATE"],
      notes: "Parts 1-8: literary extract MCQ, cross-text multiple match, gapped text, multiple matching" },
    { skill: "USE_OF_ENGLISH", cefrLevel: "C1", minItems: 28, targetItems: 32, maxItems: 36,
      grammarConstructs: ["INVERSION", "CLEFT_SENTENCE", "MIXED_CONDITIONAL", "PASSIVE_MODAL", "PARTICIPLE_CLAUSE", "MODAL_SPECULATION"],
      vocabularyDomains: ["COLLOCATIONS", "IDIOMS", "WORD_FORMATION", "ACADEMIC_VOCABULARY", "PHRASAL_VERBS"],
      cognitiveProcesses: ["APPLY", "ANALYSE"],
      notes: "Parts 1-4: MCQ cloze, open cloze, word formation, key word transformation" },
    { skill: "LISTENING", cefrLevel: "C1", minItems: 25, targetItems: 28, maxItems: 30,
      cognitiveProcesses: ["ANALYSE", "EVALUATE"],
      notes: "Parts 1-4: complex extracts, sentence completion, MCQ, multiple matching" },
    { skill: "WRITING", cefrLevel: "C1", minItems: 2, targetItems: 2, maxItems: 2,
      cognitiveProcesses: ["CREATE", "EVALUATE"],
      notes: "Part 1: mandatory essay; Part 2: letter/proposal/report/review" },
    { skill: "SPEAKING", cefrLevel: "C1", minItems: 4, targetItems: 4, maxItems: 4,
      cognitiveProcesses: ["CREATE", "EVALUATE", "ANALYSE"],
      notes: "Parts 1-4: interview, individual long turn, collaborative task, discussion" },
  ],
};

/** CPE (C2 Proficiency) blueprint — Cambridge Assessment English */
export const CPE_BLUEPRINT: ExamBlueprint = {
  examName: "Cambridge C2 Proficiency (CPE)",
  examCode: "CPE",
  cefrTarget: "C2",
  totalItems: 52,
  description: "4-paper exam: Reading/Use of English (56pts), Writing (2 tasks), Listening (28pts), Speaking",
  cognitiveBalance: {
    REMEMBER: 0.02, UNDERSTAND: 0.15, APPLY: 0.25, ANALYSE: 0.30, EVALUATE: 0.20, CREATE: 0.08,
  },
  cells: [
    { skill: "READING", cefrLevel: "C2", minItems: 28, targetItems: 32, maxItems: 38,
      cognitiveProcesses: ["ANALYSE", "EVALUATE"],
      notes: "Parts 1-7: literary texts, academic prose, reviews, argument texts" },
    { skill: "USE_OF_ENGLISH", cefrLevel: "C2", minItems: 24, targetItems: 28, maxItems: 32,
      grammarConstructs: ["INVERSION", "MIXED_CONDITIONAL", "PASSIVE_MODAL", "CLEFT_SENTENCE", "PARTICIPLE_CLAUSE", "MODAL_SPECULATION"],
      vocabularyDomains: ["IDIOMS", "COLLOCATIONS", "ACADEMIC_VOCABULARY", "FORMAL_REGISTER", "WORD_FORMATION"],
      cognitiveProcesses: ["APPLY", "ANALYSE"],
      notes: "Parts 1-4: open cloze, word formation, key word transformation, gapped sentences" },
    { skill: "LISTENING", cefrLevel: "C2", minItems: 22, targetItems: 25, maxItems: 28,
      cognitiveProcesses: ["ANALYSE", "EVALUATE"],
      notes: "Parts 1-4: complex discussions, academic lectures" },
    { skill: "WRITING", cefrLevel: "C2", minItems: 2, targetItems: 2, maxItems: 2,
      cognitiveProcesses: ["CREATE", "EVALUATE"],
      notes: "Part 1: summary/essay; Part 2: review/letter/essay/report (sophisticated register)" },
    { skill: "SPEAKING", cefrLevel: "C2", minItems: 2, targetItems: 2, maxItems: 2,
      cognitiveProcesses: ["CREATE", "EVALUATE"],
      notes: "Parts 1-2: extended discussion and interaction" },
  ],
};

/** Adaptive CAT blueprint — for the LinguAdapt platform overall */
export const LINGUADAPT_CAT_BLUEPRINT: ExamBlueprint = {
  examName: "LinguAdapt Adaptive Assessment",
  examCode: "CAT_ADAPTIVE",
  cefrTarget: "B2",  // default target — varies by candidate
  totalItems: 45,    // typical test length for the platform
  description: "IRT-based adaptive CAT covering A1–C2. Items selected by KL/MFI information maximisation.",
  cognitiveBalance: {
    REMEMBER: 0.10, UNDERSTAND: 0.30, APPLY: 0.30, ANALYSE: 0.20, EVALUATE: 0.08, CREATE: 0.02,
  },
  cells: [
    { skill: "READING", cefrLevel: "A2", minItems: 3, targetItems: 5, maxItems: 8, cognitiveProcesses: ["UNDERSTAND", "REMEMBER"] },
    { skill: "READING", cefrLevel: "B1", minItems: 4, targetItems: 6, maxItems: 10, cognitiveProcesses: ["UNDERSTAND", "ANALYSE"] },
    { skill: "READING", cefrLevel: "B2", minItems: 4, targetItems: 6, maxItems: 10, cognitiveProcesses: ["ANALYSE", "EVALUATE"] },
    { skill: "LISTENING", cefrLevel: "A2", minItems: 3, targetItems: 4, maxItems: 6, cognitiveProcesses: ["UNDERSTAND"] },
    { skill: "LISTENING", cefrLevel: "B1", minItems: 3, targetItems: 5, maxItems: 8, cognitiveProcesses: ["UNDERSTAND", "ANALYSE"] },
    { skill: "LISTENING", cefrLevel: "B2", minItems: 3, targetItems: 5, maxItems: 8, cognitiveProcesses: ["ANALYSE"] },
    { skill: "USE_OF_ENGLISH", cefrLevel: "B1", minItems: 4, targetItems: 6, maxItems: 10,
      grammarConstructs: ["PRESENT_PERFECT", "CONDITIONAL_FIRST", "REPORTED_SPEECH", "PASSIVE_SIMPLE", "MODAL_OBLIGATION"],
      vocabularyDomains: ["OXFORD_3000", "COLLOCATIONS"] },
    { skill: "USE_OF_ENGLISH", cefrLevel: "B2", minItems: 4, targetItems: 6, maxItems: 10,
      grammarConstructs: ["CONDITIONAL_SECOND", "CONDITIONAL_THIRD", "PASSIVE_PERFECT", "INVERSION", "PARTICIPLE_CLAUSE"],
      vocabularyDomains: ["OXFORD_5000", "PHRASAL_VERBS", "WORD_FORMATION"] },
    { skill: "WRITING", cefrLevel: "B2", minItems: 1, targetItems: 1, maxItems: 2, cognitiveProcesses: ["CREATE"] },
    { skill: "SPEAKING", cefrLevel: "B2", minItems: 1, targetItems: 1, maxItems: 2, cognitiveProcesses: ["CREATE"] },
  ],
};

export const ALL_BLUEPRINTS: ExamBlueprint[] = [
  FCE_BLUEPRINT, CAE_BLUEPRINT, CPE_BLUEPRINT, LINGUADAPT_CAT_BLUEPRINT,
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. COVERAGE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export interface CellCoverageResult {
  skill: SkillDomain;
  cefrLevel: CefrLevel;
  targetItems: number;
  actualItems: number;
  coveragePercent: number;
  status: "ADEQUATE" | "UNDER_COVERED" | "OVER_SAMPLED";
  grammarGaps: GrammarConstruct[];
  vocabularyGaps: VocabularyDomain[];
}

export interface CoverageReport {
  blueprintName: string;
  totalItemsInBank: number;
  totalItemsAnalysed: number;
  overallCoveragePercent: number;
  cellResults: CellCoverageResult[];
  cognitiveBalance: Record<CognitiveProcess, number>;
  cognitiveBalanceCompliant: boolean;
  cefrDistribution: Record<CefrLevel, number>;
  skillDistribution: Record<string, number>;
  computedAt: string;
}

export interface GapAnalysis {
  criticalGaps: Array<{
    skill: SkillDomain;
    cefrLevel: CefrLevel;
    deficit: number;          // items needed
    priority: "HIGH" | "MEDIUM" | "LOW";
    grammarGaps: GrammarConstruct[];
    vocabularyGaps: VocabularyDomain[];
  }>;
  overSampledAreas: Array<{
    skill: SkillDomain;
    cefrLevel: CefrLevel;
    surplus: number;
  }>;
  grammarConstructCoverage: Record<string, number>; // construct -> item count
  vocabularyDomainCoverage: Record<string, number>;
  recommendations: string[];
}

/**
 * Build a Q-matrix from a list of item records
 */
export function buildQMatrix(items: QMatrixEntry[]): Map<string, QMatrixEntry> {
  const qMatrix = new Map<string, QMatrixEntry>();
  for (const item of items) {
    qMatrix.set(item.itemId, item);
  }
  return qMatrix;
}

/**
 * Compute coverage against a blueprint
 */
export function computeCoverage(
  qMatrix: Map<string, QMatrixEntry>,
  blueprint: ExamBlueprint
): CoverageReport {
  const items = Array.from(qMatrix.values());
  const total = items.length;
  let totalCovered = 0;

  // Compute cell results
  const cellResults: CellCoverageResult[] = blueprint.cells.map((cell) => {
    const matching = items.filter(
      (it) => it.skill === cell.skill && it.cefrLevel === cell.cefrLevel
    );
    const actual = matching.length;
    totalCovered += Math.min(actual, cell.targetItems);

    const coveragePercent = cell.targetItems > 0
      ? Math.min(100, Math.round((actual / cell.targetItems) * 100))
      : 100;

    let status: CellCoverageResult["status"] = "ADEQUATE";
    if (actual < cell.minItems) status = "UNDER_COVERED";
    else if (cell.maxItems && actual > cell.maxItems) status = "OVER_SAMPLED";

    // Grammar gaps
    const grammarGaps: GrammarConstruct[] = (cell.grammarConstructs ?? []).filter(
      (gc) => !matching.some((it) => it.grammarConstruct === gc)
    );

    // Vocabulary gaps
    const vocabularyGaps: VocabularyDomain[] = (cell.vocabularyDomains ?? []).filter(
      (vd) => !matching.some((it) => it.vocabularyDomain === vd)
    );

    return {
      skill: cell.skill,
      cefrLevel: cell.cefrLevel,
      targetItems: cell.targetItems,
      actualItems: actual,
      coveragePercent,
      status,
      grammarGaps,
      vocabularyGaps,
    };
  });

  // Cognitive process distribution
  const cogCounts = {} as Record<CognitiveProcess, number>;
  for (const item of items) {
    cogCounts[item.cognitiveProcess] = (cogCounts[item.cognitiveProcess] ?? 0) + 1;
  }
  const cogBalance = {} as Record<CognitiveProcess, number>;
  const cogProcesses: CognitiveProcess[] = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYSE", "EVALUATE", "CREATE"];
  for (const cp of cogProcesses) {
    cogBalance[cp] = total > 0 ? Number(((cogCounts[cp] ?? 0) / total).toFixed(3)) : 0;
  }

  // Check cognitive balance compliance (within 10% tolerance)
  let cogCompliant = true;
  for (const cp of cogProcesses) {
    const target = blueprint.cognitiveBalance[cp] ?? 0;
    const actual = cogBalance[cp] ?? 0;
    if (Math.abs(actual - target) > 0.10) {
      cogCompliant = false;
      break;
    }
  }

  // CEFR distribution
  const cefrDist = {} as Record<CefrLevel, number>;
  for (const item of items) {
    cefrDist[item.cefrLevel] = (cefrDist[item.cefrLevel] ?? 0) + 1;
  }

  // Skill distribution
  const skillDist = {} as Record<string, number>;
  for (const item of items) {
    skillDist[item.skill] = (skillDist[item.skill] ?? 0) + 1;
  }

  const targetTotal = blueprint.cells.reduce((s, c) => s + c.targetItems, 0);
  const overallCoverage = targetTotal > 0 ? Math.min(100, Math.round((totalCovered / targetTotal) * 100)) : 100;

  return {
    blueprintName: blueprint.examName,
    totalItemsInBank: total,
    totalItemsAnalysed: total,
    overallCoveragePercent: overallCoverage,
    cellResults,
    cognitiveBalance: cogBalance,
    cognitiveBalanceCompliant: cogCompliant,
    cefrDistribution: cefrDist,
    skillDistribution: skillDist,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Identify gaps and over-sampled areas from a coverage report
 */
export function identifyGaps(coverage: CoverageReport, blueprint: ExamBlueprint): GapAnalysis {
  const criticalGaps: GapAnalysis["criticalGaps"] = [];
  const overSampledAreas: GapAnalysis["overSampledAreas"] = [];

  for (const cell of coverage.cellResults) {
    if (cell.status === "UNDER_COVERED") {
      const deficit = cell.targetItems - cell.actualItems;
      const priority: "HIGH" | "MEDIUM" | "LOW" =
        deficit >= cell.targetItems * 0.5 ? "HIGH" :
        deficit >= cell.targetItems * 0.25 ? "MEDIUM" : "LOW";
      criticalGaps.push({
        skill: cell.skill,
        cefrLevel: cell.cefrLevel,
        deficit,
        priority,
        grammarGaps: cell.grammarGaps,
        vocabularyGaps: cell.vocabularyGaps,
      });
    } else if (cell.status === "OVER_SAMPLED") {
      const blueprintCell = blueprint.cells.find(
        (c) => c.skill === cell.skill && c.cefrLevel === cell.cefrLevel
      );
      overSampledAreas.push({
        skill: cell.skill,
        cefrLevel: cell.cefrLevel,
        surplus: cell.actualItems - (blueprintCell?.maxItems ?? cell.targetItems),
      });
    }
  }

  // Grammar construct coverage
  const grammarCoverage = {} as Record<string, number>;
  const vocabCoverage = {} as Record<string, number>;

  // Build recommendations
  const recommendations: string[] = [];

  const highPriority = criticalGaps.filter((g) => g.priority === "HIGH");
  if (highPriority.length > 0) {
    recommendations.push(
      `HIGH PRIORITY: Write ${highPriority.map((g) => `${g.deficit} ${g.skill} items at ${g.cefrLevel}`).join("; ")}.`
    );
  }

  const medPriority = criticalGaps.filter((g) => g.priority === "MEDIUM");
  if (medPriority.length > 0) {
    recommendations.push(
      `MEDIUM PRIORITY: Expand ${medPriority.map((g) => `${g.skill} at ${g.cefrLevel} (+${g.deficit} items)`).join("; ")}.`
    );
  }

  const grammarGaps = criticalGaps.flatMap((g) => g.grammarGaps);
  if (grammarGaps.length > 0) {
    recommendations.push(
      `Grammar constructs needing items: ${[...new Set(grammarGaps)].join(", ")}.`
    );
  }

  const vocabGaps = criticalGaps.flatMap((g) => g.vocabularyGaps);
  if (vocabGaps.length > 0) {
    recommendations.push(
      `Vocabulary domains needing items: ${[...new Set(vocabGaps)].join(", ")}.`
    );
  }

  if (overSampledAreas.length > 0) {
    recommendations.push(
      `Consider reducing sampling from: ${overSampledAreas.map((a) => `${a.skill} at ${a.cefrLevel}`).join("; ")}.`
    );
  }

  if (!coverage.cognitiveBalanceCompliant) {
    recommendations.push(
      "Cognitive process balance is outside target. Audit item cognitive demands and balance REMEMBER/UNDERSTAND/APPLY/ANALYSE/EVALUATE/CREATE levels."
    );
  }

  return {
    criticalGaps,
    overSampledAreas,
    grammarConstructCoverage: grammarCoverage,
    vocabularyDomainCoverage: vocabCoverage,
    recommendations,
  };
}

/**
 * Quick summary for API response
 */
export function blueprintSummary(blueprint: ExamBlueprint): {
  name: string;
  code: string;
  cefrTarget: CefrLevel;
  totalItems: number;
  skills: string[];
  cognitiveBalance: Record<string, number>;
} {
  const skills = [...new Set(blueprint.cells.map((c) => c.skill))];
  return {
    name: blueprint.examName,
    code: blueprint.examCode,
    cefrTarget: blueprint.cefrTarget,
    totalItems: blueprint.totalItems,
    skills,
    cognitiveBalance: blueprint.cognitiveBalance,
  };
}
