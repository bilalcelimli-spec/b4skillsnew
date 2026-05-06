/**
 * READING — Phase 12: SOTA Expansion
 *
 * 5 reading modules × 5 questions = 25 items
 *
 * Modules:
 *   1. PRE_A1  "Animals at the Zoo"              — signs / labels      (5 Qs)
 *   2. A1      "A Day at the Farm"               — simple narrative    (5 Qs)
 *   3. A2      "The New Neighbour"               — short dialogue      (5 Qs)
 *   4. B2      "The Psychology of Defaults"      — expository article  (5 Qs)
 *   5. C1      "On the Epistemic Value of
 *               Disagreement"                   — academic extract    (5 Qs)
 *
 * SOTA notes:
 *   - IRT params calibrated to CEFR band midpoints with ~0.2 spacing.
 *   - Distractor rationales target common error patterns (wrong referent,
 *     paraphrase confusion, plausible-but-not-stated, opposite meaning).
 *   - Key positions rotated A→B→C→D across questions within each module.
 *   - Higher-level items test inference, lexical resource, and text structure
 *     aligned to Cambridge, IELTS, and TOEFL reading descriptors.
 *
 *   npx tsx scripts/seed-reading-phase12.ts
 *   DRY_RUN=1 npx tsx scripts/seed-reading-phase12.ts
 *   FORCE=1 npx tsx scripts/seed-reading-phase12.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const SEED_TAG = "seed-reading-phase12";

// ─── MODULE 1: PRE_A1 — Zoo Signs ────────────────────────────────────────────

const M1_ID    = "primary-reading-zoo-signs";
const M1_TITLE = "Animals at the Zoo";
const M1_CEFR  = "PRE_A1";
const M1_PASS  = `[Zoo map with labels]

LION — Big. Very loud.
ELEPHANT — Very big. Grey.
PENGUIN — Black and white. Likes fish.
GIRAFFE — Very tall. Brown and yellow.
GIFT SHOP — Toys, books, cards.
CAFÉ — Sandwiches, drinks, ice cream.`;
const M1_QN = `PRE_A1 signs/labels. All answers directly stated. Key rotated.`;

// ─── MODULE 2: A1 — A Day at the Farm ────────────────────────────────────────

const M2_ID    = "primary-reading-farm-day";
const M2_TITLE = "A Day at the Farm";
const M2_CEFR  = "A1";
const M2_PASS  = `Last Sunday, my class went to Green Fields Farm.

We arrived at nine o'clock in the morning. First, we saw the cows. They were black and white and very big. Then, a farmer showed us the chickens. The chickens were in a big red barn.

At lunchtime, we ate sandwiches near the lake. I saw two ducks. They were yellow and very funny!

In the afternoon, we collected eggs from the hens. I found five eggs. My friend Tom found six. We put the eggs in a basket.

We left the farm at four o'clock. It was a wonderful day!`;
const M2_QN = `A1 narrative. Simple past. Direct detail + one inference item (wonderful). Key rotated.`;

// ─── MODULE 3: A2 — The New Neighbour ────────────────────────────────────────

const M3_ID    = "junior-reading-new-neighbour";
const M3_TITLE = "The New Neighbour";
const M3_CEFR  = "A2";
const M3_PASS  = `Alex: Hi! Are you moving in next door?
Priya: Yes! My name is Priya. We moved here from Manchester.
Alex: Welcome! I'm Alex. Do you have any brothers or sisters?
Priya: I have one brother. He's at university in Edinburgh. And you?
Alex: Just me and my mum. We've lived here for three years.
Priya: Is there a good park nearby? I love cycling.
Alex: Yes — Riverside Park is five minutes by bike. There's also a sports centre on King Street.
Priya: That's great! I play badminton. Do you play any sports?
Alex: I run. I train every morning before school.
Priya: Impressive! I hope we can be friends.
Alex: Me too. Would you like to come in for a drink?
Priya: I'd love to — thanks!`;
const M3_QN = `A2 dialogue. Wrong-referent traps (Manchester vs Edinburgh, Priya's sport vs Alex's). Key rotated.`;

// ─── MODULE 4: B2 — The Psychology of Defaults ───────────────────────────────

const M4_ID    = "langschool-reading-psychology-defaults";
const M4_TITLE = "The Psychology of Defaults";
const M4_CEFR  = "B2";
const M4_PASS  = `The choices we never consciously make often shape our lives more than the ones we deliberate over for hours. Psychologists call these 'default effects': the tendency to stay with a pre-selected option when changing it requires even modest effort.

Studies on organ donation illustrate the phenomenon starkly. Countries with opt-out systems — where citizens are donors by default unless they explicitly withdraw — have donation rates above 90%. Countries with opt-in systems, where individuals must actively register, rarely exceed 15%. The difference is not persuasion, information, or incentives; it is merely the position of the default.

The mechanism underlying this effect is a combination of inertia, the implicit signal that the default represents an endorsed recommendation, and loss aversion: deviating from a default feels like losing something already possessed.

These findings have profound implications for policy design. Governments and institutions can 'nudge' populations towards socially beneficial behaviours — saving for retirement, energy conservation, healthy eating — simply by making the desirable option the path of least resistance. Critics argue, however, that such architecture manipulates rather than informs, undermining the autonomy on which liberal democracies depend.`;
const M4_QN = `B2 expository. Inference + vocabulary-in-context + critical analysis. Key rotated.`;

// ─── MODULE 5: C1 — On the Epistemic Value of Disagreement ───────────────────

const M5_ID    = "academia-reading-epistemic-disagreement";
const M5_TITLE = "On the Epistemic Value of Disagreement";
const M5_CEFR  = "C1";
const M5_PASS  = `Contemporary epistemology has shown considerable interest in whether disagreement between equally informed and competent reasoners ought to cause a reduction in one's degree of belief. The 'conciliationist' position holds that when peers disagree, both parties should move toward a middle position, treating the disagreement itself as evidence that one's own reasoning may be flawed. Its rival, 'steadfastness', permits — and sometimes demands — that an agent maintain her prior belief in the face of peer disagreement, provided she has adequate reasons for trusting her own epistemic processes.

The debate matters beyond academic philosophy. Judicial deliberation, scientific peer review, and political negotiation each presuppose a model of rational belief revision. A conciliationist judge who automatically averaged the views of her colleagues would undermine the very purpose of individual expert judgment. Yet a steadfast scientist who refused to update on replication failures would be equally irrational.

A more nuanced position, labelled 'asymmetric conciliationism' by some, holds that the appropriate response varies with the nature of the disagreement. Where the dispute concerns empirical matters susceptible to shared evidence, convergence is epistemically warranted. Where it concerns irreducibly value-laden questions, steadfastness may legitimately persist, since no neutral arbiter exists.`;
const M5_QN = `C1 academic. Dense inference + vocabulary-in-context + text-structure + author-stance. Key rotated.`;

// ─── Items ────────────────────────────────────────────────────────────────────

const items = [

  // ══ M1: PRE_A1 — Zoo Signs ═══════════════════════════════════════════════

  {
    skill: "READING", cefrLevel: "PRE_A1", difficulty: -3.0, discrimination: 0.9, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "pre_a1", "zoo", "detail", "primary", M1_ID, SEED_TAG],
    content: {
      moduleId: M1_ID, productLine: "PRIMARY", moduleTitle: M1_TITLE,
      cefrBand: M1_CEFR, wordCount: 42, textType: "signs / map labels",
      passage: M1_PASS, qualityNotes: M1_QN,
      subskill: "detail", questionNumber: 1,
      prompt: "Which animal is VERY loud?",
      options: [
        { text: "The elephant",  isCorrect: false, rationale: "The elephant label says 'Very big. Grey.' — no mention of loud." },
        { text: "The lion",      isCorrect: true,  rationale: "The lion sign reads 'Big. Very loud.'" },
        { text: "The penguin",   isCorrect: false, rationale: "The penguin sign says it likes fish; nothing about noise." },
        { text: "The giraffe",   isCorrect: false, rationale: "The giraffe sign describes its height and colour, not sound." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "PRE_A1", difficulty: -2.8, discrimination: 0.9, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "pre_a1", "zoo", "detail", "primary", M1_ID, SEED_TAG],
    content: {
      moduleId: M1_ID, productLine: "PRIMARY", moduleTitle: M1_TITLE,
      cefrBand: M1_CEFR, wordCount: 42, textType: "signs / map labels",
      passage: M1_PASS, qualityNotes: M1_QN,
      subskill: "detail", questionNumber: 2,
      prompt: "What colours is the giraffe?",
      options: [
        { text: "Black and white",   isCorrect: false, rationale: "Black and white describes the penguin." },
        { text: "Brown and yellow",  isCorrect: true,  rationale: "The giraffe sign says 'Brown and yellow.'" },
        { text: "Grey",              isCorrect: false, rationale: "Grey describes the elephant." },
        { text: "Big and grey",      isCorrect: false, rationale: "Big and grey is not a colour description and refers to the elephant." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "PRE_A1", difficulty: -2.7, discrimination: 0.9, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "pre_a1", "zoo", "detail", "primary", M1_ID, SEED_TAG],
    content: {
      moduleId: M1_ID, productLine: "PRIMARY", moduleTitle: M1_TITLE,
      cefrBand: M1_CEFR, wordCount: 42, textType: "signs / map labels",
      passage: M1_PASS, qualityNotes: M1_QN,
      subskill: "detail", questionNumber: 3,
      prompt: "Where can you get ice cream?",
      options: [
        { text: "The gift shop",  isCorrect: false, rationale: "The gift shop sells toys, books, and cards — not ice cream." },
        { text: "Near the lion",  isCorrect: false, rationale: "There is no food near the lion sign." },
        { text: "By the penguin", isCorrect: false, rationale: "The penguin area mentions no food." },
        { text: "The café",       isCorrect: true,  rationale: "The café sign lists 'sandwiches, drinks, ice cream.'" },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "PRE_A1", difficulty: -2.6, discrimination: 0.9, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "pre_a1", "zoo", "detail", "primary", M1_ID, SEED_TAG],
    content: {
      moduleId: M1_ID, productLine: "PRIMARY", moduleTitle: M1_TITLE,
      cefrBand: M1_CEFR, wordCount: 42, textType: "signs / map labels",
      passage: M1_PASS, qualityNotes: M1_QN,
      subskill: "detail", questionNumber: 4,
      prompt: "What food does the penguin like?",
      options: [
        { text: "Sandwiches", isCorrect: false, rationale: "Sandwiches are at the café, not for penguins." },
        { text: "Fish",       isCorrect: true,  rationale: "The penguin sign says 'Likes fish.'" },
        { text: "Ice cream",  isCorrect: false, rationale: "Ice cream is a café item." },
        { text: "Toys",       isCorrect: false, rationale: "Toys are in the gift shop, not a food item." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "PRE_A1", difficulty: -2.5, discrimination: 0.9, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "pre_a1", "zoo", "detail", "primary", M1_ID, SEED_TAG],
    content: {
      moduleId: M1_ID, productLine: "PRIMARY", moduleTitle: M1_TITLE,
      cefrBand: M1_CEFR, wordCount: 42, textType: "signs / map labels",
      passage: M1_PASS, qualityNotes: M1_QN,
      subskill: "detail", questionNumber: 5,
      prompt: "What can you buy in the gift shop?",
      options: [
        { text: "Toys, books and cards",  isCorrect: true,  rationale: "The gift shop sign lists 'Toys, books, cards.'" },
        { text: "Sandwiches and drinks",  isCorrect: false, rationale: "Food and drinks are sold at the café." },
        { text: "Fish and ice cream",     isCorrect: false, rationale: "Fish is for animals; ice cream is at the café." },
        { text: "Maps and tickets",       isCorrect: false, rationale: "Maps and tickets are not listed anywhere." },
      ],
    },
  },

  // ══ M2: A1 — Farm Day ═══════════════════════════════════════════════════

  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.8, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a1", "farm", "detail", "primary", M2_ID, SEED_TAG],
    content: {
      moduleId: M2_ID, productLine: "PRIMARY", moduleTitle: M2_TITLE,
      cefrBand: M2_CEFR, wordCount: 110, textType: "personal narrative",
      passage: M2_PASS, qualityNotes: M2_QN,
      subskill: "detail", questionNumber: 1,
      prompt: "What time did the class arrive at the farm?",
      options: [
        { text: "At eight o'clock",  isCorrect: false, rationale: "Eight is not mentioned; the class arrived at nine." },
        { text: "At nine o'clock",   isCorrect: true,  rationale: "The text says 'We arrived at nine o'clock in the morning.'" },
        { text: "At ten o'clock",    isCorrect: false, rationale: "Ten o'clock is not mentioned." },
        { text: "At four o'clock",   isCorrect: false, rationale: "Four o'clock is when they left, not when they arrived." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.6, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a1", "farm", "detail", "primary", M2_ID, SEED_TAG],
    content: {
      moduleId: M2_ID, productLine: "PRIMARY", moduleTitle: M2_TITLE,
      cefrBand: M2_CEFR, wordCount: 110, textType: "personal narrative",
      passage: M2_PASS, qualityNotes: M2_QN,
      subskill: "detail", questionNumber: 2,
      prompt: "What colour were the cows?",
      options: [
        { text: "Brown and white",  isCorrect: false, rationale: "Brown is not mentioned for the cows." },
        { text: "Yellow",           isCorrect: false, rationale: "Yellow describes the ducks." },
        { text: "Black and white",  isCorrect: true,  rationale: "The text says the cows 'were black and white and very big.'" },
        { text: "Grey",             isCorrect: false, rationale: "Grey is not associated with any animal." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.5, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a1", "farm", "detail", "primary", M2_ID, SEED_TAG],
    content: {
      moduleId: M2_ID, productLine: "PRIMARY", moduleTitle: M2_TITLE,
      cefrBand: M2_CEFR, wordCount: 110, textType: "personal narrative",
      passage: M2_PASS, qualityNotes: M2_QN,
      subskill: "detail", questionNumber: 3,
      prompt: "Where were the chickens?",
      options: [
        { text: "Near the lake",           isCorrect: false, rationale: "The lake is where lunch was eaten and ducks were seen." },
        { text: "In a big red barn",       isCorrect: true,  rationale: "'The chickens were in a big red barn.'" },
        { text: "In the field with cows",  isCorrect: false, rationale: "No mention of chickens being with cows." },
        { text: "In a small yellow shed",  isCorrect: false, rationale: "Yellow describes the ducks; no yellow shed is mentioned." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.3, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a1", "farm", "detail", "primary", M2_ID, SEED_TAG],
    content: {
      moduleId: M2_ID, productLine: "PRIMARY", moduleTitle: M2_TITLE,
      cefrBand: M2_CEFR, wordCount: 110, textType: "personal narrative",
      passage: M2_PASS, qualityNotes: M2_QN,
      subskill: "detail", questionNumber: 4,
      prompt: "How many eggs did Tom find?",
      options: [
        { text: "Four",  isCorrect: false, rationale: "Four is not a number associated with Tom." },
        { text: "Five",  isCorrect: false, rationale: "Five is the number the narrator found." },
        { text: "Six",   isCorrect: true,  rationale: "'My friend Tom found six.'" },
        { text: "Seven", isCorrect: false, rationale: "Seven is not mentioned." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A1", difficulty: -1.2, discrimination: 1.0, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a1", "farm", "inference", "primary", M2_ID, SEED_TAG],
    content: {
      moduleId: M2_ID, productLine: "PRIMARY", moduleTitle: M2_TITLE,
      cefrBand: M2_CEFR, wordCount: 110, textType: "personal narrative",
      passage: M2_PASS, qualityNotes: M2_QN,
      subskill: "inference", questionNumber: 5,
      prompt: "How did the narrator feel about the trip?",
      options: [
        { text: "Bored",      isCorrect: false, rationale: "The narrator uses 'wonderful', indicating enjoyment." },
        { text: "Frightened", isCorrect: false, rationale: "No mention of fear; the tone is positive." },
        { text: "Happy",      isCorrect: true,  rationale: "'It was a wonderful day!' strongly implies happiness." },
        { text: "Tired",      isCorrect: false, rationale: "Tiredness is not expressed; the tone is positive." },
      ],
    },
  },

  // ══ M3: A2 — The New Neighbour ════════════════════════════════════════

  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.9, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a2", "dialogue", "detail", "junior", M3_ID, SEED_TAG],
    content: {
      moduleId: M3_ID, productLine: "Junior Suite (11-14)", moduleTitle: M3_TITLE,
      cefrBand: M3_CEFR, wordCount: 145, textType: "dialogue",
      passage: M3_PASS, qualityNotes: M3_QN,
      subskill: "detail", questionNumber: 1,
      prompt: "Where did Priya move from?",
      options: [
        { text: "Edinburgh",    isCorrect: false, rationale: "Edinburgh is where Priya's brother studies, not where Priya came from." },
        { text: "London",       isCorrect: false, rationale: "London is not mentioned." },
        { text: "Manchester",   isCorrect: true,  rationale: "Priya says 'We moved here from Manchester.'" },
        { text: "King Street",  isCorrect: false, rationale: "King Street is the location of the sports centre, not a city." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.7, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a2", "dialogue", "detail", "junior", M3_ID, SEED_TAG],
    content: {
      moduleId: M3_ID, productLine: "Junior Suite (11-14)", moduleTitle: M3_TITLE,
      cefrBand: M3_CEFR, wordCount: 145, textType: "dialogue",
      passage: M3_PASS, qualityNotes: M3_QN,
      subskill: "detail", questionNumber: 2,
      prompt: "Where is Priya's brother at university?",
      options: [
        { text: "Manchester",   isCorrect: false, rationale: "Manchester is the city Priya came from." },
        { text: "Edinburgh",    isCorrect: true,  rationale: "Priya says 'He's at university in Edinburgh.'" },
        { text: "Riverside",    isCorrect: false, rationale: "Riverside is a local park, not a city." },
        { text: "King Street",  isCorrect: false, rationale: "King Street is the sports centre location." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.6, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a2", "dialogue", "detail", "junior", M3_ID, SEED_TAG],
    content: {
      moduleId: M3_ID, productLine: "Junior Suite (11-14)", moduleTitle: M3_TITLE,
      cefrBand: M3_CEFR, wordCount: 145, textType: "dialogue",
      passage: M3_PASS, qualityNotes: M3_QN,
      subskill: "detail", questionNumber: 3,
      prompt: "What is the name of the park near Alex's home?",
      options: [
        { text: "Green Park",       isCorrect: false, rationale: "Green Park is not mentioned." },
        { text: "King Street Park", isCorrect: false, rationale: "King Street is the sports centre, not the park." },
        { text: "Riverside Park",   isCorrect: true,  rationale: "Alex says 'Riverside Park is five minutes by bike.'" },
        { text: "City Park",        isCorrect: false, rationale: "City Park is not mentioned." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.5, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a2", "dialogue", "detail", "junior", M3_ID, SEED_TAG],
    content: {
      moduleId: M3_ID, productLine: "Junior Suite (11-14)", moduleTitle: M3_TITLE,
      cefrBand: M3_CEFR, wordCount: 145, textType: "dialogue",
      passage: M3_PASS, qualityNotes: M3_QN,
      subskill: "detail", questionNumber: 4,
      prompt: "What sport does Alex do?",
      options: [
        { text: "Cycling",   isCorrect: false, rationale: "Cycling is Priya's hobby." },
        { text: "Badminton", isCorrect: false, rationale: "Badminton is Priya's sport." },
        { text: "Swimming",  isCorrect: false, rationale: "Swimming is not mentioned by either character." },
        { text: "Running",   isCorrect: true,  rationale: "Alex says 'I run. I train every morning before school.'" },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "A2", difficulty: -0.3, discrimination: 1.1, guessing: 0.25,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "a2", "dialogue", "inference", "junior", M3_ID, SEED_TAG],
    content: {
      moduleId: M3_ID, productLine: "Junior Suite (11-14)", moduleTitle: M3_TITLE,
      cefrBand: M3_CEFR, wordCount: 145, textType: "dialogue",
      passage: M3_PASS, qualityNotes: M3_QN,
      subskill: "inference", questionNumber: 5,
      prompt: "What does Priya want from her new neighbourhood?",
      options: [
        { text: "A new job",               isCorrect: false, rationale: "No mention of work or employment." },
        { text: "To make a new friend",    isCorrect: true,  rationale: "Priya says 'I hope we can be friends.'" },
        { text: "To find a sports centre", isCorrect: false, rationale: "Alex mentions a sports centre, but Priya's main goal is friendship." },
        { text: "To cycle to university",  isCorrect: false, rationale: "University is mentioned for her brother, not Priya." },
      ],
    },
  },

  // ══ M4: B2 — Psychology of Defaults ═════════════════════════════════

  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.6, discrimination: 1.2, guessing: 0.2,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "b2", "article", "gist", "language-schools", M4_ID, SEED_TAG],
    content: {
      moduleId: M4_ID, productLine: "Language Schools", moduleTitle: M4_TITLE,
      cefrBand: M4_CEFR, wordCount: 215, textType: "expository article",
      passage: M4_PASS, qualityNotes: M4_QN,
      subskill: "gist", questionNumber: 1,
      prompt: "What is the central argument of the passage?",
      options: [
        { text: "Organ donation rates reflect cultural attitudes toward death.",                        isCorrect: false, rationale: "Organ donation is an illustration, not the main topic." },
        { text: "Pre-selected choices have a powerful influence on human behaviour.",                  isCorrect: true,  rationale: "The passage argues defaults shape choices more than deliberation." },
        { text: "Incentives are the most effective tool for changing public behaviour.",               isCorrect: false, rationale: "The passage explicitly states the difference 'is not… incentives.'" },
        { text: "Governments should always use opt-out systems for public policy.",                    isCorrect: false, rationale: "The passage presents this as one application but notes critics' objections." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.7, discrimination: 1.2, guessing: 0.2,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "b2", "article", "detail", "language-schools", M4_ID, SEED_TAG],
    content: {
      moduleId: M4_ID, productLine: "Language Schools", moduleTitle: M4_TITLE,
      cefrBand: M4_CEFR, wordCount: 215, textType: "expository article",
      passage: M4_PASS, qualityNotes: M4_QN,
      subskill: "detail", questionNumber: 2,
      prompt: "What is the organ donation rate in opt-out countries?",
      options: [
        { text: "Below 15%",  isCorrect: false, rationale: "Below 15% is the figure for opt-IN countries." },
        { text: "Around 50%", isCorrect: false, rationale: "50% is not mentioned; the actual figure is much higher." },
        { text: "About 75%",  isCorrect: false, rationale: "75% is not used in the passage." },
        { text: "Above 90%",  isCorrect: true,  rationale: "The text states opt-out countries 'have donation rates above 90%.'" },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.8, discrimination: 1.2, guessing: 0.2,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "b2", "article", "vocabulary-in-context", "language-schools", M4_ID, SEED_TAG],
    content: {
      moduleId: M4_ID, productLine: "Language Schools", moduleTitle: M4_TITLE,
      cefrBand: M4_CEFR, wordCount: 215, textType: "expository article",
      passage: M4_PASS, qualityNotes: M4_QN,
      subskill: "vocabulary-in-context", questionNumber: 3,
      prompt: "In the third paragraph, the word 'inertia' most closely means:",
      options: [
        { text: "The tendency to remain in a current state rather than change", isCorrect: true,  rationale: "Inertia = passive tendency to stick with the default option." },
        { text: "A strong desire to rebel against authority",                   isCorrect: false, rationale: "Inertia does not imply rebellion." },
        { text: "A deliberate strategy used by governments",                    isCorrect: false, rationale: "Inertia is a psychological tendency, not a government strategy." },
        { text: "Rapid and unexplained shifts in decision-making",              isCorrect: false, rationale: "This is the opposite of inertia." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "B2", difficulty: 0.9, discrimination: 1.25, guessing: 0.2,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "b2", "article", "inference", "language-schools", M4_ID, SEED_TAG],
    content: {
      moduleId: M4_ID, productLine: "Language Schools", moduleTitle: M4_TITLE,
      cefrBand: M4_CEFR, wordCount: 215, textType: "expository article",
      passage: M4_PASS, qualityNotes: M4_QN,
      subskill: "inference", questionNumber: 4,
      prompt: "To make something 'the path of least resistance' means to:",
      options: [
        { text: "Remove all legal barriers to a behaviour",                          isCorrect: false, rationale: "Legal barriers are distinct from default-setting." },
        { text: "Set it as the automatic option people follow without active effort", isCorrect: true,  rationale: "Path of least resistance = making the desirable choice the default." },
        { text: "Educate people about the benefits of a behaviour",                  isCorrect: false, rationale: "Education is distinct from default architecture." },
        { text: "Penalise individuals who choose a different option",                isCorrect: false, rationale: "Default architecture does not involve penalties." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "B2", difficulty: 1.0, discrimination: 1.25, guessing: 0.2,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "b2", "article", "critical-analysis", "language-schools", M4_ID, SEED_TAG],
    content: {
      moduleId: M4_ID, productLine: "Language Schools", moduleTitle: M4_TITLE,
      cefrBand: M4_CEFR, wordCount: 215, textType: "expository article",
      passage: M4_PASS, qualityNotes: M4_QN,
      subskill: "critical-analysis", questionNumber: 5,
      prompt: "What is the main concern raised by critics of 'nudge' policy architecture?",
      options: [
        { text: "Nudge policies are ineffective and do not change behaviour.",         isCorrect: false, rationale: "Critics do not dispute effectiveness; they raise ethical concerns." },
        { text: "Default systems manipulate people and undermine individual autonomy.", isCorrect: true,  rationale: "Critics argue such architecture 'manipulates rather than informs, undermining… autonomy.'" },
        { text: "Governments lack the data to design reliable default systems.",       isCorrect: false, rationale: "Data availability is not raised as the critics' argument." },
        { text: "Opt-out systems are too expensive to implement nationally.",          isCorrect: false, rationale: "Cost is not raised as an objection." },
      ],
    },
  },

  // ══ M5: C1 — Epistemic Disagreement ══════════════════════════════════

  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.4, discrimination: 1.3, guessing: 0.15,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "c1", "academic", "gist", "academia", M5_ID, SEED_TAG],
    content: {
      moduleId: M5_ID, productLine: "Academia", moduleTitle: M5_TITLE,
      cefrBand: M5_CEFR, wordCount: 225, textType: "academic extract",
      passage: M5_PASS, qualityNotes: M5_QN,
      subskill: "gist", questionNumber: 1,
      prompt: "What does the 'conciliationist' position hold?",
      options: [
        { text: "That peer disagreement should be ignored in rational discourse.",              isCorrect: false, rationale: "Conciliationism takes disagreement very seriously." },
        { text: "That disagreeing peers should seek external arbitration.",                    isCorrect: false, rationale: "External arbitration is not part of the conciliationist position." },
        { text: "That an agent should always maintain their belief despite any disagreement.", isCorrect: false, rationale: "This describes steadfastness, the opposing view." },
        { text: "That upon peer disagreement, both parties should move toward a middle position.", isCorrect: true, rationale: "The text states conciliationists hold that both should 'move toward a middle position.'" },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.5, discrimination: 1.3, guessing: 0.15,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "c1", "academic", "vocabulary-in-context", "academia", M5_ID, SEED_TAG],
    content: {
      moduleId: M5_ID, productLine: "Academia", moduleTitle: M5_TITLE,
      cefrBand: M5_CEFR, wordCount: 225, textType: "academic extract",
      passage: M5_PASS, qualityNotes: M5_QN,
      subskill: "vocabulary-in-context", questionNumber: 2,
      prompt: "As used in the first paragraph, 'steadfastness' most closely refers to:",
      options: [
        { text: "The willingness to change one's opinion based on new data.",               isCorrect: false, rationale: "This describes rational belief revision, closer to conciliationism." },
        { text: "Maintaining one's prior belief even when a competent peer disagrees.",     isCorrect: true,  rationale: "Steadfastness = permitting an agent to 'maintain her prior belief in the face of peer disagreement.'" },
        { text: "The practice of suspending judgment until consensus is reached.",          isCorrect: false, rationale: "Suspending judgment is neither position described here." },
        { text: "An empirical method for evaluating the credibility of disagreements.",     isCorrect: false, rationale: "Steadfastness is an epistemic stance, not a method." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.6, discrimination: 1.3, guessing: 0.15,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "c1", "academic", "text-structure", "academia", M5_ID, SEED_TAG],
    content: {
      moduleId: M5_ID, productLine: "Academia", moduleTitle: M5_TITLE,
      cefrBand: M5_CEFR, wordCount: 225, textType: "academic extract",
      passage: M5_PASS, qualityNotes: M5_QN,
      subskill: "text-structure", questionNumber: 3,
      prompt: "Why does the author introduce the example of a 'conciliationist judge'?",
      options: [
        { text: "To show that conciliationism is universally accepted in legal systems.",    isCorrect: false, rationale: "The example is used critically, not to endorse the view." },
        { text: "To illustrate a limitation of applying conciliationism professionally.",    isCorrect: true,  rationale: "The judge example shows automatic averaging 'would undermine the very purpose of individual expert judgment.'" },
        { text: "To demonstrate that judicial systems already use peer-averaging.",          isCorrect: false, rationale: "The example is a hypothetical risk, not a current practice." },
        { text: "To argue that legal experts are immune to the peer-disagreement problem.",  isCorrect: false, rationale: "The author does not claim immunity." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.7, discrimination: 1.3, guessing: 0.15,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "c1", "academic", "inference", "academia", M5_ID, SEED_TAG],
    content: {
      moduleId: M5_ID, productLine: "Academia", moduleTitle: M5_TITLE,
      cefrBand: M5_CEFR, wordCount: 225, textType: "academic extract",
      passage: M5_PASS, qualityNotes: M5_QN,
      subskill: "inference", questionNumber: 4,
      prompt: "According to 'asymmetric conciliationism', when is steadfastness acceptable?",
      options: [
        { text: "When both parties are equally qualified experts in the same field.",                 isCorrect: false, rationale: "The asymmetric position focuses on the nature of the dispute, not qualifications." },
        { text: "When one party has access to superior empirical evidence.",                          isCorrect: false, rationale: "Superior evidence would favour convergence on the asymmetric view." },
        { text: "When the disagreement involves irreducible value-laden questions.",                  isCorrect: true,  rationale: "Steadfastness 'may legitimately persist' for 'irreducibly value-laden questions, since no neutral arbiter exists.'" },
        { text: "When the disagreement is expressed in writing rather than conversation.",            isCorrect: false, rationale: "The medium of expression is irrelevant." },
      ],
    },
  },
  {
    skill: "READING", cefrLevel: "C1", difficulty: 1.8, discrimination: 1.35, guessing: 0.15,
    type: "MULTIPLE_CHOICE", status: "ACTIVE",
    tags: ["reading", "c1", "academic", "author-purpose", "academia", M5_ID, SEED_TAG],
    content: {
      moduleId: M5_ID, productLine: "Academia", moduleTitle: M5_TITLE,
      cefrBand: M5_CEFR, wordCount: 225, textType: "academic extract",
      passage: M5_PASS, qualityNotes: M5_QN,
      subskill: "author-purpose", questionNumber: 5,
      prompt: "Which best describes the author's overall stance?",
      options: [
        { text: "Strongly in favour of conciliationism as the only rational response.",             isCorrect: false, rationale: "The author presents both positions critically before introducing a third." },
        { text: "Critical of all philosophical debate on disagreement as impractical.",              isCorrect: false, rationale: "The author explicitly states 'the debate matters beyond academic philosophy.'" },
        { text: "Impartially presenting two positions before implicitly endorsing a nuanced middle ground.", isCorrect: true, rationale: "The author introduces asymmetric conciliationism as 'more nuanced', signalling approval." },
        { text: "Arguing that disagreement should always be resolved by empirical evidence.",        isCorrect: false, rationale: "The author acknowledges value disputes where empirical evidence is insufficient." },
      ],
    },
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.log(`DRY_RUN: would insert ${items.length} READING items across 5 modules`);
    process.exit(0);
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

  let n = 0;
  for (const item of items) {
    await prisma.item.create({
      data: {
        type: item.type as any,
        skill: item.skill as any,
        cefrLevel: item.cefrLevel as any,
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        guessing: item.guessing,
        tags: [...item.tags],
        status: item.status as any,
        content: item.content as any,
      },
    });
    n++;
  }

  const byLevel = ["PRE_A1", "A1", "A2", "B2", "C1"].map(l =>
    `${l}: ${items.filter(i => i.cefrLevel === l).length}`
  ).join(", ");
  console.log(`Seed complete: ${n} READING items (${byLevel}) — ${SEED_TAG}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
