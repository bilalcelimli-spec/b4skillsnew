#!/usr/bin/env tsx
/**
 * Pretest calibration progress (read only).
 *
 *   npm run report:pretest-progress                      # Markdown to stdout
 *   npm run report:pretest-progress -- --window 14       # recent window in days (default 30)
 *   npm run report:pretest-progress -- --out reports/pretest-progress.md
 *   npm run report:pretest-progress -- --json            # one row per item
 *
 * For every item in the pretest pool (status PRETEST, or ACTIVE with
 * isPretest) it reports which product lines can serve it under the live
 * delivery rule, how many pretest responses it has (all time and in the
 * recent window), and its stage against CALIBRATION_POLICY thresholds
 * (estimate n ≥ 80, publish n ≥ 200). Items no product line can serve
 * never collect responses and are listed separately.
 *
 * Writes nothing to the database.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildPretestProgress, renderProgressMarkdown, type PretestItem, type ResponseCounts } from "../../src/lib/calibration/pretest-progress.js";
import { resolveProfileName } from "../../src/lib/product-lines/profiles.js";
import { CALIBRATION_POLICY } from "../../src/lib/psychometrics/calibration-policy.js";

const argOf = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const windowDays = Math.max(1, Number(argOf("--window") ?? 30) || 30);
const outPath = argOf("--out");
const asJson = process.argv.includes("--json");

async function main() {
  const db = new PrismaClient();
  try {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const items = await db.item.findMany({
      where: { OR: [{ status: "PRETEST" }, { status: "ACTIVE", isPretest: true }] },
      select: {
        id: true, itemCode: true, skill: true, cefrLevel: true, status: true, isPretest: true,
        discrimination: true, guessing: true, tags: true, content: true, ageSuitability: true,
      },
    });
    const ids = items.map((item) => item.id);
    const [allTime, recent, sessions] = await Promise.all([
      db.response.groupBy({ by: ["itemId"], where: { isPretest: true, itemId: { in: ids } }, _count: { id: true } }),
      db.response.groupBy({ by: ["itemId"], where: { isPretest: true, itemId: { in: ids }, createdAt: { gte: since } }, _count: { id: true } }),
      db.session.findMany({ where: { status: "COMPLETED", completedAt: { gte: since } }, select: { metadata: true }, take: 50_000 }),
    ]);

    const counts = new Map<string, ResponseCounts>();
    for (const row of allTime) counts.set(row.itemId, { total: row._count.id, recent: 0 });
    for (const row of recent) counts.set(row.itemId, { total: counts.get(row.itemId)?.total ?? row._count.id, recent: row._count.id });

    const sessionsByProfile: Record<string, number> = {};
    for (const session of sessions) {
      const name = resolveProfileName((session.metadata as { productLine?: string } | null)?.productLine) ?? "Unknown";
      sessionsByProfile[name] = (sessionsByProfile[name] ?? 0) + 1;
    }

    const thresholds = { estimateMinN: CALIBRATION_POLICY.estimateMinN, publishMinN: CALIBRATION_POLICY.publishMinN, windowDays };
    const rows = buildPretestProgress(items as unknown as PretestItem[], counts, thresholds);
    const output = asJson
      ? JSON.stringify({ generatedAt: new Date().toISOString(), thresholds, sessionsByProfile, rows }, null, 2) + "\n"
      : renderProgressMarkdown(rows, thresholds, sessionsByProfile, new Date());

    if (outPath) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, output);
      console.log(`Wrote ${outPath} (${rows.length} pretest items).`);
    } else {
      process.stdout.write(output);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
