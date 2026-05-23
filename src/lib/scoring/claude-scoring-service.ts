import Anthropic from "@anthropic-ai/sdk";
import { buildCefrRubricPrompt, type CefrLevel } from "../cefr/cefr-framework.js";
import { buildCefrScoringKnowledge } from "../cefr/cefr-knowledge-base.js";
import { buildSkillAwarePromptAddendum, type MacroSkill } from "../language-skills/language-skill-framework.js";

/**
 * b4skills Claude Scoring Service
 * Second rater in multi-rater ensemble for WRITING and SPEAKING tasks.
 * Provides independent CEFR-aligned evaluation using Claude 3.5 Sonnet.
 */

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
  }
  return _anthropic;
}

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
Your evaluations are used in high-stakes language assessments for universities, corporations, and immigration bodies.

For EVERY response you must:
  1. Apply the level-specific CEFR rubric AND the CEFR knowledge block provided.
  2. Score on five sub-criteria: Grammar, Vocabulary, Coherence/Cohesion, Fluency (speaking), and Task Achievement.
  3. Provide targeted, actionable feedback anchored in the rubric language.
  4. Cite specific examples from the candidate's response.
  5. If performance clearly exceeds or falls below the target level, reflect this in cefrLevel.
  6. Use the error profile to calibrate scoring tolerance.
  7. Use the Can-Do descriptors to anchor qualitative feedback.

Be objective, rigorous, and precise. Always return valid JSON.
`;

export async function scoreWithClaude(
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

    const response = await getAnthropic().messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      system: SYSTEM_INSTRUCTION,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }
    jsonStr = jsonMatch[0];

    const result = JSON.parse(jsonStr) as AIScore;
    return {
      ...result,
      score: Math.max(0, Math.min(1, Number(result.score ?? 0))),
      confidence: Math.max(0, Math.min(1, Number(result.confidence ?? 0.5))),
    };
  } catch (error) {
    console.error("[Claude Scoring]", error);
    throw error;
  }
}

export async function scoreWritingWithClaude(
  candidateText: string,
  taskPrompt: string,
  targetCefrLevel: CefrLevel
): Promise<AIScore> {
  return scoreWithClaude(candidateText, taskPrompt, targetCefrLevel, "WRITING");
}

export async function scoreSpeakingWithClaude(
  transcript: string,
  taskPrompt: string,
  targetCefrLevel: CefrLevel
): Promise<AIScore> {
  return scoreWithClaude("", taskPrompt, targetCefrLevel, "SPEAKING", transcript);
}
