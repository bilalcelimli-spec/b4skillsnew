import { prisma } from "./src/lib/prisma.js";

type Option = { text?: string; id?: string; isCorrect?: boolean; rationale?: string };

let fixed = 0, skipped = 0, errors = 0;

async function fixCorrectAnswerByLetter() {
  console.log("\n=== FIX A: Set isCorrect:true from correctAnswer letter ===");
  
  const items = await prisma.item.findMany({
    where: { skill: { in: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"] as any[] } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
  });

  let fixed = 0;
  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const opts: Option[] = (c.options as Option[]) ?? [];
    const hasIsCorrect = opts.some(o => o.isCorrect === true);
    if (hasIsCorrect) continue; // already correct

    const correctAnswer = (c.correctAnswer ?? c.answer ?? null) as string | null;
    if (!correctAnswer) continue; // can't auto-fix without correctAnswer

    // Only fix if correctAnswer is a single letter A-D
    const letterMatch = ["A","B","C","D","E"].includes(String(correctAnswer).trim());
    if (!letterMatch) continue;

    const letter = String(correctAnswer).trim();
    const matchingIdx = opts.findIndex(o => (o.id ?? "").toUpperCase() === letter);
    if (matchingIdx === -1) {
      // Try index-based if no id
      const idx = ["A","B","C","D","E"].indexOf(letter);
      if (idx >= 0 && opts[idx]) {
        opts[idx].isCorrect = true;
        for (let i = 0; i < opts.length; i++) {
          if (i !== idx) opts[i].isCorrect = false;
        }
      } else continue;
    } else {
      for (let i = 0; i < opts.length; i++) {
        opts[i].isCorrect = i === matchingIdx;
      }
    }

    try {
      await prisma.item.update({
        where: { id: item.id },
        data: { content: { ...c, options: opts } as any },
      });
      fixed++;
      if (fixed % 50 === 0) process.stdout.write(`  Fixed ${fixed}...\n`);
    } catch (e) {
      errors++;
    }
  }
  console.log(`  ✅ Fixed ${fixed} items (set isCorrect:true from correctAnswer letter)`);
  return fixed;
}

async function fixListeningUndefinedIds() {
  console.log("\n=== FIX B: LISTENING items with id='undefined' — reassign A/B/C/D ===");
  
  const items = await prisma.item.findMany({
    where: { skill: "LISTENING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, status: true, content: true },
  });

  let fixed = 0;
  const LETTERS = ["A","B","C","D","E","F"];

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const opts: Option[] = (c.options as Option[]) ?? [];
    if (opts.length === 0) continue;
    
    // Check if any option id is "undefined" (string)
    const hasUndefinedId = opts.some(o => o.id === "undefined" || o.id === undefined || o.id === null || o.id === "");
    if (!hasUndefinedId) continue;

    const correctAnswerText = (c.correctAnswer as string ?? "").toLowerCase().trim();
    
    // Reassign IDs A/B/C/D based on index
    const correctedOpts: Option[] = opts.map((o, i) => ({
      ...o,
      id: LETTERS[i] ?? String(i),
      isCorrect: undefined as any, // will be set below
    }));

    // Now find correct answer by matching text
    let correctLetter: string | null = null;
    for (let i = 0; i < correctedOpts.length; i++) {
      const optText = (correctedOpts[i].text ?? "").toLowerCase().trim();
      // Match if the correctAnswerText starts with or contains the option text (trimmed)
      if (correctAnswerText && optText.length > 5 && correctAnswerText.includes(optText.slice(0, 30))) {
        correctLetter = LETTERS[i] ?? null;
        break;
      }
    }

    // Set isCorrect
    for (let i = 0; i < correctedOpts.length; i++) {
      correctedOpts[i].isCorrect = (LETTERS[i] === correctLetter) ? true : false;
    }
    // If no match found, use the existing isCorrect flag from the original
    if (!correctLetter) {
      const origCorrectIdx = opts.findIndex(o => o.isCorrect === true);
      if (origCorrectIdx >= 0) {
        for (let i = 0; i < correctedOpts.length; i++) {
          correctedOpts[i].isCorrect = i === origCorrectIdx;
        }
        correctLetter = LETTERS[origCorrectIdx] ?? null;
      }
    }

    try {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          content: {
            ...c,
            options: correctedOpts,
            correctAnswer: correctLetter ?? c.correctAnswer,
          } as any
        },
      });
      fixed++;
    } catch (e) {
      errors++;
    }
  }
  console.log(`  ✅ Fixed ${fixed} LISTENING items (reassigned option IDs A/B/C/D)`);
  return fixed;
}

