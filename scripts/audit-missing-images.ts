/**
 * audit-missing-images.ts
 *
 * Comprehensive audit of ALL items in the database that reference a visual
 * stimulus (picture, image, photo, chart, graph, diagram) in their content
 * but have no imageUrl assigned.
 *
 * Output:
 *   - Console summary table (counts by skill × CEFR)
 *   - logs/audit-missing-images-<date>.jsonl  — one line per item
 *   - logs/audit-missing-images-<date>.csv    — for spreadsheet review
 *
 * Usage:
 *   npx tsx scripts/audit-missing-images.ts
 *   SKILL=SPEAKING npx tsx scripts/audit-missing-images.ts
 *   LEVEL=B1       npx tsx scripts/audit-missing-images.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const SKILL_FILTER = process.env.SKILL?.toUpperCase();
const LEVEL_FILTER = process.env.LEVEL?.toUpperCase();

const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const dateStr   = new Date().toISOString().slice(0, 10);
const jsonlPath = path.join(LOG_DIR, `audit-missing-images-${dateStr}.jsonl`);
const csvPath   = path.join(LOG_DIR, `audit-missing-images-${dateStr}.csv`);

// ─── Visual detection ─────────────────────────────────────────────────────────

/**
 * Returns true if the item content genuinely references a visual stimulus
 * that should have an accompanying image.  Uses a tiered approach per skill:
 *
 * SPEAKING  — any mention of picture/image/photo/look at the → always needs image
 * WRITING   — only chart/graph/diagram/figure/table references (IELTS-style data tasks)
 * READING   — only explicit [image:...] placeholders or infographic references
 * VOCAB/GRAMMAR — picture/image/look at
 * LISTENING — picture/image reference in prompt
 */
