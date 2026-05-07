/**
 * Fix merged passage+question items.
 *
 * Some items have the passage text and question stem concatenated in a single
 * content.prompt field with no separate content.passage.
 *
 * Example (broken):
 *   content.passage: null
 *   content.prompt:  "Hi Alex,\nI saw you were having trouble...\n\nWhat should
 *                     Alex do to read all the articles?"
 *
 * After fix:
 *   content.passage: "Hi Alex,\nI saw you were having trouble..."
 *   content.prompt:  "What should Alex do to read all the articles?"
 *
 * Run dry-run first:
 *   DRY_RUN=1 npx tsx scripts/fix-merged-prompts.ts
 *
 * Apply:
 *   npx tsx scripts/fix-merged-prompts.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

/**
 * Split "passage body. Question?" into { passage, question }.
 * Returns null if the prompt does not have this structure.
 */
function splitPassageQuestion(prompt: string): { passage: string; question: string } | null {
  const trimmed = prompt.trim();
  // Must end with a question mark
  if (!trimmed.endsWith("?")) return null;
  // Pattern: at least 60 chars of passage text (ending with . or !) then the question
  const match = trimmed.match(/^([\s\S]{60,}?[.!])\s{0,6}([A-Z][^\n.!?]{8,}\?)\s*$/);
  if (!match) return null;
  const passage = match[1].trim();
  const question = match[2].trim();
  // Passage must be at least 8 words
  if (passage.split(/\s+/).length < 8) return null;
  return { passage, question };
}

async function main() {
  console.log(`\n${DRY_RUN ? "DRY RUN — " : ""}Fix merged passage+question items\n`);

  const items = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "DRAFT"] } },
    select: { id: true, skill: true, cefrLevel: true, content: true },
  });

  let fixed = 0, skipped = 0;

  for (const item of items) {
    const c = item.content as any;
    if (!c) continue;
    const hasPassage = c.passage && typeof c.passage === "string" && c.passage.trim().length > 0;
    const prompt = typeof c.prompt === "string" ? c.prompt.trim() : "";
    if (hasPassage || !prompt) continue; // already has a separate passage, or no prompt

    const split = splitPassageQuestion(prompt);
    if (!split) { skipped++; continue; }

    console.log(`\n[${item.skill} ${item.cefrLevel}] ${item.id}`);
    console.log(`  PASSAGE: ${split.passage.slice(0, 100)}${split.passage.length > 100 ? "…" : ""}`);
    console.log(`  QUESTION: ${split.question}`);

    if (!DRY_RUN) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          content: {
            ...c,
            passage: split.passage,
            prompt: split.question,
          } as any,
        },
      });
    }
    fixed++;
  }

  console.log(`\n✓ ${DRY_RUN ? "Would fix" : "Fixed"}: ${fixed} items`);
  console.log(`  Skipped (no pattern match): ${skipped}`);
  if (DRY_RUN) console.log("\n  Run without DRY_RUN=1 to apply changes.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
