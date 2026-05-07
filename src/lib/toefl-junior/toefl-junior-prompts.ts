/**
 * TOEFL Junior AI Prompt Templates
 *
 * Builds precise, exam-aligned prompts for the AI item generator.
 * Each builder encodes exact TOEFL Junior task constraints:
 *   - Section 1: Listening (short conversations, short talks, academic discussions)
 *   - Section 2: Language Form and Meaning (grammar MCQ, vocabulary-in-context MCQ)
 *   - Section 3: Reading Comprehension (7 passage types × 6 questions)
 */

import {
  type ToeflJuniorTask,
  TOEFL_JUNIOR_META,
  TOEFL_JUNIOR_TASKS,
  getToeflJuniorTask,
} from "./toefl-junior-framework";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SHARED QUALITY RUBRIC
// ─────────────────────────────────────────────────────────────────────────────

const TOEFL_QUALITY_RUBRIC = `
TOEFL JUNIOR ITEM QUALITY REQUIREMENTS (mandatory):
- Exactly ONE unambiguously correct answer. All other options must be clearly wrong
  when the stimulus is fully understood.
- All 4 options must be the same grammatical category and roughly the same length.
- NO trick questions, double negatives, or "all of the above / none of the above".
- Language and content must be appropriate for students aged 11–15.
- Avoid culturally specific references that non-native speakers may not recognise.
- Distractors must represent real, systematic learner errors — not absurd foils.
- IRT parameters: b (difficulty) within task range; a (discrimination) 0.6–2.0;
  c (guessing) = 0.25 for all 4-option MCQ items.
- Do NOT copy items verbatim from published ETS TOEFL Junior practice tests.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// 2. PER-FORMAT PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/** Section 1 Part 1 — Short Conversation MCQ */
function buildShortConversationPrompt(
  task: ToeflJuniorTask,
  topic: string,
  batchSize: number
): string {
  return `
You are an ETS TOEFL Junior item writer generating ${batchSize} Listening Part 1 items.

TASK: Short Conversations
- Format: 2 speakers, 4–8 natural exchanges, followed by 1 four-option question.
- Setting: Everyday school context (classroom, cafeteria, hallway, library, sports, etc.)
- Speech: Natural pace with contractions, hesitations, short responses.
- One question per conversation — each item is independent.

CONTENT TOPIC: ${topic}

ALLOWED QUESTION TYPES (vary across items):
${task.questionTypes.map((q) => `  - ${q}`).join("\n")}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${batchSize} items:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "LISTENING",
    "cefrLevel": "<A2, B1, or B1+ based on difficulty>",
    "difficulty": <b, within [${task.difficultyRange[0]}, ${task.difficultyRange[1]}]>,
    "discrimination": <a, 0.6–2.0>,
    "guessing": 0.25,
    "content": {
      "transcript": "<Full conversation script. Format:\\nSpeaker A: ...\\nSpeaker B: ...>",
      "prompt": "<The question shown to the student after listening>",
      "options": [
        { "id": "A", "text": "..." },
        { "id": "B", "text": "..." },
        { "id": "C", "text": "..." },
        { "id": "D", "text": "..." }
      ],
      "correctAnswer": "<A, B, C, or D>",
      "questionType": "<one of the allowed question types above>",
      "toefl_task_id": "${task.id}",
      "topic": "${topic}"
    }
  }
]

CRITICAL: The conversation must make the correct answer clear to a good listener, 
but distractors must be mentioned or plausibly inferred from the exchange.
Generate ${batchSize} fully independent conversation + question items.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

