import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prisma = new PrismaClient();

/**
 * AutoItemGenerator — SOTA Psychometric Item Factory
 *
 * Design principles:
 * - Cambridge/Duolingo quality rubrics embedded in every prompt
 * - Multimodal: generates pollinations.ai image URLs for visual tasks
 * - Full IRT 3PL parameter specification in output
 * - Distractors must be plausible (avoids trivially wrong options)
 * - Supports all 6 skills × 7 CEFR levels × all item types
 */

export type GeneratedItem = {
  type: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  content: {
    prompt: string;
    options?: { id: string; text: string }[];
    correctAnswer?: string;
    correctOptionIndex?: number;
    rubric?: string;
    transcript?: string;    // Listening: full text for TTS
    audioUrl?: string;      // Listening: pre-generated audio
    imageUrl?: string;      // Visual/Speaking: image URL
    wordBank?: string[];    // Drag-drop / Fill-in tasks
  };
};

const CEFR_DIFFICULTY_MAP: Record<string, number> = {
  A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5
};

const ITEM_TYPE_FOR_SKILL: Record<string, string[]> = {
  GRAMMAR:    ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
  VOCABULARY: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"],
  READING:    ["MULTIPLE_CHOICE", "INTEGRATED_TASK"],
  LISTENING:  ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
  WRITING:    ["WRITING_PROMPT"],
  SPEAKING:   ["SPEAKING_PROMPT"],
};

async function buildPromptAndGenerate(
  skill: string,
  cefrLevel: string,
  topic: string,
  batchSize: number
): Promise<GeneratedItem[]> {
  const targetDifficulty = CEFR_DIFFICULTY_MAP[cefrLevel] ?? 0;
  const itemTypes = ITEM_TYPE_FOR_SKILL[skill]?.join(", ") || "MULTIPLE_CHOICE";

  const visualNote =
    skill === "SPEAKING" || skill === "WRITING"
      ? `\n- If the task benefits from a visual stimulus, include "imageUrl": "https://image.pollinations.ai/prompt/{URL_ENCODED_DESCRIPTION}?width=800&height=600&nologo=true"`
      : "";

  const listeningNote =
    skill === "LISTENING"
      ? `\n- Include a "transcript" field with a natural English passage (3-5 sentences) the candidate will hear. The system converts this to audio automatically.`
      : "";

  const multipleChoiceNote = `
- For MULTIPLE_CHOICE/FILL_IN_BLANKS: include "options" (4 items, IDs A-D), "correctAnswer" (e.g. "B"), and functional distractors that are plausible but unambiguously wrong.
- For WRITING_PROMPT / SPEAKING_PROMPT: include "rubric" covering CEFR criteria (grammar, vocab, fluency, coherence, task relevance).
- For DRAG_DROP: include "wordBank" (array of words, some distractors) and "correctAnswer" (correct sequence as comma-separated IDs or words).`;

  const systemPrompt = `
You are a Senior Cambridge ESOL Psychometrician and Duolingo item designer.
Generate exactly ${batchSize} fully-specified English assessment items.

SKILL:        ${skill}
CEFR LEVEL:   ${cefrLevel}
TOPIC DOMAIN: ${topic}
ALLOWED TYPES: ${itemTypes}

IRT PARAMETERS — required in each item:
- "difficulty"      (b): float ≈ ${targetDifficulty.toFixed(1)} ± 0.5 (IRT b-parameter, ranging -4 to +4)
- "discrimination"  (a): float 0.8 – 2.5 (higher = more diagnostic power)
- "guessing"        (c): 0.0 for constructed-response; 0.25 for 4-option MC

DESIGN RULES:
${multipleChoiceNote}
- Prompts must be unambiguous, culturally neutral, and free of bias.
- Difficulty must match the CEFR level strictly (${cefrLevel}).
- Distractor traps must target plausible systematic learner errors.
- Each item must be distinct (no near-duplicates in this batch).${visualNote}${listeningNote}

OUTPUT: A JSON array of ${batchSize} item objects. Only raw JSON — no markdown fences.

SCHEMA:
[{
  "type": "MULTIPLE_CHOICE",
  "skill": "${skill}",
  "cefrLevel": "${cefrLevel}",
  "difficulty": ${targetDifficulty},
  "discrimination": 1.5,
  "guessing": 0.25,
  "content": {
    "prompt": "...",
    "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
    "correctAnswer": "A",
    "rubric": "..."
  }
}]
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: { responseMimeType: "application/json" }
    });
    const items = JSON.parse(response.text || "[]");
    return Array.isArray(items) ? (items as GeneratedItem[]) : [];
  } catch (err: any) {
    console.error(`AutoItemGenerator error (${skill} ${cefrLevel}):`, err.message);
    return [];
  }
}

export const AutoItemGenerator = {
  /**
   * Generate a single item for the given skill/level/topic.
   */
  async generateItem(
    skill: string,
    cefrLevel: string,
    topic: string = "General English"
  ): Promise<GeneratedItem | null> {
    const items = await buildPromptAndGenerate(skill, cefrLevel, topic, 1);
    return items[0] ?? null;
  },

  /**
   * Generate a batch of items for a given skill/level and persist them to the DB.
   */
  async generateAndSeed(
    skill: string,
    cefrLevel: string,
    topic: string = "General English",
    count: number = 10,
    tags: string[] = []
  ): Promise<number> {
    const items = await buildPromptAndGenerate(skill, cefrLevel, topic, count);
    let inserted = 0;

    for (const item of items) {
      try {
        await prisma.item.create({
          data: {
            type: item.type as any,
            skill: item.skill as any,
            cefrLevel: item.cefrLevel as any,
            difficulty: item.difficulty,
            discrimination: item.discrimination,
            guessing: item.guessing,
            content: item.content as any,
            tags: tags.length > 0 ? tags : [topic],
            status: "ACTIVE",
            isPretest: false
          }
        });
        inserted++;
      } catch (e: any) {
        console.error("DB insert failed:", e.message);
      }
    }
    return inserted;
  }
};

