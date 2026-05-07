/**
 * Cambridge Exam AI Prompt Templates
 *
 * Builds precise, exam-aligned prompts for the AI item generator.
 * Each builder encodes the exact Cambridge task constraints so the
 * LLM produces items that match real exam format, difficulty, and style.
 */

import type { CambridgeExam, CambridgeTask } from "./cambridge-framework";
import {
  CAMBRIDGE_EXAM_META,
  CAMBRIDGE_TASKS,
  getTask,
} from "./cambridge-framework";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SHARED QUALITY RUBRIC (appended to every prompt)
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_QUALITY_RUBRIC = `
ITEM QUALITY REQUIREMENTS (mandatory for all Cambridge-style items):
- ONE and only ONE clearly correct answer. The key must be unambiguously right.
- PLAUSIBLE distractors: wrong options must be the same grammatical category,
  plausible at the target level, but definitively incorrect.
- NO trick questions, double negatives, or culture-biased content.
- Language must be appropriate for the stated CEFR level — do not include
  vocabulary or grammar beyond the exam's syllabus.
- Avoid recycling the exact stem or key from standard Cambridge practice tests.
- IRT parameters: set 'b' (difficulty) within the exam's theta range,
  'a' (discrimination) between 0.6–2.0, 'c' (guessing) at 0.0 for
  constructed-response tasks and 0.20–0.25 for 3-option MCQ, 0.25 for 4-option.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// 2. PER-FORMAT PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/** Builds a prompt for MCQ/cloze items (most common format) */
function buildClozeOrMcqPrompt(
  task: CambridgeTask,
  topic: string,
  batchSize: number
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];
  const grammarFocus = meta.grammarSyllabus.join("; ");
  const topicList = meta.topicAreas.join(", ");
  const optCount = task.optionCount ?? 3;
  const stimRange = task.stimulusWordRange
    ? `${task.stimulusWordRange[0]}–${task.stimulusWordRange[1]} words`
    : "short";

  return `
You are a Cambridge Assessment English item writer producing ${batchSize} items
for the ${meta.fullName} (${meta.cefr}).

TASK SPECIFICATION:
- Exam part: ${task.name}
- Format: ${task.format}
- Items per stimulus: ${task.itemCount}
- Options per item: ${optCount}
- Target CEFR: ${task.cefr}
- IRT difficulty range: ${meta.thetaRange[0]} to ${meta.thetaRange[1]}

CONTENT TOPIC: ${topic}

TOPIC AREAS allowed: ${topicList}

GRAMMAR SYLLABUS: ${grammarFocus}

STIMULUS CONSTRAINTS:
- Length: ${stimRange}
- Text type: ${task.stimulusDescription}
- Candidate instruction: "${task.candidateTask}"

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

OUTPUT FORMAT (JSON array of ${batchSize} items):
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "${task.skill === "READING_WRITING" ? "READING" : task.skill}",
    "cefrLevel": "${task.cefr}",
    "difficulty": <b parameter within [${meta.thetaRange[0]}, ${meta.thetaRange[1]}]>,
    "discrimination": <a parameter, 0.6–2.0>,
    "guessing": ${optCount === 3 ? 0.25 : optCount === 4 ? 0.2 : 0.0},
    "content": {
      "prompt": "<full question stem including any passage text>",
      "options": [
        { "id": "A", "text": "<option text>" },
        { "id": "B", "text": "<option text>" },
        { "id": "C", "text": "<option text>"${optCount === 4 ? `,\n        { "id": "D", "text": "<option text>" }` : ""} 
      ],
      "correctAnswer": "<letter of correct option>",
      "cambridge_task_id": "${task.id}",
      "cambridge_exam": "${task.exam}",
      "topic": "${topic}"
    }
  }
]

${GLOBAL_QUALITY_RUBRIC}