function needsImage(skill: string, c: Record<string, any>): {
  needed: boolean;
  reason: string;
  imageDescription: string;
} {
  const prompt: string = (c.prompt ?? c.question ?? c.stem ?? c.stimulus ?? "").toString();
  const lower = prompt.toLowerCase();

  // Already has a valid imageUrl → skip
  const existing = (c.imageUrl ?? "").toString().trim();
  const hasValid = existing.length > 0
    && !existing.includes("placeholder")
    && !existing.includes("example.com");
  if (hasValid) return { needed: false, reason: "has_image", imageDescription: existing };

  if (skill === "SPEAKING") {
    // Speaking items that describe a picture to respond to
    const patterns = [
      "look at the picture", "look at these", "look at this picture",
      "describe what you see", "describe the picture", "describe the image",
      "describe the photo", "in the picture", "the picture shows",
      "the image shows", "picture 1", "picture 2", "picture a", "picture b",
      "[image a]", "[image b]",
    ];
    const matched = patterns.find(p => lower.includes(p));
    if (matched) {
      // Try to extract description from prompt
      const descMatch = prompt.match(/(?:shows?|depicts?|of)\s+([^.!?\n]{10,80})/i);
      const description = descMatch ? descMatch[1].trim() : prompt.slice(0, 80);
      return { needed: true, reason: `speaking_visual:${matched}`, imageDescription: description };
    }
    return { needed: false, reason: "speaking_no_visual", imageDescription: "" };
  }

  if (skill === "WRITING") {
    // Only data-description tasks (IELTS Task 1 / Cambridge integrated writing)
    const dataPatterns = [
      "the chart", "the graph", "the diagram", "the figure",
      "the table shows", "the bar chart", "the pie chart", "the line graph",
      "the infographic", "using the data", "according to the chart",
      "the map shows", "the plan shows",
    ];
    const matched = dataPatterns.find(p => lower.includes(p));
    if (matched) {
      const descMatch = prompt.match(/(?:chart|graph|diagram|figure|table)\s+(?:shows?|depicts?|presents?|illustrates?)\s+([^.!?\n]{10,80})/i);
      const description = descMatch ? descMatch[1].trim() : matched.replace("the ", "");
      return { needed: true, reason: `writing_data:${matched}`, imageDescription: description };
    }
    return { needed: false, reason: "writing_no_data_task", imageDescription: "" };
  }

  if (skill === "READING") {
    // Reading questions themselves don't need images — the passage may contain
    // visuals but that's part of the passage, not the question.
    // Only flag if there's an explicit [image:...] placeholder in the content.
    if (
      lower.includes("[image:") ||
      lower.includes("[chart:") ||
      lower.includes("[graph:") ||
      lower.includes("[figure:") ||
      lower.includes("refer to the diagram") ||
      lower.includes("look at the infographic")
    ) {
      const bracketMatch = prompt.match(/\[(?:image|chart|graph|figure):([^\]]{5,60})\]/i);
      const description = bracketMatch ? bracketMatch[1].trim() : "reading visual";
      return { needed: true, reason: "reading_explicit_placeholder", imageDescription: description };
    }
    // Reading passage that is itself an image (rare — vocab picture reading)
    if (lower.includes("look at the picture") || lower.includes("look at this image")) {
      return { needed: true, reason: "reading_picture_prompt", imageDescription: prompt.slice(0, 80) };
    }
    return { needed: false, reason: "reading_text_only", imageDescription: "" };
  }

  if (skill === "VOCABULARY" || skill === "GRAMMAR") {
    const patterns = ["picture", "look at the", "look at this", "the image shows", "the photo shows"];
    const matched = patterns.find(p => lower.includes(p));
    if (matched) {
      return { needed: true, reason: `${skill.toLowerCase()}_visual:${matched}`, imageDescription: prompt.slice(0, 80) };
    }
    return { needed: false, reason: "no_visual_ref", imageDescription: "" };
  }

  if (skill === "LISTENING") {
    if (lower.includes("picture") || lower.includes("look at the image") || lower.includes("the image shows")) {
      return { needed: true, reason: "listening_visual", imageDescription: prompt.slice(0, 80) };
    }
    return { needed: false, reason: "listening_no_visual", imageDescription: "" };
  }

  return { needed: false, reason: "unknown_skill", imageDescription: "" };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72));
  console.log("  LinguAdapt — Missing Image Audit");
  console.log("=".repeat(72));

  const where: Record<string, any> = {};
  if (SKILL_FILTER) where.skill = SKILL_FILTER;
  if (LEVEL_FILTER) where.cefrLevel = LEVEL_FILTER;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, type: true, status: true, content: true },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
  });

  console.log(`\n  Total items in scope: ${items.length}\n`);

  // Results store
  const results: Array<{
    id: string;
    itemCode: string | null;
    skill: string;
    cefrLevel: string;
    type: string;
    status: string;
    reason: string;
    imageDescription: string;
    prompt: string;
  }> = [];

  for (const item of items) {
    const c = (item.content ?? {}) as Record<string, any>;
    const check = needsImage(item.skill, c);
    if (!check.needed) continue;

    const prompt = (c.prompt ?? c.question ?? c.stem ?? c.stimulus ?? "").toString().slice(0, 120);
    results.push({
      id: item.id,
      itemCode: item.itemCode,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      type: item.type,
      status: item.status,
      reason: check.reason,
      imageDescription: check.imageDescription,
      prompt,
    });
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  const SKILLS = ["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "SPEAKING"];
  const CEFRS  = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

  const countMap: Record<string, Record<string, number>> = {};
  for (const s of SKILLS) {
    countMap[s] = {};
    for (const c of CEFRS) countMap[s][c] = 0;
  }
  for (const r of results) {
    if (countMap[r.skill]) countMap[r.skill][r.cefrLevel] = (countMap[r.skill][r.cefrLevel] ?? 0) + 1;
  }

  console.log("  Items needing images — by Skill × CEFR:\n");
  const header = `  ${"Skill".padEnd(12)} ${"PRE_A1".padStart(6)} ${"A1".padStart(6)} ${"A2".padStart(6)} ${"B1".padStart(6)} ${"B2".padStart(6)} ${"C1".padStart(6)} ${"C2".padStart(6)} ${"TOTAL".padStart(7)}`;
  console.log(header);
  console.log("  " + "-".repeat(70));

  let grandTotal = 0;
  for (const skill of SKILLS) {
    const row = countMap[skill];
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    grandTotal += total;
    const cols = CEFRS.map(c => String(row[c] || 0).padStart(6)).join(" ");
    console.log(`  ${skill.padEnd(12)} ${cols} ${String(total).padStart(7)}`);
  }
  console.log("  " + "-".repeat(70));
  console.log(`  ${"TOTAL".padEnd(12)} ${"".padStart(6 * 7 + 6)} ${String(grandTotal).padStart(7)}`);

  // ── JSONL log ──────────────────────────────────────────────────────────────
  const jsonlLines = results.map(r => JSON.stringify({ ts: new Date().toISOString(), ...r }));
  fs.writeFileSync(jsonlPath, jsonlLines.join("\n") + "\n");

  // ── CSV export ─────────────────────────────────────────────────────────────
  const csvHeader = "id,itemCode,skill,cefrLevel,type,status,reason,imageDescription,prompt";
  const csvRows = results.map(r =>
    [r.id, r.itemCode ?? "", r.skill, r.cefrLevel, r.type, r.status, r.reason,
      `"${r.imageDescription.replace(/"/g, "'")}"`,
      `"${r.prompt.replace(/"/g, "'").replace(/\n/g, " ")}"`
    ].join(",")
  );
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n") + "\n");

  console.log(`\n  Total items needing images: ${grandTotal}`);
  console.log(`  JSONL: ${jsonlPath}`);
  console.log(`  CSV:   ${csvPath}`);
  console.log("\n  Next step: run generate-missing-images.ts with SKILL=ALL\n");
  console.log("=".repeat(72) + "\n");

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
