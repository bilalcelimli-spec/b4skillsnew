#!/usr/bin/env tsx
/**
 * Read-only. Faz 1 triage of the coverage gaps: for every product × skill ×
 * CEFR cell below `sectionConfig.minItems` (the `verify:coverage` rule), what
 * would close it?
 *
 *   POLICY        the shared general core (items with no product source) would
 *                 close it if the profile could draw on it (decision a)
 *   QUEUE         PRETEST / REVIEW / DRAFT items already written for the cell
 *   POLICY+QUEUE  both together
 *   CONTENT       new items are needed even then
 *
 * Primary (7-10) never draws on the general core in this analysis: adult
 * items are not written for 7-year-olds.
 *
 *   npx tsx scripts/jobs/phase1-gap-triage.ts [--out scripts/jobs/.out/phase1]
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PRODUCT_LINE_PROFILES, type ProductLineProfile } from "../../src/lib/product-lines/profiles.js";
import { isAdaptiveEligible, isGeneralCoreItem, type AdaptiveEligibilityItem } from "../../src/lib/assessment-engine/adaptive-policy.js";
import { profileLevels } from "../../src/lib/content-factory/bank-capacity.js";
import { SkillType } from "../../src/lib/assessment-engine/types.js";

const i = process.argv.indexOf("--out");
const OUT = i >= 0 ? process.argv[i + 1]! : "scripts/jobs/.out/phase1";
const QUEUE = ["PRETEST", "REVIEW", "DRAFT"] as const;

type Row = AdaptiveEligibilityItem & { id: string; itemCode: string | null; status: string };

function liveEligible(item: Row, profile: ProductLineProfile, skill: string, asLive: boolean): boolean {
  const view = asLive ? { ...item, status: "ACTIVE", isPretest: false } : item;
  return isAdaptiveEligible(view, profile, skill as SkillType);
}

/** Eligible under decision (a): own pool, or the general core with the profile's age exclusions. */
function coreEligible(item: Row, profile: ProductLineProfile, skill: string, asLive: boolean): boolean {
  if (liveEligible(item, profile, skill, asLive)) return true;
  if (profile.name === "Primary (7-10)" || !isGeneralCoreItem(item)) return false;
  return liveEligible(item, { ...profile, examSources: ["general"] }, skill, asLive);
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows: Row[] = (await db.item.findMany({
      where: { status: { in: ["ACTIVE", ...QUEUE] }, isSuspended: false, isCompromised: false },
      select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, isPretest: true,
        discrimination: true, guessing: true, tags: true, content: true },
    })).map((r) => ({ ...r, content: r.content as unknown }));
    const active = rows.filter((r) => r.status === "ACTIVE" && !r.isPretest);
    const queue = rows.filter((r) => !(r.status === "ACTIVE" && !r.isPretest));

    const cells = [];
    for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
      for (const skill of profile.sectionOrder.map(String)) {
        const need = profile.sectionConfig[skill]?.minItems ?? 1;
        for (const cefr of profileLevels(profile)) {
          const at = (r: Row) => r.skill === skill && r.cefrLevel === cefr;
          const now = active.filter((r) => at(r) && liveEligible(r, profile, skill, false));
          if (now.length >= need) continue;
          const withPolicy = active.filter((r) => at(r) && coreEligible(r, profile, skill, false));
          const q = queue.filter((r) => at(r) && liveEligible(r, profile, skill, true));
          const qCore = queue.filter((r) => at(r) && coreEligible(r, profile, skill, true));
          const byStatus = (list: Row[]) => Object.fromEntries(QUEUE.map((s) => [s, list.filter((r) => r.status === s || (s === "PRETEST" && r.isPretest && r.status === "ACTIVE")).length]));
          const route =
            withPolicy.length >= need ? "POLICY"
            : now.length + q.length >= need ? "QUEUE"
            : withPolicy.length + qCore.length >= need ? "POLICY+QUEUE"
            : "CONTENT";
          cells.push({
            profile: profile.name, skill, cefr, need, active: now.length, activeWithCore: withPolicy.length,
            queue: q.length, queueByStatus: byStatus(q), queueWithCore: qCore.length, route,
            contentShortfall: Math.max(0, need - withPolicy.length - qCore.length),
            queueItemCodes: q.map((r) => r.itemCode ?? r.id).slice(0, 40),
          });
        }
      }
    }
    const routes = cells.reduce<Record<string, number>>((m, c) => ({ ...m, [c.route]: (m[c.route] ?? 0) + 1 }), {});
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/gap-triage.json`, JSON.stringify({ generatedAt: new Date().toISOString(), gaps: cells.length, routes, cells }, null, 2));
    console.log(`gaps ${cells.length}  routes ${JSON.stringify(routes)}`);
    console.log(`${"profile".padEnd(32)} ${"cell".padEnd(18)} need active +core queue(P/R/D) +core  route`);
    for (const c of cells) {
      const qs = `${c.queue}(${c.queueByStatus.PRETEST}/${c.queueByStatus.REVIEW}/${c.queueByStatus.DRAFT})`;
      console.log(`${c.profile.padEnd(32)} ${`${c.skill}/${c.cefr}`.padEnd(18)} ${String(c.need).padStart(4)} ${String(c.active).padStart(6)} ${String(c.activeWithCore).padStart(5)} ${qs.padStart(12)} ${String(c.queueWithCore).padStart(5)}  ${c.route}${c.contentShortfall ? ` (−${c.contentShortfall})` : ""}`);
    }
    console.log(`\nwritten: ${OUT}/gap-triage.json`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Gap triage failed; the database was only read.", error);
  process.exitCode = 1;
});
