/**
 * LinguAdapt Readability & Lexical Quality Engine
 *
 * Provides automated linguistic quality metrics for assessment item stimuli.
 * Pure TypeScript — zero external dependencies.
 *
 * Metrics computed:
 *  — Flesch Reading Ease (FRE)
 *  — Flesch-Kincaid Grade Level (FKGL)
 *  — Gunning Fog Index
 *  — SMOG Grade
 *  — Average Sentence Length (ASL)
 *  — Average Syllables Per Word (ASW)
 *  — Lexical Density (content words / total words)
 *  — Type-Token Ratio (TTR) — lexical richness
 *  — CEFR Vocabulary Ceiling Check (Oxford 3000 + AWL band approximation)
 *  — Predicted CEFR level from readability
 *
 * Reference:
 *  — Flesch (1948), Kincaid et al. (1975), Gunning (1952), McLaughlin (1969)
 *  — Nation (2001) — Learning Vocabulary in Another Language
 *  — Coxhead (2000) — A New Academic Word List
 *  — Read (2000) — Assessing Vocabulary
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadabilityMetrics {
  fleschReadingEase: number;       // 0–100. Higher = easier. 60-70 = standard US English.
  fleschKincaidGrade: number;      // US grade level. 8 ≈ general newspaper.
  gunningFog: number;              // Grade level. <12 = general audience.
  smogGrade: number;               // Grade level.
  avgSentenceLength: number;       // Words per sentence.
  avgSyllablesPerWord: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  complexWordCount: number;        // ≥3 syllables, not a proper noun or familiar compound
  lexicalDensity: number;          // 0–1. Content words / total words. Academic ≈ 0.45–0.55.
  typeTokenRatio: number;          // 0–1. Unique words / total words. Rich text ≈ 0.60+
  predictedCefrLevel: CefrLevel;   // Estimated from readability composite
  readabilityScore: number;        // 0–100 composite (100 = most readable / easiest)
}

export interface LexicalAnalysis {
  totalWords: number;
  uniqueWords: number;
  k1Words: number;                 // BNC 1–1000 (A1/A2 vocabulary)
  k2Words: number;                 // BNC 1001–2000 (A2/B1)
  k3k5Words: number;               // BNC 2001–5000 (B1/B2)
  awlWords: number;                // Academic Word List (B2/C1)
  lowFreqWords: number;            // Beyond K5 + AWL (C1/C2)
  k1Coverage: number;              // % of text tokens covered by K1
  k2Coverage: number;
  k3k5Coverage: number;
  awlCoverage: number;
  lowFreqCoverage: number;
  ceilingViolations: Array<{        // Words above the target CEFR ceiling
    word: string;
    predictedBand: string;
    ceilingLevel: CefrLevel;
  }>;
  estimatedVocabLevel: CefrLevel;
}

export interface LinguisticQualityReport {
  readability: ReadabilityMetrics;
  lexical: LexicalAnalysis;
  /**  true when the stimulus is linguistically appropriate for the target level */
  passesQualityGate: boolean;
  /** Human-readable issues (e.g. "Stimulus is 2 CEFR levels too hard") */
  issues: Array<{ severity: "critical" | "major" | "minor"; message: string }>;
  /** 0–100 composite linguistic quality score */
  qualityScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYLLABLE COUNTER (Tsaur & Kuo 2009 algorithmic approximation)
// ─────────────────────────────────────────────────────────────────────────────

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT VOCABULARY BAND LOOKUP
// ─────────────────────────────────────────────────────────────────────────────
// We use a 3-tier heuristic based on word frequency patterns and known band markers
// rather than shipping a full 10,000-word corpus (avoids large bundle / data files).

