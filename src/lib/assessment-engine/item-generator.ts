import { GoogleGenAI, Type } from "@google/genai";
import { Item, SkillType, ItemType, CefrLevel } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * AI Item Generation Service
 * Generates high-quality assessment items on-the-fly using Gemini.
 */

const ITEM_GEN_PROMPT = `
You are a professional English language assessment content developer.
Generate a new assessment item for the following parameters:
Skill: {{SKILL}}
CEFR Level: {{LEVEL}}
Item Type: {{TYPE}}

The item must be valid, engaging, and accurately calibrated to the CEFR level.
Include a passage/prompt, options (if applicable), the correct answer, and a detailed rubric.

Return the result in JSON format matching the Item structure.
`;

export const ItemGeneratorService = {
  /**
   * Generate a new item based on skill and level
   */
  async generateItem(skill: SkillType, level: CefrLevel, type: ItemType): Promise<Partial<Item>> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: ITEM_GEN_PROMPT
          .replace("{{SKILL}}", skill)
          .replace("{{LEVEL}}", level)
          .replace("{{TYPE}}", type),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              skill: { type: Type.STRING },
              cefrLevel: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
              content: {
                type: Type.OBJECT,
                properties: {
                  prompt: { type: Type.STRING },
                  passage: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  rubric: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const generated = JSON.parse(response.text);
      return {
        ...generated,
        status: "ACTIVE",
        version: 1,
        exposureCount: 0
      };
    } catch (error) {
      console.error("Item Generation Error:", error);
      throw error;
    }
  }
};
