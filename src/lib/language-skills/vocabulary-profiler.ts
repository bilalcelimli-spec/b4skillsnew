/**
 * Vocabulary Profiler
 *
 * Analyses the CEFR word-band distribution of a text passage to ensure
 * lexical difficulty matches the target CEFR level.
 *
 * References:
 *   - English Vocabulary Profile (EVP) — Cambridge University Press
 *   - British National Corpus (BNC) frequency bands
 *   - Nation, I. S. P. (2001). Learning Vocabulary in Another Language.
 *   - CEFR Companion Volume 2020 — Vocabulary Range descriptors
 *
 * Word-band definitions (approximate token coverage):
 *   A1: Top 500 word families   → ~87% of spoken tokens
 *   A2: Top 1 000 word families → ~89% of spoken tokens
 *   B1: Top 2 000 word families → ~92% of spoken tokens (NGSL)
 *   B2: Top 3 000 word families → ~94% of tokens
 *   C1: Top 5 000 word families → ~96% of tokens (AWL heavily represented)
 *   C2: Top 8 000+ word families → ≥ 97% of tokens
 *   OFF: Below/outside these bands (technical, rare, proper nouns)
 *
 * This module ships with a curated embedded word list covering the A1–B2
 * bands (most critical for primary+junior+language-school products). C1/C2
 * relies on fallback frequency-rank heuristics. A full EVP word list can be
 * injected via setWordListOverride() in integration tests or production.
 *
 * All functions are pure — no I/O.
 */

import type { CefrLevel } from "../assessment-engine/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WordBand = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "OFF";

export interface WordBandDistribution {
  total: number;
  bands: Record<WordBand, number>;
  /** Cumulative coverage up to and including the target band */
  cumulativeCoverage: Record<WordBand, number>;
}

export interface VocabularyProfileResult {
  targetLevel: CefrLevel;
  distribution: WordBandDistribution;
  /** Whether the passage meets lexical difficulty constraints for targetLevel */
  passes: boolean;
  /** Human-readable issues found */
  issues: string[];
  /** Flesch-Kincaid Grade Level estimate */
  fleschKincaidGrade: number;
  /** Average word length in characters */
  avgWordLength: number;
  /** Type-Token Ratio (lexical diversity) */
  ttr: number;
}

// ─── Embedded A1–B1 Word List (curated subset, 1 500 families) ───────────────
// Source: NGSL top-1500 + EVP A1/A2 anchors
// Format: word → band

