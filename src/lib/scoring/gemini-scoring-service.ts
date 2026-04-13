import { GoogleGenAI, Type } from "@google/genai";

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
You are an expert CEFR (Common European Framework of Reference for Languages) examiner.
Your task is to evaluate language learner responses with high precision.
Follow the official CEFR rubrics for Writing and Speaking.
For speaking tasks, you must perform deep acoustic and linguistic analysis, extracting features like speech rate, pauses, and pronunciation clarity.
Be objective, encouraging, and provide actionable feedback.
Always return valid JSON.
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
  mode: ScoreMode
): Promise<AIScore> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        text: `
          Evaluate the candidate speaking response against Cambridge CAEL/DET strict rubrics to the prompt: ${prompt}
          1. Transcribe the audio accurately.
          2. Extract specific speaking features:
             - speechRate: estimated words per minute.
             - pauseDuration: total estimated duration of significant pauses in seconds.
             - pronunciationClarity: clarity of speech on a scale of 0-10.
             - lexicalDiversity: variety and sophistication of vocabulary on a scale of 0-10.
             - grammaticalAccuracy: correctness of grammatical structures on a scale of 0-10.
             - discourseStructure: organization and flow of ideas on a scale of 0-10.
          3. Score the response based on CEFR criteria (A1-C2), using the extracted features as primary evidence for the score.
          4. Provide a normalized score (0.0 to 1.0) where 0.1=A1, 0.3=A2, 0.5=B1, 0.7=B2, 0.9=C1, 1.0=C2.
          5. Break down scores for Grammar, Vocabulary, Fluency, Coherence, and Task Relevance (0-10).
          6. Identify pronunciation or grammatical errors.

          Return JSON:
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

async function scoreWritingInternal(text: string, prompt: string, mode: ScoreMode): Promise<AIScore> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
      Evaluate the candidate writing response against Cambridge CAEL/DET strict rubrics to the prompt:
      ${prompt}

      Response: "${text}"

      Score based on CEFR criteria.
      Provide a normalized score (0.0 to 1.0) and detailed rubric breakdown.
      Identify specific grammatical or stylistic improvements.

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
  async scoreSpeaking(audioBase64: string, mimeType: string, prompt: string): Promise<AIScore> {
    try {
      return await scoreSpeakingInternal(audioBase64, mimeType, prompt, "primary");
    } catch (error) {
      console.error("Gemini Speaking Scoring Error:", error);
      throw new Error("Failed to score speaking response via AI.");
    }
  },

  async verifySpeaking(audioBase64: string, mimeType: string, prompt: string): Promise<AIScore> {
    try {
      return await scoreSpeakingInternal(audioBase64, mimeType, prompt, "verifier");
    } catch (error) {
      console.error("Gemini Speaking Verification Error:", error);
      throw new Error("Failed to verify speaking response via AI.");
    }
  },

  /**
   * Score a writing response based on CEFR rubrics.
   */
  async scoreWriting(text: string, prompt: string): Promise<AIScore> {
    try {
      return await scoreWritingInternal(text, prompt, "primary");
    } catch (error) {
      console.error("Gemini Writing Scoring Error:", error);
      throw new Error("Failed to score writing response via AI.");
    }
  },

  async verifyWriting(text: string, prompt: string): Promise<AIScore> {
    try {
      return await scoreWritingInternal(text, prompt, "verifier");
    } catch (error) {
      console.error("Gemini Writing Verification Error:", error);
      throw new Error("Failed to verify writing response via AI.");
    }
  }
};
