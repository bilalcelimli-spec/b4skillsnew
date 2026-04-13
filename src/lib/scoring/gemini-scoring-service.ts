import { GoogleGenAI, Type } from "@google/genai";
import { buildCefrRubricPrompt, type CefrLevel } from "../cefr/cefr-framework.js";

/**
 * b4skills Gemini Scoring Service
 * Provides advanced AI-driven evaluation for language assessments.
 * Handles transcription, CEFR-aligned scoring, and detailed feedback.
 */

// Initialize Gemini with the platform-provided API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIScore {
  score: number;           // Normalized 0.0 to 1.0
  cefrLevel: string;       // A1, A2, B1, B2, C1, C2
  feedback: string;        // Qualitative feedback for the candidate
  confidence: number;      // Model's confidence in the score (0-1)
  transcript?: string;     // Transcription for speaking tasks
  rubricScores: {
    grammar: number;       // 0-10
    vocabulary: number;    // 0-10
    fluency?: number;      // 0-10 (Speaking only)
    coherence: number;     // 0-10
    taskRelevance: number; // 0-10
  };
  speakingFeatures?: {
    speechRate: number;           // Words per minute
    pauseDuration: number;        // Total pause time in seconds
    pronunciationClarity: number; // 0-10
    lexicalDiversity: number;     // 0-10
    grammaticalAccuracy: number;    // 0-10
    discourseStructure: number;   // 0-10
  };
  corrections: Array<{
    original: string;
    suggestion: string;
    type: "grammar" | "vocabulary" | "style" | "pronunciation";
    explanation: string;
  }>;
}

type ScoreMode = "primary" | "verifier";

const SYSTEM_INSTRUCTION = `
You are a senior CEFR examiner certified by the Council of Europe.
Your evaluations are used in high-stakes language assessments for universities, corporations, and immigration bodies.
You are intimately familiar with the CEFR Companion Volume (2018), ALTE Can-Do statements, and Cambridge Assessment rubrics.
For EVERY response you must:
  1. Apply the level-specific CEFR rubric provided in the user prompt.
  2. Consider all five sub-criteria: Grammar, Vocabulary, Coherence/Cohesion, Fluency (speaking), and Task Achievement.
  3. Provide targeted, actionable feedback anchored in the rubric language.
  4. Cite specific examples from the candidate's response in corrections and feedback.
  5. If the performance clearly exceeds or falls below the target level, reflect this in cefrLevel.
Be objective, rigorous, and precise. Always return valid JSON.
`;

function buildSystemInstruction(mode: ScoreMode): string {
  return mode === "verifier"
    ? `${SYSTEM_INSTRUCTION}\nYou are the independent verification scorer. Re-evaluate from scratch, apply the rubric strictly, and do not try to match any previous score.`
    : SYSTEM_INSTRUCTION;
}

function normalizeScore(result: AIScore): AIScore {
  return {
    ...result,
    score: Math.max(0, Math.min(1, Number(result.score ?? 0))),
    confidence: Math.max(0, Math.min(1, Number(result.confidence ?? 0.5))),
    corrections: result.corrections || [],
    rubricScores: {
      grammar: Number(result.rubricScores?.grammar ?? 0),
      vocabulary: Number(result.rubricScores?.vocabulary ?? 0),
      coherence: Number(result.rubricScores?.coherence ?? 0),
      taskRelevance: Number(result.rubricScores?.taskRelevance ?? 0),
      ...(result.rubricScores?.fluency !== undefined ? { fluency: Number(result.rubricScores.fluency) } : {})
    }
  };
}

