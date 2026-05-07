/**
 * One-time patch: fix mismatched / spurious imageUrl values in Item content JSON.
 *
 * Run with:
 *   npx tsx scripts/patch-vocab-image-urls.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Items that need a CORRECT imageUrl (visual prompts with previously recycled wrong URL)
const VISUAL_FIXES: Array<{ prompt: string; imageUrl: string }> = [
  {
    prompt: "Look at the picture. The animal is a ___.",
    imageUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80&fit=crop&auto=format",
  },
  {
    prompt: "In the image, people are in a ___.",
    imageUrl:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&fit=crop&auto=format",
  },
  {
    prompt: "The picture shows a sunny ___. (time of day)",
    imageUrl:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80&fit=crop&auto=format",
  },
  {
    prompt: "In the image, the building looks like a ___.",
    imageUrl:
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80&fit=crop&auto=format",
  },
  {
    prompt: "The picture shows people playing a team ___.",
    imageUrl:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&fit=crop&auto=format",
  },
  {
    prompt: "In the picture, a person is holding a ___. to paint on paper.",
    imageUrl:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&fit=crop&auto=format",
  },
];

// Text-based items that should NOT have an imageUrl (remove the key entirely)
const IMAGE_REMOVALS: string[] = [
  "We should protect the ___. (world around us)",
  "I need to ___ early tomorrow.",
  "Cars can cause air ___.",
  "Public speaking can ___ your confidence if you practice.",
  "Factories sometimes ___ the river.",
  "If you break the rules, there will be ___.",
  "Good feedback can increase a learner's ___.",
  "We put bottles in the bin to ___. them.",
  "The doctor could not ___ flu without a test.",
  "We should ___ water during dry weather.",
  "This factor alone could ___ half of the difference we observed.",
  "In this debate, ___. and theory should both be on the table.",
];

async function main() {
  let fixed = 0;
  let removed = 0;
  let notFound = 0;

  // 1. Fix visual items: set correct imageUrl
  for (const { prompt, imageUrl } of VISUAL_FIXES) {
    const result = await prisma.$executeRaw`
      UPDATE "Item"
      SET content = jsonb_set(content, '{imageUrl}', ${JSON.stringify(imageUrl)}::jsonb)
      WHERE content->>'prompt' = ${prompt}
        AND content->>'imageUrl' = 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop&auto=format'
    `;
    if (result > 0) {
      console.log(`✅ Fixed imageUrl for: "${prompt.slice(0, 60)}..." (${result} row(s))`);
      fixed += result;
    } else {
      // May already be fixed or never had wrong URL – check without URL filter
      const any = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Item" WHERE content->>'prompt' = ${prompt} LIMIT 1
      `;
      if (any.length === 0) {
        console.warn(`⚠️  Item not found in DB: "${prompt.slice(0, 60)}..."`);
        notFound++;
      } else {
        console.log(`ℹ️  Already patched or different URL: "${prompt.slice(0, 60)}..."`);
      }
    }
  }

  // 2. Remove imageUrl from text-based items
  for (const prompt of IMAGE_REMOVALS) {
    const result = await prisma.$executeRaw`
      UPDATE "Item"
      SET content = content - 'imageUrl'
      WHERE content->>'prompt' = ${prompt}
        AND content ? 'imageUrl'
    `;
    if (result > 0) {
      console.log(`🗑️  Removed imageUrl from: "${prompt.slice(0, 60)}..." (${result} row(s))`);
      removed += result;
    } else {
      const any = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Item" WHERE content->>'prompt' = ${prompt} LIMIT 1
      `;
      if (any.length === 0) {
        console.warn(`⚠️  Item not found in DB: "${prompt.slice(0, 60)}..."`);
        notFound++;
      } else {
        console.log(`ℹ️  imageUrl already absent: "${prompt.slice(0, 60)}..."`);
      }
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Removed: ${removed}, Not found: ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
