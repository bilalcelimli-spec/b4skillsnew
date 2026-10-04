#!/usr/bin/env tsx

/**
 * Fills missing item embeddings (gemini-embedding-001, 768 dims) so semantic
 * duplicate screening has something to compare against. Only rows whose
 * embeddingVec is null are written.
 *
 *   npx tsx scripts/jobs/backfill-embeddings.ts [--limit 20]
 */

import { backfillEmbeddings } from "../../src/lib/content-factory/duplicate-detector.js";
import { prisma } from "../../src/lib/prisma.js";

const i = process.argv.indexOf("--limit");
const limit = i >= 0 ? Number(process.argv[i + 1]) : 10_000;

async function main() {
  const t0 = Date.now();
  const r = await backfillEmbeddings(undefined, undefined, limit, 4);
  const rows: Array<{ t: string | null; n: number }> = await prisma.$queryRawUnsafe(
    `SELECT jsonb_typeof("embeddingVec"::jsonb) AS t, COUNT(*)::int AS n FROM "Item" GROUP BY 1 ORDER BY 2 DESC`
  );
  console.log(`processed=${r.processed} failed=${r.failed} skippedEmpty=${r.skippedEmpty} in ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log("embeddingVec by type:", JSON.stringify(rows));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
