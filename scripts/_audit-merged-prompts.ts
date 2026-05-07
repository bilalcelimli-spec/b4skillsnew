import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const items = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "DRAFT"] } },
    select: { id: true, skill: true, cefrLevel: true, content: true },
  });

  let merged = 0, noPassage = 0;
  const bySkill: Record<string, number> = {};
  const examples: any[] = [];

  for (const item of items) {
    const c = item.content as any;
    if (!c) continue;
    const hasPassage = c.passage && typeof c.passage === "string" && c.passage.trim().length > 0;
    const prompt = typeof c.prompt === "string" ? c.prompt.trim() : "";
    if (!hasPassage && prompt) {
      noPassage++;
      const split = splitPassageQuestion(prompt);
      if (split) {
        merged++;
        bySkill[item.skill] = (bySkill[item.skill] || 0) + 1;
        if (examples.length < 3) {
          examples.push({ id: item.id, skill: item.skill, level: item.cefrLevel, passage: split.passage.slice(0, 80) + "…", question: split.question });
        }
      }
    }
  }

  console.log("Total items checked:", items.length);
  console.log("Items without passage:", noPassage);
  console.log("Items with MERGED passage+question:", merged);
  console.log("By skill:", JSON.stringify(bySkill));
  console.log("\nExamples:");
  for (const e of examples) console.log(JSON.stringify(e, null, 2));
  await prisma.$disconnect();
}

/** Split "passage text + question?" into { passage, question }. Returns null if not applicable. */
export function splitPassageQuestion(prompt: string): { passage: string; question: string } | null {
  const trimmed = prompt.trim();
  // The question must be the final sentence ending with ?
  // It should follow a previous sentence that ends with . or ! (the passage)
  // Pattern: passage body (>=60 chars) then optionally whitespace then question (capital letter, >=10 chars, ending ?)
  const match = trimmed.match(/^([\s\S]{60,}?[.!])\s{0,5}([A-Z][^\n.!?]{8,}\?)\s*$/);
  if (!match) return null;
  const passage = match[1].trim();
  const question = match[2].trim();
  // Sanity: passage should be at least 8 words
  if (passage.split(/\s+/).length < 8) return null;
  return { passage, question };
}

run().catch(e => { console.error(e); process.exit(1); });
