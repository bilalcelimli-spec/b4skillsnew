#!/usr/bin/env tsx

/**
 * Read-only. For B2+ reading/listening MCQs, measures how much the source text
 * actually helps a solver:
 *
 *   blind  — options shuffled (seeded by item id), NO text
 *   guided — options shuffled, text provided (control)
 *
 * textGap = guided − blind. Items solved blind AND with a gap of 0 do not need
 * the text. Shuffling removes position bias, so the same option TEXT must be
 * picked for a blind hit to count.
 *
 *   npx tsx scripts/jobs/scan-text-gap.ts [--limit N]
 *
 * Output: scripts/jobs/.out/text-gap.jsonl (incremental) + text-gap.json
 */

import { Type } from "@google/genai";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { runJudge, isJudgeAvailable } from "../../src/lib/ai/validation/prompt-judge.js";
import { keyIndex } from "../../src/lib/psychometrics/content-iqs.js";

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

const optText = (o: any) => (typeof o === "string" ? o : String(o?.text ?? ""));
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: { answerIndex: { type: Type.INTEGER } },
  required: ["answerIndex"],
};

async function solve(question: string, options: string[], source: string | null, kind: string): Promise<number | null> {
  const r = await withTimeout(
    runJudge<{ answerIndex: number }>({
      prompt: `${source ? `SOURCE ${kind.toUpperCase()}:\n${source}\n\n` : `The ${kind} is NOT available to you. Use only general knowledge, logic and the wording of the options.\n\n`}QUESTION: ${question}
OPTIONS:
${options.map((o, i) => `${i}. ${o}`).join("\n")}

Return "answerIndex": the 0-based index of the single best answer.`,
      responseSchema: SCHEMA,
      options: { temperature: 0 },
    }),
    40_000
  );
  return r ? r.answerIndex : null;
}

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

  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/text-gap.jsonl", "");
  const out: any[] = [];
  let cursor = 0, skipped = 0, failed = 0;

  async function worker() {
    while (cursor < items.length) {
      const it = items[cursor++];
      const c: any = it.content ?? {};
      const opts: any[] = c.options ?? [];
      const ki = keyIndex(c);
      const source = String(c.passage ?? c.ttsScript ?? c.transcript ?? c.audioScript ?? "").trim();
      if (ki < 0 || opts.length < 3 || !source) { skipped++; continue; }

      const kind = it.skill === "LISTENING" ? "recording transcript" : "passage";
      const order = seededShuffle(opts.map((_, i) => i), it.id);
      const shuffled = order.map((i) => optText(opts[i]));
      const keyPos = order.indexOf(ki);
      const question = String(c.question ?? c.stem ?? c.prompt ?? "");

      const [blind, guided] = await Promise.all([
        solve(question, shuffled, null, kind),
        solve(question, shuffled, source.slice(0, 6000), kind),
      ]);
      if (blind == null || guided == null) { failed++; continue; }

      const row = {
        id: it.id, itemCode: it.itemCode, skill: it.skill, cefr: it.cefrLevel,
        question: question.slice(0, 160),
        blindOk: blind === keyPos, guidedOk: guided === keyPos,
      };
      out.push(row);
      appendFileSync("scripts/jobs/.out/text-gap.jsonl", JSON.stringify(row) + "\n");
      if (out.length % 25 === 0) console.log(`  progress ${out.length}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  writeFileSync("scripts/jobs/.out/text-gap.json", JSON.stringify(out, null, 2));

  const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");
  console.log(`items=${items.length} scored=${out.length} skipped(no text/key)=${skipped} failed=${failed}`);
  console.log(`blind(shuffled) correct: ${pct(out.filter((r) => r.blindOk).length, out.length)}`);
  console.log(`guided (with text) correct: ${pct(out.filter((r) => r.guidedOk).length, out.length)}`);
  const noNeed = out.filter((r) => r.blindOk && r.guidedOk).length;
  const needs = out.filter((r) => !r.blindOk && r.guidedOk).length;
  const guidedWrong = out.filter((r) => !r.guidedOk).length;
  console.log(`text NOT needed (blind ok & guided ok): ${pct(noNeed, out.length)}`);
  console.log(`text helps (blind wrong, guided ok):     ${pct(needs, out.length)}`);
  console.log(`guided WRONG (key may be wrong/ambiguous): ${pct(guidedWrong, out.length)}`);
  for (const sk of ["READING", "LISTENING"]) for (const cf of ["B2", "C1", "C2"]) {
    const rows = out.filter((r) => r.skill === sk && r.cefr === cf);
    console.log(`  ${sk}/${cf}`.padEnd(16), `no-need ${pct(rows.filter((r) => r.blindOk && r.guidedOk).length, rows.length)}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
