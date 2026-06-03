#!/usr/bin/env npx tsx
/**
 * verify-skill-coverage.ts — Profile × Skill × CEFR coverage audit
 *
 * Walks every product-line profile in PRODUCT_LINE_PROFILES and checks that
 * the ACTIVE item bank has at least `sectionConfig[skill].minItems` items
 * available for every skill in `profile.sectionOrder` at every CEFR level
 * that falls inside the profile's `cefrRange`.
 *
 * Output:
 *   [Profile Name] SKILL / CEFR: <count> items ✅ (need <min>)
 *   [Profile Name] SKILL / CEFR: <count> items ❌ (need <min>) — fix: <hint>
 *
 *   TOTAL GAPS: <n>
 *
 * Exit code 0 if no gaps, 1 if any profile × skill × CEFR is under-served.
 * Designed to be wired into CI so item-bank regressions fail the build.
 *
 * Usage:
 *   npm run verify:coverage
 *   tsx scripts/verify-skill-coverage.ts
 *
 * Flags:
 *   --skill=WRITING      Only audit one skill
 *   --profile="15-Min"   Substring-match profile names
 *   --json               Emit machine-readable JSON instead of text
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { PRODUCT_LINE_PROFILES } from "../src/lib/product-lines/profiles.js";

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const SKILL_FILTER = args.find((a) => a.startsWith("--skill="))?.split("=")[1];
const PROFILE_FILTER = args.find((a) => a.startsWith("--profile="))?.split("=")[1];
const JSON_OUTPUT = args.includes("--json");

// ── CEFR ordering ────────────────────────────────────────────────────────────
const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Cefr = (typeof CEFR_ORDER)[number];

function cefrLevelsInRange(min: string, max: string): Cefr[] {
  const start = CEFR_ORDER.indexOf(min as Cefr);
  const end = CEFR_ORDER.indexOf(max as Cefr);
  if (start < 0 || end < 0 || start > end) return [];
  return CEFR_ORDER.slice(start, end + 1) as Cefr[];
}

// ── Seed-script hint map (helps the admin know which script to re-run) ───────
const SEED_HINT: Record<string, string> = {
  WRITING:  "tsx scripts/seed-writing-phase1.ts (or seed-writing-phase2/3 for B1+/early levels)",
  SPEAKING: "tsx scripts/seed-speaking-phase1.ts (or seed-speaking-phase2/3 for early levels / C1-C2)",
  READING:  "tsx scripts/seed-reading-phase9.ts ... seed-reading-phase12.ts",
  LISTENING:"tsx scripts/seed-listening-phase11.ts ... seed-listening-phase29.ts",
  GRAMMAR:  "tsx scripts/seed-grammar-300-sota.ts (or seed-grammar-phaseN)",
  VOCABULARY:"tsx scripts/seed-vocab-200-sota.ts (or seed-vocab-phase2.ts)",
};

// ── Audit ────────────────────────────────────────────────────────────────────
interface Gap {
  profile: string;
  skill: string;
  cefrLevel: string;
  have: number;
  need: number;
  hint: string;
}

interface ProfileReport {
  profile: string;
  rows: Array<{
    skill: string;
    cefrLevel: string;
    have: number;
    need: number;
    ok: boolean;
  }>;
  gaps: number;
}

async function main(): Promise<void> {
  const gaps: Gap[] = [];
  const reports: ProfileReport[] = [];

  for (const [profileName, profile] of Object.entries(PRODUCT_LINE_PROFILES)) {
    if (PROFILE_FILTER && !profileName.toLowerCase().includes(PROFILE_FILTER.toLowerCase())) continue;

    const [minCefr, maxCefr] = profile.cefrRange;
    const cefrLevels = cefrLevelsInRange(minCefr, maxCefr);
    const report: ProfileReport = { profile: profileName, rows: [], gaps: 0 };

    for (const skill of profile.sectionOrder) {
      const skillStr = String(skill);
      if (SKILL_FILTER && skillStr !== SKILL_FILTER) continue;

      const cfg = profile.sectionConfig?.[skillStr];
      const need = cfg?.minItems ?? 1;

      for (const cefrLevel of cefrLevels) {
        const have = await prisma.item.count({
          where: {
            skill: skillStr as any,
            cefrLevel: cefrLevel as any,
            status: { in: ["ACTIVE", "PRETEST"] as any },
          },
        });
        const ok = have >= need;
        report.rows.push({ skill: skillStr, cefrLevel, have, need, ok });
        if (!ok) {
          report.gaps++;
          gaps.push({
            profile: profileName,
            skill: skillStr,
            cefrLevel,
            have,
            need,
            hint: SEED_HINT[skillStr] ?? `add ${need - have} more ACTIVE items`,
          });
        }
      }
    }
    reports.push(report);
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ totalGaps: gaps.length, reports, gaps }, null, 2));
  } else {
    for (const r of reports) {
      console.log(`\n📋 ${r.profile}  (${r.gaps} gap${r.gaps === 1 ? "" : "s"})`);
      for (const row of r.rows) {
        const mark = row.ok ? "✅" : "❌";
        const tag = `[${r.profile}]`.padEnd(34);
        const skillTag = `${row.skill}/${row.cefrLevel}`.padEnd(20);
        console.log(`  ${tag} ${skillTag} ${String(row.have).padStart(3)} items ${mark} (need ${row.need})`);
      }
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`TOTAL GAPS: ${gaps.length}`);
    if (gaps.length > 0) {
      console.log(`\n🛠️  Fix hints:`);
      const byScript = new Map<string, Gap[]>();
      for (const g of gaps) {
        const list = byScript.get(g.hint) ?? [];
        list.push(g);
        byScript.set(g.hint, list);
      }
      for (const [hint, gs] of byScript) {
        console.log(`  • ${gs.length} gap(s) → ${hint}`);
      }
    } else {
      console.log(`✨ All profiles fully covered. No action needed.`);
    }
    console.log(`${"═".repeat(60)}`);
  }

  await prisma.$disconnect();
  process.exit(gaps.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`Fatal error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
});
