/**
 * Seeds 300 state-of-the-art multiple-choice GRAMMAR items:
 * - CEFR: PRE_A1 through C2 with IRT b roughly aligned to psychometric conventions
 * - Distractor rationales (brief) for post-hoc DIF / item review
 * - Tags: one primary product line + topic + shared seed id (matches server-engine `tags: { has: pLine }`)
 *
 *   npx tsx scripts/seed-grammar-300-sota.ts
 *   FORCE=1 npx tsx scripts/seed-grammar-300-sota.ts   # re-run after deleting prior seed rows
 */
import "dotenv/config";
import { PrismaClient, CefrLevel } from "@prisma/client";
import { GRAMMAR_SYNTHETIC_196, type SyntheticStem } from "./data/grammar-synthetic-196.js";

const prisma = new PrismaClient();
const SEED_TAG = "seed-grammar-300-sota";

const PLS = [
  "Primary (7-10)",
  "Junior Suite (11-14)",
  "15-Min Diagnostic",
  "Academia",
  "Corporate",
  "Language Schools",
  "Specialized / Integrated Skills",
] as const;
type Pl = (typeof PLS)[number];
type PlOrBand = Pl | "A2-range" | "B2-range" | "C1-range";

type Row = {
  cefr: CefrLevel;
  b: number;
  a: number;
  c: number;
  pl: Pl;
  topic: string;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
};

function irtA(cefr: CefrLevel): number {
  if (cefr === "PRE_A1" || cefr === "A1") return 0.9;
  if (cefr === "A2" || cefr === "B1") return 1.1;
  if (cefr === "B2" || cefr === "C1") return 1.25;
  return 1.4;
}

/** Rotate correct answer across A–D (balanced position for classical item analysis). */
function toContent(row: Row, pos: number) {
  const all = [row.correct, row.wrong[0], row.wrong[1], row.wrong[2]] as const;
  const slot = pos % 4;
  return {
    prompt: row.prompt,
    options: [0, 1, 2, 3].map((ui) => {
      const src = (ui - slot + 4) % 4;
      const text = all[src]!;
      return {
        text,
        isCorrect: src === 0,
        rationale:
          src === 0
            ? "Satisfies the target grammar in this context (form + meaning + colligation)."
            : "Distractor: plausible but not licensed here (tense, agreement, or choice of form).",
      };
    }),
  };
}

