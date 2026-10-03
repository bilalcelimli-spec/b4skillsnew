#!/usr/bin/env tsx

/**
 * Read-only: for B2+ reading/listening MCQs, asks an LLM to answer WITHOUT the
 * passage. If it picks the key, the item may not require the text.
 *
 *   npx tsx scripts/jobs/scan-text-dependency.ts [--limit N]
 *
 * One blind guess has a 25% chance baseline, so treat the aggregate rate as the
 * signal and individual hits as candidates for human review.
 */

import { Type } from "@google/genai";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { runJudge, isJudgeAvailable } from "../../src/lib/ai/validation/prompt-judge.js";
import { keyIndex } from "../../src/lib/psychometrics/content-iqs.js";

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

const optText = (o: any) => (typeof o === "string" ? o : String(o?.text ?? ""));

async function main() {
  if (!isJudgeAvailable()) { console.error("GEMINI_API_KEY is not set."); process.exit(1); }

  const items = await prisma.item.findMany({
    where: {
      status: "ACTIVE" as any,
      type: "MULTIPLE_CHOICE" as any,
      skill: { in: ["READING", "LISTENING"] as any },
      cefrLevel: { in: ["B2", "C1", "C2"] as any },
    },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, content: true },
    orderBy: { id: "asc" },
    take: LIMIT,
  });

  const out: any[] = [];
  let cursor = 0;
  let timedOut = 0;
  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/text-dependency.jsonl", "");
  async function worker() {
    while (cursor < items.length) {
      const it = items[cursor++];
      const c: any = it.content ?? {};
      const opts: any[] = c.options ?? [];
      const ki = keyIndex(c);
      if (ki < 0 || opts.length < 3) continue;

      const verdict = await withTimeout(runJudge<{ answerIndex: number; textRequired: boolean; reason: string }>({
        prompt: `A candidate is shown this ${it.skill.toLowerCase()} question but the ${it.skill === "LISTENING" ? "recording" : "passage"} is NOT available to you.
Using only general knowledge, logic and the wording of the options, pick the most likely correct option.

QUESTION: ${c.question ?? c.stem ?? c.prompt ?? ""}
OPTIONS:
${opts.map((o, i) => `${i}. ${optText(o)}`).join("\n")}

"answerIndex": 0-based index of your best guess.
"textRequired": true if a candidate genuinely cannot answer without the source text, false if the answer is guessable.
"reason": one short sentence.`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answerIndex: { type: Type.INTEGER },
            textRequired: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["answerIndex", "textRequired", "reason"],
        },
        options: { temperature: 0.1 },
      }), 40_000);
      if (!verdict) { timedOut++; continue; }
      const row = {
        id: it.id, itemCode: it.itemCode, skill: it.skill, cefr: it.cefrLevel,
        question: String(c.question ?? c.stem ?? c.prompt ?? "").slice(0, 160),
        solvedBlind: verdict.answerIndex === ki, textRequired: verdict.textRequired, reason: verdict.reason,
      };
      out.push(row);
      appendFileSync("scripts/jobs/.out/text-dependency.jsonl", JSON.stringify(row) + "\n");
      if (out.length % 20 === 0) console.log(`  progress ${out.length}/${items.length} (no-verdict ${timedOut})`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  writeFileSync("scripts/jobs/.out/text-dependency.json", JSON.stringify(out, null, 2));

  const rate = (rows: any[]) => (rows.length ? `${rows.filter((r) => r.solvedBlind).length}/${rows.length} (${((100 * rows.filter((r) => r.solvedBlind).length) / rows.length).toFixed(0)}%)` : "n/a");
  console.log(`no verdict (timeout/error): ${timedOut}`);
  console.log(`checked=${out.length}/${items.length}  solved-blind overall: ${rate(out)}  (chance ≈ 25%)`);
  for (const sk of ["READING", "LISTENING"]) for (const cf of ["B2", "C1", "C2"]) console.log(`  ${sk}/${cf}`.padEnd(16), rate(out.filter((r) => r.skill === sk && r.cefr === cf)));
  console.log("judge says text NOT required:", out.filter((r) => !r.textRequired).length);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