const A1_WORDS = new Set([
  // Articles, pronouns, auxiliaries
  "a","an","the","i","me","my","myself","we","our","ours","ourselves","you",
  "your","yours","yourself","yourselves","he","him","his","himself","she","her",
  "hers","herself","it","its","itself","they","them","their","theirs","themselves",
  "what","which","who","whom","this","that","these","those","am","is","are","was",
  "were","be","been","being","have","has","had","do","does","did","will","would",
  "shall","should","may","might","must","can","could","ought","need","dare","used",
  // Numbers / ordinals
  "one","two","three","four","five","six","seven","eight","nine","ten","eleven",
  "twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen",
  "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety","hundred","thousand",
  "first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth",
  // Time & place adverbs
  "last","next","today","tomorrow","yesterday","now","then","here","there","when",
  "where","why","how","always","never","often","sometimes","usually","again","already",
  "still","soon","late","early","ago","once","twice",
  // Quantifiers / determiners
  "all","both","each","few","more","most","other","some","such","no","not","only",
  "same","than","too","very","just","every","any","much","many","enough","another",
  // Conjunctions
  "but","and","or","nor","for","so","yet","although","because","since","while","if",
  "when","until","after","before","though","even",
  // Common nouns — people, family, body
  "name","person","people","man","woman","boy","girl","child","children","baby","friend",
  "family","mother","father","parent","son","daughter","brother","sister","husband","wife",
  "teacher","student","class","school","doctor","nurse","police","driver",
  "head","hand","eye","ear","nose","mouth","face","arm","leg","foot","feet","hair","body",
  // Common nouns — home, objects
  "house","home","room","door","window","table","chair","bed","floor","wall","garden",
  "kitchen","bathroom","bedroom","living","book","bag","car","bus","train","phone","computer",
  "pen","pencil","paper","clock","key","money","card","glass","cup","plate","food","water",
  "milk","coffee","tea","bread","rice","fruit","apple","banana","orange",
  // Animals
  "cat","dog","bird","fish","horse","cow","rabbit","mouse","chicken","duck","pet","animal",
  // Colours
  "red","blue","green","yellow","white","black","brown","pink","orange","purple","grey","gray",
  // Common verbs (base forms + inflected)
  "time","year","day","week","month","morning","afternoon","evening","night","hour","minute",
  "way","place","word","number","age","size","part","side","thing","lot","kind",
  "go","goes","went","going","gone","come","comes","came","coming",
  "take","takes","took","taking","taken","make","makes","made","making",
  "know","knows","knew","knowing","known","see","sees","saw","seeing","seen",
  "get","gets","got","getting","give","gives","gave","giving","given",
  "find","finds","found","finding","think","thinks","thought","thinking",
  "tell","tells","told","telling","become","becomes","became","becoming",
  "show","shows","showed","showing","shown","leave","leaves","left","leaving",
  "feel","feels","felt","feeling","put","puts","putting",
  "bring","brings","brought","bringing","begin","begins","began","beginning","begun",
  "keep","keeps","kept","keeping","hold","holds","held","holding",
  "write","writes","wrote","writing","written","stand","stands","stood","standing",
  "hear","hears","heard","hearing","let","lets","letting","mean","means","meant","meaning",
  "set","sets","setting","meet","meets","met","meeting",
  "run","runs","ran","running","pay","pays","paid","paying",
  "sit","sits","sat","sitting","speak","speaks","spoke","speaking","spoken",
  "read","reads","reading","grow","grows","grew","growing","grown",
  "buy","buys","bought","buying","wear","wears","wore","wearing","worn",
  "live","lives","lived","living","love","loves","loved","loving",
  "like","likes","liked","liking","want","wants","wanted","wanting",
  "need","needs","needed","needing","use","uses","used","using",
  "work","works","worked","working","play","plays","played","playing",
  "eat","eats","ate","eating","drunk","drink","drinks","drank","drinking",
  "walk","walks","walked","walking","talk","talks","talked","talking",
  "look","looks","looked","looking","listen","listens","listened","listening",
  "help","helps","helped","helping","try","tries","tried","trying",
  "start","starts","started","starting","stop","stops","stopped","stopping",
  "open","opens","opened","opening","close","closes","closed","closing",
  "call","calls","called","calling","ask","asks","asked","asking",
  "answer","answers","answered","answering","watch","watches","watched","watching",
  "learn","learns","learned","learning","teach","teaches","taught","teaching",
  "spell","spells","spelled","spelling","count","counts","counted","counting",
  "draw","draws","drew","drawing","drawn","sleep","sleeps","slept","sleeping",
  "wake","wakes","woke","waking","woken","swim","swims","swam","swimming",
  "ride","rides","rode","riding","ridden","cook","cooks","cooked","cooking",
  "clean","cleans","cleaned","cleaning","wash","washes","washed","washing",
  "sing","sings","sang","singing","sung","dance","dances","danced","dancing",
  // Basic adjectives
  "good","bad","new","old","big","small","large","little","long","short",
  "high","low","hot","cold","warm","cool","fast","slow","easy","hard","difficult",
  "right","wrong","true","false","happy","sad","hungry","tired","ill","sick","well",
  "clean","dirty","full","empty","open","closed","busy","free","ready","different",
  "same","great","nice","beautiful","pretty","funny","interesting","boring","important",
  "first","last","next","other","young","tall","fat","thin","dark","light","loud","quiet",
  // Common prepositions
  "in","on","at","by","from","up","about","into","through","during","before","after",
  "above","below","between","out","off","over","under","of","with","without","to",
  "than","per","as","near","behind","beside","inside","outside","around","across",
  // Possessives & demonstratives (additional)
  "whose","anyone","everyone","someone","no one","nobody","everybody","somebody",
  "nothing","everything","something","anywhere","everywhere","somewhere",
  // Pets / common animals (additional)
  "pets","cats","dogs","birds","fish","horses","cows","rabbits","animals",
  // Plurals of common A1 nouns
  "rooms","houses","books","bags","cars","buses","trains","phones","computers",
  "days","weeks","months","years","hours","minutes","words","things","places",
  "schools","classes","teachers","students","friends","families","people",
  "eyes","ears","hands","feet","arms","legs","heads","names","boys","girls",
  "men","women","children","babies","brothers","sisters","sons","daughters",
]);

