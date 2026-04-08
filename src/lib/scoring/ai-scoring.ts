import { GoogleGenAI, Type } from "@google/genai";

/**
 * b4skills AI Scoring Service
 * Uses Gemini to evaluate Writing and Speaking responses against CEFR rubrics.
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ScoringResult {
  score: number; // 0.0 to 1.0
  cefrLevel: string;
  feedback: string;
  confidence: number;
  rubricScores: {
    grammar: number;
    vocabulary: number;
    coherence: number;
    taskRelevance: number;
  };
  corrections?: Array<{
    original: string;
    suggestion: string;
    type: "grammar" | "vocabulary" | "style";
    explanation: string;
  }>;
}

const WRITING_RUBRIC_PROMPT = `
You are an expert English language examiner. Evaluate the following writing response based on CEFR criteria.
Provide a score from 0.0 (Pre-A1) to 1.0 (C2).
Break down the score into Grammar, Vocabulary, Coherence, and Task Relevance (each 0-10).
Identify specific errors and provide corrections.

Response to evaluate:
"{{CONTENT}}"

Return the result in JSON format with the following structure:
{
  "score": number,
  "cefrLevel": string,
  "feedback": string,
  "confidence": number,
  "rubricScores": {
    "grammar": number,
    "vocabulary": number,
    "coherence": number,
    "taskRelevance": number
  },
  "corrections": [
    { "original": string, "suggestion": string, "type": "grammar" | "vocabulary" | "style", "explanation": string }
  ]
}
`;

const SPEAKING_MULTIMODAL_PROMPT = `
Listen to this audio response and evaluate the candidate's English proficiency.
Analyze pronunciation, fluency, grammar, and vocabulary.
Provide a CEFR level and a score from 0.0 to 1.0.
`;

export const AIScoringService = {
  /**
   * Score a Writing response with granular feedback
   */
  async scoreWriting(content: string): Promise<ScoringResult> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: WRITING_RUBRIC_PROMPT.replace("{{CONTENT}}", content),
        config: {
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
                    type: { type: Type.STRING, enum: ["grammar", "vocabulary", "style"] },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["score", "cefrLevel", "feedback", "confidence", "rubricScores"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("AI Writing Scoring Error:", error);
      throw error;
    }
  },

  /**
   * Score a Speaking response using Multimodal Audio Input
   */
  async scoreSpeakingMultimodal(audioBase64: string, mimeType: string): Promise<ScoringResult> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: SPEAKING_MULTIMODAL_PROMPT },
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType
            }
          }
        ],
        config: {
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
              }
            }
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("AI Multimodal Speaking Scoring Error:", error);
      throw error;
    }
  },

  /**
   * Score a Speaking response (Transcription + Evaluation)
   */
  async scoreSpeaking(audioUrl: string, transcript?: string): Promise<ScoringResult> {
    // For this demo, we assume the transcript is provided or we simulate it
    const textToEvaluate = transcript || "I enjoy hiking in the mountains because it is peaceful and healthy.";
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Evaluate this English speaking transcript: "${textToEvaluate}". Provide CEFR scoring.`,
        config: {
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
              }
            }
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("AI Speaking Scoring Error:", error);
      throw error;
    }
  }
};
