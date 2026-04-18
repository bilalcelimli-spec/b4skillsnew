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
    description: "Adolescents aged 11-14. Topics like friends, hobbies, early science, pop culture, sports. Engaging but not overtly complicated, developmentally appropriate for teenagers.",
    levels: ["A2", "B1", "B2"]
  },
  {
    name: "15-Min Diagnostic",
    description: "A fast-paced diagnostic test spanning all levels. Questions should be highly discriminative to quickly estimate ability. Mix of grammar, vocabulary, reading.",
    levels: ["A1", "B1", "B2", "C1", "C2"]
  },
  {
    name: "Academia",
    description: "University and academic context. Lectures, campus life, research, complex sentence structure, academic vocabulary, high cognitive demand.",
    levels: ["B2", "C1", "C2"]
  },
  {
    name: "Corporate",
    description: "Business English. Office communication, emails, reports, management terminology, HR, negotiations, industry-standard professional tone.",
    levels: ["B1", "B2", "C1"]
  },
  {
    name: "Language Schools",
    description: "Standard communicative English for general adult learners. Travel, culture, everyday situations, making bookings, living abroad.",
    levels: ["A1", "A2", "B1", "B2", "C1"]
  },
  {
    name: "Specialized / Integrated Skills",
    description: "Complex integrated tasks. Advanced reading comprehension, extracting specific data from text, implicit meaning.",
    levels: ["B2", "C1"]
  }
];

async function generateBatchForProductLine(product: any, batchSize: number): Promise<any[]> {
  const prompt = `
You are an expert psychometrician designing "State-of-the-Art" (Duolingo/Cambridge standard) English assessment items.
Generate exactly ${batchSize} different test items specifically tailored for the "${product.name}" product line.

TARGET AUDIENCE & PEDAGOGY:
${product.description}

REQUIREMENTS:
- Produce exactly ${batchSize} items in total.
- Distribute them across CEFR levels: ${product.levels.join(", ")}.
- Mix skills: READING, GRAMMAR, VOCABULARY.
- Give a discrimination index (a-parameter: 0.5 to 2.5), difficulty (b-parameter: -3 to +3), and guessing (c-parameter: 0 to 0.25).
- Output MUST be a valid JSON array of objects, ONLY JSON. Do not include markdown blocks like \`\`\`json. Just the raw array.

JSON OBJECT SCHEMA FORMAT PER ITEM:
[
  {
    "type": "MULTIPLE_CHOICE",
    "skill": "READING",
    "cefrLevel": "B1",
    "difficulty": 0.5,
    "discrimination": 1.2,
    "guessing": 0.2,
    "content": {
      "prompt": "<The stimulus text, scenario, or question>",
      "options": [
        {"id": "A", "text": "Option 1"},
        {"id": "B", "text": "Option 2"},
        {"id": "C", "text": "Option 3"},
        {"id": "D", "text": "Option 4"}
      ],
      "correctAnswer": "A",
      "rubric": "Explanation regarding the correct option."
    }
  }
]
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text || "[]";
    const items = JSON.parse(text);
    return Array.isArray(items) ? items : [];
  } catch (error: any) {
    console.error(`Failed to generate batch for ${product.name}:`, error.message);
    return [];
  }
}

async function main() {
  console.log("Starting generation of State-of-the-Art assessment items for different product lines...");
  let totalInserted = 0;
  
  // Generating 40 items per category as requested!
  const BATCHES = 4;
  const ITEMS_PER_BATCH = 10;

  for (const product of PRODUCT_LINES) {
    console.log(`\n=== Generating items for: ${product.name} (Target: 40) ===`);
    let categoryInserted = 0;
    
    for (let batch = 1; batch <= BATCHES; batch++) {
      console.log(`Generating batch ${batch}/${BATCHES} for ${product.name}...`);
      const generatedItems = await generateBatchForProductLine(product, ITEMS_PER_BATCH);
      
      if (generatedItems.length === 0) continue;

      for (const itemData of generatedItems) {
        await prisma.item.create({
          data: {
            type: itemData.type || "MULTIPLE_CHOICE",
            skill: itemData.skill || "GRAMMAR",
            cefrLevel: itemData.cefrLevel || "B1",
            difficulty: itemData.difficulty || 0.0,
            discrimination: itemData.discrimination || 1.0,
            guessing: itemData.guessing || 0.0,
            content: itemData.content,
            tags: [product.name], // Crucial for filtering in engine
            status: "ACTIVE",     // So they are immediately playable
            isPretest: false
          }
        });
        categoryInserted++;
        totalInserted++;
      }
    }
    console.log(`Finished ${product.name}. Inserted ${categoryInserted} items.`);
  }
  
  console.log(`\n✅ Successfully generated and inserted ${totalInserted} SOTA items!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