// AWL approximate marker stems (Coxhead 2000 — first 60 word families of each sublist)
const AWL_STEMS = new Set([
  "analys","approach","area","assess","assum","authorit","avail","benefit","concept","consist",
  "constitut","context","contract","creat","data","definit","deriv","distribut","econom","environment",
  "establis","estim","eviden","export","factor","finance","formula","function","identif","impact",
  "increas","indicat","individ","interpret","involv","issu","labour","legal","legisl","major",
  "method","occur","percent","period","policy","principle","procedur","process","requir","research",
  "respond","role","section","sector","signific","similar","source","specif","structur","theor",
  "variable","evident","consequent","analysis","maintain","obtain","participate","perceive","positive",
  "potential","previous","primary","purchase","range","region","regulat","relev","reside","resource",
  "restrict","site","tradition","transfer","utility","valid","version","welfare"
]);

// C1/C2 indicator stems (words unlikely to appear in K1-K5)
const C1C2_STEMS = new Set([
  "amalgam","ambig","antithes","archet","candour","clandest","corollary","deprec","dichotom",
  "dissemin","efficac","emanat","enigm","epitom","erudite","esoteric","euphemi","expedient",
  "exponent","furtive","gregarious","hegemony","idiosyncr","implicit","inconclus","inherent",
  "juxtapos","laconic","lament","manifest","misanthrop","nefarious","obfuscat","ostensible",
  "paradigm","perfunct","pertinent","pragmatic","precarious","precipitat","prerogative","prevalent",
  "proliferat","propensity","proximity","recalcitrant","reciproc","relentless","remunerat",
  "rhetori","rudiment","solicit","spurious","statutory","stringent","sublim","substantiat","tenuous",
  "ubiquitous","unilateral","unprecedented","venerable","versatile","vindic"
]);

type VocabBand = "K1" | "K2" | "K3K5" | "AWL" | "C1C2" | "UNKNOWN";

