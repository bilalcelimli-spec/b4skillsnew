import OpenAI from "openai";
import { buildCefrRubricPrompt, type CefrLevel } from "../cefr/cefr-framework.js";
import { buildCefrScoringKnowledge } from "../cefr/cefr-knowledge-base.js";
import { buildSkillAwarePromptAddendum, type MacroSkill } from "../language-skills/language-skill-framework.js";

/**
 * b4skills GPT-4 Scoring Service
 * Third rater in multi-rater ensemble for WRITING and SPEAKING tasks.
 * Provides independent CEFR-aligned evaluation using GPT-4o.
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface AIScore {
  score: number;
  cefrLevel: string;
  feedback: string;
  confidence: number;
  transcript?: string;
  rubricScores: {
    grammar: number;
    vocabulary: number;
    fluency?: number;
    coherence: number;
    taskRelevance: number;
  };
  speakingFeatures?: {
    speechRate: number;
    pauseDuration: number;
    pronunciationClarity: number;
    lexicalDiversity: number;
    grammaticalAccuracy: number;
    discourseStructure: number;
  };
  corrections: Array<{
    original: string;
    suggestion: string;
    type: "grammar" | "vocabulary" | "style" | "pronunciation";
    explanation: string;
  }>;
}

const SYSTEM_INSTRUCTION = `
You are a senior CEFR examiner certified by the Council of Europe.
Your evaluations are used in high-stakes language assessments.

For EVERY response you must:
  1. Apply the level-specific CEFR rubric and knowledge block provided.
  2. Score on five sub-criteria: Grammar, Vocabulary, Coherence/Cohesion, Fluency (speaking), Task Achievement.
  3. Provide targeted feedback anchored in the rubric language.
  4. Cite specific examples from the candidate's response.
  5. Reflect actual performance in cefrLevel if it exceeds or falls below target.
  6. Use error profiles to calibrate scoring tolerance.
  7. Use Can-Do descriptors to anchor feedback.

Be objective, rigorous, and precise. Always return valid JSON.
`;

export async function scoreWithGPT4(
  candidateResponse: string,
  taskPrompt: string,
  targetCefrLevel: CefrLevel,
  skill: MacroSkill,
  transcript?: string
): Promise<AIScore> {
  try {
    const rubricPrompt = buildCefrRubricPrompt(targetCefrLevel, skill);
    const knowledgeBlock = buildCefrScoringKnowledge(targetCefrLevel, skill);
    const skillAddendum = buildSkillAwarePromptAddendum(skill);

    const userPrompt = `
${rubricPrompt}

${knowledgeBlock}

${skillAddendum}

CANDIDATE RESPONSE:
${transcript ? `Transcript: ${transcript}\n` : ""}
${candidateResponse}

TASK PROMPT:
${taskPrompt}

Evaluate this response and return a JSON object with the following structure:
{
  "score": <0.0-1.0>,
  "cefrLevel": "<A1|A2|B1|B2|C1|C2>",
  "feedback": "<comprehensive feedback>",
  "confidence": <0.0-1.0>,
  "rubricScores": {
    "grammar": <0-10>,
    "vocabulary": <0-10>,
    "fluency": <0-10>,
    "coherence": <0-10>,
    "taskRelevance": <0-10>
  },
  "corrections": [
    {
      "original": "<text>",
      "suggestion": "<corrected text>",
      "type": "<grammar|vocabulary|style|pronunciation>",
      "explanation": "<why>"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: SYSTEM_INSTRUCTION,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in GPT-4 response");
    }

    let jsonStr = content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in GPT-4 response");
    }
    jsonStr = jsonMatch[0];

    const result = JSON.parse(jsonStr) as AIScore;
    return {
      ...result,
      score: Math.max(0, Math.min(1, Number(result.score ?? 0))),
      confidence: Math.max(0, Math.min(1, Number(result.confidence ?? 0.5))),
    };
  } catch (error) {
    console.error("[GPT-4 Scoring]", error);
    throw error;
  }
}

export async function scoreWritingWithGPT4(
  candidateText: string,
  taskPrompt: string,
  targetCefrLevel: CefrLevel
): Promise<AIScore> {
  return scoreWithGPT4(candidateText, taskPrompt, targetCefrLevel, "WRITING");
}

export async function scoreSpeakingWithGPT4(
  transcript: string,
  taskPrompt: string,
  targetCefrLevel: CefrLevel
): Promise<AIScore> {
  return scoreWithGPT4("", taskPrompt, targetCefrLevel, "SPEAKING", transcript);
}