async function scoreSpeakingInternal(
  audioBase64: string,
  mimeType: string,
  prompt: string,
  mode: ScoreMode,
  targetCefr?: CefrLevel
): Promise<AIScore> {
  const cefrRubricBlock = targetCefr ? buildCefrRubricPrompt(targetCefr, "speaking") : "";
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        text: `
Evaluate the candidate SPEAKING response to the following prompt:
"${prompt}"

${cefrRubricBlock}

Instructions:
1. Transcribe the audio accurately.
2. Extract specific speaking features:
   - speechRate: estimated words per minute.
   - pauseDuration: total estimated duration of significant pauses in seconds.
   - pronunciationClarity: clarity of speech (0-10).
   - lexicalDiversity: variety and sophistication of vocabulary (0-10).
   - grammaticalAccuracy: correctness of grammatical structures (0-10).
   - discourseStructure: organization and flow of ideas (0-10).
3. Score the response against the CEFR rubric provided above.
4. Normalised score: A1=0.10, A2=0.28, B1=0.46, B2=0.65, C1=0.82, C2=1.0
5. Sub-scores for Grammar, Vocabulary, Fluency, Coherence, and Task Relevance (0-10).
6. 3–5 specific corrections with original text, suggestion, type and explanation.

Return JSON with these exact fields:
{
  "score": number,
  "cefrLevel": string,
  "feedback": string,
  "confidence": number,
  "transcript": string,
  "rubricScores": { "grammar": number, "vocabulary": number, "fluency": number, "coherence": number, "taskRelevance": number },
  "speakingFeatures": {
    "speechRate": number,
    "pauseDuration": number,
    "pronunciationClarity": number,
    "lexicalDiversity": number,
    "grammaticalAccuracy": number,
    "discourseStructure": number
  },
  "corrections": [{ "original": string, "suggestion": string, "type": "grammar" | "vocabulary" | "style" | "pronunciation", "explanation": string }]
}
        `
      },
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      }
    ],
    config: {
      systemInstruction: buildSystemInstruction(mode),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          cefrLevel: { type: Type.STRING },
          feedback: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          transcript: { type: Type.STRING },
          rubricScores: {
            type: Type.OBJECT,
            properties: {
              grammar: { type: Type.NUMBER },
              vocabulary: { type: Type.NUMBER },
              fluency: { type: Type.NUMBER },
              coherence: { type: Type.NUMBER },
              taskRelevance: { type: Type.NUMBER }
            }
          },
          speakingFeatures: {
            type: Type.OBJECT,
            properties: {
              speechRate: { type: Type.NUMBER },
              pauseDuration: { type: Type.NUMBER },
              pronunciationClarity: { type: Type.NUMBER },
              lexicalDiversity: { type: Type.NUMBER },
              grammaticalAccuracy: { type: Type.NUMBER },
              discourseStructure: { type: Type.NUMBER }
            },
            required: ["speechRate", "pauseDuration", "pronunciationClarity", "lexicalDiversity", "grammaticalAccuracy", "discourseStructure"]
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                type: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        },
        required: ["score", "cefrLevel", "feedback", "confidence", "transcript", "rubricScores", "speakingFeatures", "corrections"]
      }
    }
  });

  return normalizeScore(JSON.parse(response.text));
}

async function scoreWritingInternal(text: string, prompt: string, mode: ScoreMode, targetCefr?: CefrLevel): Promise<AIScore> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
Evaluate the candidate WRITING response to the following prompt:
"${prompt}"

${targetCefr ? buildCefrRubricPrompt(targetCefr as CefrLevel, "writing") : ""}

Candidate Response:
"${text}"

Instructions:
1. Score against the CEFR rubric provided above.
2. Normalised score: A1=0.10, A2=0.28, B1=0.46, B2=0.65, C1=0.82, C2=1.0
3. Sub-scores for Grammar, Vocabulary, Coherence, and Task Relevance (0–10).
4. 3–5 specific corrections with original text, suggestion, type and explanation.

Return JSON:
{
  "score": number,
  "cefrLevel": string,
  "feedback": string,
  "confidence": number,
  "rubricScores": { "grammar": number, "vocabulary": number, "coherence": number, "taskRelevance": number },
  "corrections": [{ "original": string, "suggestion": string, "type": "grammar" | "vocabulary" | "style", "explanation": string }]
}
    `,
    config: {
      systemInstruction: buildSystemInstruction(mode),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          cefrLevel: { type: Type.STRING },
          feedback: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          rubricScores: {
            type: Type.OBJECT,
            properties: {
              grammar: { type: Type.NUMBER },
              vocabulary: { type: Type.NUMBER },
              coherence: { type: Type.NUMBER },
              taskRelevance: { type: Type.NUMBER }
            }
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                type: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        },
        required: ["score", "cefrLevel", "feedback", "confidence", "rubricScores", "corrections"]
      }
    }
  });

  return normalizeScore(JSON.parse(response.text));
}

export const GeminiScoringService = {
  /**
   * Transcribe audio and score speaking performance in a single multimodal pass.
   * This is more efficient and accurate than separate steps.
   */
  async scoreSpeaking(audioBase64: string, mimeType: string, prompt: string, targetCefr?: CefrLevel): Promise<AIScore> {
    try {
      return await scoreSpeakingInternal(audioBase64, mimeType, prompt, "primary", targetCefr);
    } catch (error) {
      console.error("Gemini Speaking Scoring Error:", error);
      throw new Error("Failed to score speaking response via AI.");
    }
  },

  async verifySpeaking(audioBase64: string, mimeType: string, prompt: string, targetCefr?: CefrLevel): Promise<AIScore> {
    try {
      return await scoreSpeakingInternal(audioBase64, mimeType, prompt, "verifier", targetCefr);
    } catch (error) {
      console.error("Gemini Speaking Verification Error:", error);
      throw new Error("Failed to verify speaking response via AI.");
    }
  },

  /**
   * Score a writing response based on CEFR rubrics.
   */
  async scoreWriting(text: string, prompt: string, targetCefr?: CefrLevel): Promise<AIScore> {
    try {
      return await scoreWritingInternal(text, prompt, "primary", targetCefr);
    } catch (error) {
      console.error("Gemini Writing Scoring Error:", error);
      throw new Error("Failed to score writing response via AI.");
    }
  },

  async verifyWriting(text: string, prompt: string, targetCefr?: CefrLevel): Promise<AIScore> {
    try {
      return await scoreWritingInternal(text, prompt, "verifier", targetCefr);
    } catch (error) {
      console.error("Gemini Writing Verification Error:", error);
      throw new Error("Failed to verify writing response via AI.");
    }
  }
};