function classifyWord(word: string): VocabBand {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return "K1";

  // Common function words and very high-frequency words → K1
  const k1Closed = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","as","is","was","are","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","not","this","that","these","those","i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their","who","which","what","when","where","how","all","each","every","some","any","no","more","most","other","about","up","out","if","then","than","so","also","just","into","over","after","its","they","see","get","go","come","take","make","know","think","time","year","way","people","new","first","last","long","great","little","own","right","big","high","different","small","large","next","early","young","important","public","private","real","best","free","good","old","house","give","day","here","there","much","between","need","still","want","look","tell","keep","let","begin","show","hear","play","run","move","live","believe","hold","bring","happen","write","provide","sit","stand","lose","pay","meet","include","continue","set","face","based","already","country","national","however","yet","among","system","program","government","state","against","home","might","without","through","during","having"]);
  if (k1Closed.has(w)) return "K1";

  // AWL check via stem matching
  for (const stem of AWL_STEMS) {
    if (w.startsWith(stem) && (w.length - stem.length) <= 4) return "AWL";
  }

  // C1/C2 indicator check
  for (const stem of C1C2_STEMS) {
    if (w.startsWith(stem)) return "C1C2";
  }

  // Heuristic by length + syllable complexity
  const syllables = countSyllables(w);
  if (syllables >= 4 && w.length >= 9) return "C1C2";
  if (syllables >= 3 && w.length >= 8) return "AWL"; // probably mid-frequency academic
  if (w.length >= 7 && syllables >= 2) return "K3K5";
  if (w.length >= 5) return "K2";
  return "K1";
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION WORDS (used for lexical density)
// ─────────────────────────────────────────────────────────────────────────────

const FUNCTION_WORDS = new Set([
  "the","a","an","and","or","but","if","then","than","so","as","at","in","on","to","for","of","with","by","from","into","onto","upon","about","above","below","between","through","during","before","after","since","until","while","although","because","unless","when","where","whose","which","that","who","what","how","i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their","this","these","those","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","must","can","not","no","any","all","each","every","some","also","just","only","even","very","quite","rather","much","more","most","few","little","many","both","either","neither","once","twice","already","yet","still","ever","never","here","there","up","down","out","off","over","again","always","often","sometimes","usually","well"
]);

// ─────────────────────────────────────────────────────────────────────────────
// TEXT SEGMENTATION
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.match(/\b[a-zA-Z'-]+\b/g) || [];
}

function segmentSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE READABILITY COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function computeReadability(text: string): ReadabilityMetrics {
  const words = tokenize(text);
  const sentences = segmentSentences(text);
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);

  const syllables = words.map(w => countSyllables(w));
  const totalSyllables = syllables.reduce((a, b) => a + b, 0);
  const complexWords = words.filter((w, i) => syllables[i] >= 3 && !/[A-Z]/.test(w[0]));

  const asl = wordCount / sentenceCount;
  const asw = totalSyllables / Math.max(wordCount, 1);

  // Flesch Reading Ease (FRE)
  const fre = Math.max(0, Math.min(100, 206.835 - 1.015 * asl - 84.6 * asw));

  // Flesch-Kincaid Grade Level
  const fkgl = Math.max(0, 0.39 * asl + 11.8 * asw - 15.59);

  // Gunning Fog Index
  const fog = 0.4 * (asl + 100 * (complexWords.length / Math.max(wordCount, 1)));

  // SMOG (requires ≥30 sentences; approximated for short texts)
  const smog = 3 + Math.sqrt(complexWords.length * (30 / Math.max(sentenceCount, 1)));

  // Lexical Density
  const contentWords = words.filter(w => !FUNCTION_WORDS.has(w.toLowerCase()));
  const lexicalDensity = contentWords.length / Math.max(wordCount, 1);

  // Type-Token Ratio (TTR)
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const ttr = uniqueWords / Math.max(wordCount, 1);

  // Composite readability score (normalised 0-100, where 100 = most readable)
  const readabilityScore = Math.round(Math.max(0, Math.min(100, fre)));

  // Predict CEFR from readability
  const predictedCefrLevel = readabilityToCefr(fre, fkgl);

  return {
    fleschReadingEase: Math.round(fre * 10) / 10,
    fleschKincaidGrade: Math.round(fkgl * 10) / 10,
    gunningFog: Math.round(fog * 10) / 10,
    smogGrade: Math.round(smog * 10) / 10,
    avgSentenceLength: Math.round(asl * 10) / 10,
    avgSyllablesPerWord: Math.round(asw * 100) / 100,
    wordCount,
    sentenceCount,
    syllableCount: totalSyllables,
    complexWordCount: complexWords.length,
    lexicalDensity: Math.round(lexicalDensity * 100) / 100,
    typeTokenRatio: Math.round(ttr * 100) / 100,
    predictedCefrLevel,
    readabilityScore,
  };
}

function readabilityToCefr(fre: number, fkgl: number): CefrLevel {
  // Composite weighting
  const grade = (fkgl + (100 - fre) / 10) / 2;

  if (grade <= 2) return "A1";
  if (grade <= 4) return "A2";
  if (grade <= 6) return "B1";
  if (grade <= 9) return "B2";
  if (grade <= 12) return "C1";
  return "C2";
}

// ─────────────────────────────────────────────────────────────────────────────
// LEXICAL ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_LEVEL_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function bandToCefrLevel(band: VocabBand): CefrLevel {
  switch (band) {
    case "K1": return "A2";
    case "K2": return "B1";
    case "K3K5": return "B2";
    case "AWL": return "C1";
    case "C1C2": return "C2";
    default: return "B2";
  }
}

function cefrLevelIndex(level: CefrLevel): number {
  return CEFR_LEVEL_ORDER.indexOf(level);
}

