/**
 * audit-missing-media.ts
 *
 * Scans ALL items in the database and reports exactly which ones are
 * missing required media assets:
 *
 *   LISTENING  → content.audioUrl (or content.ttsScript for generation)
 *   READING    → content.passage  (inline text) or content.passageUrl (external)
 *   VOCABULARY → content.imageUrl (for visual-prompt items)
 *   GRAMMAR    → content.imageUrl (for chart/image-based items)
 *   WRITING    → content.imageUrl or content.chartData (for integrated tasks)
 *
 * Output: JSON report  logs/missing-media-YYYY-MM-DD.json
 *         Console summary per skill / level / issue type
 *
 * Usage:
 *   npx tsx scripts/audit-missing-media.ts
 *   SKILL=LISTENING npx tsx scripts/audit-missing-media.ts
 *   STATUS=PRETEST npx tsx scripts/audit-missing-media.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const SKILL_FILTER  = process.env.SKILL?.toUpperCase();
const STATUS_FILTER = process.env.STATUS?.toUpperCase() ?? undefined;

const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const reportPath = path.join(logDir, `missing-media-${new Date().toISOString().slice(0, 10)}.json`);

// ─────────────────────────────────────────────────────────────────────────────
// Issue types
// ─────────────────────────────────────────────────────────────────────────────

type IssueType =
  | "NO_AUDIO_URL"            // LISTENING: no audioUrl, no ttsScript
  | "NO_TTS_SCRIPT"           // LISTENING: no audioUrl, no ttsScript to generate from
  | "NO_AUDIO_URL_HAS_TTS"    // LISTENING: no audioUrl but has ttsScript → can generate
  | "NO_PASSAGE"              // READING: no passage text or passageUrl
  | "NO_IMAGE_URL"            // VOCAB/GRAMMAR: visual item without imageUrl
  | "BROKEN_IMAGE_URL"        // imageUrl present but is a placeholder/empty
  | "NO_CHART_DATA"           // WRITING integrated task: no chartData or imageUrl
  | "EMPTY_CONTENT"           // content field is null or empty object
  | "NO_TTS_SCRIPT_MODULE";   // LISTENING: has moduleId but no ttsScript in any item in module

interface MissingMediaItem {
  id: string;
  skill: string;
  cefrLevel: string;
  status: string;
  type: string;
  issues: IssueType[];
  moduleId?: string;
  passageId?: string;
  hasTtsScript: boolean;
  hasPassage: boolean;
  hasImageUrl: boolean;
  contentKeys: string[];
  promptSnippet: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isPlaceholderUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  if (url.trim() === "") return true;
  if (url.includes("placeholder") || url.includes("via.placeholder")) return true;
  if (url.includes("example.com")) return true;
  return false;
}

function isVisualVocabItem(c: Record<string, any>): boolean {
  const prompt: string = c.prompt ?? c.question ?? "";
  const lower = prompt.toLowerCase();
  // Heuristics: image-based vocabulary items tend to reference visual stimuli
  return (
    lower.includes("picture") ||
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("look at") ||
    lower.includes("chart") ||
    lower.includes("graph") ||
    lower.includes("diagram") ||
    lower.includes("figure") ||
    Boolean(c.imageUrl !== undefined) // already has the field (even if empty)
  );
}

function isIntegratedTask(c: Record<string, any>): boolean {
  return (
    c.taskType === "INTEGRATED" ||
    c.taskType === "integrated" ||
    c.taskType === "integrated_task" ||
    Boolean(c.chartData !== undefined) ||
    Boolean(c.chartUrl !== undefined)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main audit
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Missing Media Audit");
  console.log("=".repeat(70));
  if (SKILL_FILTER) console.log(`  Filter: SKILL=${SKILL_FILTER}`);
  if (STATUS_FILTER) console.log(`  Filter: STATUS=${STATUS_FILTER}`);
  console.log();

  const where: Record<string, any> = {};
  if (SKILL_FILTER) where.skill = SKILL_FILTER;
  if (STATUS_FILTER) where.status = STATUS_FILTER;

  const items = await prisma.item.findMany({
    where,
    select: {
      id: true,
      skill: true,
      cefrLevel: true,
      status: true,
      type: true,
      tags: true,
      content: true,
    },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
  });

  console.log(`  Total items fetched: ${items.length}\n`);

  const missing: MissingMediaItem[] = [];
  const stats: Record<string, { total: number; missing: number; issues: Record<string, number> }> = {};

  for (const item of items) {
    const c = (item.content ?? {}) as Record<string, any>;
    const issues: IssueType[] = [];

    const skill = item.skill as string;
    if (!stats[skill]) stats[skill] = { total: 0, missing: 0, issues: {} };
    stats[skill].total++;

    // ── EMPTY CONTENT ────────────────────────────────────────────────────────
    if (!item.content || Object.keys(c).length === 0) {
      issues.push("EMPTY_CONTENT");
    }

    // ── LISTENING ─────────────────────────────────────────────────────────────
    if (skill === "LISTENING") {
      const hasAudio   = !isPlaceholderUrl(c.audioUrl);
      const hasTts     = typeof c.ttsScript === "string" && c.ttsScript.trim().length > 10;

      if (!hasAudio) {
        if (hasTts) {
          issues.push("NO_AUDIO_URL_HAS_TTS");
        } else {
          issues.push("NO_TTS_SCRIPT");
        }
      }
    }

    // ── READING ──────────────────────────────────────────────────────────────
    if (skill === "READING") {
      const hasPassage    = typeof c.passage === "string" && c.passage.trim().length > 50;
      const hasPassageUrl = !isPlaceholderUrl(c.passageUrl);
      if (!hasPassage && !hasPassageUrl) {
        issues.push("NO_PASSAGE");
      }
    }

    // ── VOCABULARY ────────────────────────────────────────────────────────────
    if (skill === "VOCABULARY") {
      if (isVisualVocabItem(c)) {
        if (isPlaceholderUrl(c.imageUrl)) {
          issues.push("NO_IMAGE_URL");
        }
      }
    }

    // ── GRAMMAR ──────────────────────────────────────────────────────────────
    if (skill === "GRAMMAR") {
      if (isVisualVocabItem(c)) {
        if (isPlaceholderUrl(c.imageUrl)) {
          issues.push("NO_IMAGE_URL");
        }
      }
    }

    // ── WRITING / SPEAKING (integrated tasks) ─────────────────────────────────
    if (skill === "WRITING" || skill === "SPEAKING") {
      if (isIntegratedTask(c)) {
        const hasChart = !isPlaceholderUrl(c.chartUrl) || (c.chartData && Object.keys(c.chartData).length > 0);
        const hasImage = !isPlaceholderUrl(c.imageUrl);
        if (!hasChart && !hasImage) {
          issues.push("NO_CHART_DATA");
        }
      }
    }

    if (issues.length === 0) continue;

    // Accumulate stats
    stats[skill].missing++;
    for (const iss of issues) {
      stats[skill].issues[iss] = (stats[skill].issues[iss] ?? 0) + 1;
    }

    const prompt: string = c.prompt ?? c.stem ?? c.question ?? c.passage?.slice(0, 80) ?? "";

    missing.push({
      id: item.id,
      skill,
      cefrLevel: item.cefrLevel as string,
      status: item.status as string,
      type: item.type as string,
      issues,
      moduleId: c.moduleId as string | undefined,
      passageId: c.moduleId ?? c.passageId,
      hasTtsScript: typeof c.ttsScript === "string" && c.ttsScript.trim().length > 10,
      hasPassage: typeof c.passage === "string" && c.passage.trim().length > 50,
      hasImageUrl: !isPlaceholderUrl(c.imageUrl),
      contentKeys: Object.keys(c),
      promptSnippet: prompt.slice(0, 100),
    });
  }

  // ── CONSOLE SUMMARY ─────────────────────────────────────────────────────────
  console.log("  SUMMARY BY SKILL");
  console.log("  " + "-".repeat(66));
  for (const [skill, s] of Object.entries(stats)) {
    if (s.missing === 0) {
      console.log(`  ${skill.padEnd(12)} total=${s.total.toString().padStart(5)}  missing=0 ✓`);
    } else {
      console.log(`  ${skill.padEnd(12)} total=${s.total.toString().padStart(5)}  missing=${s.missing}`);
      for (const [iss, count] of Object.entries(s.issues)) {
        console.log(`                  → ${iss.padEnd(30)} ×${count}`);
      }
    }
  }

  console.log(`\n  Total items with missing media: ${missing.length}`);
  console.log(`  Report saved to: ${reportPath}\n`);

  // ── LISTENING DETAIL ─────────────────────────────────────────────────────────
  const noAudioHasTts = missing.filter(m => m.issues.includes("NO_AUDIO_URL_HAS_TTS"));
  const noTtsScript   = missing.filter(m => m.issues.includes("NO_TTS_SCRIPT"));
  const noPassage     = missing.filter(m => m.issues.includes("NO_PASSAGE"));
  const noImage       = missing.filter(m => m.issues.includes("NO_IMAGE_URL"));

  if (noAudioHasTts.length) {
    console.log(`  LISTENING — can auto-generate (have ttsScript): ${noAudioHasTts.length} items`);
    const mods = [...new Set(noAudioHasTts.map(m => m.moduleId).filter(Boolean))];
    console.log(`    Unique modules: ${mods.length}`);
    mods.slice(0, 10).forEach(m => console.log(`      • ${m}`));
    if (mods.length > 10) console.log(`      … and ${mods.length - 10} more`);
  }
  if (noTtsScript.length) {
    console.log(`  LISTENING — need TTS script written: ${noTtsScript.length} items`);
    noTtsScript.slice(0, 5).forEach(m => console.log(`    • ${m.id} [${m.cefrLevel}] ${m.promptSnippet.slice(0, 60)}`));
  }
  if (noPassage.length) {
    console.log(`\n  READING — missing passage: ${noPassage.length} items`);
    noPassage.slice(0, 5).forEach(m => console.log(`    • ${m.id} [${m.cefrLevel}] ${m.promptSnippet.slice(0, 70)}`));
  }
  if (noImage.length) {
    console.log(`\n  VISUAL ITEMS — missing imageUrl: ${noImage.length} items`);
    noImage.slice(0, 5).forEach(m => console.log(`    • ${m.id} [${m.skill}/${m.cefrLevel}] ${m.promptSnippet.slice(0, 60)}`));
  }

  // ── WRITE JSON REPORT ────────────────────────────────────────────────────────
  const report = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    totalMissing: missing.length,
    stats,
    items: missing,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n  Next steps:`);
  if (noAudioHasTts.length)   console.log(`    npx tsx scripts/generate-missing-audio.ts`);
  if (noTtsScript.length)     console.log(`    npx tsx scripts/generate-missing-tts-scripts.ts`);
  if (noPassage.length)       console.log(`    npx tsx scripts/generate-missing-passages.ts`);
  if (noImage.length)         console.log(`    npx tsx scripts/generate-missing-images.ts`);
  console.log();

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
