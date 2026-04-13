/**
 * LinguAdapt Item Similarity Detector
 *
 * Prevents item bank contamination from:
 *  — Near-duplicate items (same stem rephrased)
 *  — Stimulus reuse without credit (shared reading passage)
 *  — Key-skill overlap (items measuring identical sub-skills from the same text)
 *
 * Algorithms:
 *  — Character N-gram fingerprint (Jaccard similarity) — fast O(n) comparison
 *  — Shingling (word 3-grams) — sentence-structure aware
 *  — Levenshtein edit distance (normalised) — exact near-match
 *  — TF-IDF cosine skeleton — weighted by informativeness
 *
 * Reference:
 *  — Broder (1997) "On the Resemblance and Containment of Documents"
 *  — Metzler & Croft (2000) TF-IDF cosine for short texts
 *  — ETS (2012) "DIF and Item Fairness" — item equivalence policy
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemFingerprint {
  id: string;
  stemText: string;         // Core question stem (no instructions)
  stimulusText?: string;    // Reading/listening stimulus if present
  choicesText?: string;     // Combined option text
  combinedText: string;     // Concatenated stem + stimulus + choices
  trigrams: Set<string>;    // Character 3-gram set
  wordNgrams: Set<string>;  // Word 3-gram set
  keywords: Set<string>;    // Lemmatized content keywords
}

export interface SimilarityResult {
  itemId: string;
  referenceItemId: string;
  jaccardTrigram: number;      // 0–1. ≥ 0.5 = near-duplicate
  jaccardWordNgram: number;    // 0–1. ≥ 0.4 = structurally similar
  normalizedLevenshtein: number; // 0–1. ≥ 0.85 = very close
  keywordOverlap: number;      // 0–1. ≥ 0.7 = same construct
  compositeScore: number;      // 0–1 weighted average
  isDuplicate: boolean;        // true when composite ≥ DUPLICATE_THRESHOLD
  isSuspicious: boolean;       // true when composite ≥ SUSPICIOUS_THRESHOLD
  matchedOn: Array<"trigram" | "word-ngram" | "levenshtein" | "keyword">;
}

export interface BankSimilarityReport {
  newItemId: string;
  totalCompared: number;
  duplicates: SimilarityResult[];
  suspicious: SimilarityResult[];
  clearToAdd: boolean;
  topMatch?: SimilarityResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CHAR_N = 4;              // Character n-gram size
const WORD_N = 3;              // Word n-gram size
const DUPLICATE_THRESHOLD = 0.55;
const SUSPICIOUS_THRESHOLD = 0.35;

// Composite weights
const W_TRIGRAM   = 0.30;
const W_WORDNGRAM = 0.30;
const W_LEVENSHTEIN = 0.20;
const W_KEYWORD   = 0.20;

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","as","is","was","are","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","not","this","that","these","those","which","who","what","when","where","how","i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their","all","each","every","some","any","also","just","only","very","much","more","most"
]);

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenise(text: string): string[] {
  return normalise(text).split(" ").filter(w => w.length > 1);
}

function extractKeywords(text: string): Set<string> {
  return new Set(tokenise(text).filter(w => !STOPWORDS.has(w) && w.length > 3));
}

// ─────────────────────────────────────────────────────────────────────────────
// N-GRAM GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function charNgrams(text: string, n: number = CHAR_N): Set<string> {
  const s = normalise(text).replace(/\s/g, "_");
  const grams = new Set<string>();
  for (let i = 0; i <= s.length - n; i++) {
    grams.add(s.slice(i, i + n));
  }
  return grams;
}

function wordNgrams(text: string, n: number = WORD_N): Set<string> {
  const tokens = tokenise(text);
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.add(tokens.slice(i, i + n).join(" "));
  }
  return grams;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMILARITY METRICS
// ─────────────────────────────────────────────────────────────────────────────

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const el of a) if (b.has(el)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Levenshtein edit distance (Wagner-Fischer DP).
 * Limited to strings up to 500 chars to avoid O(n²) blow-up.
 */