Generate exactly ${batchSize} items now.
`.trim();
}

/** Builds a prompt for open-cloze items (no options) */
function buildOpenClozePrompt(
  task: CambridgeTask,
  topic: string,
  batchSize: number
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];
  const stimRange = task.stimulusWordRange
    ? `${task.stimulusWordRange[0]}–${task.stimulusWordRange[1]} words`
    : "short";

  return `
You are a Cambridge Assessment English item writer producing ${batchSize} open-cloze items
for ${meta.fullName} (${meta.cefr}).

TASK SPECIFICATION:
- Exam part: ${task.name}
- Format: Open Cloze — no options provided
- Candidate instruction: "${task.candidateTask}"

CONTENT TOPIC: ${topic}

STIMULUS LENGTH: ${stimRange}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

OUTPUT FORMAT (JSON array):
[
  {
    "type": "FILL_IN_BLANKS",
    "skill": "READING",
    "cefrLevel": "${task.cefr}",
    "difficulty": <b parameter, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
    "discrimination": <a parameter, 0.6–2.0>,
    "guessing": 0,
    "content": {
      "prompt": "<passage text with ___ marking each gap>",
      "wordBank": [],
      "correctAnswer": "<pipe-separated answers for each gap, e.g. the|on|has>",
      "cambridge_task_id": "${task.id}",
      "cambridge_exam": "${task.exam}",
      "topic": "${topic}"
    }
  }
]

CRITICAL: Each gap must have EXACTLY ONE correct answer. Provide ${task.itemCount} gaps per passage.
Generate ${batchSize} passages (${batchSize * task.itemCount} total gap-fill items).

