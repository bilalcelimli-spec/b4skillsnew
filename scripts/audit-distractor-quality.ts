/**
 * audit-distractor-quality.ts
 *
 * Evaluates every distractor in MULTIPLE_CHOICE items using Gemini.
 * A good distractor must:
 *   1. Represent a plausible learner error (grammar, vocab, logic)
 *   2. Be clearly wrong for a competent speaker at the target CEFR level
 *   3. Not overlap with the correct answer in meaning
 *   4. Match the grammatical form of the correct answer
 *   5. Not be "obviously" wrong (too different in length, register, etc.)
 *
 * Scoring:
 *   Each distractor receives a score 0-100:
 *     ≥ 80 → GOOD
 *     60-79 → ACCEPTABLE
 *     < 60 → POOR (flagged for revision)
 *
 * Output:
 *   - Console table with flagged distractors
 *   - JSON report: logs/distractor-quality-YYYY-MM-DD.json
 *   - Optionally writes `metadata.distractorQuality` to each flagged item
 *
 * Usage:
 *   npx tsx scripts/audit-distractor-quality.ts
 *   SKILL=VOCABULARY npx tsx scripts/audit-distractor-quality.ts
 *   LEVEL=B2 npx tsx scripts/audit-distractor-quality.ts
 *   FIX=1   npx tsx scripts/audit-distractor-quality.ts  # write quality to DB
 *   THRESHOLD=70 npx tsx scripts/audit-distractor-quality.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SKILL_FILTER  = process.env.SKILL?.toUpperCase();
const LEVEL_FILTER  = process.env.LEVEL?.toUpperCase();
const FIX           = process.env.FIX === "1";
const DELAY_MS      = parseInt(process.env.DELAY_MS ?? "1200", 10);
const THRESHOLD     = parseInt(process.env.THRESHOLD ?? "60", 10);
const DRY_RUN       = process.env.DRY_RUN === "1";

const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const reportPath = path.join(LOG_DIR, `distractor-quality-${new Date().toISOString().slice(0, 10)}.json`);
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// Gemini rubric
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a Principal Item Writer at Cambridge Assessment English with 20 years of
experience developing multiple-choice items for language proficiency tests.

Your task is to evaluate the quality of DISTRACTORS (wrong answer options) in a
multiple-choice language test item.

A HIGH-QUALITY distractor:
  1. Represents a plausible, specific learner error at the target CEFR level
  2. Is clearly wrong for a competent speaker — cannot be argued as correct
  3. Shares the grammatical category and sentence slot with the correct answer
  4. Has similar surface length/register to the correct answer
  5. Tests one specific construct (grammar, vocabulary, collocations, etc.)
  6. Would attract wrong answers predictably — discriminates between learners

A POOR distractor:
  - Is obviously wrong (very different length, unrelated word class, nonsense)
  - Could be argued as partially correct by advanced learners
  - Duplicates the meaning of another option
  - Does not reflect any real learner error pattern

Respond ONLY with a JSON object matching this exact schema, no markdown:
{
  "distractors": [
    {
      "text": "<distractor text>",
      "score": <integer 0-100>,
      "grade": "GOOD|ACCEPTABLE|POOR",
      "errorType": "<grammar|vocabulary|collocation|register|form|logic|other>",
      "comment": "<one sentence: what learner error it targets, OR why it fails>"
    }
  ],
  "overallItemQuality": <integer 0-100>,
  "revisionSuggested": <boolean>
}
`.trim();

interface DistractorResult {
  text: string;
  score: number;
  grade: "GOOD" | "ACCEPTABLE" | "POOR";
  errorType: string;
  comment: string;
}

interface ItemAnalysis {
  itemId: string;
  skill: string;
  cefrLevel: string;
  prompt: string;
  correctAnswer: string;
  distractors: DistractorResult[];
  overallItemQuality: number;
  revisionSuggested: boolean;
  poorCount: number;
}

async function analyseItem(item: {
  id: string;
  skill: string;
  cefrLevel: string;
  content: Record<string, any>;
}): Promise<ItemAnalysis | null> {
  const c = item.content;
  const prompt = c.prompt ?? c.stem ?? c.question ?? "";
  const rawOptions: any[] = c.options ?? [];

  // Normalise options to { text, isCorrect }
  const options = rawOptions.map((o: any) => {
    if (typeof o === "string") return { text: o, isCorrect: false };
    return { text: String(o.text ?? o.value ?? o), isCorrect: Boolean(o.isCorrect ?? false) };
  });

  // Detect correct answer
  let correctText: string = c.correctAnswer ?? c.answer ?? "";
  if (!correctText) {
    const found = options.find(o => o.isCorrect);
    correctText = found?.text ?? "";
  }

  const distractors = options.filter(o => o.text !== correctText);
  if (distractors.length === 0) return null;

  const userPrompt = `
CEFR Level: ${item.cefrLevel}
Skill: ${item.skill}
Stem: ${prompt}
Correct answer: ${correctText}
Distractors to evaluate:
${distractors.map((d, i) => `  ${i + 1}. ${d.text}`).join("\n")}

Evaluate each distractor using the rubric.
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      topP: 0.85,
    },
  });

  let raw = (response.text ?? "").trim();
  raw = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(raw);
    const results: DistractorResult[] = (parsed.distractors ?? []).map((d: any, i: number) => ({
      text: d.text ?? distractors[i]?.text ?? "",
      score: typeof d.score === "number" ? d.score : 50,
      grade: d.grade ?? (d.score >= 80 ? "GOOD" : d.score >= 60 ? "ACCEPTABLE" : "POOR"),
      errorType: d.errorType ?? "unknown",
      comment: d.comment ?? "",
    }));

    return {
      itemId: item.id,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      prompt: prompt.slice(0, 120),
      correctAnswer: correctText,
      distractors: results,
      overallItemQuality: typeof parsed.overallItemQuality === "number" ? parsed.overallItemQuality : 60,
      revisionSuggested: Boolean(parsed.revisionSuggested),
      poorCount: results.filter(d => d.score < THRESHOLD).length,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Distractor Quality Audit (Gemini)");
  console.log("=".repeat(70));
  if (SKILL_FILTER) console.log(`  Skill:     ${SKILL_FILTER}`);
  if (LEVEL_FILTER) console.log(`  Level:     ${LEVEL_FILTER}`);
  console.log(`  Threshold: ${THRESHOLD} (below = POOR)`);
  console.log(`  FIX:       ${FIX ? "write quality metadata to DB" : "report only"}`);
  console.log(`  Report:    ${reportPath}\n`);

  const where: Record<string, any> = {
    type: "MULTIPLE_CHOICE",
    status: { in: ["ACTIVE", "PRETEST"] },
  };
  if (SKILL_FILTER) where.skill = SKILL_FILTER;
  if (LEVEL_FILTER) where.cefrLevel = LEVEL_FILTER;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, skill: true, cefrLevel: true, content: true, metadata: true },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
  });

  console.log(`  Found ${items.length} MULTIPLE_CHOICE items to analyse\n`);

  const results: ItemAnalysis[] = [];
  let analysed = 0;
  let skipped  = 0;
  let errors   = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const c = (item.content ?? {}) as Record<string, any>;
    process.stdout.write(`  [${i + 1}/${items.length}] ${item.skill}/${item.cefrLevel} ... `);

    if (DRY_RUN) {
      console.log("DRY_RUN");
      continue;
    }

    try {
      const analysis = await analyseItem({
        id: item.id,
        skill: item.skill as string,
        cefrLevel: item.cefrLevel as string,
        content: c,
      });

      if (!analysis) {
        console.log("SKIP (no distractors)");
        skipped++;
        continue;
      }

      const poorFlag = analysis.poorCount > 0 ? ` ⚠ ${analysis.poorCount} POOR` : " ✓";
      console.log(`OK (Q=${analysis.overallItemQuality}, ${analysis.distractors.length}D)${poorFlag}`);
      results.push(analysis);
      analysed++;

      // Optionally write metadata to DB
      if (FIX && analysis.revisionSuggested) {
        await prisma.item.update({
          where: { id: item.id },
          data: {
            metadata: {
              ...((item.metadata as Record<string, any>) ?? {}),
              distractorQuality: {
                auditDate: new Date().toISOString(),
                overallItemQuality: analysis.overallItemQuality,
                revisionSuggested: true,
                distractors: analysis.distractors,
              },
            } as any,
          },
        });
      }
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 60)}`);
      errors++;
    }

    if (i < items.length - 1) await sleep(DELAY_MS);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const flagged = results.filter(r => r.revisionSuggested);
  const allPoor = results.flatMap(r => r.distractors.filter(d => d.score < THRESHOLD));

  console.log("\n" + "=".repeat(70));
  console.log(`  Analysed: ${analysed}  Skipped: ${skipped}  Errors: ${errors}`);
  console.log(`  Items flagged for revision: ${flagged.length} / ${analysed}`);
  console.log(`  Total POOR distractors:     ${allPoor.length}`);

  // Quality distribution by skill
  const bySkill: Record<string, { items: number; poor: number; avgQ: number }> = {};
  for (const r of results) {
    if (!bySkill[r.skill]) bySkill[r.skill] = { items: 0, poor: 0, avgQ: 0 };
    bySkill[r.skill].items++;
    bySkill[r.skill].poor += r.poorCount;
    bySkill[r.skill].avgQ += r.overallItemQuality;
  }
  console.log("\n  Quality by skill:");
  for (const [skill, s] of Object.entries(bySkill)) {
    const avg = (s.avgQ / s.items).toFixed(0);
    console.log(`    ${skill.padEnd(12)} items=${s.items.toString().padStart(4)}  avgQ=${avg}  poorDistractors=${s.poor}`);
  }

  // Top 10 worst items
  const worst = [...results].sort((a, b) => a.overallItemQuality - b.overallItemQuality).slice(0, 10);
  if (worst.length > 0) {
    console.log("\n  TOP 10 ITEMS NEEDING REVISION:");
    for (const r of worst) {
      console.log(`    [${r.skill}/${r.cefrLevel}] Q=${r.overallItemQuality} — "${r.prompt.slice(0, 60)}"`);
      for (const d of r.distractors.filter(dd => dd.score < THRESHOLD)) {
        console.log(`      ✗ "${d.text}" (${d.score}) — ${d.comment}`);
      }
    }
  }

  // Write report
  const report = {
    generatedAt: new Date().toISOString(),
    totalAnalysed: analysed,
    flaggedForRevision: flagged.length,
    poorDistractorCount: allPoor.length,
    threshold: THRESHOLD,
    bySkill,
    items: results,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report written to: ${reportPath}`);

  if (flagged.length > 0 && !FIX) {
    console.log(`\n  To write quality metadata to DB: FIX=1 npx tsx scripts/audit-distractor-quality.ts`);
  }
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});

// ─── Statistical p-value / r_pbis audit (ETS/Cambridge standard) ─────────────
// Run independently via: STATISTICAL=1 npx tsx scripts/audit-distractor-quality.ts

if (process.env.STATISTICAL === "1") {
  (async () => {
    const MIN_N = parseInt(process.env.MIN_RESPONSES ?? "50");
    const ITEM_PBIS_MIN = 0.30;
    const DISTRACTOR_PBIS_MAX = 0.0;

    function pointBiserial(scores: number[], continuous: number[]): number {
      const n = scores.length;
      if (n < 10) return NaN;
      const mean_t = continuous.reduce((a, b) => a + b, 0) / n;
      const std_t = Math.sqrt(
        continuous.reduce((a, b) => a + Math.pow(b - mean_t, 2), 0) / n,
      );
      if (std_t === 0) return 0;
      const n1 = scores.filter((s) => s === 1).length;
      const n0 = n - n1;
      if (!n1 || !n0) return NaN;
      const p = n1 / n;
      const q = 1 - p;
      const mean_1 =
        continuous.filter((_, i) => scores[i] === 1).reduce((a, b) => a + b, 0) /
        n1;
      return ((mean_1 - mean_t) / std_t) * Math.sqrt(p / q);
    }

    const items = await prisma.item.findMany({
      where: { status: "ACTIVE", type: "MULTIPLE_CHOICE" },
      include: {
        responses: {
          select: { value: true, session: { select: { currentTheta: true } } },
        },
      },
    });

    const flags: object[] = [];
    for (const item of items) {
      const rs = item.responses.filter((r) => r.session?.currentTheta != null);
      if (rs.length < MIN_N) continue;
      const content = item.content as any;
      const opts = content?.options as any[] | undefined;
      if (!Array.isArray(opts) || opts.length < 2) continue;
      const ci: number =
        content?.correctIndex ??
        opts.findIndex((o: any) => typeof o === "object" && o?.isCorrect);
      if (ci < 0) continue;
      const thetas = rs.map((r) => r.session!.currentTheta as number);
      const isCorrect = rs.map((r) => (Number(r.value) === ci ? 1 : 0));
      const pValue = isCorrect.reduce((a, b) => a + b, 0) / isCorrect.length;
      const itemPbis = pointBiserial(isCorrect, thetas);
      if (!isNaN(itemPbis) && itemPbis < ITEM_PBIS_MIN)
        flags.push({ type: "ITEM_LOW_DISCRIMINATION", itemId: item.id, pbis: +itemPbis.toFixed(3), n: rs.length });
      if (pValue > 0.85)
        flags.push({ type: "ITEM_TOO_EASY", itemId: item.id, pValue: +pValue.toFixed(3), n: rs.length });
      for (let di = 0; di < opts.length; di++) {
        if (di === ci) continue;
        const sel = rs.map((r) => (Number(r.value) === di ? 1 : 0));
        if (sel.reduce((a, b) => a + b, 0) < 5) continue;
        const dPbis = pointBiserial(sel, thetas);
        if (!isNaN(dPbis) && dPbis >= DISTRACTOR_PBIS_MAX)
          flags.push({ type: "DISTRACTOR_POSITIVE_PBIS", itemId: item.id, distractorIndex: di, pbis: +dPbis.toFixed(3) });
      }
    }

    const outPath = `logs/pbis-audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    require("fs").mkdirSync("logs", { recursive: true });
    for (const f of flags)
      require("fs").appendFileSync(outPath, JSON.stringify(f) + "\n");
    console.log(`[pbis-audit] ${flags.length} flags → ${outPath}`);
    await prisma.$disconnect();
    process.exit(0);
  })();
}