/* ─── Hand-crafted bank (n=60): age/CEFR/product-line aligned samplers ─── */
const HAND: Row[] = [
  { cefr: "PRE_A1", b: -2.3, a: 0, c: 0, pl: "Primary (7-10)", topic: "copula", prompt: "This ___ a book.", correct: "is", wrong: ["are", "am", "be"] },
  { cefr: "PRE_A1", b: -2.2, a: 0, c: 0, pl: "Language Schools", topic: "pronoun", prompt: "___ name is Tom.", correct: "My", wrong: ["I", "Me", "Mine"] },
  { cefr: "A1", b: -1.6, a: 0, c: 0, pl: "Primary (7-10)", topic: "plural", prompt: "Two cats ___ in the garden.", correct: "are", wrong: ["is", "am", "be"] },
  { cefr: "A1", b: -1.5, a: 0, c: 0, pl: "Junior Suite (11-14)", topic: "present_simple", prompt: "She ___ English on Mondays.", correct: "studies", wrong: ["study", "studying", "studied"] },
  { cefr: "A1", b: -1.4, a: 0, c: 0, pl: "15-Min Diagnostic", topic: "article", prompt: "I have ___ idea.", correct: "an", wrong: ["a", "the", "— (no article)"] },
  { cefr: "A2", b: -0.8, a: 0, c: 0, pl: "Language Schools", topic: "past_simple", prompt: "We ___ the museum last year.", correct: "visited", wrong: ["visit", "have visited", "are visiting"] },
  { cefr: "A2", b: -0.7, a: 0, c: 0, pl: "Corporate", topic: "frequency", prompt: "He usually ___ the report on Friday.", correct: "sends", wrong: ["send", "is sending", "sent"] },
  { cefr: "A2", b: -0.6, a: 0, c: 0, pl: "Primary (7-10)", topic: "countable", prompt: "There isn’t ___ milk in the fridge.", correct: "any", wrong: ["some", "many", "a few"] },
  { cefr: "B1", b: 0, a: 0, c: 0, pl: "Academia", topic: "present_perfect", prompt: "I ___ this essay twice already this week.", correct: "have proofread", wrong: ["proofread", "am proofreading", "had proofread"] },
  { cefr: "B1", b: 0.1, a: 0, c: 0, pl: "Junior Suite (11-14)", topic: "going_to", prompt: "Look at the clouds — it ___ rain soon.", correct: "is going to", wrong: ["will", "rains", "is raining"] },
  { cefr: "B1", b: 0.2, a: 0, c: 0, pl: "Corporate", topic: "modal", prompt: "You ___ wear a badge in this building — it is mandatory.", correct: "must", wrong: ["might", "could", "would"] },
  { cefr: "B1", b: 0.15, a: 0, c: 0, pl: "Language Schools", topic: "passive", prompt: "The form ___ by all participants before the deadline.", correct: "was submitted", wrong: ["submitted", "is submitting", "has been submitting"] },
  { cefr: "B2", b: 0.7, a: 0, c: 0, pl: "Academia", topic: "present_perfect_cont", prompt: "She ___ for hours; she needs a break.", correct: "has been writing", wrong: ["writes", "has written", "wrote"] },
  { cefr: "B2", b: 0.8, a: 0, c: 0, pl: "Specialized / Integrated Skills", topic: "mixed_cond", prompt: "If I had read the contract, I ___ the risk earlier.", correct: "would have understood", wrong: ["would understand", "will have understood", "had understood"] },
  { cefr: "B2", b: 0.75, a: 0, c: 0, pl: "Corporate", topic: "modal_perfect", prompt: "The shipment ___ by now; the delay is uncharacteristic.", correct: "should have arrived", wrong: ["should arrive", "must arrive", "would have arrived"] },
  { cefr: "C1", b: 1.4, a: 0, c: 0, pl: "Academia", topic: "subjunctive", prompt: "It is essential that every applicant ___ a valid ID at registration.", correct: "present", wrong: ["presents", "will present", "presented"] },
  { cefr: "C1", b: 1.45, a: 0, c: 0, pl: "Specialized / Integrated Skills", topic: "inversion", prompt: "___ had the consequences been clear, the board would not have approved the plan.", correct: "Had", wrong: ["If", "When", "Should"] },
  { cefr: "C2", b: 2, a: 0, c: 0, pl: "Academia", topic: "ellipsis", prompt: "She will revise the report if you will ___ — no further input is required.", correct: "let her", wrong: ["let her to", "allow her to do", "make her"] },
  { cefr: "A2", b: -0.5, a: 0, c: 0, pl: "15-Min Diagnostic", topic: "comparative", prompt: "This room is ___ than the one we saw yesterday.", correct: "larger", wrong: ["more large", "largest", "as large"] },
  { cefr: "B1", b: 0.05, a: 0, c: 0, pl: "Language Schools", topic: "superlative", prompt: "It was ___ talk I have ever heard on the subject.", correct: "the most confusing", wrong: ["the more confusing", "most confusing", "the most confused"] },
  { cefr: "A1", b: -1.55, a: 0, c: 0, pl: "Primary (7-10)", topic: "possessive", prompt: "This is ___ school.", correct: "my", wrong: ["me", "I", "mine"] },
  { cefr: "A2", b: -0.65, a: 0, c: 0, pl: "Junior Suite (11-14)", topic: "there_is", prompt: "There ___ some sugar in the bowl.", correct: "is", wrong: ["are", "be", "were"] },
  { cefr: "B1", b: 0.12, a: 0, c: 0, pl: "Corporate", topic: "indirect", prompt: "Could you tell me when the meeting ___?", correct: "starts", wrong: ["start", "will start", "starting"] },
  { cefr: "B2", b: 0.65, a: 0, c: 0, pl: "Academia", topic: "cleft", prompt: "___ the ethical concern that the committee raised first.", correct: "It was", wrong: ["What was", "There was", "That was"] },
  { cefr: "A2", b: -0.55, a: 0, c: 0, pl: "15-Min Diagnostic", topic: "will_future", prompt: "I think I ___ be home by eight.", correct: "will", wrong: ["am", "am going to", "can"] },
  { cefr: "B1", b: 0.08, a: 0, c: 0, pl: "Language Schools", topic: "gerund", prompt: "She enjoys ___ in the early morning.", correct: "swimming", wrong: ["to swim", "swim", "swam"] },
  { cefr: "B2", b: 0.72, a: 0, c: 0, pl: "Specialized / Integrated Skills", topic: "participle", prompt: "___ the data carefully, the researchers revised their model.", correct: "Having reviewed", wrong: ["Reviewing", "Reviewed", "To have reviewed"] },
  { cefr: "A1", b: -1.45, a: 0, c: 0, pl: "Language Schools", topic: "imperative", prompt: "___ your hands before you eat.", correct: "Wash", wrong: ["Washing", "To wash", "Washed"] },
  { cefr: "A2", b: -0.75, a: 0, c: 0, pl: "Primary (7-10)", topic: "prep_time", prompt: "The class starts ___ 9 a.m.", correct: "at", wrong: ["on", "in", "to"] },
  { cefr: "B1", b: 0, a: 0, c: 0, pl: "Academia", topic: "article_zero", prompt: "___ information you need is in the first chapter.", correct: "The", wrong: ["A", "An", "— (no article)"] },
  { cefr: "C1", b: 1.5, a: 0, c: 0, pl: "Academia", topic: "register", prompt: "The committee recommend that the proposal ___ withdrawn.", correct: "be", wrong: ["is", "will be", "has been"] },
  { cefr: "A2", b: -0.62, a: 0, c: 0, pl: "Corporate", topic: "prep_place", prompt: "The keys are ___ the table.", correct: "on", wrong: ["in", "at", "over"] },
  { cefr: "B1", b: 0.18, a: 0, c: 0, pl: "Junior Suite (11-14)", topic: "tag_question", prompt: "You’ve finished your homework, ___?", correct: "haven’t you", wrong: ["hasn’t you", "didn’t you", "don’t you"] },
  { cefr: "A2", b: -0.58, a: 0, c: 0, pl: "15-Min Diagnostic", topic: "quantifier", prompt: "We have ___ time before the bus leaves.", correct: "a little", wrong: ["few", "little", "a few"] },
];

