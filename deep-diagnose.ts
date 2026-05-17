import { prisma } from "./src/lib/prisma.js";

type Option = { text?: string; id?: string; isCorrect?: boolean; rationale?: string };

async function deepDiagnose() {
  // Find the actual 54 LISTENING mismatch items (those where correctAnswer is a sentence, not a letter)
  const allListening = await prisma.item.findMany({
    where: { skill: "LISTENING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });

  const mismatch: typeof allListening = [];
  const noOptions: typeof allListening = [];
  const correctByLetter: typeof allListening = [];
  
  for (const item of allListening) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const correctAnswer = c.correctAnswer as string | undefined;
    
    if (!opts || opts.length === 0) {
      noOptions.push(item);
    } else {
      const ids = opts.map(o => o.id ?? "");
      if (correctAnswer && !["A","B","C","D","E","F"].includes(correctAnswer)) {
        // correctAnswer is a full sentence not an id letter — mismatch category
        mismatch.push(item);
      } else {
        correctByLetter.push(item);
      }
    }
  }

  console.log(`Total LISTENING: ${allListening.length}`);
  console.log(`  - correct by letter (A/B/C/D): ${correctByLetter.length} ← FINE`);
  console.log(`  - no options (form completion): ${noOptions.length} ← DIFFERENT TYPE`);
  console.log(`  - correctAnswer is full sentence: ${mismatch.length} ← BROKEN\n`);

  // Show a broken mismatch item
  if (mismatch.length > 0) {
    const m = mismatch[0];
    const c = m.content as any;
    console.log("=== Sample broken MISMATCH item ===");
    console.log(`[${m.itemCode ?? m.id.slice(0,10)}] ${m.cefrLevel} status=${m.status}`);
    console.log("content keys:", Object.keys(c).join(", "));
    console.log("correctAnswer:", (c.correctAnswer as string)?.slice(0, 100));
    const opts: Option[] = c.options ?? [];
    console.log(`Options (${opts.length}):`);
    for (const o of opts) {
      console.log(`  {id:"${o.id}", text:"${(o.text ?? "").slice(0,60)}", isCorrect:${o.isCorrect}}`);
    }
    console.log("audioUrl:", c.audioUrl ?? "MISSING");
    console.log();
  }

  // Now look at the 352 NO_CORRECT_ANSWER items — are they grammar/vocab/reading?
  const noCorrectItems = await prisma.item.findMany({
    where: { skill: { in: ["GRAMMAR", "VOCABULARY", "READING"] as any[] } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, content: true },
  });
  
  let noCorrectCount = 0;
  let itemsWithCorrectField = 0;
  let itemsWithIsCorrectField = 0;
  let sampleNoCorrect: any = null;
  let sampleHasField: any = null;

  for (const item of noCorrectItems) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const hasIsCorrect = opts.some(o => o.isCorrect === true);
    const hasCorrectField = !!(c.correctAnswer ?? c.answer ?? c.correct);
    
    if (!hasIsCorrect) {
      noCorrectCount++;
      if (!sampleNoCorrect) sampleNoCorrect = { item, opts, c };
    }
    if (hasCorrectField && !hasIsCorrect) {
      itemsWithCorrectField++;
      if (!sampleHasField) sampleHasField = { item, opts, c };
    }
    if (hasIsCorrect) itemsWithIsCorrectField++;
  }

  console.log(`\n=== NO_CORRECT_ANSWER (GRAMMAR/VOC/READING) ===`);
  console.log(`Total items: ${noCorrectItems.length}`);
  console.log(`  With isCorrect:true in options: ${itemsWithIsCorrectField}`);
  console.log(`  Without isCorrect:true: ${noCorrectCount}`);
  console.log(`  Without isCorrect but WITH correctAnswer/answer field: ${itemsWithCorrectField}`);

  if (sampleNoCorrect) {
    const { item, opts, c } = sampleNoCorrect;
    console.log(`\nSample NO_CORRECT item [${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel} status=${item.status}`);
    console.log("Content keys:", Object.keys(c).join(", "));
    console.log("Options:");
    for (const o of opts.slice(0,4)) {
      console.log(`  {text:"${(o.text ?? "").slice(0,50)}", isCorrect:${o.isCorrect}, id:"${o.id ?? ""}"}`);
    }
  }

  if (sampleHasField) {
    const { item, opts, c } = sampleHasField;
    console.log(`\nSample WITH correctAnswer field [${item.itemCode ?? item.id.slice(0,10)}]`);
    console.log(`  correctAnswer: "${(c.correctAnswer ?? c.answer ?? "").slice(0,60)}"`);
  }

  // Check speaking — why 279 items with NO_PREP_TIME?
  const speaking = await prisma.item.findMany({
    where: { skill: "SPEAKING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, content: true },
  });
  let noPrepTime = 0;
  let sampleSpeak: any = null;
  for (const s of speaking) {
    const c = s.content as any;
    if (!c.prepTime && c.prepTime !== 0) {
      noPrepTime++;
      if (!sampleSpeak) sampleSpeak = { item: s, c };
    }
  }
  console.log(`\n=== SPEAKING ===`);
  console.log(`Total SPEAKING: ${speaking.length}, without prepTime: ${noPrepTime}`);
  if (sampleSpeak) {
    console.log(`Sample NO_PREP item [${sampleSpeak.item.itemCode ?? sampleSpeak.item.id.slice(0,10)}]`);
    console.log("  content keys:", Object.keys(sampleSpeak.c).join(", "));
    console.log("  prepTime:", sampleSpeak.c.prepTime, "responseTime:", sampleSpeak.c.responseTime);
  }

  await prisma.$disconnect();
}
deepDiagnose().catch(e => { console.error(e); process.exit(1); });
