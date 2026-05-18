/**
 * Inspect SPEAKING item structure to understand schema design
 */

import { prisma } from "./src/lib/prisma.js";

async function main() {
  console.log("Inspecting SPEAKING items structure...\n");

  // Get sample SPEAKING items
  const speaking = await prisma.item.findMany({
    where: { skill: "SPEAKING" },
    take: 5,
    select: { id: true, cefrLevel: true, status: true, content: true },
  });

  console.log(`Sample of ${speaking.length} SPEAKING items:\n`);

  speaking.forEach((item, idx) => {
    const c = item.content as any;
    const keys = Object.keys(c).sort();

    console.log(`[${idx + 1}] ${item.id.slice(0, 12)} ${item.cefrLevel} ${item.status}`);
    console.log(`  Content keys: ${keys.join(", ")}`);
    console.log(`  Has correctAnswer: ${!!c.correctAnswer}`);
    console.log(`  Has rubric: ${!!c.rubric}`);
    console.log(`  Has prompt/stem/question: ${!!(c.prompt || c.stem || c.question)}`);
    console.log(`  Has options: ${Array.isArray(c.options) && c.options.length > 0}`);
    console.log();
  });

  // Check overall structure
  const stats = {
    total: 0,
    withCorrectAnswer: 0,
    withRubric: 0,
    withPrompt: 0,
  };

  const allSpeaking = await prisma.item.findMany({
    where: { skill: "SPEAKING" },
    select: { content: true },
  });

  for (const item of allSpeaking) {
    const c = item.content as any;
    stats.total++;
    if (c.correctAnswer) stats.withCorrectAnswer++;
    if (c.rubric) stats.withRubric++;
    if (c.prompt || c.stem || c.question) stats.withPrompt++;
  }

  console.log("SPEAKING items summary:");
  console.log(`  Total: ${stats.total}`);
  console.log(`  With correctAnswer: ${stats.withCorrectAnswer}`);
  console.log(`  With rubric: ${stats.withRubric}`);
  console.log(`  With prompt/stem: ${stats.withPrompt}`);
  console.log(
    `\n  Inference: SPEAKING items are likely rubric-based (${
      stats.withRubric > 0 ? "rubric field present" : "rubric field not found"
    })`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