const A2_WORDS = new Set([
  "ability","achieve","action","activity","addition","advance","advantage","advice",
  "affect","age","agree","agreement","ahead","air","already","although","always",
  "animal","answer","appear","argue","article","ask","attention","available",
  "average","avoid","back","bad","base","basic","battle","beauty","begin","believe",
  "benefit","better","black","board","body","born","both","break","bring","broad",
  "business","buy","call","care","carry","cause","center","certain","chance","change",
  "character","charge","choice","choose","city","class","clear","close","clothing",
  "club","coast","college","color","common","community","complete","concern","condition",
  "control","conversation","cost","course","create","culture","current","damage","deal",
  "decide","decision","deep","defend","degree","describe","design","development","difference",
  "difficult","direction","discover","discuss","distance","dream","drive","drop","during",
  "early","east","easy","economy","education","effort","electric","enough","environment",
  "especially","evidence","example","exercise","experience","explain","face","fair","fall",
  "false","famous","field","fight","figure","fill","final","financial","fire","floor","focus",
  "follow","food","force","foreign","forget","form","forward","free","friend","front","full",
  "future","game","general","gift","glad","glass","government","great","ground","guess",
  "happen","hard","health","heart","help","history","hope","house","idea","imagine","include",
  "increase","interest","international","join","keep","kind","knowledge","language","lead",
  "learn","letter","life","light","line","listen","local","look","love","main","manage",
  "market","material","member","mind","missing","moment","move","music","natural","necessary",
  "news","note","nothing","object","offer","office","opinion","opportunity","order","outside",
  "page","part","pass","perfect","perform","period","phone","picture","piece","plan","plant",
  "play","player","popular","position","possible","practice","present","price","produce",
  "project","provide","purpose","question","record","reduce","remember","report","require",
  "result","return","road","safe","science","sea","section","sense","simple","situation",
  "size","skill","sleep","society","song","sort","sound","special","spend","stand","start",
  "step","still","store","strong","success","support","sure","table","teacher","technology",
  "television","test","thought","together","total","trade","travel","tree","true","try",
  "understand","use","usually","value","view","village","visit","voice","walk","want","watch",
  "weather","website","west","wide","win","wish","world","write",
]);

const B1_WORDS = new Set([
  "abandon","academic","access","accommodate","accomplish","accurate","acquisition",
  "adapt","adequate","admire","admit","adolescent","adopt","adult","advertising",
  "aggressive","aid","alternative","ambitious","analysis","ancient","anxiety",
  "appropriate","approximately","architecture","argument","aspect","assess","assist",
  "assumption","attitude","audience","authority","automation","awareness","balance",
  "barrier","behavior","bias","border","budget","candidate","capacity","category",
  "challenge","characteristic","circumstance","citizen","claim","collaborate",
  "colleague","commit","communicate","compensation","competition","complex","component",
  "concentrate","concept","conclude","confident","conflict","consequence","considerable",
  "consistently","contemporary","context","contrast","contribute","controversial",
  "convention","convince","criticism","crucial","deadline","debate","decline","define",
  "demonstrate","depend","depression","deserve","despite","determine","develop",
  "digital","distinction","distribute","diverse","effective","efficient","element",
  "eliminate","emphasis","encourage","estimate","evaluate","eventually","evidence",
  "evolve","exceed","exclude","expand","expert","facilitate","failure","feature",
  "flexible","framework","fundamental","generate","global","guideline","highlight",
  "identify","illustrate","impact","implement","imply","individual","industry",
  "influence","initiative","innovate","instance","institution","integrate","interact",
  "interpret","investigate","involve","justify","maintenance","majority","maximize",
  "mechanism","media","minimize","minority","moderate","modify","motivation","negotiate",
  "network","objective","obtain","occur","opposition","outcome","overcome","participate",
  "perception","perspective","phenomenon","physical","policy","positive","potential",
  "poverty","prevent","primarily","principle","prior","procedure","proportion","propose",
  "protect","prove","publish","react","recognize","refer","reflect","regulate","relate",
  "relevant","require","research","resolve","respond","responsibility","restrict","role",
  "select","significant","solve","specific","strategy","structure","sufficient",
  "suggest","suitable","sustainable","technique","tendency","theory","tradition",
  "transform","trend","typical","ultimately","uncertain","unemployment","unique","vary",
  "volunteer","widespread",
]);

// B2+ words rely on frequency heuristics (see getWordBand)
const B2_HIGH_FREQUENCY = new Set([
  "abstract","acknowledge","acquisition","alleviate","ambiguous","analogy","anticipate",
  "assertion","circumstantial","cognitive","coherent","compelling","comprehensive",
  "conceptual","concurrent","consensus","contemporary","controversial","correlation",
  "criteria","curriculum","demographic","diminish","discriminate","disposition",
  "empirical","enumerate","facilitate","fundamental","hierarchy","hypothesis",
  "implement","incentive","incorporate","inference","inherent","initiate","innovative",
  "integrate","integrity","intervention","legislation","legitimate","mechanism",
  "methodology","minimize","objective","opposition","paradigm","parameter","perceive",
  "phenomenon","proliferate","prominent","proportion","rationale","reinforce","resilience",
  "rhetoric","spectrum","subsequent","sustainability","symbolic","systematic","theoretical",
  "underlying","validate","vulnerability",
]);