/** Section 1 Part 2 — Short Talk MCQ (3 questions per talk) */
function buildShortTalkPrompt(
  task: ToeflJuniorTask,
  topic: string,
  batchSize: number
): string {
  const setsCount = Math.max(1, Math.round(batchSize / 3));
  return `
You are an ETS TOEFL Junior item writer generating ${setsCount} Listening Part 2 sets.
Each set = 1 short monologue talk + 3 four-option questions.

TASK: Short Talks (one speaker, non-academic)
- Talk types: school announcement, teacher instructions, recorded audio guide,
  club/activity presentation, school radio segment, trip information.
- One speaker only. Natural but clear delivery.
- Talk length: ~100–200 words.
- 3 questions per talk covering different aspects (main idea + 2 details/inferences).

CONTENT TOPIC: ${topic}

ALLOWED QUESTION TYPES:
${task.questionTypes.map((q) => `  - ${q}`).join("\n")}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${setsCount} sets:
[
  {
    "setId": "<unique label, e.g. TJ_L2_${topic.replace(/\s+/g, "_").toUpperCase().slice(0, 12)}_001>",
    "transcript": "<full monologue text, 100–200 words>",
    "questions": [
      {
        "type": "MULTIPLE_CHOICE",
        "skill": "LISTENING",
        "cefrLevel": "<A2/B1/B1+>",
        "difficulty": <b>,
        "discrimination": <a>,
        "guessing": 0.25,
        "content": {
          "prompt": "<question>",
          "options": [
            { "id": "A", "text": "..." },
            { "id": "B", "text": "..." },
            { "id": "C", "text": "..." },
            { "id": "D", "text": "..." }
          ],
          "correctAnswer": "<A/B/C/D>",
          "questionType": "<type>",
          "toefl_task_id": "${task.id}",
          "topic": "${topic}"
        }
      }
    ]
  }
]

Generate ${setsCount} independent sets. First question in each set = main idea/purpose.
Second and third questions = specific details or inference.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

/** Section 1 Part 3 — Academic Discussion / Mini-lecture MCQ */
function buildAcademicDiscussionPrompt(
  task: ToeflJuniorTask,
  topic: string,
  batchSize: number
): string {
  const setsCount = Math.max(1, Math.round(batchSize / 3));
  return `
You are an ETS TOEFL Junior item writer generating ${setsCount} Listening Part 3 sets.
Each set = 1 classroom discussion / mini-lecture + 3 four-option questions.

TASK: Academic Discussions / Mini-lectures
- Setting: Middle school classroom — a teacher explaining a concept + optional
  student question or comment (1–2 student turns).
- Content domains: science (biology, physics, chemistry, earth science),
  social studies, history, geography, health, arts, technology.
- Length: 200–380 words. Contains: enumeration, comparison, cause-effect, or definition.
- Academic language: hedging ("it seems that"), enumeration ("first… second…"),
  summarising ("so, in other words…"), giving examples ("for instance").

CONTENT TOPIC: ${topic} (from the domain list above)

ALLOWED QUESTION TYPES:
${task.questionTypes.map((q) => `  - ${q}`).join("\n")}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${setsCount} sets:
[
  {
    "setId": "<unique label>",
    "transcript": "<full classroom discussion, 200–380 words. Format: Teacher: ... / Student: ... as needed>",
    "questions": [
      {
        "type": "MULTIPLE_CHOICE",
        "skill": "LISTENING",
        "cefrLevel": "<B1/B1+/B2>",
        "difficulty": <b>,
        "discrimination": <a>,
        "guessing": 0.25,
        "content": {
          "prompt": "<question>",
          "options": [
            { "id": "A", "text": "..." },
            { "id": "B", "text": "..." },
            { "id": "C", "text": "..." },
            { "id": "D", "text": "..." }
          ],
          "correctAnswer": "<A/B/C/D>",
          "questionType": "<type>",
          "toefl_task_id": "${task.id}",
          "topic": "${topic}"
        }
      }
    ]
  }
]

REQUIREMENT: Include at least one vocabulary-in-context question and
one inference/implied meaning question per set.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

/** Section 2 Part 1 — Grammar in Context MCQ */
function buildGrammarContextPrompt(
  task: ToeflJuniorTask,
  topic: string,
  batchSize: number
): string {
  const grammarPoints = TOEFL_JUNIOR_META.grammarSyllabus;
  const selectedGrammar = grammarPoints
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(batchSize, 6))
    .join(";\n  ");

  return `
You are an ETS TOEFL Junior item writer generating ${batchSize} Language Form items
(Section 2, Part 1 — Grammar in Context).

TASK: Choose the word/phrase that correctly completes the sentence.
- Each item: one sentence or 2–3 sentence context with ONE blank.
- The blank targets a specific grammar point.
- 4 options — all same lexical base, different grammatical forms.
- Context topic: ${topic}

GRAMMAR POINTS TO COVER (distribute across ${batchSize} items):
  ${selectedGrammar}

FULL GRAMMAR SYLLABUS for reference:
${grammarPoints.map((g) => `  - ${g}`).join("\n")}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${batchSize} items:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "GRAMMAR",
    "cefrLevel": "<A2/B1/B1+/B2>",
    "difficulty": <b, within [${task.difficultyRange[0]}, ${task.difficultyRange[1]}]>,
    "discrimination": <a, 0.6–2.0>,
    "guessing": 0.25,
    "content": {
      "prompt": "<sentence with ___ for the blank>",
      "options": [
        { "id": "A", "text": "..." },
        { "id": "B", "text": "..." },
        { "id": "C", "text": "..." },
        { "id": "D", "text": "..." }
      ],
      "correctAnswer": "<A/B/C/D>",
      "grammarPoint": "<specific grammar point being tested>",
      "distractorLogic": "<why each wrong option is a plausible learner error>",
      "toefl_task_id": "${task.id}",
      "topic": "${topic}"
    }
  }
]

REQUIREMENT: Each item must target a DIFFERENT grammar point.
No two items should have the same blank in the same sentence structure.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

/** Section 2 Part 2 — Vocabulary in Context MCQ */
function buildVocabContextPrompt(
  task: ToeflJuniorTask,
  topic: string,
  batchSize: number
): string {
  const vocabFocus = TOEFL_JUNIOR_META.vocabularyFocus
    .slice(0, 4)
    .join("; ");

  return `
You are an ETS TOEFL Junior item writer generating ${batchSize} Meaning in Context items
(Section 2, Part 2 — Vocabulary in Context).

TASK: Choose the word/phrase closest in meaning to the underlined word,
or choose the word that best completes the blank.
- Context: 1–3 sentences. Target word underlined OR blank provided.
- Stem types (vary across items): synonym question, definition question,
  collocation question, "as used in this passage, X means…" question.
- 4 options — all same part of speech.
- Context topic: ${topic}

VOCABULARY TARGETS:
  ${vocabFocus}

FULL VOCABULARY FOCUS for reference:
${TOEFL_JUNIOR_META.vocabularyFocus.map((v) => `  - ${v}`).join("\n")}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${batchSize} items:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "VOCABULARY",
    "cefrLevel": "<A2/B1/B1+/B2>",
    "difficulty": <b, within [${task.difficultyRange[0]}, ${task.difficultyRange[1]}]>,
    "discrimination": <a, 0.6–2.0>,
    "guessing": 0.25,
    "content": {
      "prompt": "<context sentence(s) with target word underlined OR blank shown as ___>",
      "targetWord": "<the word being tested, or null if blank-fill>",
      "questionStem": "<e.g. 'The word [X] in the sentence is closest in meaning to'>",
      "options": [
        { "id": "A", "text": "..." },
        { "id": "B", "text": "..." },
        { "id": "C", "text": "..." },
        { "id": "D", "text": "..." }
      ],
      "correctAnswer": "<A/B/C/D>",
      "vocabularyType": "<synonym | definition | collocation | context-meaning | phrasal-verb>",
      "toefl_task_id": "${task.id}",
      "topic": "${topic}"
    }
  }
]

