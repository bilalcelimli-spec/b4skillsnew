/**
 * Seeds 200 SOTA multiple-choice VOCABULARY items (CEFR-banded, product-line tags, optional imageUrl for young-learner rows).
 *
 *   npx tsx scripts/seed-vocab-200-sota.ts
 *   DRY_RUN=1 npx tsx scripts/seed-vocab-200-sota.ts
 *   FORCE=1 npx tsx scripts/seed-vocab-200-sota.ts
 *
 * Regenerate stems: `node scripts/data/vocab-200.build.mjs` → `scripts/data/vocab-synthetic-200.ts`
 */
import "dotenv/config";
import { PrismaClient, CefrLevel } from "@prisma/client";
import { VOCAB_SYNTHETIC_200, type VocabStem } from "./data/vocab-synthetic-200.js";

const prisma = new PrismaClient();
const SEED_TAG = "seed-vocab-200-sota";

function irtA(cefr: CefrLevel): number {
  if (cefr === "PRE_A1" || cefr === "A1") return 0.9;
  if (cefr === "A2" || cefr === "B1") return 1.1;
  if (cefr === "B2" || cefr === "C1") return 1.25;
  return 1.4;
}

/** Rotate A–D for balanced key position. */
function toContent(stem: VocabStem, pos: number) {
  const all = [stem.correct, stem.wrong[0], stem.wrong[1], stem.wrong[2]] as const;
  const slot = pos % 4;
  const base = {
    prompt: stem.prompt,
    options: [0, 1, 2, 3].map((ui) => {
      const src = (ui - slot + 4) % 4;
      const text = all[src]!;
      return {
        text,
        isCorrect: src === 0,
        rationale:
          src === 0
            ? "Target item: felicitous lexical choice in this context (collocation, register, or single-word fit)."
            : "Distractor: same word class or plausible in related contexts, but not licensed here.",
      };
    }),
  };
  if (stem.imageUrl) {
    return { ...base, imageUrl: stem.imageUrl };
  }
  return base;
}

async function main() {
  if (process.env.DRY_RUN === "1") {
    const n = VOCAB_SYNTHETIC_200.length;
    console.log("DRY_RUN: would insert", n, "items (expected 200)");
    process.exit(n === 200 ? 0 : 1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const existing = await prisma.item.count({ where: { tags: { has: SEED_TAG } } });
  if (existing > 0 && !process.env.FORCE) {
    console.log(`Skip: ${existing} items already tagged ${SEED_TAG}. Set FORCE=1 to re-seed.`);
    return;
  }
  if (process.env.FORCE && existing > 0) {
    await prisma.item.deleteMany({ where: { tags: { has: SEED_TAG } } });
    console.log(`Removed ${existing} previous ${SEED_TAG} items.`);
  }
  if (VOCAB_SYNTHETIC_200.length !== 200) {
    console.error("Expected 200 items in VOCAB_SYNTHETIC_200, got", VOCAB_SYNTHETIC_200.length);
    process.exit(1);
  }
  let n = 0;
  for (const stem of VOCAB_SYNTHETIC_200) {
    const a = irtA(stem.cefr);
    const content = toContent(stem, n);
    await prisma.item.create({
      data: {
        type: "MULTIPLE_CHOICE",
        skill: "VOCABULARY",
        cefrLevel: stem.cefr,
        difficulty: stem.b,
        discrimination: a,
        guessing: 0.2,
        tags: [stem.pl, `vocab:${stem.topic}`, SEED_TAG, `disc:${a.toFixed(2)}`],
        status: "ACTIVE",
        content,
      },
    });
    n++;
  }
  console.log(`Seed complete: 200 VOCABULARY items (${SEED_TAG})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