function computeLexicalAnalysis(text: string, targetLevel?: CefrLevel): LexicalAnalysis {
  const words = tokenize(text).map(w => w.toLowerCase().replace(/[^a-z]/g, "")).filter(w => w.length > 1);
  const totalWords = words.length;
  const uniqueWords = new Set(words).size;

  const bandCounts = { K1: 0, K2: 0, K3K5: 0, AWL: 0, C1C2: 0, UNKNOWN: 0 };
  const ceilingViolations: LexicalAnalysis["ceilingViolations"] = [];

  for (const word of words) {
    const band = classifyWord(word);
    bandCounts[band]++;

    if (targetLevel) {
      const wordLevel = bandToCefrLevel(band);
      if (cefrLevelIndex(wordLevel) > cefrLevelIndex(targetLevel) + 1) {
        ceilingViolations.push({ word, predictedBand: band, ceilingLevel: targetLevel });
      }
    }
  }

  const ratio = (n: number) => Math.round((n / Math.max(totalWords, 1)) * 1000) / 10;

  // Estimate vocab level from predominant band
  let estimatedVocabLevel: CefrLevel = "A1";
  if (bandCounts.C1C2 / totalWords > 0.05) estimatedVocabLevel = "C1";
  else if (bandCounts.AWL / totalWords > 0.10) estimatedVocabLevel = "B2";
  else if (bandCounts.K3K5 / totalWords > 0.12) estimatedVocabLevel = "B1";
  else if (bandCounts.K2 / totalWords > 0.15) estimatedVocabLevel = "A2";
  else estimatedVocabLevel = "A1";

  return {
    totalWords,
    uniqueWords,
    k1Words: bandCounts.K1,
    k2Words: bandCounts.K2,
    k3k5Words: bandCounts.K3K5,
    awlWords: bandCounts.AWL,
    lowFreqWords: bandCounts.C1C2,
    k1Coverage: ratio(bandCounts.K1),
    k2Coverage: ratio(bandCounts.K2),
    k3k5Coverage: ratio(bandCounts.K3K5),
    awlCoverage: ratio(bandCounts.AWL),
    lowFreqCoverage: ratio(bandCounts.C1C2),
    ceilingViolations: ceilingViolations.slice(0, 10),    // Top 10 problematic words
    estimatedVocabLevel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY GATE & ISSUE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_FRE_NORMS: Record<CefrLevel, { min: number; max: number }> = {
  PRE_A1: { min: 80, max: 100 },
  A1:     { min: 75, max: 100 },
  A2:     { min: 65, max: 85 },
  B1:     { min: 55, max: 75 },
  B2:     { min: 40, max: 65 },
  C1:     { min: 25, max: 55 },
  C2:     { min: 0,  max: 45 },
};

const CEFR_ASL_NORMS: Record<CefrLevel, { min: number; max: number }> = {
  PRE_A1: { min: 3,  max: 8  },
  A1:     { min: 4,  max: 10 },
  A2:     { min: 6,  max: 14 },
  B1:     { min: 10, max: 18 },
  B2:     { min: 14, max: 24 },
  C1:     { min: 18, max: 32 },
  C2:     { min: 20, max: 45 },
};

function buildQualityReport(
  readability: ReadabilityMetrics,
  lexical: LexicalAnalysis,
  targetLevel?: CefrLevel
): LinguisticQualityReport {
  const issues: LinguisticQualityReport["issues"] = [];

  if (targetLevel && targetLevel !== "PRE_A1") {
    const freNorm = CEFR_FRE_NORMS[targetLevel];
    const aslNorm = CEFR_ASL_NORMS[targetLevel];

    // FRE too low (too hard)
    if (readability.fleschReadingEase < freNorm.min - 10) {
      issues.push({ severity: "major", message: `Text readability (FRE=${readability.fleschReadingEase}) is significantly lower than the ${targetLevel} norm (${freNorm.min}–${freNorm.max}). Stimulus may be too difficult.` });
    }
    // FRE too high (too easy)
    if (readability.fleschReadingEase > freNorm.max + 10) {
      issues.push({ severity: "minor", message: `Text readability (FRE=${readability.fleschReadingEase}) is higher than expected for ${targetLevel}. Stimulus may be too simple.` });
    }

    // Sentence length
    if (readability.avgSentenceLength > aslNorm.max + 5) {
      issues.push({ severity: "major", message: `Average sentence length (${readability.avgSentenceLength} words) exceeds the ${targetLevel} norm ceiling (${aslNorm.max}). Shorten sentences.` });
    }
    if (readability.avgSentenceLength < aslNorm.min - 2) {
      issues.push({ severity: "minor", message: `Average sentence length (${readability.avgSentenceLength} words) is below the ${targetLevel} norm floor (${aslNorm.min}).` });
    }

    // Vocabulary ceiling violations
    if (lexical.ceilingViolations.length > 2) {
      issues.push({ severity: "major", message: `${lexical.ceilingViolations.length} word(s) exceed the ${targetLevel} vocabulary ceiling: ${lexical.ceilingViolations.map(v => v.word).join(", ")}.` });
    } else if (lexical.ceilingViolations.length > 0) {
      issues.push({ severity: "minor", message: `${lexical.ceilingViolations.length} word(s) may exceed the ${targetLevel} vocabulary ceiling: ${lexical.ceilingViolations.map(v => v.word).join(", ")}.` });
    }

    // Predicted level misalignment
    const predIdx = cefrLevelIndex(readability.predictedCefrLevel);
    const targetIdx = cefrLevelIndex(targetLevel);
    if (Math.abs(predIdx - targetIdx) > 1) {
      issues.push({ severity: "critical", message: `Predicted readability level (${readability.predictedCefrLevel}) differs from target (${targetLevel}) by more than 1 band. Revise the stimulus text.` });
    }
  }

  // Short text warning
  if (readability.wordCount < 30) {
    issues.push({ severity: "minor", message: `Text is very short (${readability.wordCount} words). Readability metrics may be unreliable.` });
  }

  // Low lexical richness
  if (readability.typeTokenRatio < 0.4 && readability.wordCount > 50) {
    issues.push({ severity: "minor", message: `Low lexical diversity (TTR=${readability.typeTokenRatio}). Consider increasing vocabulary variety.` });
  }

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const majorCount = issues.filter(i => i.severity === "major").length;
  let score = 100 - criticalCount * 20 - majorCount * 10 - issues.filter(i => i.severity === "minor").length * 3;
  score = Math.max(0, score);

  return {
    readability,
    lexical,
    passesQualityGate: criticalCount === 0 && majorCount === 0,
    issues,
    qualityScore: score,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse the full linguistic quality of a stimulus text against an optional target CEFR level.
 */
export function analyseText(text: string, targetLevel?: CefrLevel): LinguisticQualityReport {
  const readability = computeReadability(text);
  const lexical = computeLexicalAnalysis(text, targetLevel);
  return buildQualityReport(readability, lexical, targetLevel);
}

/**
 * Quick predicate: does this text pass the CEFR-level quality gate?
 */
export function textPassesCefrGate(text: string, level: CefrLevel): boolean {
  return analyseText(text, level).passesQualityGate;
}

/**
 * Predict the CEFR readability level of a raw text.
 */
export function predictTextCefrLevel(text: string): CefrLevel {
  return computeReadability(text).predictedCefrLevel;
}

/**
 * Return a concise human-readable summary of text quality.
 */
export function summariseTextQuality(text: string, targetLevel?: CefrLevel): string {
  const report = analyseText(text, targetLevel);
  const lines = [
    `Readability: FRE=${report.readability.fleschReadingEase}, FKGL=${report.readability.fleschKincaidGrade} (predicted CEFR: ${report.readability.predictedCefrLevel})`,
    `Words: ${report.readability.wordCount}, Sentences: ${report.readability.sentenceCount}, ASL: ${report.readability.avgSentenceLength}`,
    `TTR: ${report.readability.typeTokenRatio}, Lexical density: ${report.readability.lexicalDensity}`,
    `Vocab bands — K1: ${report.lexical.k1Coverage}%, K2: ${report.lexical.k2Coverage}%, K3-K5: ${report.lexical.k3k5Coverage}%, AWL: ${report.lexical.awlCoverage}%, C1/C2: ${report.lexical.lowFreqCoverage}%`,
    report.issues.length > 0 ? `Issues (${report.issues.length}): ${report.issues.map(i => i.message).join(" | ")}` : "No issues detected.",
  ];
  return lines.join("\n");
}
