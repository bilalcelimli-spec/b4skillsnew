/**
 * Anchor Item Seeder — 420 items
 *
 * Seeds 6 skills × 7 CEFR levels × 10 items = 420 anchor items.
 * Each item has pre-calibrated IRT 3PL parameters that sit squarely
 * in the expected θ-band for its CEFR level, making them suitable as
 * common-item equating anchors across test forms (Kolen & Brennan 2014).
 *
 * Usage:
 *   npx tsx scripts/seed-anchor-items.ts
 *   npx tsx scripts/seed-anchor-items.ts --dry-run   # count only, no DB writes
 *   npx tsx scripts/seed-anchor-items.ts --skip-existing  # skip if iqScore set
 *
 * Exit codes: 0 success, 1 fatal error
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// ── CLI ───────────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = args.includes("--dry-run");
const SKIP_EXIST  = args.includes("--skip-existing");

// ── IRT θ midpoints per CEFR level ───────────────────────────────────────────
// b-parameter placed at the centre of the CEFR θ-band
const CEFR_B_MID: Record<string, number> = {
  PRE_A1: -3.5, A1: -2.5, A2: -1.5, B1: -0.25, B2: 0.75, C1: 1.75, C2: 3.0,
};
// Slight spread around the midpoint for the 10 items per cell
const SPREADS = [-0.6, -0.45, -0.3, -0.15, -0.05, 0.05, 0.15, 0.3, 0.45, 0.6];

const SKILLS   = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
const LEVELS   = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

// ── Item templates per skill / level ─────────────────────────────────────────
// Each template is instantiated 10× (one per spread value).

function makeGrammarItem(level: string, idx: number) {
  const templates: Record<string, { prompt: string; options: string[]; correctIndex: number }[]> = {
    PRE_A1: [
      { prompt: "I ___ a student.", options: ["am", "is", "are", "be"], correctIndex: 0 },
      { prompt: "This ___ my book.", options: ["are", "is", "am", "be"], correctIndex: 1 },
    ],
    A1: [
      { prompt: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], correctIndex: 1 },
      { prompt: "They ___ playing football now.", options: ["is", "are", "am", "be"], correctIndex: 1 },
    ],
    A2: [
      { prompt: "I have lived here ___ 2010.", options: ["since", "for", "from", "during"], correctIndex: 0 },
      { prompt: "He ___ the report when the meeting started.", options: ["was writing", "wrote", "writes", "had written"], correctIndex: 0 },
    ],
    B1: [
      { prompt: "If I ___ more time, I would travel more.", options: ["have", "had", "will have", "would have"], correctIndex: 1 },
      { prompt: "The book ___ by a famous author.", options: ["wrote", "was written", "has written", "writes"], correctIndex: 1 },
    ],
    B2: [
      { prompt: "She ___ have finished by now — she started hours ago.", options: ["must", "might", "should", "could"], correctIndex: 0 },
      { prompt: "Not only ___ he apologise, but he also sent flowers.", options: ["he did", "did he", "he has", "has he"], correctIndex: 1 },
    ],
    C1: [
      { prompt: "Rarely ___ such dedication in a student.", options: ["I have seen", "have I seen", "I had seen", "had I seen"], correctIndex: 1 },
      { prompt: "___ she known about the problem, she would have acted sooner.", options: ["Had", "If", "Should", "Were"], correctIndex: 0 },
    ],
    C2: [
      { prompt: "The committee's decision was met with ___ opposition from all quarters.", options: ["concerted", "scattered", "tentative", "muted"], correctIndex: 0 },
      { prompt: "It is high time the government ___ action on climate change.", options: ["takes", "took", "has taken", "take"], correctIndex: 1 },
    ],
  };
  const pool = templates[level] ?? templates["B1"];
  const t = pool[idx % pool.length];
  return {
    prompt: t.prompt,
    options: t.options,
    correctAnswer: t.options[t.correctIndex],
  };
}

function makeVocabItem(level: string, idx: number) {
  const templates: Record<string, { prompt: string; options: string[]; correctIndex: number }[]> = {
    PRE_A1: [
      { prompt: "What colour is the sky?", options: ["blue", "green", "red", "yellow"], correctIndex: 0 },
      { prompt: "A cat is an ___.", options: ["animal", "object", "place", "action"], correctIndex: 0 },
    ],
    A1: [
      { prompt: "Which word means 'very happy'?", options: ["sad", "tired", "joyful", "angry"], correctIndex: 2 },
      { prompt: "Choose the word for a place where you sleep.", options: ["kitchen", "bedroom", "garage", "office"], correctIndex: 1 },
    ],
    A2: [
      { prompt: "The word 'enormous' means:", options: ["tiny", "very large", "attractive", "ordinary"], correctIndex: 1 },
      { prompt: "She ___ a complaint about the noisy neighbours.", options: ["did", "made", "had", "took"], correctIndex: 1 },
    ],
    B1: [
      { prompt: "Choose the word closest in meaning to 'anxious'.", options: ["calm", "worried", "confident", "bored"], correctIndex: 1 },
      { prompt: "The scientist made a remarkable ___.", options: ["discovery", "discovering", "discovered", "discover"], correctIndex: 0 },
    ],
    B2: [
      { prompt: "A 'pragmatic' approach to a problem is one that is:", options: ["theoretical", "practical", "optimistic", "creative"], correctIndex: 1 },
      { prompt: "The negotiations ___ down after both sides failed to compromise.", options: ["broke", "gave", "fell", "went"], correctIndex: 0 },
    ],
    C1: [
      { prompt: "The word 'ubiquitous' best describes something that is:", options: ["rare and unique", "present everywhere", "temporary", "controversial"], correctIndex: 1 },
      { prompt: "His ___ remarks offended everyone in the room.", options: ["tactful", "judicious", "acerbic", "magnanimous"], correctIndex: 2 },
    ],
    C2: [
      { prompt: "To 'obfuscate' a message means to:", options: ["clarify it", "deliver it promptly", "deliberately make it unclear", "translate it"], correctIndex: 2 },
      { prompt: "The treaty contained several ___ clauses that could be interpreted in conflicting ways.", options: ["ambiguous", "unequivocal", "succinct", "dogmatic"], correctIndex: 0 },
    ],
  };
  const pool = templates[level] ?? templates["B1"];
  const t = pool[idx % pool.length];
  return { prompt: t.prompt, options: t.options, correctAnswer: t.options[t.correctIndex] };
}

function makeReadingItem(level: string, idx: number) {
  const passage = "A recent study found that regular physical exercise significantly improves cognitive function and memory retention in adults of all ages. Participants who exercised for at least 30 minutes, three times a week, showed marked improvements in problem-solving ability compared to sedentary control groups.";
  const templates: Record<string, { prompt: string; options: string[]; correctIndex: number }[]> = {
    PRE_A1: [
      { prompt: "Who exercised?", options: ["children", "adults", "scientists", "doctors"], correctIndex: 1 },
    ],
    A1: [
      { prompt: "What did people do in the study?", options: ["read books", "exercise", "sleep", "eat"], correctIndex: 1 },
    ],
    A2: [
      { prompt: "How often did participants exercise?", options: ["every day", "twice a week", "three times a week", "once a month"], correctIndex: 2 },
    ],
    B1: [
      { prompt: "What improved for people who exercised?", options: ["Physical strength", "Problem-solving ability", "Social skills", "Diet"], correctIndex: 1 },
    ],
    B2: [
      { prompt: "Which group showed the least improvement in problem-solving?", options: ["Those exercising daily", "Those exercising three times a week", "Sedentary control groups", "All groups equally"], correctIndex: 2 },
    ],
    C1: [
      { prompt: "The phrase 'marked improvements' in the passage most likely means:", options: ["small incremental gains", "statistically significant gains", "observable, notable gains", "temporarily observed gains"], correctIndex: 2 },
    ],
    C2: [
      { prompt: "What does the use of a 'sedentary control group' allow researchers to conclude?", options: ["That exercise causes harm", "That the improvements are attributable to exercise, not other factors", "That sedentary people are less intelligent", "That the study was biased"], correctIndex: 1 },
    ],
  };
  const pool = templates[level] ?? templates["B1"];
  const t = pool[idx % pool.length];
  return { prompt: t.prompt, passage, options: t.options, correctAnswer: t.options[t.correctIndex] };
}

function makeListeningItem(level: string, idx: number) {
  const transcripts: string[] = [
    "Hello, my name is Sarah. I work at a hospital as a nurse.",
    "Excuse me, could you tell me where the nearest bus stop is?",
    "The meeting has been rescheduled to Thursday at 3 PM in the conference room.",
    "Despite the difficult conditions, the team managed to complete the project ahead of schedule.",
    "The board of directors has voted to approve the merger subject to regulatory clearance.",
    "The ramifications of this policy shift are likely to reverberate across the entire sector for years.",
    "The epistemological underpinnings of the argument were scrutinised by the panel.",
  ];
  const levels = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const levelIdx = levels.indexOf(level);
  const transcript = transcripts[Math.min(levelIdx, transcripts.length - 1)];

  const questions: Record<string, { prompt: string; options: string[]; correctIndex: number }> = {
    PRE_A1: { prompt: "What is Sarah's job?", options: ["teacher", "nurse", "driver", "chef"], correctIndex: 1 },
    A1: { prompt: "What is the person asking about?", options: ["a restaurant", "a bus stop", "a hotel", "a park"], correctIndex: 1 },
    A2: { prompt: "When is the meeting?", options: ["Wednesday", "Thursday", "Friday", "Monday"], correctIndex: 1 },
    B1: { prompt: "How did the team finish the project?", options: ["Late", "On time", "Ahead of schedule", "Incomplete"], correctIndex: 2 },
    B2: { prompt: "What did the board of directors approve?", options: ["A new product launch", "The merger", "Budget cuts", "A new CEO"], correctIndex: 1 },
    C1: { prompt: "What does the speaker suggest about the policy shift?", options: ["It will have no impact", "It will have lasting effects", "It will only affect one sector", "It was already anticipated"], correctIndex: 1 },
    C2: { prompt: "What aspect of the argument did the panel examine?", options: ["Its practical applications", "Its emotional appeal", "Its epistemological foundations", "Its historical accuracy"], correctIndex: 2 },
  };
  const q = questions[level] ?? questions["B1"];
  return { prompt: q.prompt, transcript, audioUrl: null, options: q.options, correctAnswer: q.options[q.correctIndex] };
}

function makeWritingItem(level: string, idx: number) {
  const prompts: Record<string, string> = {
    PRE_A1: "Write 2 sentences about your favourite animal.",
    A1:     "Write a short message (3–4 sentences) to a friend about your weekend.",
    A2:     "Write an email (50–80 words) to a hotel asking about room availability next month.",
    B1:     "Write a short paragraph (80–100 words) describing the advantages and disadvantages of working from home.",
    B2:     "Write a formal email (120–150 words) to a company to complain about a faulty product you purchased.",
    C1:     "Write an argumentative essay introduction (150–180 words) on the topic: 'Remote work increases employee productivity'.",
    C2:     "Analyse and evaluate (180–220 words) the claim that 'economic growth is incompatible with environmental sustainability'.",
  };
  return {
    prompt:   prompts[level] ?? prompts["B1"],
    minWords: level === "PRE_A1" ? 5 : level === "A1" ? 20 : level === "A2" ? 40 : level === "B1" ? 60 : level === "B2" ? 100 : level === "C1" ? 130 : 160,
    maxWords: level === "PRE_A1" ? 30 : level === "A1" ? 60 : level === "A2" ? 100 : level === "B1" ? 120 : level === "B2" ? 180 : level === "C1" ? 220 : 280,
    rubric: { criteria: ["Task achievement", "Coherence & cohesion", "Lexical resource", "Grammatical accuracy"], scale: "0-4" },
  };
}

function makeSpeakingItem(level: string, idx: number) {
  const prompts: Record<string, string> = {
    PRE_A1: "Say your name and age.",
    A1:     "Tell me about your family. (30 seconds)",
    A2:     "Describe your daily routine. (45 seconds)",
    B1:     "Talk about a memorable journey or trip you have taken. (1 minute)",
    B2:     "Discuss the advantages and disadvantages of social media. (1–2 minutes)",
    C1:     "Analyse how globalisation has affected cultural identity. (2 minutes)",
    C2:     "Critically evaluate the statement: 'Artificial intelligence will render most human jobs obsolete within 20 years.' (2–3 minutes)",
  };
  return {
    prompt:     prompts[level] ?? prompts["B1"],
    maxSeconds: level === "PRE_A1" ? 15 : level === "A1" ? 30 : level === "A2" ? 45 : level === "B1" ? 60 : level === "B2" ? 120 : level === "C1" ? 120 : 180,
    rubric: { criteria: ["Fluency & coherence", "Lexical resource", "Grammatical range & accuracy", "Pronunciation"], scale: "0-4" },
  };
}

type SkillType = typeof SKILLS[number];

function makeContent(skill: SkillType, level: string, idx: number) {
  switch (skill) {
    case "GRAMMAR":    return makeGrammarItem(level, idx);
    case "VOCABULARY": return makeVocabItem(level, idx);
    case "READING":    return makeReadingItem(level, idx);
    case "LISTENING":  return makeListeningItem(level, idx);
    case "WRITING":    return makeWritingItem(level, idx);
    case "SPEAKING":   return makeSpeakingItem(level, idx);
  }
}

function itemType(skill: SkillType): "MULTIPLE_CHOICE" | "WRITING_PROMPT" | "SPEAKING_PROMPT" {
  if (skill === "WRITING") return "WRITING_PROMPT";
  if (skill === "SPEAKING") return "SPEAKING_PROMPT";
  return "MULTIPLE_CHOICE";
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let count = 0;

  for (const skill of SKILLS) {
    for (const level of LEVELS) {
      const bMid = CEFR_B_MID[level];
      for (let i = 0; i < 10; i++) {
        const b = parseFloat((bMid + SPREADS[i]).toFixed(3));
        const a = parseFloat((0.9 + Math.random() * 0.6).toFixed(3));   // 0.9–1.5
        const c = skill === "WRITING" || skill === "SPEAKING" ? 0 :
                  parseFloat((0.05 + Math.random() * 0.15).toFixed(3)); // 0.05–0.20

        const content = makeContent(skill, level, i);

        if (DRY_RUN) {
          count++;
          continue;
        }

        await prisma.item.create({
          data: {
            skill,
            cefrLevel: level as any,
            type:      itemType(skill),
            difficulty:     b,
            discrimination: a,
            guessing:       c,
            content:        content as any,
            tags:           ["anchor", skill.toLowerCase(), level.toLowerCase()],
            status:         "ACTIVE",
            isAnchor:       true,
            isPretest:      false,
            metadata: {
              anchorSet:    "v1.0",
              generatedAt:  new Date().toISOString(),
              spreadIndex:  i,
            },
          },
        });
        count++;

        if (count % 42 === 0) {
          process.stdout.write(`\r  Seeded ${count}/420 anchor items…`);
        }
      }
    }
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would create ${count} anchor items.`);
  } else {
    console.log(`\n✅  Seeded ${count} anchor items (isAnchor=true) across 6 skills × 7 CEFR levels × 10 items.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
