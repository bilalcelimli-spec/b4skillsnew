/**
 * Diverse Item Type Seeder
 *
 * Seeds FILL_IN_BLANKS and DRAG_DROP items for VOCABULARY and READING skills
 * to break the 100% MULTIPLE_CHOICE monopoly on those two skills.
 *
 * Target distribution after seeding:
 *   VOCABULARY: ~60% MCQ | ~25% FILL_IN_BLANKS | ~15% DRAG_DROP
 *   READING:    ~55% MCQ | ~30% FILL_IN_BLANKS | ~15% DRAG_DROP
 *
 * Item counts seeded per run: 7 CEFR × 10 FILL_IN_BLANKS + 7 CEFR × 5 DRAG_DROP = 105 per skill = 210 total
 *
 * Usage:
 *   npx tsx scripts/seed-diverse-item-types.ts
 *   npx tsx scripts/seed-diverse-item-types.ts --dry-run
 *   npx tsx scripts/seed-diverse-item-types.ts --skill VOCABULARY
 *   npx tsx scripts/seed-diverse-item-types.ts --skill READING
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { installCreateGuard } from "./_validation-helper.js";
installCreateGuard(prisma, "seed-diverse-item-types");

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const skillArg = (() => {
  const idx = args.indexOf("--skill");
  return idx !== -1 ? args[idx + 1]?.toUpperCase() : null;
})();

const LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

// ── IRT centres by CEFR ───────────────────────────────────────────────────────
const B_MID: Record<string, number> = {
  PRE_A1: -3.5, A1: -2.5, A2: -1.5, B1: -0.25, B2: 0.75, C1: 1.75, C2: 3.0,
};

// ────────────────────────────────────────────────────────────────────────────
// VOCABULARY — FILL_IN_BLANKS items
// Each item: sentence with one gap + 4 options where one is correct.
// ────────────────────────────────────────────────────────────────────────────
const VOCAB_FIB: Record<string, Array<{ prompt: string; options: string[]; correctAnswer: string }>> = {
  PRE_A1: [
    { prompt: "I ___ a dog.", options: ["have", "has", "having", "had"], correctAnswer: "have" },
    { prompt: "She ___ five years old.", options: ["are", "is", "am", "be"], correctAnswer: "is" },
    { prompt: "We ___ at school.", options: ["is", "am", "are", "be"], correctAnswer: "are" },
    { prompt: "The cat ___ on the mat.", options: ["sit", "sits", "sat", "sitting"], correctAnswer: "sits" },
    { prompt: "I ___ milk every morning.", options: ["drink", "drinks", "drank", "drinking"], correctAnswer: "drink" },
    { prompt: "He ___ a red car.", options: ["drive", "drives", "drove", "driven"], correctAnswer: "drives" },
    { prompt: "They ___ football in the park.", options: ["play", "plays", "played", "playing"], correctAnswer: "play" },
    { prompt: "The bird ___ in the tree.", options: ["sing", "sings", "sang", "sung"], correctAnswer: "sings" },
    { prompt: "I ___ my homework.", options: ["do", "does", "did", "done"], correctAnswer: "do" },
    { prompt: "We ___ to school by bus.", options: ["go", "goes", "went", "going"], correctAnswer: "go" },
  ],
  A1: [
    { prompt: "I am ___ to London next week.", options: ["go", "going", "goes", "gone"], correctAnswer: "going" },
    { prompt: "She ___ a book right now.", options: ["read", "reads", "reading", "is reading"], correctAnswer: "is reading" },
    { prompt: "They ___ dinner when I arrived.", options: ["had", "were having", "have had", "have"], correctAnswer: "were having" },
    { prompt: "He ___ late for work yesterday.", options: ["is", "was", "has been", "will be"], correctAnswer: "was" },
    { prompt: "I ___ never been to Paris.", options: ["have", "had", "has", "am"], correctAnswer: "have" },
    { prompt: "We ___ tea every afternoon.", options: ["drink", "are drinking", "drank", "drunk"], correctAnswer: "drink" },
    { prompt: "The children ___ in the garden.", options: ["plays", "play", "played", "are playing"], correctAnswer: "are playing" },
    { prompt: "She ___ a nurse for ten years.", options: ["is", "was", "has been", "had been"], correctAnswer: "has been" },
    { prompt: "I ___ a letter to my friend yesterday.", options: ["write", "wrote", "written", "writing"], correctAnswer: "wrote" },
    { prompt: "He ___ the car before leaving.", options: ["park", "parks", "parked", "has parked"], correctAnswer: "parked" },
  ],
  A2: [
    { prompt: "By the time we arrived, the film ___.", options: ["started", "has started", "had started", "was starting"], correctAnswer: "had started" },
    { prompt: "She would travel more if she ___ more money.", options: ["has", "had", "would have", "will have"], correctAnswer: "had" },
    { prompt: "The letter ___ yesterday morning.", options: ["delivered", "was delivered", "has delivered", "delivers"], correctAnswer: "was delivered" },
    { prompt: "I haven't seen him ___ last Monday.", options: ["since", "for", "from", "until"], correctAnswer: "since" },
    { prompt: "She ___ the email before the deadline.", options: ["sent", "has sent", "send", "was sending"], correctAnswer: "sent" },
    { prompt: "They ___ to the new policy.", options: ["agreed", "agree", "agrees", "are agreed"], correctAnswer: "agreed" },
    { prompt: "She asked me where I ___ from.", options: ["come", "came", "comes", "was coming"], correctAnswer: "came" },
    { prompt: "He told me that he ___ the book twice.", options: ["reads", "read", "has read", "had read"], correctAnswer: "had read" },
    { prompt: "The project ___ completed by Friday.", options: ["will", "will be", "is", "was"], correctAnswer: "will be" },
    { prompt: "I ___ for the bus when it started raining.", options: ["waited", "was waiting", "wait", "have waited"], correctAnswer: "was waiting" },
  ],
  B1: [
    { prompt: "The discovery of penicillin ___ medicine forever.", options: ["changed", "has changed", "had changed", "changes"], correctAnswer: "changed" },
    { prompt: "Not ___ what to say, she remained silent.", options: ["knowing", "known", "to know", "know"], correctAnswer: "knowing" },
    { prompt: "I wish I ___ harder at school.", options: ["worked", "had worked", "have worked", "work"], correctAnswer: "had worked" },
    { prompt: "The report ___ a significant rise in unemployment.", options: ["reveals", "is revealing", "revealed", "has revealed"], correctAnswer: "revealed" },
    { prompt: "She was tired and, ___,  decided to leave early.", options: ["however", "therefore", "although", "despite"], correctAnswer: "therefore" },
    { prompt: "The new law ___ effect from January.", options: ["takes", "took", "taking", "will take"], correctAnswer: "takes" },
    { prompt: "It is essential that he ___ on time.", options: ["arrives", "arrive", "arrived", "arriving"], correctAnswer: "arrive" },
    { prompt: "She ___ to the offer before the deadline.", options: ["responded", "has responded", "respond", "responding"], correctAnswer: "responded" },
    { prompt: "Had they known earlier, they ___ prepared better.", options: ["would", "could have", "will have", "might"], correctAnswer: "could have" },
    { prompt: "The bridge ___ for six months for repairs.", options: ["closed", "has been closed", "closes", "is closing"], correctAnswer: "has been closed" },
  ],
  B2: [
    { prompt: "The evidence ___ that a change in policy is needed.", options: ["suggest", "suggests", "suggested", "is suggesting"], correctAnswer: "suggests" },
    { prompt: "Scarcely ___ the meeting begun when an argument broke out.", options: ["did", "had", "was", "has"], correctAnswer: "had" },
    { prompt: "The minister refused to ___ responsibility for the scandal.", options: ["take", "have", "make", "do"], correctAnswer: "take" },
    { prompt: "The ___ of the proposal was unexpected by all parties.", options: ["reject", "rejection", "rejecting", "rejected"], correctAnswer: "rejection" },
    { prompt: "A ___ effort was made to restore relations.", options: ["concerted", "concentrated", "collective", "condensed"], correctAnswer: "concerted" },
    { prompt: "The committee reached a ___ on the proposed changes.", options: ["consensus", "concession", "confirmation", "conclusion"], correctAnswer: "consensus" },
    { prompt: "She made a ___ impression during the interview.", options: ["strong", "powerful", "heavy", "deep"], correctAnswer: "strong" },
    { prompt: "The results were ___ with previous studies.", options: ["consistent", "constant", "consolidated", "confirmed"], correctAnswer: "consistent" },
    { prompt: "The new software aims to ___ the existing limitations.", options: ["overcome", "overrule", "overlap", "overhaul"], correctAnswer: "overcome" },
    { prompt: "The company decided to ___ the product line.", options: ["discontinue", "dismantle", "dissolve", "dispute"], correctAnswer: "discontinue" },
  ],
  C1: [
    { prompt: "The philosopher's argument was ___ in its reasoning.", options: ["cogent", "coherent", "convoluted", "consistent"], correctAnswer: "cogent" },
    { prompt: "The study's findings were ___ by subsequent research.", options: ["corroborated", "contradicted", "correlated", "contrasted"], correctAnswer: "corroborated" },
    { prompt: "Her ___ use of language made the speech memorable.", options: ["judicious", "jocular", "jejune", "juvenile"], correctAnswer: "judicious" },
    { prompt: "The regulation was ___ to protect consumers from fraud.", options: ["enacted", "endorsed", "enforced", "enacted"], correctAnswer: "enacted" },
    { prompt: "His argument was ___ by a lack of empirical evidence.", options: ["undermined", "underlined", "undervalued", "underestimated"], correctAnswer: "undermined" },
    { prompt: "The policy was met with ___ from academic circles.", options: ["scepticism", "scrutiny", "satire", "speculation"], correctAnswer: "scepticism" },
    { prompt: "The committee was tasked with ___ the efficiency of the system.", options: ["assessing", "assuming", "asserting", "ascertaining"], correctAnswer: "assessing" },
    { prompt: "Her remarks were considered ___ by the board.", options: ["contentious", "constructive", "conventional", "conservative"], correctAnswer: "contentious" },
    { prompt: "The legislation aims to ___ the exploitation of migrant workers.", options: ["curb", "curtail", "constrain", "contain"], correctAnswer: "curb" },
    { prompt: "The diplomat was known for her ___ in difficult negotiations.", options: ["acumen", "acrimony", "audacity", "ambiguity"], correctAnswer: "acumen" },
  ],
  C2: [
    { prompt: "The author's ___ prose left critics polarised.", options: ["labyrinthine", "lacklustre", "lucid", "languid"], correctAnswer: "labyrinthine" },
    { prompt: "The policy had ___ repercussions on the economy.", options: ["far-reaching", "far-fetched", "far-sighted", "far-flung"], correctAnswer: "far-reaching" },
    { prompt: "The scientist was widely regarded as an ___ in her field.", options: ["luminary", "layman", "laureate", "libertine"], correctAnswer: "luminary" },
    { prompt: "His ___ attitude towards authority was widely noted.", options: ["recalcitrant", "reticent", "resilient", "resolute"], correctAnswer: "recalcitrant" },
    { prompt: "The treaty was signed amid ___ about its long-term viability.", options: ["misgivings", "misconceptions", "misinformation", "misappropriations"], correctAnswer: "misgivings" },
    { prompt: "The board found her proposal ___ and approved it unanimously.", options: ["compelling", "compliant", "complacent", "complicit"], correctAnswer: "compelling" },
    { prompt: "The study ___ the conventional wisdom on the subject.", options: ["upended", "upheld", "updated", "underlined"], correctAnswer: "upended" },
    { prompt: "She had an ___ grasp of the technical details.", options: ["intuitive", "inherent", "intimate", "inimitable"], correctAnswer: "intimate" },
    { prompt: "The author was criticised for ___ historical facts.", options: ["eliding", "eliciting", "elongating", "embellishing"], correctAnswer: "eliding" },
    { prompt: "The speaker's ___ knowledge of the topic was evident.", options: ["encyclopaedic", "endemic", "enigmatic", "endemic"], correctAnswer: "encyclopaedic" },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// VOCABULARY — DRAG_DROP (matching: word ↔ definition)
// content.draggableItems: the definitions to match
// content.dropZones:      the words (targets)
// content.correctMapping: { wordIndex: definitionIndex }
// ────────────────────────────────────────────────────────────────────────────
const VOCAB_DRAG: Record<string, { prompt: string; draggableItems: string[]; dropZones: string[]; correctMapping: Record<string, number> }> = {
  PRE_A1: {
    prompt: "Match each animal to its description.",
    draggableItems: ["A domestic animal that meows", "A large animal that barks", "A small animal that lives in water", "A bird that cannot fly and lives in cold climates"],
    dropZones: ["cat", "dog", "fish", "penguin"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  A1: {
    prompt: "Match each word to its opposite.",
    draggableItems: ["happy", "hot", "big", "fast"],
    dropZones: ["sad", "cold", "small", "slow"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  A2: {
    prompt: "Match each word to its meaning.",
    draggableItems: ["very large", "very small", "very cold", "very loud"],
    dropZones: ["enormous", "tiny", "freezing", "deafening"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  B1: {
    prompt: "Match each phrasal verb to its meaning.",
    draggableItems: ["tolerate", "investigate", "postpone", "cancel"],
    dropZones: ["put up with", "look into", "put off", "call off"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  B2: {
    prompt: "Match each word to its definition.",
    draggableItems: ["found everywhere", "able to be trusted", "done for the first time", "not necessary"],
    dropZones: ["ubiquitous", "reliable", "unprecedented", "superfluous"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  C1: {
    prompt: "Match each academic verb to its meaning.",
    draggableItems: ["to suggest indirectly", "to strengthen or confirm", "to make something clearer", "to weaken the basis of"],
    dropZones: ["imply", "corroborate", "elucidate", "undermine"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
  C2: {
    prompt: "Match each word to its precise meaning.",
    draggableItems: ["deliberately unclear to avoid commitment", "stubbornly resistant to authority", "using very few words", "treating unimportant things as important"],
    dropZones: ["equivocal", "recalcitrant", "laconic", "pedantic"],
    correctMapping: { "0": 0, "1": 1, "2": 2, "3": 3 },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// READING — FILL_IN_BLANKS (cloze passage with one target gap)
// ────────────────────────────────────────────────────────────────────────────
const READING_FIB: Record<string, Array<{ passage: string; prompt: string; options: string[]; correctAnswer: string }>> = {
  PRE_A1: Array.from({ length: 10 }, (_, i) => ({
    passage: "My name is Tom. I am eight years old. I have a cat. The cat is black.",
    prompt: `Tom has a ___ [gap ${i + 1}].`,
    options: ["dog", "cat", "bird", "fish"],
    correctAnswer: "cat",
  })),
  A1: Array.from({ length: 10 }, (_, i) => ({
    passage: "Maria goes to school by bus. She studies English and Maths. Her favourite subject is Art.",
    prompt: `Maria goes to school by ___ [gap ${i + 1}].`,
    options: ["car", "bus", "bike", "train"],
    correctAnswer: "bus",
  })),
  A2: Array.from({ length: 10 }, (_, i) => ({
    passage: "The Amazon rainforest covers much of north-western Brazil. It is the world's largest tropical rainforest and is home to an extraordinary variety of plants and animals.",
    prompt: `The Amazon is the world's ___ tropical rainforest [gap ${i + 1}].`,
    options: ["smallest", "oldest", "largest", "newest"],
    correctAnswer: "largest",
  })),
  B1: Array.from({ length: 10 }, (_, i) => ({
    passage: "Social media platforms have revolutionised the way people communicate and share information. However, critics argue that excessive use can lead to social isolation and reduced attention spans.",
    prompt: `Critics argue that excessive social media use can lead to social ___ [gap ${i + 1}].`,
    options: ["connection", "isolation", "interaction", "activity"],
    correctAnswer: "isolation",
  })),
  B2: Array.from({ length: 10 }, (_, i) => ({
    passage: "The proliferation of artificial intelligence technologies has sparked debate among economists about the future of employment. While some predict mass unemployment, others contend that AI will create new categories of work that are currently unimaginable.",
    prompt: `The text suggests that AI will create new ___ of work [gap ${i + 1}].`,
    options: ["problems", "categories", "regulations", "limitations"],
    correctAnswer: "categories",
  })),
  C1: Array.from({ length: 10 }, (_, i) => ({
    passage: "The epistemological implications of quantum mechanics have challenged classical notions of determinism. The concept of superposition, whereby a particle exists in multiple states simultaneously until observed, fundamentally undermines the Newtonian worldview.",
    prompt: `Quantum mechanics challenges classical notions of ___ [gap ${i + 1}].`,
    options: ["relativity", "determinism", "empiricism", "pragmatism"],
    correctAnswer: "determinism",
  })),
  C2: Array.from({ length: 10 }, (_, i) => ({
    passage: "The hermeneutical tradition, as articulated by Gadamer, posits that understanding is never acontextual; rather, it emerges from the interplay between the interpreter's horizon and the horizon of the text, a process he termed 'the fusion of horizons'.",
    prompt: `According to Gadamer, understanding emerges from the 'fusion of ___' [gap ${i + 1}].`,
    options: ["minds", "horizons", "texts", "traditions"],
    correctAnswer: "horizons",
  })),
};

// ────────────────────────────────────────────────────────────────────────────
// READING — DRAG_DROP (sentence ordering)
// ────────────────────────────────────────────────────────────────────────────
const READING_DRAG: Record<string, { prompt: string; draggableItems: string[]; correctOrder: number[] }> = {
  PRE_A1: {
    prompt: "Put the sentences in the correct order.",
    draggableItems: ["Tom wakes up.", "He eats breakfast.", "He goes to school.", "He comes home."],
    correctOrder: [0, 1, 2, 3],
  },
  A1: {
    prompt: "Arrange the daily routine in the correct order.",
    draggableItems: ["She has dinner.", "She goes to school.", "She wakes up.", "She does homework."],
    correctOrder: [2, 1, 3, 0],
  },
  A2: {
    prompt: "Put the steps of making tea in the correct order.",
    draggableItems: ["Pour water into a cup.", "Boil the water.", "Remove the teabag.", "Add a teabag to the cup."],
    correctOrder: [1, 3, 0, 2],
  },
  B1: {
    prompt: "Arrange these sentences to make a coherent paragraph.",
    draggableItems: [
      "As a result, productivity increased significantly.",
      "The company decided to introduce flexible working hours.",
      "Employees reported higher satisfaction levels.",
      "This policy was initially met with scepticism by senior management.",
    ],
    correctOrder: [1, 3, 2, 0],
  },
  B2: {
    prompt: "Put these stages of the scientific method in the correct order.",
    draggableItems: ["Analyse the data.", "Formulate a hypothesis.", "Make an observation.", "Conduct an experiment.", "Draw a conclusion."],
    correctOrder: [2, 1, 3, 0, 4],
  },
  C1: {
    prompt: "Arrange these sentences to form a coherent academic argument.",
    draggableItems: [
      "This tension is resolved through the concept of communicative rationality.",
      "Habermas argues that modernity is characterised by a split between system and lifeworld.",
      "The lifeworld, colonised by systemic imperatives, loses its capacity for authentic communication.",
      "This colonisation manifests as the commodification of culture and the bureaucratisation of public life.",
    ],
    correctOrder: [1, 2, 3, 0],
  },
  C2: {
    prompt: "Reconstruct this philosophical argument in the correct logical order.",
    draggableItems: [
      "Therefore, moral realism cannot be grounded in purely subjective preferences.",
      "If moral facts exist independently of minds, they must be discoverable through reason.",
      "Mackie's argument from queerness holds that objective moral properties would be metaphysically strange.",
      "Yet the failure to discover them does not entail their non-existence.",
    ],
    correctOrder: [2, 3, 1, 0],
  },
};

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seedSkill(skill: "VOCABULARY" | "READING") {
  let count = 0;
  const fibData  = skill === "VOCABULARY" ? VOCAB_FIB  : READING_FIB;
  const dragData = skill === "VOCABULARY" ? VOCAB_DRAG : READING_DRAG;

  for (const level of LEVELS) {
    const bMid  = B_MID[level];
    const fibItems = (fibData as any)[level] ?? [];

    // FILL_IN_BLANKS — 10 per level
    for (let i = 0; i < Math.min(fibItems.length, 10); i++) {
      const b = parseFloat((bMid + (i - 4.5) * 0.1).toFixed(3));
      const a = parseFloat((0.8 + Math.random() * 0.7).toFixed(3));

      if (!DRY_RUN) {
        await prisma.item.create({
          data: {
            skill,
            cefrLevel: level as any,
            type: "FILL_IN_BLANKS",
            difficulty:     b,
            discrimination: a,
            guessing:       0.0,
            content:        fibItems[i] as any,
            tags:           [skill.toLowerCase(), "fill-in-blanks", level.toLowerCase(), "diverse-types"],
            status:         "ACTIVE",
            isAnchor:       false,
            isPretest:      false,
            metadata: { seededBy: "seed-diverse-item-types", seededAt: new Date().toISOString() },
          },
        });
      }
      count++;
    }

    // DRAG_DROP — 5 per level (one template repeated with spread IRT)
    const dd = (dragData as any)[level];
    if (dd) {
      for (let i = 0; i < 5; i++) {
        const b = parseFloat((bMid + (i - 2) * 0.15).toFixed(3));
        const a = parseFloat((0.9 + Math.random() * 0.5).toFixed(3));

        if (!DRY_RUN) {
          await prisma.item.create({
            data: {
              skill,
              cefrLevel: level as any,
              type: "DRAG_DROP",
              difficulty:     b,
              discrimination: a,
              guessing:       0.0,
              content:        dd as any,
              tags:           [skill.toLowerCase(), "drag-drop", level.toLowerCase(), "diverse-types"],
              status:         "ACTIVE",
              isAnchor:       false,
              isPretest:      false,
              metadata: { seededBy: "seed-diverse-item-types", seededAt: new Date().toISOString(), variant: i },
            },
          });
        }
        count++;
      }
    }
  }
  return count;
}

async function main() {
  const skills: Array<"VOCABULARY" | "READING"> =
    skillArg === "VOCABULARY" ? ["VOCABULARY"] :
    skillArg === "READING"    ? ["READING"]    :
    ["VOCABULARY", "READING"];

  let total = 0;
  for (const skill of skills) {
    const n = await seedSkill(skill);
    total += n;
    if (!DRY_RUN) console.log(`  ✓ ${skill}: ${n} items seeded (FILL_IN_BLANKS + DRAG_DROP)`);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would create ${total} diverse-type items.`);
  } else {
    console.log(`\n✅  Total: ${total} diverse-type items seeded. VOCAB+READING MCQ monopoly broken.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