// ─── Frequency rank fallback heuristics ──────────────────────────────────────

/**
 * Estimate word band from orthographic properties when not in embedded list.
 * This is an approximation — EVP data would be more accurate.
 */
function estimateBandByHeuristic(word: string): WordBand {
  const len = word.length;
  // Very long words tend to be C1/C2 technical terms
  if (len > 14) return "C2";
  if (len > 11) return "C1";
  if (len > 9) return "B2";
  return "B1"; // default for unknown mid-length words
}

// ─── Word lookup ──────────────────────────────────────────────────────────────

let _wordListOverride: Map<string, WordBand> | null = null;

/** Inject a full EVP word list in production/tests. */
export function setWordListOverride(list: Map<string, WordBand>): void {
  _wordListOverride = list;
}

function getWordBand(rawWord: string): WordBand {
  // Proper nouns (capitalised mid-token, only alpha chars) are content-neutral:
  // they don't reflect lexical difficulty of the passage for the candidate.
  // Treat them as A1 to avoid penalising passages with names/places.
  if (/^[A-Z][a-z]+$/.test(rawWord) && rawWord.length > 1) {
    const lower = rawWord.toLowerCase();
    // Only treat as proper noun if not in any of our word lists
    if (!A1_WORDS.has(lower) && !A2_WORDS.has(lower) && !B1_WORDS.has(lower)) {
      return "A1"; // proper noun — not a vocabulary difficulty signal
    }
  }

  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word || word.length < 2) return "A1";

  if (_wordListOverride) {
    return _wordListOverride.get(word) ?? estimateBandByHeuristic(word);
  }

  if (A1_WORDS.has(word)) return "A1";
  if (A2_WORDS.has(word)) return "A2";
  if (B1_WORDS.has(word)) return "B1";
  if (B2_HIGH_FREQUENCY.has(word)) return "B2";
  return estimateBandByHeuristic(word);
}

// ─── Flesch-Kincaid ───────────────────────────────────────────────────────────

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (word.endsWith("e")) count = Math.max(1, count - 1);
  return Math.max(1, count);
}

function fleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  // FK GL = 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
  const asl = words.length / sentences.length;
  const asw = syllables / words.length;
  return Math.max(0, 0.39 * asl + 11.8 * asw - 15.59);
}

// ─── CEFR Lexical Constraints ─────────────────────────────────────────────────

interface LexicalConstraint {
  /** Minimum cumulative coverage through own band */
  minCoverageThrough: number;
  /** Maximum proportion of words above own band (off-level vocabulary) */
  maxAboveBand: number;
  /** FK Grade Level range */
  fkRange: [number, number];
}

const LEXICAL_CONSTRAINTS: Record<string, LexicalConstraint> = {
  PRE_A1: { minCoverageThrough: 0.90, maxAboveBand: 0.02, fkRange: [0, 1] },
  A1:     { minCoverageThrough: 0.88, maxAboveBand: 0.04, fkRange: [0, 2] },
  A2:     { minCoverageThrough: 0.83, maxAboveBand: 0.08, fkRange: [2, 4] },
  B1:     { minCoverageThrough: 0.78, maxAboveBand: 0.12, fkRange: [5, 7] },
  B2:     { minCoverageThrough: 0.70, maxAboveBand: 0.20, fkRange: [8, 11] },
  C1:     { minCoverageThrough: 0.60, maxAboveBand: 0.35, fkRange: [11, 14] },
  C2:     { minCoverageThrough: 0.50, maxAboveBand: 0.50, fkRange: [13, 99] },
};

const BAND_ORDER: WordBand[] = ["A1", "A2", "B1", "B2", "C1", "C2", "OFF"];

// ─── Main Analysis ────────────────────────────────────────────────────────────

/**
 * Profile a text passage against a target CEFR level.
 *
 * @param text        Raw passage text (no HTML)
 * @param targetLevel The intended CEFR difficulty level of the passage
 */