REQUIREMENT: Include a variety of vocabularyType values across the ${batchSize} items.
At least 2 items must test Tier 2 academic words.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

/** Section 3 — Reading Comprehension (passage + 6 questions) */
function buildReadingPassagePrompt(
  task: ToeflJuniorTask,
  topic: string,
  genre: string,
  batchSize: number
): string {
  return `
You are an ETS TOEFL Junior item writer generating ${batchSize} Reading Comprehension sets.
Each set = 1 passage (200–450 words) + 6 four-option questions.

TASK: Reading Comprehension
- Passage genre: ${genre}
- Content topic: ${topic}
- Audience: Students aged 11–15 (grades 6–9)
- Reading level: B1–B2 (Flesch-Kincaid score 50–75)
- Passage length: 200–450 words. Well-organised with clear paragraphs.
- Authentic-like style (not simplified textbook language).

QUESTION DISTRIBUTION per passage (6 questions total):
  1. Main idea / primary purpose question
  2. Factual detail question (directly stated)
  3. Factual detail question (different detail)
  4. Inference question (implied, not directly stated)
  5. Vocabulary-in-context question (as used in paragraph X, the word Y means…)
  6. Author's purpose / reference / text-organisation question

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

IRT DIFFICULTY RANGE: ${task.difficultyRange[0]} to ${task.difficultyRange[1]}

OUTPUT FORMAT — JSON array of ${batchSize} sets:
[
  {
    "setId": "<unique label>",
    "genre": "${genre}",
    "passage": "<full passage text, 200–450 words>",
    "questions": [
      {
        "type": "MULTIPLE_CHOICE",
        "skill": "READING",
        "cefrLevel": "<B1/B1+/B2>",
        "difficulty": <b>,
        "discrimination": <a>,
        "guessing": 0.25,
        "content": {
          "prompt": "<question>",
          "paragraphRef": <paragraph number if question refers to a specific paragraph, else null>,
          "options": [
            { "id": "A", "text": "..." },
            { "id": "B", "text": "..." },
            { "id": "C", "text": "..." },
            { "id": "D", "text": "..." }
          ],
          "correctAnswer": "<A/B/C/D>",
          "questionType": "<main-idea | detail | inference | vocabulary-in-context | reference | author-purpose | text-organisation>",
          "toefl_task_id": "${task.id}",
          "topic": "${topic}",
          "genre": "${genre}"
        }
      }
    ]
  }
]

IMPORTANT: 
- The vocabulary-in-context question MUST quote the target word and specify the paragraph: 
  "As used in paragraph [N], the word [X] is closest in meaning to…"
- The main-idea question should be answerable only by someone who read the whole passage.
- Inference questions must be logically supported by — but not directly stated in — the text.

${TOEFL_QUALITY_RUBRIC}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN DISPATCH FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the correct AI prompt for any TOEFL Junior task + topic combination.
 *
 * @param taskId    - One of the task IDs in toefl-junior-framework.ts
 * @param topic     - Content topic from the exam's topicAreas list
 * @param batchSize - How many items/sets to generate (default 4)
 * @param genre     - (Reading only) reading genre from readingGenres list
 */
export function buildToeflJuniorPrompt(
  taskId: string,
  topic: string,
  batchSize = 4,
  genre?: string
): string {
  const task = getToeflJuniorTask(taskId);
  if (!task) {
    throw new Error(`Unknown TOEFL Junior task ID: ${taskId}`);
  }

  switch (task.format) {
    case "SHORT_CONVERSATION_MCQ":
      return buildShortConversationPrompt(task, topic, batchSize);

    case "SHORT_TALK_MCQ":
      return buildShortTalkPrompt(task, topic, batchSize);

    case "ACADEMIC_DISCUSSION_MCQ":
      return buildAcademicDiscussionPrompt(task, topic, batchSize);

    case "GRAMMAR_CONTEXT_MCQ":
      return buildGrammarContextPrompt(task, topic, batchSize);

    case "VOCAB_CONTEXT_MCQ":
      return buildVocabContextPrompt(task, topic, batchSize);

    case "READING_PASSAGE_MCQ":
      return buildReadingPassagePrompt(
        task,
        topic,
        genre ?? TOEFL_JUNIOR_META.readingGenres[0],
        batchSize
      );

    default:
      return buildGrammarContextPrompt(task, topic, batchSize);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCH PROMPT BUILDER (full exam coverage)
// ─────────────────────────────────────────────────────────────────────────────

export interface ToeflJuniorBatchSpec {
  topicsPerTask?: number;
  itemsPerTopic?: number;
}

/**
 * Generate a list of {taskId, topic, prompt} triples covering
 * all six TOEFL Junior task types.
 */
export function buildToeflJuniorBatch(spec: ToeflJuniorBatchSpec = {}): Array<{
  taskId: string;
  topic: string;
  prompt: string;
}> {
  const { topicsPerTask = 2, itemsPerTopic = 4 } = spec;
  const topics = TOEFL_JUNIOR_META.topicAreas;
  const genres = TOEFL_JUNIOR_META.readingGenres;
  const results: Array<{ taskId: string; topic: string; prompt: string }> = [];

  TOEFL_JUNIOR_TASKS.forEach((task, taskIndex) => {
    for (let i = 0; i < topicsPerTask; i++) {
      const topic = topics[(taskIndex * topicsPerTask + i) % topics.length];
      const genre = genres[(taskIndex * topicsPerTask + i) % genres.length];

      try {
        const prompt = buildToeflJuniorPrompt(task.id, topic, itemsPerTopic, genre);
        results.push({ taskId: task.id, topic, prompt });
      } catch {
        // Skip unsupported
      }
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ITEM VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface ToeflJuniorValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Validate a generated item against its TOEFL Junior task specification.
 */
export function validateToeflJuniorItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: Record<string, any>,
  taskId: string
): ToeflJuniorValidationResult {
  const task = getToeflJuniorTask(taskId);
  const issues: string[] = [];

  if (!task) {
    return { isValid: false, issues: [`Unknown task ID: ${taskId}`] };
  }

  const content = item.content ?? {};

  if (!content.prompt || String(content.prompt).length < 5) {
    issues.push("Missing or empty prompt");
  }

  // MCQ: always 4 options
  if (!Array.isArray(content.options) || content.options.length !== 4) {
    issues.push(`Expected 4 options, got ${content.options?.length ?? 0}`);
  }

  if (!content.correctAnswer) {
    issues.push("Missing correctAnswer");
  }

  // Listening: transcript required
  if (
    ["SHORT_CONVERSATION_MCQ", "SHORT_TALK_MCQ", "ACADEMIC_DISCUSSION_MCQ"].includes(
      task.format
    )
  ) {
    if (!content.transcript && !item.transcript) {
      issues.push("Listening item missing transcript");
    }
  }

  // IRT range check
  const b = item.difficulty ?? item.b;
  if (
    typeof b === "number" &&
    (b < task.difficultyRange[0] - 0.5 || b > task.difficultyRange[1] + 0.5)
  ) {
    issues.push(
      `Difficulty b=${b} outside expected range [${task.difficultyRange[0]}, ${task.difficultyRange[1]}]`
    );
  }

  const a = item.discrimination ?? item.a;
  if (typeof a === "number" && (a < 0.3 || a > 3.0)) {
    issues.push(`Discrimination a=${a} outside acceptable range [0.3, 3.0]`);
  }

  return { isValid: issues.length === 0, issues };
}
