#!/usr/bin/env tsx

/**
 * Backfills subskill / construct / evidenceStatement / cognitive demand on
 * existing items using an LLM judge constrained to the controlled taxonomy.
 *
 *   npx tsx scripts/jobs/backfill-taxonomy.ts                 # dry-run, 20 items
 *   npx tsx scripts/jobs/backfill-taxonomy.ts --limit 200     # dry-run, 200 items
 *   npx tsx scripts/jobs/backfill-taxonomy.ts --all --apply   # write to DB
 *
 * Dry-run writes proposals to scripts/jobs/.out/taxonomy-proposals.json.
 * --apply only fills fields that are currently null; it never overwrites.
 */

import { Type } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { runJudge, isJudgeAvailable } from "../../src/lib/ai/validation/prompt-judge.js";
import { SUBSKILLS_BY_SKILL } from "../../src/lib/content-factory/blueprint.js";

const COGNITIVE_DEMANDS = [
  "RECOGNITION",
  "EXPLICIT_DETAIL",
  "MAIN_IDEA",
  "SIMPLE_INFERENCE",
  "INFERENCE",
  "WRITER_STANCE_OR_IMPLICATION",
  "SYNTHESIS_OR_EVALUATION",
  "PRODUCTION",
] as const;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ALL = args.includes("--all");
const limitIdx = args.indexOf("--limit");
const LIMIT = ALL ? undefined : limitIdx >= 0 ? Number(args[limitIdx + 1]) : 20;
const CONCURRENCY = 4;

interface Proposal {
  subskill: string;
  construct: string;
  evidenceStatement: string;
  cognitiveDemand: (typeof COGNITIVE_DEMANDS)[number];
  confidence: number;
}

function itemText(content: any): string {
  const c = content ?? {};
  const opts = (c.options ?? [])
    .map((o: any, i: number) => {
      const t = typeof o === "string" ? o : o?.text;
      return `${String.fromCharCode(65 + i)}. ${t}${o?.isCorrect ? "  [KEY]" : ""}`;
    })
    .join("\n");
  const passage = String(c.passage ?? c.ttsScript ?? c.transcript ?? "").slice(0, 1500);
  return [
    passage && `TEXT:\n${passage}`,
    `QUESTION: ${c.question ?? c.stem ?? c.prompt ?? ""}`,
    opts && `OPTIONS:\n${opts}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function classify(item: {
  id: string;
  skill: string;
  cefrLevel: string;
  type: string;
  content: unknown;
}): Promise<Proposal | null> {
  const allowed = SUBSKILLS_BY_SKILL[item.skill] ?? [];
  if (!allowed.length) return null;

  const result = await runJudge<Proposal>({
    prompt: `Classify this ${item.skill} item (labelled ${item.cefrLevel}, type ${item.type}) against the controlled taxonomy.
Judge what the item ACTUALLY measures, not what its label claims.

${itemText(item.content)}

Choose "subskill" from: ${allowed.join(", ")}
Choose "cognitiveDemand" from: ${COGNITIVE_DEMANDS.join(", ")}
"construct": short noun phrase, e.g. "Reading for inference".
"evidenceStatement": one sentence — what a correct response proves about the candidate.
"confidence": 0–1 for the subskill choice.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        subskill: { type: Type.STRING, enum: [...allowed] },
        construct: { type: Type.STRING },
        evidenceStatement: { type: Type.STRING },
        cognitiveDemand: { type: Type.STRING, enum: [...COGNITIVE_DEMANDS] },
        confidence: { type: Type.NUMBER },
      },
      required: ["subskill", "construct", "evidenceStatement", "cognitiveDemand", "confidence"],
    },
    options: { temperature: 0.1 },
  });

  if (!result || !allowed.includes(result.subskill)) return null;
  return result;
}

async function main() {
  if (!isJudgeAvailable()) {
    console.error("GEMINI_API_KEY is not set — cannot run the classifier.");
    process.exit(1);
  }

  const items = await prisma.item.findMany({
    where: { status: "ACTIVE" as any, OR: [{ subskill: null }, { construct: null }] },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, type: true, content: true, subskill: true, construct: true, evidenceStatement: true, metadata: true },
    orderBy: { id: "asc" },
    take: LIMIT,
  });
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${items.length} items to classify`);

  const proposals: Array<{ id: string; itemCode: string | null; skill: string; cefr: string; proposal: Proposal }> = [];
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      const proposal = await classify(item);
      if (!proposal) { failed++; continue; }
      proposals.push({ id: item.id, itemCode: item.itemCode, skill: item.skill, cefr: item.cefrLevel, proposal });

      if (APPLY) {
        const meta = (item.metadata as Record<string, unknown> | null) ?? {};
        await prisma.item.update({
          where: { id: item.id },
          data: {
            ...(item.subskill == null && { subskill: proposal.subskill }),
            ...(item.construct == null && { construct: proposal.construct }),
            ...(item.evidenceStatement == null && { evidenceStatement: proposal.evidenceStatement }),
            metadata: {
              ...meta,
              cognitiveDemand: proposal.cognitiveDemand,
              taxonomyBackfill: { at: new Date().toISOString(), confidence: proposal.confidence },
            } as any,
          },
        });
      }
      if (proposals.length % 25 === 0) console.log(`  ${proposals.length}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  mkdirSync("scripts/jobs/.out", { recursive: true });
  writeFileSync("scripts/jobs/.out/taxonomy-proposals.json", JSON.stringify(proposals, null, 2));

  const demandByCefr: Record<string, Record<string, number>> = {};
  for (const p of proposals) {
    const row = (demandByCefr[p.cefr] ??= {});
    row[p.proposal.cognitiveDemand] = (row[p.proposal.cognitiveDemand] ?? 0) + 1;
  }
  console.log(`classified=${proposals.length} failed=${failed} lowConfidence(<0.6)=${proposals.filter((p) => p.proposal.confidence < 0.6).length}`);
  console.log("cognitiveDemand by CEFR:", JSON.stringify(demandByCefr, null, 1));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