${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

/** Builds a prompt for word-formation (KET Part 6) */
function buildWordFormPrompt(
  task: CambridgeTask,
  topic: string,
  batchSize: number
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];

  return `
You are a Cambridge Assessment English item writer producing ${batchSize} word-formation cloze items
for ${meta.fullName} (${meta.cefr}), Part ${task.partNumber}.

TASK: Candidate reads a text with gaps. A base word in CAPITALS is given outside the gap.
Candidate must write the correct derived form of the base word in the gap.

CONTENT TOPIC: ${topic}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

TARGET DERIVATIONS: Common suffixes (-ful, -ness, -tion, -ment, -er, -ly, -able, -ous, un-, in-, dis-)

OUTPUT FORMAT (JSON array):
[
  {
    "type": "FILL_IN_BLANKS",
    "skill": "READING",
    "cefrLevel": "${task.cefr}",
    "difficulty": <b parameter, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
    "discrimination": 0.8,
    "guessing": 0,
    "content": {
      "prompt": "<text with ___ for each gap, BASE_WORD in parentheses after each gap>",
      "correctAnswer": "<pipe-separated derived forms>",
      "cambridge_task_id": "${task.id}",
      "cambridge_exam": "${task.exam}",
      "topic": "${topic}"
    }
  }
]

Generate exactly ${batchSize} items. Each item = one full passage with ${task.itemCount} word-form gaps.
${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

/** Builds a prompt for writing tasks (short messages, articles, stories) */
function buildWritingPrompt(
  task: CambridgeTask,
  topic: string,
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];
  const outputRange = task.outputWordTarget
    ? `${task.outputWordTarget[0]}–${task.outputWordTarget[1]} words`
    : "appropriate length";

  const writingType =
    task.format === "ARTICLE_OR_STORY" ? "article OR story" : "short email/message";

  return `
You are a Cambridge Assessment English item writer creating a ${writingType} writing task
for ${meta.fullName} (${meta.cefr}), Part ${task.partNumber}.

TASK SPECIFICATION:
- Candidate output: ${outputRange}
- Candidate instruction: "${task.candidateTask}"

CONTENT TOPIC: ${topic}

MARK SCHEME (embed in rubric field):
${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

OUTPUT FORMAT (JSON):
{
  "type": "WRITING_PROMPT",
  "skill": "WRITING",
  "cefrLevel": "${task.cefr}",
  "difficulty": <b parameter, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
  "discrimination": 0.9,
  "guessing": 0,
  "content": {
    "prompt": "<full writing task instructions as shown to candidate, including bullet points if applicable>",
    "rubric": "<mark scheme criteria, point by point>",
    "outputWordTarget": ${JSON.stringify(task.outputWordTarget ?? [80, 100])},
    "cambridge_task_id": "${task.id}",
    "cambridge_exam": "${task.exam}",
    "topic": "${topic}"
  }
}

${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

/** Builds a prompt for listening gap-fill tasks */
function buildListeningGapFillPrompt(
  task: CambridgeTask,
  topic: string,
  batchSize: number
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];

  return `
You are a Cambridge Assessment English item writer producing ${batchSize} listening gap-fill items
for ${meta.fullName} (${meta.cefr}), Part ${task.partNumber}.

TASK: Write a TRANSCRIPT for a monologue/dialogue AND a printed form/notes with ${task.itemCount} gaps.

CONTENT TOPIC: ${topic}

CANDIDATE INSTRUCTION: "${task.candidateTask}"

STIMULUS DESCRIPTION: ${task.stimulusDescription}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

OUTPUT FORMAT (JSON array):
[
  {
    "type": "FILL_IN_BLANKS",
    "skill": "LISTENING",
    "cefrLevel": "${task.cefr}",
    "difficulty": <b parameter, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
    "discrimination": <a, 0.6–1.8>,
    "guessing": 0,
    "content": {
      "transcript": "<full audio script — clearly marks each target answer in [BRACKETS]>",
      "prompt": "<printed notes/form shown to candidate, with ___ for each gap>",
      "correctAnswer": "<pipe-separated gap answers in order>",
      "cambridge_task_id": "${task.id}",
      "cambridge_exam": "${task.exam}",
      "topic": "${topic}"
    }
  }
]

REQUIREMENTS:
- Transcript must be natural spoken English (~${meta.exam === "STARTERS" || meta.exam === "MOVERS" ? 80 : 180} words)
- Include at least one self-correction (e.g., "No wait, it's £15, not £50")
- Answers must be ${task.itemCount === 5 ? "single words or short phrases" : "1–3 words or numbers"}
- Generate ${batchSize} independent transcript + form combinations

${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

/** Builds a prompt for listening picture MCQ */
function buildListeningPictureMcqPrompt(
  task: CambridgeTask,
  topic: string,
  batchSize: number
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];

  return `
You are a Cambridge Assessment English item writer producing ${batchSize} listening picture-MCQ items
for ${meta.fullName} (${meta.cefr}), Part ${task.partNumber}.

TASK: Write a short dialogue AND a question. The candidate hears the dialogue
and chooses from THREE pictures (A, B, C). The correct picture is determined by
understanding the full dialogue, not just the final sentence.

CONTENT TOPIC: ${topic}

CANDIDATE INSTRUCTION: "${task.candidateTask}"

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

DISTRACTOR GUIDANCE: ${task.distractorGuidance}

OUTPUT FORMAT (JSON array):
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "LISTENING",
    "cefrLevel": "${task.cefr}",
    "difficulty": <b, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
    "discrimination": <a, 0.7–2.0>,
    "guessing": 0.33,
    "content": {
      "transcript": "<full dialogue script, ~60–100 words, naturally spoken>",
      "prompt": "<question text, e.g. 'What did Jane buy?'>",
      "options": [
        { "id": "A", "text": "<description of picture A>" },
        { "id": "B", "text": "<description of picture B>" },
        { "id": "C", "text": "<description of picture C>" }
      ],
      "imageUrl": "<leave empty — images will be sourced separately>",
      "correctAnswer": "<A, B, or C>",
      "cambridge_task_id": "${task.id}",
      "cambridge_exam": "${task.exam}",
      "topic": "${topic}"
    }
  }
]

CRITICAL: All three picture descriptions must be mentioned or implied in the dialogue.
The correct answer is confirmed; distractors are clearly rejected within the audio.
Generate ${batchSize} independent items.

${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

/** Builds a prompt for speaking tasks (photo description, personal questions) */
function buildSpeakingPrompt(
  task: CambridgeTask,
  topic: string,
): string {
  const meta = CAMBRIDGE_EXAM_META[task.exam];

  return `
You are a Cambridge Assessment English item writer producing a speaking task card
for ${meta.fullName} (${meta.cefr}), Part ${task.partNumber}.

TASK FORMAT: ${task.format}

CANDIDATE INSTRUCTION: "${task.candidateTask}"

STIMULUS DESCRIPTION: ${task.stimulusDescription}

CONTENT TOPIC: ${topic}

MARK SCHEME OVERVIEW: ${task.distractorGuidance}

LANGUAGE CONSTRAINTS: ${task.languageConstraints}

OUTPUT FORMAT (JSON):
{
  "type": "SPEAKING_PROMPT",
  "skill": "SPEAKING",
  "cefrLevel": "${task.cefr}",
  "difficulty": <b, ${meta.thetaRange[0]}–${meta.thetaRange[1]}>,
  "discrimination": 0.9,
  "guessing": 0,
  "content": {
    "prompt": "<examiner instructions / question>",
    "imageUrl": "<if visual stimulus — Unsplash URL describing the scene, else empty>",
    "rubric": "<mark scheme with band descriptors for each criterion>",
    "examinerNotes": "<guidance for examiner: follow-up questions, prompts if candidate is silent>",
    "cambridge_task_id": "${task.id}",
    "cambridge_exam": "${task.exam}",
    "topic": "${topic}"
  }
}

${GLOBAL_QUALITY_RUBRIC}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN DISPATCH FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the correct AI prompt for any Cambridge task + topic combination.
 *
 * @param taskId   - One of the task IDs defined in cambridge-framework.ts
 * @param topic    - Content topic from the exam's topicAreas list
 * @param batchSize - How many independent items to generate (default 5)
 */
export function buildCambridgePrompt(
  taskId: string,
  topic: string,
  batchSize = 5
): string {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Unknown Cambridge task ID: ${taskId}`);
  }

  switch (task.format) {
    case "PICTURE_MATCHING":
    case "CATEGORISATION":
    case "READING_MCQ":
    case "CLOZE_MCQ":
    case "READING_MATCHING":
    case "READING_GAPPED_TEXT":
    case "SENTENCE_COMPLETION":
      return buildClozeOrMcqPrompt(task, topic, batchSize);

    case "CLOZE_OPEN":
      return buildOpenClozePrompt(task, topic, batchSize);

    case "WORD_FORM":
      return buildWordFormPrompt(task, topic, batchSize);

    case "SHORT_MESSAGE":
    case "ARTICLE_OR_STORY":
      return buildWritingPrompt(task, topic);

    case "GAP_FILL_LISTEN":
      return buildListeningGapFillPrompt(task, topic, batchSize);

    case "PICTURE_DIALOGUE_MCQ":
    case "MATCHING_LISTEN":
      return task.skill === "LISTENING"
        ? buildListeningPictureMcqPrompt(task, topic, batchSize)
        : buildClozeOrMcqPrompt(task, topic, batchSize);

    case "DRAWING_LINES":
    case "COLOURING_WRITING":
      return buildListeningGapFillPrompt(task, topic, batchSize);

    case "SPOT_DIFFERENCES":
    case "DESCRIBE_PHOTO":
    case "COLLABORATIVE_TASK":
    case "PERSONAL_QUESTIONS":
    case "STORY_SEQUENCING":
      return buildSpeakingPrompt(task, topic);

    default:
      return buildClozeOrMcqPrompt(task, topic, batchSize);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCH PROMPT BUILDER (generate a full exam's worth of items)
// ─────────────────────────────────────────────────────────────────────────────

export interface CambridgeBatchSpec {
  exam: CambridgeExam;
  topicsPerPart?: number;
  itemsPerTopic?: number;
}

/**
 * Generate a list of (taskId, topic, prompt) triples covering all parts
 * of a Cambridge exam. Pass the result to the AI generator in sequence.
 */
export function buildExamBatch(spec: CambridgeBatchSpec): Array<{
  taskId: string;
  topic: string;
  prompt: string;
}> {
  const { exam, topicsPerPart = 2, itemsPerTopic = 5 } = spec;
  const tasks = CAMBRIDGE_TASKS.filter((t) => t.exam === exam);
  const topics = CAMBRIDGE_EXAM_META[exam].topicAreas;
  const results: Array<{ taskId: string; topic: string; prompt: string }> = [];

  tasks.forEach((task, taskIndex) => {
    for (let i = 0; i < topicsPerPart; i++) {
      const topic = topics[(taskIndex * topicsPerPart + i) % topics.length];
      try {
        const prompt = buildCambridgePrompt(task.id, topic, itemsPerTopic);
        results.push({ taskId: task.id, topic, prompt });
      } catch {
        // Skip unsupported format
      }
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VALIDATION HELPER — check generated items conform to task spec
// ─────────────────────────────────────────────────────────────────────────────

export interface CambridgeItemValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Quick format-level validation for an AI-generated item against
 * its Cambridge task specification.
 */
export function validateCambridgeItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: Record<string, any>,
  taskId: string
): CambridgeItemValidationResult {
  const task = getTask(taskId);
  const issues: string[] = [];

  if (!task) {
    return { isValid: false, issues: [`Unknown task ID: ${taskId}`] };
  }

  const content = item.content ?? {};

  // Check prompt exists
  if (!content.prompt || content.prompt.length < 5) {
    issues.push("Missing or empty prompt");
  }

  // MCQ checks
  if (
    ["PICTURE_MATCHING", "CATEGORISATION", "READING_MCQ", "CLOZE_MCQ",
      "READING_MATCHING", "PICTURE_DIALOGUE_MCQ"].includes(task.format)
  ) {
    const optCount = task.optionCount ?? 3;
    if (!Array.isArray(content.options) || content.options.length !== optCount) {
      issues.push(`Expected ${optCount} options, got ${content.options?.length ?? 0}`);
    }
    if (!content.correctAnswer) {
      issues.push("Missing correctAnswer");
    }
  }

  // Listening: check transcript
  if (
    ["GAP_FILL_LISTEN", "DRAWING_LINES", "COLOURING_WRITING",
      "MATCHING_LISTEN"].includes(task.format) && task.skill === "LISTENING"
  ) {
    if (!content.transcript) {
      issues.push("Listening item missing transcript");
    }
  }

  // Writing: check output length target
  if (["SHORT_MESSAGE", "ARTICLE_OR_STORY"].includes(task.format)) {
    if (!content.rubric) {
      issues.push("Writing item missing mark scheme rubric");
    }
  }

  // IRT parameter checks
  const meta = CAMBRIDGE_EXAM_META[task.exam];
  const b = item.difficulty ?? item.b;
  if (typeof b === "number" && (b < meta.thetaRange[0] - 1 || b > meta.thetaRange[1] + 1)) {
    issues.push(
      `Difficulty b=${b} is outside expected range [${meta.thetaRange[0]}, ${meta.thetaRange[1]}]`
    );
  }

  const a = item.discrimination ?? item.a;
  if (typeof a === "number" && (a < 0.3 || a > 3.0)) {
    issues.push(`Discrimination a=${a} is outside acceptable range [0.3, 3.0]`);
  }

  return { isValid: issues.length === 0, issues };
}
