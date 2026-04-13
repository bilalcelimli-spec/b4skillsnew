import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PRODUCT_LINES = [
  {
    name: "Primary (7-10)",
    description: "Young learners aged 7-10. Simple grammar, highly visual themes (animals, family, colors, school), very short sentences, child-friendly pedagogical approach.",
    levels: ["A1", "A2", "B1"]
  },
  {
    name: "Junior Suite (11-14)",
    description: "Adolescents aged 11-14. Topics like friends, hobbies, early science, pop culture, sports. Engaging but not overtly complicated.",
    levels: ["A2", "B1", "B2"]
  },
  {
    name: "15-Min Diagnostic",
    description: "A fast-paced diagnostic test spanning all levels. Highly discriminative. Mix of grammar, vocabulary, reading.",
    levels: ["A1", "B1", "B2", "C1", "C2"]
  },
  {
    name: "Academia",
    description: "University and academic context. Lectures, campus life, research, complex sentence structure, academic vocabulary.",
    levels: ["B2", "C1", "C2"]
  },
  {
    name: "Corporate",
    description: "Business English. Office communication, emails, reports, management terminology, HR, negotiations.",
    levels: ["B1", "B2", "C1"]
  },
  {
    name: "Language Schools",
    description: "Standard communicative English for general adult learners. Travel, culture, everyday situations.",
    levels: ["A1", "A2", "B1", "B2", "C1"]
  },
  {
    name: "Specialized / Integrated Skills",
    description: "Complex integrated tasks. Advanced reading comprehension, extracting specific data from text, implicit meaning.",
    levels: ["B2", "C1", "C2"]
  }
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateBatchWithRetry(product: any, batchSize: number, retries = 3): Promise<any[]> {
  const prompt = `
You are an expert psychometrician designing "State-of-the-Art" (Duolingo/Cambridge standard) multimodal English assessment items.
Generate exactly ${batchSize} different test items specifically tailored for the "${product.name}" product line.

TARGET AUDIENCE & PEDAGOGY:
${product.description}

REQUIREMENTS:
- Produce exactly ${batchSize} items.
- Distribute across CEFR levels: ${product.levels.join(", ")}.
- MUST MIX SKILLS: Use a balanced mix of READING, LISTENING, WRITING, SPEAKING, GRAMMAR, and VOCABULARY.
- MUST MIX TYPES: Use MULTIPLE_CHOICE, FILL_IN_BLANKS, SPEAKING_PROMPT, WRITING_PROMPT, INTEGRATED_TASK.
- Give a discrimination index (a-parameter: 0.5 to 2.5), difficulty (b-parameter: -3 to +3), and guessing (c-parameter: 0 to 0.25).
- VISUALS: For items that need an image (especially Primary/Junior or describing an image in Speaking/Writing), include an \`imageUrl\` field. 
  Generate the URL using this format: \`https://image.pollinations.ai/prompt/YOUR_DESCRIPTIVE_PROMPT_HERE_URL_ENCODED\`
  (Example: https://image.pollinations.ai/prompt/a%20cute%20cartoon%20dog%20playing%20with%20a%20red%20ball)

Output MUST be a valid JSON array of objects, ONLY JSON. Do not include markdown blocks like \`\`\`json. Just the raw array.

EXAMPLE ITEM SCHEMA IN ARRAY:
[
  {
    "type": "SPEAKING_PROMPT",
    "skill": "SPEAKING",
    "cefrLevel": "B1",
    "difficulty": 0.5,
    "discrimination": 1.2,
    "guessing": 0.0,
    "content": {
      "prompt": "Describe what is happening in the picture.",
      "imageUrl": "https://image.pollinations.ai/prompt/people%20having%20a%20picnic%20in%20a%20sunny%20park",
      "rubric": "Evaluates fluency and relevant vocabulary for outdoor activities."
    }
  },
  {
    "type": "MULTIPLE_CHOICE",
    ...
  }
]
`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text || "[]";
      const items = JSON.parse(text);
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    } catch (error: any) {
      console.warn(`[Attempt ${attempt}/${retries}] Failed for ${product.name}: ${error.message}`);
      if (attempt === retries) {
        console.error(`Giving up on this batch for ${product.name}.`);
        return [];
      }
      // Wait before retrying (Exponential backoff to handle 503s)
      await sleep(attempt * 4000); 
    }
  }
  return [];
}

async function main() {
  console.log("Starting generation of MULTIMODAL SOTA assessment items...");
  let totalInserted = 0;
  
  // Generating 40 items per category. We do 8 batches of 5 items to reduce AI token load and timeouts.
  const BATCHES = 8;
  const ITEMS_PER_BATCH = 5;

  for (const product of PRODUCT_LINES) {
    console.log(`\n=== Generating items for: ${product.name} (Target: 40 items) ===`);
    let categoryInserted = 0;
    
    for (let batch = 1; batch <= BATCHES; batch++) {
      console.log(`Generating batch ${batch}/${BATCHES} for ${product.name}...`);
      const generatedItems = await generateBatchWithRetry(product, ITEMS_PER_BATCH);
      
      if (generatedItems.length === 0) continue;

      for (const itemData of generatedItems) {
        try {
          await prisma.item.create({
            data: {
              type: itemData.type || "MULTIPLE_CHOICE",
              skill: itemData.skill || "GRAMMAR",
              cefrLevel: itemData.cefrLevel || "B1",
              difficulty: itemData.difficulty || 0.0,
              discrimination: itemData.discrimination || 1.0,
              guessing: itemData.guessing || 0.0,
              content: itemData.content,
              tags: [product.name],
              status: "ACTIVE",
              isPretest: false
            }
          });
          categoryInserted++;
          totalInserted++;
        } catch (dbError: any) {
           console.error(`Failed to insert item: ${dbError.message}`);
        }
      }
      
      // Delay between successful batches to respect rate limits
      await sleep(3000);
    }
    console.log(`Finished ${product.name}. Inserted ${categoryInserted} items.`);
  }
  
  console.log(`\n✅ Successfully generated and inserted ${totalInserted} Multimodal SOTA items!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