async function fixSpeakingTimings() {
  console.log("\n=== FIX C: SPEAKING items — add prepTime/responseTime by CEFR level ===");
  
  const PREP_TIME: Record<string, number> = {
    PRE_A1: 20, A1: 25, A2: 30, B1: 45, B2: 60, C1: 60, C2: 60
  };
  const RESPONSE_TIME: Record<string, number> = {
    PRE_A1: 45, A1: 45, A2: 60, B1: 90, B2: 120, C1: 150, C2: 180
  };

  const items = await prisma.item.findMany({
    where: { skill: "SPEAKING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, content: true },
  });

  let fixed = 0;
  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    if (c.prepTime !== undefined && c.responseTime !== undefined) continue; // already set

    const level = item.cefrLevel;
    const prepTime = PREP_TIME[level] ?? 45;
    const responseTime = RESPONSE_TIME[level] ?? 90;

    // Also normalize rubric field name: some items use "rubric" instead of "scoringRubric"
    const updates: Record<string, unknown> = {
      ...c,
      prepTime: c.prepTime ?? prepTime,
      responseTime: c.responseTime ?? responseTime,
    };
    // If has "rubric" but not "scoringRubric", normalise
    if (c.rubric && !c.scoringRubric) {
      updates.scoringRubric = c.rubric;
    }

    try {
      await prisma.item.update({
        where: { id: item.id },
        data: { content: updates as any },
      });
      fixed++;
    } catch (e) {
      errors++;
    }
  }
  console.log(`  ✅ Fixed ${fixed} SPEAKING items (added prepTime/responseTime)`);
  return fixed;
}

async function fixWritingSampleAnswer() {
  console.log("\n=== FIX D: WRITING items — normalise scoringRubric key ===");
  
  const items = await prisma.item.findMany({
    where: { skill: "WRITING" as any },
    select: { id: true, itemCode: true, cefrLevel: true, content: true },
  });

  let fixed = 0;
  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    let changed = false;
    const updates: Record<string, unknown> = { ...c };
    
    // Normalise rubric → scoringRubric
    if (c.rubric && !c.scoringRubric) {
      updates.scoringRubric = c.rubric;
      changed = true;
    }
    // If no wordRange, add a default based on CEFR (short guide)
    const WORD_RANGES: Record<string, { min: number; max: number }> = {
      PRE_A1: { min: 15, max: 25 }, A1: { min: 25, max: 40 }, A2: { min: 30, max: 60 },
      B1: { min: 70, max: 120 }, B2: { min: 120, max: 180 }, C1: { min: 160, max: 220 }, C2: { min: 200, max: 280 }
    };
    if (!c.wordRange || !(c.wordRange as any).min) {
      updates.wordRange = WORD_RANGES[item.cefrLevel] ?? { min: 80, max: 150 };
      changed = true;
    }

    if (!changed) continue;
    
    try {
      await prisma.item.update({ where: { id: item.id }, data: { content: updates } });
      fixed++;
    } catch (e) {
      errors++;
    }
  }
  console.log(`  ✅ Fixed ${fixed} WRITING items (normalised rubric key, added wordRange)`);
  return fixed;
}

async function main() {
  console.log("Starting item quality fixes...\n");
  
  const a = await fixCorrectAnswerByLetter();
  const b = await fixListeningUndefinedIds();
  const c = await fixSpeakingTimings();
  const d = await fixWritingSampleAnswer();
  
  console.log(`\n${"═".repeat(50)}`);
  console.log(`TOTAL FIXES APPLIED: ${a + b + c + d}`);
  console.log(`Errors: ${errors}`);
  console.log(`${"═".repeat(50)}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
