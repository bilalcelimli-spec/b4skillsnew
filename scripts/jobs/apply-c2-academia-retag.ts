#!/usr/bin/env tsx
/**
 * Moves the two C2 rubric items that no product line could serve from
 * Language Schools (CEFR range stops below C2) to Academia (2026-11-22,
 * docs/quality/rubric-item-activation-2026-11.md).
 *
 *   npx tsx scripts/jobs/apply-c2-academia-retag.ts            # dry run
 *   npx tsx scripts/jobs/apply-c2-academia-retag.ts --apply    # writes it, in one transaction
 *
 * The `language-schools` tag becomes `academia` and content.productLine
 * becomes "academia". Status, pretest flag and pipeline stage are not
 * touched: the items still need the four editorial approvals before pilot
 * promotion makes them ACTIVE. Previous tags and productLine are kept under
 * metadata.retag. Items with review records are skipped, because a tag change
 * invalidates the reviewed content hash.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { isAdaptiveEligible } from "../../src/lib/assessment-engine/adaptive-policy.js";
import { PRODUCT_LINE_PROFILES } from "../../src/lib/product-lines/profiles.js";
import type { SkillType } from "../../src/lib/assessment-engine/types.js";

const RETAG_ID = "c2-academia-retag-2026-11-22";
const FROM_TAG = "language-schools";
const TO_TAG = "academia";

export const RETAGS = [
  {
    itemCode: "SPK-C2-0009",
    reviewNote: "Asks the candidate to discuss 'with the examiner', but speaking is a recorded monologue scored without an interlocutor. Reword as a monologue before approving.",
  },
  {
    itemCode: "WRT-C2-0010",
    reviewNote: "Creative epistolary fiction (280–380 words) is outside Academia's academic writing tasks (extended response 220–280 words). Confirm the construct fits Academia, or reword as an academic task, before approving.",
  },
] as const;

export interface RetagItem {
  skill: string;
  cefrLevel: string;
  discrimination: number;
  guessing: number;
  tags: string[];
  content: Record<string, unknown>;
  ageSuitability?: string | null;
}

/** New tags and content for an item, or null when it carries no Language Schools source. */
export function retagged(item: Pick<RetagItem, "tags" | "content">): { tags: string[]; content: Record<string, unknown> } | null {
  const fromProductLine = typeof item.content.productLine === "string" && /^language[ -]schools$/i.test(item.content.productLine);
  if (!item.tags.includes(FROM_TAG) && !fromProductLine) return null;
  const tags = [...new Set(item.tags.map((tag) => (tag === FROM_TAG ? TO_TAG : tag)))];
  if (!tags.includes(TO_TAG)) tags.push(TO_TAG);
  return { tags, content: { ...item.content, productLine: TO_TAG } };
}

/** Would Academia serve this item once it is ACTIVE and no longer flagged pretest? */
export function academiaServes(item: RetagItem): boolean {
  return isAdaptiveEligible({ ...item, status: "ACTIVE", isPretest: false }, PRODUCT_LINE_PROFILES["Academia"], item.skill as SkillType);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient();
  try {
    const items = await db.item.findMany({
      where: { itemCode: { in: RETAGS.map((r) => r.itemCode) } },
      include: { _count: { select: { itemReviews: true } } },
    });
    const updates: { id: string; data: Prisma.ItemUpdateInput }[] = [];
    let failed = 0;
    for (const retag of RETAGS) {
      const item = items.find((i) => i.itemCode === retag.itemCode);
      if (!item) { console.log(`SKIP  ${retag.itemCode}: not found`); continue; }
      if (item._count.itemReviews > 0) { console.log(`SKIP  ${retag.itemCode}: has review records; a tag change would void them`); continue; }
      const content = (item.content ?? {}) as Record<string, unknown>;
      const next = retagged({ tags: item.tags, content });
      if (!next) { console.log(`SKIP  ${retag.itemCode}: no Language Schools source (tags ${item.tags.join(", ")})`); continue; }
      const view = { ...item, tags: next.tags, content: next.content } as unknown as RetagItem;
      if (!academiaServes(view)) { failed++; console.log(`FAIL  ${retag.itemCode}: Academia would still not serve it`); continue; }
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      console.log(`RETAG ${retag.itemCode} (${item.skill} ${item.cefrLevel}, ${item.status}${item.isPretest ? " + pretest" : ""})`);
      console.log(`      tags ${item.tags.join(", ")} → ${next.tags.join(", ")}; productLine ${String(content.productLine)} → ${TO_TAG}`);
      console.log(`      reviewer note: ${retag.reviewNote}`);
      updates.push({
        id: item.id,
        data: {
          tags: next.tags,
          content: next.content as Prisma.InputJsonValue,
          metadata: { ...metadata, retag: { id: RETAG_ID, retaggedAt: new Date().toISOString(), previous: { tags: item.tags, productLine: content.productLine ?? null }, reviewNote: retag.reviewNote } } as Prisma.InputJsonValue,
        },
      });
    }
    console.log(`\n${updates.length} to retag for Academia, ${failed} failing.`);
    if (failed) { process.exitCode = 1; return; }
    if (!apply) { console.log("\nDry run. Pass --apply to write these changes."); return; }
    await db.$transaction(updates.map((u) => db.item.update({ where: { id: u.id }, data: u.data })));
    console.log(`\nApplied ${updates.length} changes (${RETAG_ID}).`);
  } finally {
    await db.$disconnect();
  }
}

// Run only when executed directly, so tests can import the helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