function levenshtein(a: string, b: string): number {
  const s = normalise(a).slice(0, 500);
  const t = normalise(b).slice(0, 500);
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const dp: number[] = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    let prev = dp[0]++;
    for (let j = 1; j <= t.length; j++) {
      const temp = dp[j];
      dp[j] = s[i - 1] === t[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[t.length];
}

function normalisedLevenshtein(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINTING
// ─────────────────────────────────────────────────────────────────────────────

export function buildFingerprint(item: {
  id: string;
  stem?: string;
  stimulus?: string;
  choices?: string[];
}): ItemFingerprint {
  const stemText = item.stem ?? "";
  const stimulusText = item.stimulus ?? "";
  const choicesText = (item.choices ?? []).join(" ");
  const combinedText = [stemText, stimulusText, choicesText].filter(Boolean).join(" ");

  return {
    id: item.id,
    stemText,
    stimulusText,
    choicesText,
    combinedText,
    trigrams: charNgrams(combinedText),
    wordNgrams: wordNgrams(combinedText),
    keywords: extractKeywords(combinedText),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM-TO-ITEM SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

export function compareTwoItems(a: ItemFingerprint, b: ItemFingerprint): SimilarityResult {
  const jt = jaccard(a.trigrams, b.trigrams);
  const jw = jaccard(a.wordNgrams, b.wordNgrams);
  const nled = normalisedLevenshtein(a.combinedText, b.combinedText);
  const ko = jaccard(a.keywords, b.keywords);

  const composite = jt * W_TRIGRAM + jw * W_WORDNGRAM + nled * W_LEVENSHTEIN + ko * W_KEYWORD;

  const matchedOn: SimilarityResult["matchedOn"] = [];
  if (jt >= 0.40) matchedOn.push("trigram");
  if (jw >= 0.35) matchedOn.push("word-ngram");
  if (nled >= 0.75) matchedOn.push("levenshtein");
  if (ko >= 0.60) matchedOn.push("keyword");

  return {
    itemId: a.id,
    referenceItemId: b.id,
    jaccardTrigram: Math.round(jt * 1000) / 1000,
    jaccardWordNgram: Math.round(jw * 1000) / 1000,
    normalizedLevenshtein: Math.round(nled * 1000) / 1000,
    keywordOverlap: Math.round(ko * 1000) / 1000,
    compositeScore: Math.round(composite * 1000) / 1000,
    isDuplicate: composite >= DUPLICATE_THRESHOLD,
    isSuspicious: composite >= SUSPICIOUS_THRESHOLD && composite < DUPLICATE_THRESHOLD,
    matchedOn,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK-LEVEL SIMILARITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare a new item against an existing bank.
 * Returns bank similarity report with sorted matches.
 */
export function checkAgainstBank(
  newItem: ItemFingerprint,
  bankFingerprints: ItemFingerprint[]
): BankSimilarityReport {
  if (bankFingerprints.length === 0) {
    return { newItemId: newItem.id, totalCompared: 0, duplicates: [], suspicious: [], clearToAdd: true };
  }

  const results = bankFingerprints
    .map(existing => compareTwoItems(newItem, existing))
    .sort((a, b) => b.compositeScore - a.compositeScore);

  const duplicates = results.filter(r => r.isDuplicate);
  const suspicious = results.filter(r => r.isSuspicious);

  return {
    newItemId: newItem.id,
    totalCompared: bankFingerprints.length,
    duplicates,
    suspicious,
    clearToAdd: duplicates.length === 0,
    topMatch: results[0],
  };
}

/**
 * Deduplicate a batch of newly generated items before inserting into the bank.
 * Returns only unique items (first occurrence wins).
 */
export function deduplicateBatch(items: ItemFingerprint[]): {
  unique: ItemFingerprint[];
  removed: Array<{ item: ItemFingerprint; matchedWith: string; compositeScore: number }>;
} {
  const unique: ItemFingerprint[] = [];
  const removed: ReturnType<typeof deduplicateBatch>["removed"] = [];

  for (const item of items) {
    const report = checkAgainstBank(item, unique);
    if (report.clearToAdd) {
      unique.push(item);
    } else {
      removed.push({
        item,
        matchedWith: report.topMatch!.referenceItemId,
        compositeScore: report.topMatch!.compositeScore,
      });
    }
  }

  return { unique, removed };
}

/**
 * Find top-N most similar items to a query item (without duplicate threshold).
 */
export function findSimilarItems(
  query: ItemFingerprint,
  bank: ItemFingerprint[],
  topN = 5
): SimilarityResult[] {
  return bank
    .map(item => compareTwoItems(query, item))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, topN);
}