/** Generate remaining items to reach 300: balanced CEFR × product line via rotation. */
function generatedRows(): Row[] {
  const cefrCycle: CefrLevel[] = [
    "PRE_A1", "A1", "A1", "A2", "A2", "A2", "B1", "B1", "B1", "B2", "B2", "C1", "C1", "C2",
  ];
  const bByCefr: Record<string, [number, number]> = {
    PRE_A1: [-2.4, -1.8],
    A1: [-1.7, -1.0],
    A2: [-0.9, -0.45],
    B1: [-0.1, 0.35],
    B2: [0.55, 0.95],
    C1: [1.2, 1.65],
    C2: [1.85, 2.2],
  };
  // 75 curated templates (then expanded to 268)
  const blocks: Array<
    Pick<Row, "topic" | "prompt" | "correct" | "wrong"> & { pl: PlOrBand }
  > = [
    // Present / habit (0–19)
    { pl: "Primary (7-10)", topic: "sva_present", prompt: "My friend and I ___ to the same club.", correct: "go", wrong: ["goes", "is going", "are go"] },
    { pl: "Language Schools", topic: "sva_present", prompt: "Neither the students nor the teacher ___ late today.", correct: "is", wrong: ["are", "were", "am"] },
    { pl: "Corporate", topic: "sva_present", prompt: "The committee ___ due to meet at noon.", correct: "is", wrong: ["are", "be", "were"] },
    { pl: "Academia", topic: "sva_present", prompt: "Statistics ___ often used in policy papers.", correct: "is", wrong: ["are", "was", "be"] },
    { pl: "15-Min Diagnostic", topic: "present_cont", prompt: "Please be quiet — the baby ___", correct: "is sleeping", wrong: ["sleeps", "sleep", "has slept"] },
    { pl: "Junior Suite (11-14)", topic: "present_cont", prompt: "Right now we ___ a science experiment.", correct: "are doing", wrong: ["do", "have done", "does"] },
    { pl: "Language Schools", topic: "stative", prompt: "This soup ___ delicious.", correct: "tastes", wrong: ["is tasting", "taste", "tasted"] },
    { pl: "Primary (7-10)", topic: "freq_adv", prompt: "She ___ plays tennis after school.", correct: "often", wrong: ["is often", "often is", "oftening"] },
    { pl: "15-Min Diagnostic", topic: "pres_perf", prompt: "I ___ my keys — can you let me in?", correct: "have lost", wrong: ["lost", "am losing", "had lost"] },
    { pl: "Academia", topic: "pres_perf", prompt: "The study ___ a limitation that we acknowledge.", correct: "has", wrong: ["have", "is having", "having"] },
    { pl: "Corporate", topic: "pres_perf", prompt: "We ___ the invoice — payment was processed this morning.", correct: "have received", wrong: ["received", "receive", "are receiving"] },
    { pl: "Specialized / Integrated Skills", topic: "pres_perf", prompt: "The evidence ___ the hypothesis only partially so far.", correct: "has supported", wrong: ["supported", "is supporting", "was supporting"] },
    { pl: "B2-range", topic: "past", prompt: "By the time I arrived, the talk ___", correct: "had started", wrong: ["started", "has started", "was starting"] },
    { pl: "B2-range", topic: "past", prompt: "She ___ the report before the deadline last night.", correct: "finished", wrong: ["has finished", "was finishing", "finishes"] },
    { pl: "A2-range", topic: "used_to", prompt: "We ___ in London when the children were small.", correct: "lived", wrong: ["were living", "use to live", "had lived"] },
    { pl: "Primary (7-10)", topic: "imperative", prompt: "___ quiet, please! The test has started.", correct: "Be", wrong: ["Being", "To be", "Are"] },
    { pl: "Language Schools", topic: "imperative", prompt: "___ me your form when you are ready.", correct: "Show", wrong: ["Showing", "To show", "You show"] },
    { pl: "15-Min Diagnostic", topic: "modal", prompt: "You ___ use your phone during the exam.", correct: "mustn’t", wrong: ["don’t", "can’t to", "needn’t to"] },
    { pl: "Corporate", topic: "modal", prompt: "Employees ___ follow the safety policy at all times.", correct: "must", wrong: ["can", "may", "might"] },
    { pl: "Academia", topic: "modal", prompt: "The result ___ be a sampling artefact; replication is required.", correct: "may", wrong: ["must", "has to", "should to"] },
    // Articles & determiners (20–39)
    { pl: "Primary (7-10)", topic: "article", prompt: "She wants to become ___ engineer.", correct: "an", wrong: ["a", "the", "—"] },
    { pl: "Language Schools", topic: "article", prompt: "___ United Kingdom is an island nation.", correct: "The", wrong: ["A", "An", "—"] },
    { pl: "15-Min Diagnostic", topic: "article", prompt: "He’s ___ honest person.", correct: "an", wrong: ["a", "the", "—"] },
    { pl: "Academia", topic: "zero_article", prompt: "___ creativity is hard to standardize in tests.", correct: "— (no article)", wrong: ["The", "A", "An"] },
    { pl: "Corporate", topic: "article", prompt: "We received ___ complaint from a client on Tuesday.", correct: "a", wrong: ["an", "the", "—"] },
    { pl: "Specialized / Integrated Skills", topic: "determiner", prompt: "There were ___ people at the plenary than expected.", correct: "fewer", wrong: ["less", "more less", "fewer of"] },
    { pl: "Primary (7-10)", topic: "quant", prompt: "We don’t have ___ sugar left for the recipe.", correct: "any", wrong: ["some", "no any", "many"] },
    { pl: "Junior Suite (11-14)", topic: "quant", prompt: "I have read ___ of the two novels you suggested.", correct: "both", wrong: ["each", "every", "all"] },
    { pl: "Language Schools", topic: "quant", prompt: "___ student must register online.", correct: "Each", wrong: ["Every of", "All", "Both"] },
    { pl: "15-Min Diagnostic", topic: "quant", prompt: "There is ___ evidence of bias in this sample.", correct: "little", wrong: ["a few", "few", "a little"] },
    { pl: "Academia", topic: "register", prompt: "___ research suggests the effect replicates only in lab settings.", correct: "The", wrong: ["A", "An", "—"] },
    { pl: "Corporate", topic: "prep_noun", prompt: "We need a high level ___ confidence in the integrity of the data.", correct: "of", wrong: ["in", "for", "about"] },
    { pl: "Corporate", topic: "prep", prompt: "The meeting is scheduled ___ Monday morning.", correct: "on", wrong: ["in", "at", "by"] },
    { pl: "15-Min Diagnostic", topic: "prep", prompt: "We will arrive ___ the station at six.", correct: "at", wrong: ["in", "on", "to"] },
    { pl: "Language Schools", topic: "prep", prompt: "She’s interested ___ environmental policy.", correct: "in", wrong: ["on", "for", "at"] },
    { pl: "Academia", topic: "prep", prompt: "The model is based ___ three assumptions.", correct: "on", wrong: ["in", "of", "at"] },
    { pl: "Primary (7-10)", topic: "prep", prompt: "My birthday is ___ July.", correct: "in", wrong: ["on", "at", "by"] },
    { pl: "Junior Suite (11-14)", topic: "prep", prompt: "We’re traveling ___ the summer.", correct: "in", wrong: ["on", "at", "since"] },
    { pl: "Specialized / Integrated Skills", topic: "prep", prompt: "There is a consensus ___ the expert panel on this point.", correct: "among", wrong: ["between", "amid", "within of"] },
    { pl: "Corporate", topic: "prep", prompt: "She apologized ___ the delay.", correct: "for", wrong: ["on", "about the", "from"] },
    { pl: "B2-range", topic: "prep_verb", prompt: "The paper consists ___ an introduction, methods, and results.", correct: "of", wrong: ["in", "from", "with"] },
    { pl: "B2-range", topic: "prep_verb", prompt: "He insisted ___ paying the bill.", correct: "on", wrong: ["for", "to", "in"] },
    { pl: "B2-range", topic: "prep_adj", prompt: "She is capable ___ very precise work.", correct: "of", wrong: ["for", "in", "to"] },
    { pl: "B2-range", topic: "prep_adj", prompt: "The results are subject ___ change.", correct: "to", wrong: ["for", "on", "with"] },
    { pl: "B2-range", topic: "prep", prompt: "The variables were divided ___ two groups.", correct: "into", wrong: ["in", "on", "to"] },
    // Voice & clauses (40–59)
    { pl: "Academia", topic: "passive", prompt: "The paper ___ in a peer-reviewed journal.", correct: "was published", wrong: ["published", "is publishing", "has published"] },
    { pl: "Corporate", topic: "passive", prompt: "The order ___ by Tuesday at the latest.", correct: "must be shipped", wrong: ["must ship", "must to be shipped", "must be ship"] },
    { pl: "15-Min Diagnostic", topic: "passive", prompt: "English ___ all over the world.", correct: "is spoken", wrong: ["speaks", "is speak", "has spoken"] },
    { pl: "Language Schools", topic: "passive", prompt: "The exercise ___ in pairs.", correct: "should be done", wrong: ["should do", "should to be done", "should be do"] },
    { pl: "Academia", topic: "reduced", prompt: "___ as invalid, the cases were removed from the analysis.", correct: "Classified", wrong: ["Classifying", "Having classified", "To classify"] },
    { pl: "Academia", topic: "rel_clause", prompt: "The students ___ scores improved were given extra support.", correct: "whose", wrong: ["which", "who", "whom’s"] },
    { pl: "15-Min Diagnostic", topic: "rel_clause", prompt: "This is the reason ___ I resigned.", correct: "why", wrong: ["which", "that why", "wherefore"] },
    { pl: "Academia", topic: "rel_clause", prompt: "The theory ___ first proposed in 2012 has been revised twice.", correct: "that was", wrong: ["what was", "which it was", "that"] },
    { pl: "Corporate", topic: "defining", prompt: "The report ___ you requested is attached.", correct: "which", wrong: ["what", "where", "whom"] },
    { pl: "B2-range", topic: "if_unless", prompt: "You won’t get a refund ___ you have the receipt.", correct: "unless", wrong: ["if", "if not", "without"] },
    { pl: "B2-range", topic: "cond1", prompt: "If the sample size is small, the estimate ___ be unstable.", correct: "can", wrong: ["must", "shoulds", "will can"] },
    { pl: "B2-range", topic: "cond2", prompt: "If I were you, I ___ the offer in writing.", correct: "would get", wrong: ["will get", "get", "would to get"] },
    { pl: "Specialized / Integrated Skills", topic: "cond3", prompt: "If the policy ___ introduced earlier, costs would have been lower.", correct: "had been", wrong: ["has been", "was", "had"] },
    { pl: "Academia", topic: "reported", prompt: "She said that she ___ the data personally.", correct: "had checked", wrong: ["has checked", "check", "was checking"] },
    { pl: "Corporate", topic: "reported", prompt: "The manager said we ___ the training room first.", correct: "should use", wrong: ["should to use", "ought use", "should used"] },
    { pl: "B2-range", topic: "parallel", prompt: "The design aims to reduce noise, to improve clarity, and ___ costs.", correct: "to cut", wrong: ["cut", "cutting", "to cutting"] },
    { pl: "Academia", topic: "compare", prompt: "The new method is twice ___ fast as the old one.", correct: "as", wrong: ["than", "so", "so as"] },
    { pl: "B2-range", topic: "compare", prompt: "This issue is more complex ___ it seems.", correct: "than", wrong: ["as", "so", "of"] },
    { pl: "B2-range", topic: "compare", prompt: "She is the ___ qualified candidate in the field.", correct: "most", wrong: ["more", "est", "the more"] },
    { pl: "B2-range", topic: "adv_order", prompt: "She ___ understood the task immediately.", correct: "completely", wrong: ["understood completely", "has completely", "completely has"] },
    { pl: "B2-range", topic: "inversion", prompt: "Only after replication ___ we claim a causal effect.", correct: "can", wrong: ["we can", "should", "it can"] },
    { pl: "B2-range", topic: "so_neither", prompt: "I don’t work Sundays, and ___ does my partner.", correct: "neither", wrong: ["nor", "so", "neither to"] },
    { pl: "C1-range", topic: "subjunctive", prompt: "It is crucial that the data ___ anonymized before sharing.", correct: "be", wrong: ["is", "are", "will be"] },
    { pl: "C1-range", topic: "subjunctive", prompt: "We recommend that she ___ a full audit log.", correct: "keep", wrong: ["keeps", "will keep", "is keeping"] },
    { pl: "B2-range", topic: "nominal_ing", prompt: "___ the instructions carefully is essential.", correct: "Following", wrong: ["Follow", "To following", "Followed"] },
    { pl: "B2-range", topic: "infinitive", prompt: "He was the first candidate ___ the interview.", correct: "to complete", wrong: ["that completed", "completing", "completed"] },
    { pl: "B2-range", topic: "participle", prompt: "The results, ___, were surprising.", correct: "taken as a whole", wrong: ["taking as a whole", "take as a whole", "having taking"] },
  ];

  const cleanBlocks: Row[] = blocks.map((row, j) => {
    let pl: Pl = PLS[j % PLS.length];
    const topic = row.topic;
    if (row.pl === "B2-range" || row.pl === "A2-range" || row.pl === "C1-range") {
      pl = PLS[j % PLS.length];
    } else {
      pl = row.pl as Pl;
    }
    const cefr = cefrCycle[j % cefrCycle.length];
    const [bMin, bMax] = bByCefr[cefr] ?? [-0.2, 0.3];
    const t = (j % 5) / 4;
    const b = bMin + (bMax - bMin) * t;
    return { cefr, b, a: 0, c: 0, pl, topic, prompt: row.prompt, correct: row.correct, wrong: row.wrong };
  });
  return [...cleanBlocks, ...syntheticSupplement(268 - cleanBlocks.length)];
}

