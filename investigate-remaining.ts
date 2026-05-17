import { prisma } from "./src/lib/prisma.js";
import * as fs from "fs";
import * as path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const availableAudio = new Set(fs.readdirSync(AUDIO_DIR).map(f => f.toLowerCase()));

type Option = { text?: string; id?: string; isCorrect?: boolean; rationale?: string };

async function investigate() {

  // 1. Check if the 21 form-completion LISTENING items actually have audio files
  console.log("=== Form-completion LISTENING items (NO_OPTIONS) — audio check ===\n");
  const formCompletion = await prisma.item.findMany({
    where: { skill: "LISTENING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });
  let formCount = 0, formMissingAudio = 0;
  for (const item of formCompletion) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    if (opts.length === 0 || (c.correctAnswer && String(c.correctAnswer).includes("|"))) {
      formCount++;
      const audioUrl = c.audioUrl as string | undefined;
      if (!audioUrl) { formMissingAudio++; continue; }
      const filename = audioUrl.replace(/^\/audio\//, "").toLowerCase();
      const exists = availableAudio.has(filename);
      if (!exists) {
        formMissingAudio++;
        console.log(`  ❌ [${item.itemCode ?? item.id.slice(0,10)}] ${item.cefrLevel} audioUrl="${audioUrl}" — FILE MISSING`);
      }
    }
  }
  console.log(`Form-completion items: ${formCount}, audio missing: ${formMissingAudio}\n`);

  // 2. Check PLACEHOLDER_OPTIONS — are they legitimate short grammar options?
  console.log("=== PLACEHOLDER_OPTIONS — sample items ===\n");
  const grm = await prisma.item.findMany({
    where: { skill: { in: ["GRAMMAR", "VOCABULARY"] as any[] } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
  });
  let placeholderCount = 0;
  const shortOptExamples: string[] = [];
  for (const item of grm) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const shortOpts = opts.filter(o => (o.text ?? "").trim().length < 2);
    if (shortOpts.length > 0) {
      placeholderCount++;
      const shortTexts = shortOpts.map(o => `"${o.text ?? ""}"`).join(", ");
      shortOptExamples.push(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel}: short opts ${shortTexts} — prompt: "${(c.prompt as string ?? "").slice(0,60)}"`);
    }
  }
  console.log(`Items with short options (<2 chars): ${placeholderCount}`);
  for (const ex of shortOptExamples.slice(0, 15)) console.log(`  ${ex}`);
  console.log();

  // 3. The 4 remaining NO_CORRECT_ANSWER items
  console.log("=== NO_CORRECT_ANSWER — remaining 4 items ===\n");
  for (const item of grm) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const hasCorrect = opts.some(o => o.isCorrect === true);
    if (!hasCorrect) {
      const correctField = c.correctAnswer ?? c.answer ?? c.correct ?? "NONE";
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel} status=$(unknown)`);
      console.log(`  correctAnswer field: "${String(correctField).slice(0,60)}"`);
      console.log(`  Options (${opts.length}):`);
      for (const o of opts.slice(0,4)) {
        console.log(`    {text:"${(o.text ?? "").slice(0,40)}", isCorrect:${o.isCorrect}}`);
      }
      console.log();
    }
  }

  // 4. DUPLICATE_OPTIONS — which items?
  console.log("=== DUPLICATE_OPTIONS — items ===\n");
  for (const item of grm) {
    const c = item.content as any;
    const opts: Option[] = c.options ?? [];
    const texts = opts.map(o => (o.text ?? "").trim().toLowerCase());
    const unique = new Set(texts);
    if (unique.size < texts.length) {
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel}`);
      console.log(`  prompt: "${(c.prompt as string ?? "").slice(0,60)}"`);
      for (const o of opts) console.log(`    option: "${(o.text ?? "").slice(0,50)}" isCorrect:${o.isCorrect}`);
      console.log();
    }
  }

  // 5. MISSING_PASSAGE reading items
  console.log("=== MISSING_PASSAGE reading items ===\n");
  const reading = await prisma.item.findMany({
    where: { skill: "READING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });
  for (const item of reading) {
    const c = item.content as any;
    const passage = c.passage ?? c.text ?? c.readingText ?? null;
    if (!passage || String(passage).trim().length < 30) {
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.cefrLevel} status=${item.status}`);
      console.log(`  Content keys: ${Object.keys(c).join(", ")}`);
      console.log(`  passage: "${String(passage ?? "").slice(0,80)}"`);
      console.log();
    }
  }

  // 6. EMPTY_PROMPT item
  console.log("=== EMPTY_PROMPT item ===\n");
  const allItems = await prisma.item.findMany({
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, content: true },
  });
  for (const item of allItems) {
    const c = item.content as any;
    const prompt = ((c.prompt ?? c.stem ?? c.question ?? "") as string).trim();
    if (!prompt) {
      console.log(`[${item.itemCode ?? item.id.slice(0,10)}] ${item.skill} ${item.cefrLevel} status=${item.status}`);
      console.log(`  Content keys: ${Object.keys(c).join(", ")}`);
      console.log();
    }
  }

  // 7. Writing items without sampleAnswer — count by product line
  console.log("=== WRITING NO_SAMPLE_ANSWER — by product line ===\n");
  const writing = await prisma.item.findMany({
    where: { skill: "WRITING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });
  const noSampleByLine: Record<string, number> = {};
  for (const w of writing) {
    const c = w.content as any;
    if (!c.sampleAnswer && !c.modelAnswer) {
      const line = (c.productLine ?? c.product_line ?? "unknown") as string;
      noSampleByLine[line] = (noSampleByLine[line] ?? 0) + 1;
    }
  }
  for (const [line, count] of Object.entries(noSampleByLine)) {
    console.log(`  ${line}: ${count} items`);
  }

  await prisma.$disconnect();
}
investigate().catch(e => { console.error(e); process.exit(1); });
