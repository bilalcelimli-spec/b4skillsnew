/**
 * generate-rationales.ts
 *
 * Generates item-specific distractor rationales for the ~534 GRAMMAR,
 * VOCABULARY, READING, and LISTENING items that currently have generic
 * or missing rationale text on their options.
 *
 * For each item we call Gemini Flash once with the full question context
 * and ask it to produce a JSON array of rationale strings — one per
 * option, in order. We only overwrite options where rationale is absent
 * or is still the known generic template text.
 *
 * Quality targets:
 *   - Correct option: explain WHY it is right (grammar rule, meaning, register)
 *   - Wrong options : explain specifically WHY each distractor is wrong
 *     (common learner error, false cognate, conflation of rules, etc.)
 *   - Length: 1–2 sentences, max ~200 characters, CEFR-appropriate metalanguage
 *
 * Usage:
 *   DRY_RUN=1   npx tsx scripts/generate-rationales.ts        # preview only
 *   SKILL=GRAMMAR npx tsx scripts/generate-rationales.ts      # one skill at a time
 *   LIMIT=20    npx tsx scripts/generate-rationales.ts        # cap items processed
 *   STATUS=ACTIVE npx tsx scripts/generate-rationales.ts      # only ACTIVE items
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌  GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const DRY_RUN   = process.env.DRY_RUN === "1";
const SKILL     = process.env.SKILL as string | undefined;
const LIMIT     = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const STATUS_FILTER = process.env.STATUS;   // e.g. "ACTIVE" | "PRETEST"

// ── Generic template strings to treat as "missing" ───────────────────────────

const GENERIC_PATTERNS = [
  "Satisfies the target grammar in this context",
  "Distractor: plausible but not licensed here",
  "plausible but not licensed",
  "Correct — satisfies",
];

function isGenericRationale(text: string | undefined): boolean {
  if (!text || text.trim().length < 5) return true;
  return GENERIC_PATTERNS.some((p) => text.includes(p));
}

// ── Build skill-aware prompt for Gemini ──────────────────────────────────────

type Option = { text?: string; isCorrect?: boolean; rationale?: string; id?: string };

function buildPrompt(
  skill: string,
  cefrLevel: string,
  prompt: string,
  passage: string | undefined,
  options: Option[],
): string {
  const correctIdx = options.findIndex((o) => o.isCorrect === true);
  const correctText = correctIdx >= 0 ? options[correctIdx].text : "unknown";

  const context = [
    `You are a Cambridge-certified EFL item writer reviewing a ${skill} question at ${cefrLevel} level.`,
    passage ? `\nReading/Listening context:\n"""\n${passage.slice(0, 600)}\n"""` : "",
    `\nQuestion: "${prompt}"`,
    `\nOptions (${options.length}):`,
    ...options.map((o, i) => {
      const marker = o.isCorrect ? "✓ CORRECT" : "✗ WRONG";
      return `  ${i + 1}. [${marker}] "${o.text}"`;
    }),
    `\nTask: For each option above (in the same order), write a concise rationale (1–2 sentences, max 180 chars):`,
    `  • For the CORRECT option: state the specific grammar/lexical/comprehension rule that makes it right.`,
    `  • For WRONG options: state the specific error type — e.g. subject-verb agreement, false cognate, wrong tense, misread passage, etc.`,
    `  • Use ${cefrLevel}-appropriate metalanguage.`,
    `  • Do NOT say "Distractor: plausible but not licensed here".`,
    `\nReturn ONLY a valid JSON array of exactly ${options.length} strings. No extra text.`,
    `Example format: ["rationale for opt 1", "rationale for opt 2", ...]`,
  ].join("\n");

  return context;
}

// ── Parse Gemini response — extract JSON array ────────────────────────────────

function parseRationaleArray(raw: string, expectedCount: number): string[] | null {
  // Strip markdown code fences if present
  const clean = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length === expectedCount) {
      return parsed.map(String);
    }
  } catch {
    // ignore
  }

  // Try to find [...] anywhere
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length === expectedCount) {
        return parsed.map(String);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// ── Rate-limit helper ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const skillFilter = SKILL
    ? [SKILL]
    : ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"];

  const statusFilter = STATUS_FILTER
    ? [STATUS_FILTER]
    : ["ACTIVE", "PRETEST"];

  // Load all candidate items
  const all = await prisma.item.findMany({
    where: {
      skill: { in: skillFilter as any[] },
      status: { in: statusFilter as any[] },
    },
    select: {
      id: true,
      itemCode: true,
      skill: true,
      cefrLevel: true,
      content: true,
    },
    orderBy: { status: "asc" }, // ACTIVE first
  });

  // Filter to items that actually need rationale work
  const targets = all.filter((item) => {
    const c = item.content as any;
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];
    if (opts.length === 0) return false;
    return opts.some((o) => isGenericRationale(o.rationale));
  });

  const capped = targets.slice(0, LIMIT);

  console.log(`\nSkills   : ${skillFilter.join(", ")}`);
  console.log(`Statuses : ${statusFilter.join(", ")}`);
  console.log(`Candidate items : ${targets.length}`);
  console.log(`Processing cap  : ${LIMIT === Infinity ? "none" : LIMIT}`);
  console.log(`Will process    : ${capped.length}`);
  if (DRY_RUN) console.log("⚠️  DRY RUN — no DB writes.\n");
  else         console.log();

  let updated  = 0;
  let skipped  = 0;
  let errors   = 0;

  for (let i = 0; i < capped.length; i++) {
    const item = capped[i];
    const c = item.content as any;
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];
    const passage = c.passage ?? c.text ?? c.ttsScript ?? undefined;

    const label = item.itemCode ?? item.id.slice(0, 10);
    process.stdout.write(`[${i + 1}/${capped.length}] ${label} ${item.skill} ${item.cefrLevel} … `);

    // Check if any option actually needs work (re-check per item)
    const needsWork = opts.some((o) => isGenericRationale(o.rationale));
    if (!needsWork) {
      process.stdout.write("OK (all rationales present)\n");
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      const missingCount = opts.filter((o) => isGenericRationale(o.rationale)).length;
      process.stdout.write(`[DRY RUN] ${missingCount}/${opts.length} options need rationale\n`);
      updated++;
      continue;
    }

    try {
      const prompt = buildPrompt(
        item.skill,
        item.cefrLevel,
        String(c.prompt ?? c.stem ?? ""),
        typeof passage === "string" ? passage : undefined,
        opts,
      );

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 },
      });

      const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const rationales = parseRationaleArray(raw, opts.length);

      if (!rationales) {
        process.stdout.write(`✗ PARSE ERROR (${opts.length} expected)\n`);
        console.log(`  Raw: ${raw.slice(0, 200)}`);
        errors++;
        await sleep(1000);
        continue;
      }

      // Merge: only overwrite options that are missing/generic
      const updatedOpts = opts.map((o, idx) => {
        if (isGenericRationale(o.rationale)) {
          return { ...o, rationale: rationales[idx] };
        }
        return o; // keep existing specific rationale
      });

      await prisma.item.update({
        where: { id: item.id },
        data: { content: { ...c, options: updatedOpts } },
      });

      process.stdout.write(`✅ (${opts.length} options)\n`);
      updated++;
      await sleep(800); // ~75 req/min safety margin for Flash
    } catch (err: any) {
      process.stdout.write(`✗ ERROR: ${err.message}\n`);
      errors++;
      await sleep(2000);
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log(`Updated : ${updated}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Errors  : ${errors}`);
  console.log("══════════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