export function profileText(
  text: string,
  targetLevel: CefrLevel,
): VocabularyProfileResult {
  const tokens = text.split(/\s+/).filter((t) => t.length > 0);
  const contentWords = tokens.filter((t) => /[a-zA-Z]/.test(t));
  const n = contentWords.length || 1;

  // Band counts
  const counts: Record<WordBand, number> = {
    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, OFF: 0,
  };
  for (const token of contentWords) {
    counts[getWordBand(token)]++;
  }

  // Band proportions
  const bands: Record<WordBand, number> = {} as any;
  for (const band of BAND_ORDER) {
    bands[band] = counts[band] / n;
  }

  // Cumulative coverage
  const cumulative: Record<WordBand, number> = {} as any;
  let cum = 0;
  for (const band of BAND_ORDER) {
    cum += bands[band];
    cumulative[band] = cum;
  }

  const distribution: WordBandDistribution = {
    total: n,
    bands,
    cumulativeCoverage: cumulative,
  };

  // FK grade
  const fk = fleschKincaidGrade(text);

  // TTR
  const uniqueWords = new Set(contentWords.map((w) => w.toLowerCase()));
  const ttr = uniqueWords.size / n;

  // Average word length
  const avgWordLength =
    contentWords.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, "").length, 0) / n;

  // Constraint check
  const constraint = LEXICAL_CONSTRAINTS[targetLevel] ?? LEXICAL_CONSTRAINTS["B1"];
  const issues: string[] = [];

  // 1. Coverage through own band
  const targetBandIdx = BAND_ORDER.indexOf(targetLevel as WordBand);
  const coverageThrough =
    targetBandIdx >= 0 ? cumulative[BAND_ORDER[targetBandIdx]] ?? 0 : 0;
  if (coverageThrough < constraint.minCoverageThrough) {
    issues.push(
      `Lexical coverage through ${targetLevel} band is ${(coverageThrough * 100).toFixed(1)}% ` +
      `(minimum ${(constraint.minCoverageThrough * 100).toFixed(0)}%). ` +
      "Simplify vocabulary or add high-frequency words.",
    );
  }

  // 2. Off-level vocabulary
  const aboveBand =
    targetBandIdx >= 0
      ? BAND_ORDER.slice(targetBandIdx + 1).reduce(
          (sum, b) => sum + (bands[b] ?? 0),
          0,
        )
      : 0;
  if (aboveBand > constraint.maxAboveBand) {
    issues.push(
      `${(aboveBand * 100).toFixed(1)}% of words are above the ${targetLevel} band ` +
      `(max ${(constraint.maxAboveBand * 100).toFixed(0)}%). ` +
      "Replace low-frequency words with level-appropriate alternatives.",
    );
  }

  // 3. FK Grade
  const [fkMin, fkMax] = constraint.fkRange;
  if (fk < fkMin) {
    issues.push(
      `Flesch-Kincaid Grade Level (${fk.toFixed(1)}) is below expected range ` +
      `[${fkMin}, ${fkMax}] for ${targetLevel}. Passage may be too simple.`,
    );
  } else if (fk > fkMax) {
    issues.push(
      `Flesch-Kincaid Grade Level (${fk.toFixed(1)}) exceeds expected range ` +
      `[${fkMin}, ${fkMax}] for ${targetLevel}. Passage may be too complex.`,
    );
  }

  return {
    targetLevel,
    distribution,
    passes: issues.length === 0,
    issues,
    fleschKincaidGrade: fk,
    avgWordLength,
    ttr,
  };
}

/**
 * Quick check: does this text meet the minimum lexical standard for targetLevel?
 * Returns true/false without the full report.
 */
export function meetsLexicalStandard(text: string, targetLevel: CefrLevel): boolean {
  return profileText(text, targetLevel).passes;
}

/**
 * Format a vocabulary profile as a human-readable summary.
 */
export function formatProfileSummary(result: VocabularyProfileResult): string {
  const { distribution: d, targetLevel, passes, issues, fleschKincaidGrade: fk, ttr } = result;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const lines = [
    `Vocabulary Profile — Target: ${targetLevel} | Status: ${passes ? "✅ PASS" : "❌ FAIL"}`,
    `Words analysed: ${d.total} | FK Grade: ${fk.toFixed(1)} | TTR: ${ttr.toFixed(2)}`,
    `Band distribution:`,
    `  A1: ${pct(d.bands.A1)}  A2: ${pct(d.bands.A2)}  B1: ${pct(d.bands.B1)}` +
      `  B2: ${pct(d.bands.B2)}  C1: ${pct(d.bands.C1)}  C2: ${pct(d.bands.C2)}` +
      `  OFF: ${pct(d.bands.OFF)}`,
  ];

  if (issues.length > 0) {
    lines.push("Issues:");
    for (const issue of issues) lines.push(`  • ${issue}`);
  }

  return lines.join("\n");
}
