/**
 * fix-item-issues.ts — Bulk-fix all audited item problems:
 *
 * Fix 1: DRAG_DROP → FILL_IN_BLANKS (items already have ___ in prompt)
 * Fix 2: WRITING/MULTIPLE_CHOICE → WRITING_PROMPT
 * Fix 3: FIB items whose prompt has no ___ marker → convert to MULTIPLE_CHOICE
 * Fix 4: SPEAKING_PROMPT items with no rubric → add default CEFR rubric
 * Fix 5: WRITING_PROMPT items with no minWords/rubric → add defaults
 * Fix 6: Duplicate-prompt items → mark RETIRED (keep canonical, retire dupes)
 * Fix 7: Tag dialogue LISTENING items needing audio regen (print their IDs)
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ── CEFR-specific defaults ───────────────────────────────────────────────────
const CEFR_RUBRIC: Record<string, string> = {
  PRE_A1: "Assess basic intelligibility and ability to name simple objects/actions. Grammar errors acceptable.",
  A1: "Assess basic intelligibility. Evaluate simple vocabulary, familiar phrases, minimal grammar control.",
  A2: "Assess ability to describe routine matters. Evaluate simple sentence structure and common vocabulary.",
  B1: "Assess ability to deal with most everyday situations. Evaluate grammatical range, coherence, vocabulary.",
  B2: "Assess clear, detailed responses on a range of topics. Evaluate precision, fluency, grammatical accuracy.",
  C1: "Assess effective and flexible language use. Evaluate sophisticated vocabulary, cohesion, and spontaneity.",
  C2: "Assess near-native mastery. Evaluate precision, nuance, idiomatic expression, and complete fluency.",
};
const CEFR_MIN_WORDS: Record<string, number> = {
  PRE_A1: 10, A1: 20, A2: 30, B1: 50, B2: 80, C1: 120, C2: 150,
};
const CEFR_MAX_WORDS: Record<string, number> = {
  PRE_A1: 30, A1: 60, A2: 80, B1: 120, B2: 180, C1: 250, C2: 350,
};

async function main() {
  let fixed = 0;
  const dialogueNeedsAudio: string[] = [];

  // ── Fix 1 + 2: DRAG_DROP / wrong type items ────────────────────────────────
  const dragItems = await prisma.item.findMany({
    where: { type: "DRAG_DROP" },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
  });
  console.log(`🔧 DRAG_DROP items to fix: ${dragItems.length}`);

  for (const item of dragItems) {
    const c: any = item.content ?? {};
    const hasBlank = /_{2,}|\[_+\]|\[\s*BLANK\s*\]/i.test(String(c.prompt || ""));
    // If it has a blank marker → FILL_IN_BLANKS, else MULTIPLE_CHOICE
    const newType = hasBlank ? "FILL_IN_BLANKS" : "MULTIPLE_CHOICE";
    await prisma.item.update({
      where: { id: item.id },
      data: { type: newType as any },
    });
    fixed++;
  }
  console.log(`  ✅ Converted ${dragItems.length} DRAG_DROP items`);

  // Fix WRITING/MULTIPLE_CHOICE → WRITING_PROMPT
  const writingMCQ = await prisma.item.findMany({
    where: { skill: "WRITING", type: "MULTIPLE_CHOICE" },
    select: { id: true },
  });
  for (const item of writingMCQ) {
    await prisma.item.update({ where: { id: item.id }, data: { type: "WRITING_PROMPT" as any } });
    fixed++;
  }
  console.log(`  ✅ Converted ${writingMCQ.length} WRITING/MULTIPLE_CHOICE → WRITING_PROMPT`);

  // ── Fix 3: FIB items without blank markers → MULTIPLE_CHOICE ──────────────
  const fibItems = await prisma.item.findMany({
    where: { type: "FILL_IN_BLANKS" },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
  });
  let fibFixed = 0;
  for (const item of fibItems) {
    const c: any = item.content ?? {};
    const text = String(c.prompt || c.sentence || c.text || "");
    const hasBlank = /_{2,}|\[_+\]|\[\s*BLANK\s*\]/i.test(text) || text.includes("{{blank}}") || text.includes("{{GAP}}");
    if (!hasBlank) {
      // Has options → convert to MCQ. Otherwise mark RETIRED.
      const opts = c.options ?? c.choices;
      if (Array.isArray(opts) && opts.length >= 2) {
        await prisma.item.update({ where: { id: item.id }, data: { type: "MULTIPLE_CHOICE" as any } });
      } else {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: "RETIRED" as any, retirementReason: "FIB item has no blank marker and no MCQ options — unrenderable" },
        });
      }
      fibFixed++;
      fixed++;
    }
  }
  console.log(`🔧 FIB without blank markers fixed: ${fibFixed}`);

  // ── Fix 4: SPEAKING items missing rubric ────────────────────────────────────
  const speakingItems = await prisma.item.findMany({
    where: { type: "SPEAKING_PROMPT" },
    select: { id: true, cefrLevel: true, content: true },
  });
  let speakFixed = 0;
  for (const item of speakingItems) {
    const c: any = item.content ?? {};
    if (!c.rubric && !c.criteria) {
      const rubric = CEFR_RUBRIC[item.cefrLevel] ?? CEFR_RUBRIC["B1"];
      await prisma.item.update({
        where: { id: item.id },
        data: {
          content: {
            ...c,
            rubric,
            scoringCriteria: ["fluency", "grammar", "vocabulary", "pronunciation"],
          },
        },
      });
      speakFixed++;
      fixed++;
    }
  }
  console.log(`🔧 Speaking items missing rubric fixed: ${speakFixed}`);

  // ── Fix 5: WRITING items missing constraints ─────────────────────────────────
  const writingItems = await prisma.item.findMany({
    where: { type: "WRITING_PROMPT" },
    select: { id: true, cefrLevel: true, content: true },
  });
  let writeFixed = 0;
  for (const item of writingItems) {
    const c: any = item.content ?? {};
    if (!c.minWords && !c.wordLimit && !c.rubric) {
      const minWords = CEFR_MIN_WORDS[item.cefrLevel] ?? 50;
      const maxWords = CEFR_MAX_WORDS[item.cefrLevel] ?? 180;
      const rubric = CEFR_RUBRIC[item.cefrLevel] ?? CEFR_RUBRIC["B1"];
      await prisma.item.update({
        where: { id: item.id },
        data: {
          content: {
            ...c,
            minWords,
            maxWords,
            rubric,
            scoringCriteria: ["task_achievement", "coherence", "grammar", "vocabulary"],
          },
        },
      });
      writeFixed++;
      fixed++;
    }
  }
  console.log(`🔧 Writing items missing constraints fixed: ${writeFixed}`);

  // ── Fix 6: Retire duplicate-prompt items ─────────────────────────────────────
  const allItems = await prisma.item.findMany({
    where: { status: { not: "RETIRED" as any } },
    select: { id: true, skill: true, cefrLevel: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" }, // keep the oldest, retire newer dupes
  });

  const promptSeen: Record<string, string> = {};
  const toRetire: string[] = [];
  for (const item of allItems) {
    const c: any = item.content ?? {};
    const prompt = String(c.prompt || "").trim().slice(0, 150);
    if (!prompt) continue;
    const key = `${item.skill}|${item.cefrLevel}|${prompt}`;
    if (promptSeen[key]) {
      toRetire.push(item.id);
    } else {
      promptSeen[key] = item.id;
    }
  }
  console.log(`🔧 Duplicate prompt items to retire: ${toRetire.length}`);
  if (toRetire.length > 0) {
    await prisma.item.updateMany({
      where: { id: { in: toRetire } },
      data: { status: "RETIRED" as any, retirementReason: "Duplicate prompt within same skill+CEFR level" },
    });
    fixed += toRetire.length;
  }

  // ── Fix 7: Identify dialogue items that need audio regen ──────────────────
  const listeningItems = await prisma.item.findMany({
    where: { skill: "LISTENING", type: "MULTIPLE_CHOICE" },
    select: { id: true, itemCode: true, cefrLevel: true, content: true, assets: { select: { type: true, metadata: true } } },
  });
  for (const item of listeningItems) {
    const c: any = item.content ?? {};
    const isDialogue =
      (c.speakers && Array.isArray(c.speakers)) ||
      (c.script && Array.isArray(c.script)) ||
      (c.transcript && String(c.transcript).includes(":")) ||
      (c.prompt && /conversation|dialogue|two people|speakers/i.test(c.prompt));
    if (!isDialogue) continue;

    const audioAsset = item.assets.find((a: any) => a.type === "AUDIO");
    const assetMeta: any = audioAsset?.metadata ?? {};
    const hasSpeakerMeta = assetMeta.speakers || assetMeta.speakerA || (c.speakers?.length >= 2) || (c.script?.length >= 2);

    if (!hasSpeakerMeta) {
      dialogueNeedsAudio.push(item.itemCode || item.id);
    }
  }

  console.log(`\n========================================================`);
  console.log(`  ITEM FIX COMPLETE`);
  console.log(`========================================================`);
  console.log(`  Total items fixed/retired : ${fixed}`);
  console.log(`  Dialogue items needing audio regen: ${dialogueNeedsAudio.length}`);
  if (dialogueNeedsAudio.length > 0) {
    console.log(`\n  Run with REGEN_DIALOGUE=1 to regenerate multi-speaker audio for:`);
    for (const id of dialogueNeedsAudio.slice(0, 30)) console.log(`    ${id}`);
    if (dialogueNeedsAudio.length > 30) console.log(`    ... and ${dialogueNeedsAudio.length - 30} more`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
