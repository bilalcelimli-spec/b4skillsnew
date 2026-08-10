/**
 * scripts/flag-easy-items.ts
 *
 * Flags items that are statistically too easy or have concerning distractor
 * patterns based on response data. No external API required.
 *
 * ETS standard: p-value > 0.85 → item is too easy and should be revised.
 * Cambridge standard: p-value > 0.90 → RETIRE or revise.
 *
 * Usage:
 *   npx tsx scripts/flag-easy-items.ts [--dry-run] [--p-max 0.85] [--min-n 20]
 *
 * Options:
 *   --dry-run     Report without modifying DB (default: false)
 *   --p-max N     Flag items with p-value > N (default: 0.85)
 *   --min-n N     Minimum responses to calculate p-value (default: 20)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const P_MAX = (() => {
  const i = args.indexOf("--p-max");
  return i !== -1 ? parseFloat(args[i + 1]) : 0.85;
})();
const MIN_N = (() => {
  const i = args.indexOf("--min-n");
  return i !== -1 ? parseInt(args[i + 1]) : 20;
})();

async function main() {
  console.log(`\n📊 Statistical Item Flagging (ETS/Cambridge standards)`);
  console.log(`   p-value threshold:  > ${P_MAX}`);
  console.log(`   Min responses:      ${MIN_N}`);
  console.log(`   Mode:               ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  // Load active items with their response data
  const items = await prisma.item.findMany({
    where: { status: { in: ["ACTIVE", "PRETEST"] }, type: "MULTIPLE_CHOICE" },
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      content: true,
      tags: true,
      responses: {
        select: { value: true },
        take: 500,
      },
    },
  });

  console.log(`📦 Loaded ${items.length} active MULTIPLE_CHOICE items`);

  const toFlag: Array<{ id: string; skill: string; level: string; pValue: number; n: number; reason: string }> = [];

  for (const item of items) {
    const responses = item.responses;
    if (responses.length < MIN_N) continue;

    const content = item.content as any;
    const correctIndex = content?.correctIndex as number | undefined;
    const correctId = content?.options?.find?.((o: any) => o?.isCorrect)?.id;

    if (correctIndex === undefined && !correctId) continue;

    const correct = responses.filter((r) => {
      const val = r.value as any;
      if (correctId) return val === correctId || val?.id === correctId;
      return val === correctIndex || val?.selectedIndex === correctIndex || val?.index === correctIndex;
    }).length;

    const pValue = correct / responses.length;

    if (pValue > P_MAX) {
      const reason = pValue > 0.90
        ? `p=${pValue.toFixed(3)} > 0.90 → RETIRE candidate (Cambridge threshold)`
        : `p=${pValue.toFixed(3)} > ${P_MAX} → too easy, revise distractors (ETS threshold)`;
      toFlag.push({ id: item.id, skill: item.skill, level: item.cefrLevel, pValue, n: responses.length, reason });
    }
  }

  console.log(`\n⚠️  ${toFlag.length} items flagged as too easy:\n`);

  if (toFlag.length > 0) {
    // Sort by p-value descending
    toFlag.sort((a, b) => b.pValue - a.pValue);
    const table = toFlag.slice(0, 30).map((f) => ({
      skill: f.skill,
      level: f.level,
      p: f.pValue.toFixed(3),
      n: f.n,
      reason: f.reason.split(" → ")[0],
    }));
    console.table(table);
    if (toFlag.length > 30) console.log(`  ... and ${toFlag.length - 30} more`);
  }

  if (!DRY_RUN && toFlag.length > 0) {
    console.log("\n💾 Updating database...");
    let updated = 0;
    for (const f of toFlag) {
      const item = items.find((i) => i.id === f.id)!;
      const currentTags = (item.tags as string[]) ?? [];
      const newTag = f.pValue > 0.90 ? "P_VALUE_TOO_HIGH_RETIRE" : "P_VALUE_TOO_HIGH";
      if (currentTags.includes(newTag)) continue;
      await prisma.item.update({
        where: { id: f.id },
        data: {
          tags: [...currentTags, newTag],
          status: f.pValue > 0.90 ? "REVIEW" : undefined,
        },
      });
      updated++;
    }
    console.log(`✅ Tagged ${updated} items (p>0.90 items moved to REVIEW)`);
  }

  // Summary stats
  const bySkill: Record<string, number> = {};
  for (const f of toFlag) {
    bySkill[f.skill] = (bySkill[f.skill] ?? 0) + 1;
  }
  if (Object.keys(bySkill).length > 0) {
    console.log("\nFlagged by skill:");
    Object.entries(bySkill).sort(([, a], [, b]) => b - a).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  }

  console.log("\nDone.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
