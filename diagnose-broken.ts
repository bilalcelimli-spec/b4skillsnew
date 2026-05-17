import { prisma } from "./src/lib/prisma.js";

type Option = { text?: string; id?: string; isCorrect?: boolean; rationale?: string };

async function diagnose() {
  // 1. Sample NO_CORRECT_ANSWER items — look at what the options actually look like
  console.log("=== GRAMMAR/VOCAB/READING: NO_CORRECT_ANSWER samples ===\n");
  const noCorrect = await prisma.item.findMany({
    where: { skill: { in: ["GRAMMAR", "VOCABULARY", "READING"] as any[] } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
    take: 5,
  });
  for (const item of noCorrect) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const hasCorrect = opts.some(o => o.isCorrect === true);
    if (!hasCorrect) {
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel}`);
      for (const o of opts) {
        console.log(`  {text: "${(o.text ?? "").slice(0,40)}", isCorrect: ${o.isCorrect}, rationale: "${(o.rationale ?? "").slice(0,50)}"}`);
      }
      console.log();
    }
  }

  // 2. Sample LISTENING MISMATCH items — understand the broken option structure  
  console.log("\n=== LISTENING: CORRECT_ANSWER_MISMATCH samples ===\n");
  const listening = await prisma.item.findMany({
    where: { skill: "LISTENING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
    take: 5,
  });
  for (const item of listening) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const correctAnswer = c.correctAnswer;
    const idsEmpty = opts.every(o => !o.id);
    console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.cefrLevel} correctAnswer="${(correctAnswer ?? "").slice(0,60)}"`);
    console.log(`  Option IDs empty: ${idsEmpty}, Option count: ${opts.length}`);
    for (const o of opts) {
      console.log(`  {id: "${o.id ?? ""}", text: "${(o.text ?? "").slice(0,60)}", isCorrect: ${o.isCorrect}}`);
    }
    console.log();
  }

  // 3. Check NO_OPTIONS LISTENING items
  console.log("\n=== LISTENING: NO_OPTIONS items ===\n");
  const noOpts = await prisma.item.findMany({
    where: { skill: "LISTENING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });
  for (const item of noOpts) {
    const c = item.content as any;
    if (!c.options || (Array.isArray(c.options) && c.options.length === 0)) {
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.cefrLevel} status=${item.status}`);
      console.log(`  Content keys: ${Object.keys(c).join(", ")}`);
      const correctAnswer = c.correctAnswer ?? "N/A";
      console.log(`  correctAnswer: "${String(correctAnswer).slice(0,80)}"`);
      console.log();
    }
  }

  // 4. WRITING items without sampleAnswer or wordRange — check pattern
  console.log("\n=== WRITING: NO_SAMPLE_ANSWER items count by pattern ===\n");
  const writing = await prisma.item.findMany({
    where: { skill: "WRITING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, content: true },
  });
  let noSample = 0, noRange = 0;
  for (const w of writing) {
    const c = w.content as any;
    if (!c.sampleAnswer && !c.modelAnswer) noSample++;
    if (!c.wordRange || !c.wordRange.min) noRange++;
  }
  console.log(`Total WRITING: ${writing.length}, without sampleAnswer: ${noSample}, without wordRange: ${noRange}`);

  // 5. SPEAKING: what fields are missing?
  const speaking = await prisma.item.findMany({
    where: { skill: "SPEAKING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, content: true },
    take: 3,
  });
  console.log("\n=== SPEAKING: field structure ===\n");
  for (const s of speaking) {
    const c = s.content as any;
    console.log(`[${s.itemCode ?? s.id.slice(0,10)}] ${s.cefrLevel}`);
    console.log(`  keys: ${Object.keys(c).join(", ")}`);
    console.log(`  prepTime: ${c.prepTime ?? "MISSING"}, responseTime: ${c.responseTime ?? "MISSING"}`);
  }

  await prisma.$disconnect();
}
diagnose().catch(e => { console.error(e); process.exit(1); });