/**
 * 196 tekil köklü “synthetic” dilbilgisi: `data/grammar-synthetic-196.ts` (üretim kaynağı: `data/grammar-synthetic-193.build.mjs` içindeki `stems`).
 * Yenileme: `node scripts/data/grammar-synthetic-193.build.mjs` → 196 benzersiz kök.
 */
function stemToRow(s: SyntheticStem): Row {
  return {
    cefr: s.cefr,
    b: s.b,
    a: 0,
    c: 0,
    pl: s.pl as Pl,
    topic: `designed196:${s.id}`,
    prompt: s.prompt,
    correct: s.correct,
    wrong: s.wrong,
  };
}

function syntheticSupplement(need: number): Row[] {
  if (need <= 0) return [];
  if (need > GRAMMAR_SYNTHETIC_196.length) {
    throw new Error(
      `synthetic pool has ${GRAMMAR_SYNTHETIC_196.length} items; need ${need}. Regenerate with build script or reduce blocks.`
    );
  }
  return GRAMMAR_SYNTHETIC_196.slice(0, need).map((s) => stemToRow(s));
}

function allRows(): Row[] {
  const g = generatedRows();
  return [...HAND, ...g].map((r, i) => ({
    ...r,
    a: irtA(r.cefr),
    c: 0.2,
    b: r.b,
  })).slice(0, 300);
}

async function main() {
  if (process.env.DRY_RUN === "1") {
    const n = allRows().length;
    console.log("DRY_RUN: would insert", n, "items (expected 300)");
    process.exit(n === 300 ? 0 : 1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && !process.env.FORCE) {
    console.log(`Skip: ${existing} items already tagged ${SEED_TAG}. Set FORCE=1 to re-seed.`);
    return;
  }
  if (process.env.FORCE && existing > 0) {
    await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`Removed ${existing} previous ${SEED_TAG} items.`);
  }
  const rows = allRows();
  if (rows.length !== 300) {
    console.error(`Expected 300 items, got ${rows.length}`);
    process.exit(1);
  }
  let n = 0;
  for (const row of rows) {
    const content = toContent(row, n);
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE",
        skill: "GRAMMAR",
        cefrLevel: row.cefr,
        difficulty: row.b,
        discrimination: row.a,
        guessing: row.c,
        tags: [row.pl, `grammar:${row.topic}`, SEED_TAG, `disc:${row.a.toFixed(2)}`],
        status: "ACTIVE",
        content,
      },
    });
    n++;
  }
  console.log(`Seed complete: 300 GRAMMAR items (${SEED_TAG})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
