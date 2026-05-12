/**
 * generate-missing-images.ts
 *
 * Finds VOCABULARY and GRAMMAR items that are "visual" (prompt references a
 * picture / image / chart / diagram) but lack a content.imageUrl, then
 * automatically assigns an appropriate Unsplash image URL.
 *
 * Strategy:
 *   1. Extract keywords from the item's prompt via Gemini (fast, cheap).
 *   2. Search the Unsplash API for those keywords and pick the first result.
 *   3. Patch content.imageUrl in the database.
 *   Fallback (if UNSPLASH_ACCESS_KEY is not set):
 *   → Use the built-in keyword → curated-URL map for common visual categories.
 *
 * Environment variables:
 *   GEMINI_API_KEY      — required for keyword extraction
 *   UNSPLASH_ACCESS_KEY — optional; enables live Unsplash search
 *   DRY_RUN=1           — preview only, no DB writes
 *   FORCE=1             — overwrite existing imageUrls
 *   SKILL=VOCABULARY    — restrict to one skill
 *   LEVEL=B2            — restrict to one CEFR level
 *   DELAY_MS=800        — pause between API calls (default 800)
 *
 * Usage:
 *   npx tsx scripts/generate-missing-images.ts
 *   UNSPLASH_ACCESS_KEY=xxx npx tsx scripts/generate-missing-images.ts
 *   DRY_RUN=1 npx tsx scripts/generate-missing-images.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const GEMINI_KEY    = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const UNSPLASH_KEY  = process.env.UNSPLASH_ACCESS_KEY ?? "";
const DRY_RUN       = process.env.DRY_RUN   === "1";
const FORCE         = process.env.FORCE     === "1";
const SKILL_FILTER  = process.env.SKILL?.toUpperCase();
const LEVEL_FILTER  = process.env.LEVEL?.toUpperCase();
const DELAY_MS      = parseInt(process.env.DELAY_MS ?? "800", 10);

const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logPath = path.join(LOG_DIR, `generate-missing-images-${new Date().toISOString().slice(0, 10)}.jsonl`);
function log(obj: Record<string, unknown>) {
  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// Curated keyword → Unsplash URL map (fallback when no API key)
// ─────────────────────────────────────────────────────────────────────────────

const CURATED: Record<string, string> = {
  // Animals
  dog:        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80&fit=crop&auto=format",
  cat:        "https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=800&q=80&fit=crop&auto=format",
  bird:       "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80&fit=crop&auto=format",
  horse:      "https://images.unsplash.com/photo-1533374927625-dc2d73e9b8c8?w=800&q=80&fit=crop&auto=format",
  fish:       "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=800&q=80&fit=crop&auto=format",
  elephant:   "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80&fit=crop&auto=format",
  // Nature / weather
  forest:     "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&fit=crop&auto=format",
  mountain:   "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80&fit=crop&auto=format",
  beach:      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&fit=crop&auto=format",
  sun:        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80&fit=crop&auto=format",
  rain:       "https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&q=80&fit=crop&auto=format",
  snow:       "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80&fit=crop&auto=format",
  // Food & drink
  food:       "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80&fit=crop&auto=format",
  fruit:      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80&fit=crop&auto=format",
  vegetable:  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80&fit=crop&auto=format",
  coffee:     "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&fit=crop&auto=format",
  restaurant: "https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=800&q=80&fit=crop&auto=format",
  // People & activities
  family:     "https://images.unsplash.com/photo-1609220136736-443140cfeaa8?w=800&q=80&fit=crop&auto=format",
  sport:      "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80&fit=crop&auto=format",
  football:   "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&fit=crop&auto=format",
  running:    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&fit=crop&auto=format",
  music:      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80&fit=crop&auto=format",
  reading:    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80&fit=crop&auto=format",
  cooking:    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop&auto=format",
  painting:   "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&fit=crop&auto=format",
  // Places
  city:       "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&fit=crop&auto=format",
  school:     "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80&fit=crop&auto=format",
  hospital:   "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80&fit=crop&auto=format",
  market:     "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=80&fit=crop&auto=format",
  airport:    "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80&fit=crop&auto=format",
  hotel:      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80&fit=crop&auto=format",
  office:     "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fit=crop&auto=format",
  library:    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80&fit=crop&auto=format",
  // Charts / graphs (for WRITING integrated tasks)
  chart:      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&fit=crop&auto=format",
  graph:      "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&q=80&fit=crop&auto=format",
  diagram:    "https://images.unsplash.com/photo-1551135049-8a33b5883817?w=800&q=80&fit=crop&auto=format",
  map:        "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80&fit=crop&auto=format",
  // Transport
  car:        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&fit=crop&auto=format",
  bus:        "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80&fit=crop&auto=format",
  train:      "https://images.unsplash.com/photo-1474487548417-781cb6d646b3?w=800&q=80&fit=crop&auto=format",
  bicycle:    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop&auto=format",
  plane:      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80&fit=crop&auto=format",
  // Technology
  computer:   "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80&fit=crop&auto=format",
  phone:      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&fit=crop&auto=format",
  robot:      "https://images.unsplash.com/photo-1535378620166-273be5f4cd6b?w=800&q=80&fit=crop&auto=format",
  // Generic fallback
  people:     "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop&auto=format",
  house:      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&fit=crop&auto=format",
  clothes:    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80&fit=crop&auto=format",
  building:   "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80&fit=crop&auto=format",
};

function findCuratedUrl(keywords: string[]): string | null {
  for (const kw of keywords) {
    const key = kw.toLowerCase().trim();
    if (CURATED[key]) return CURATED[key];
    // Try partial match
    for (const [k, url] of Object.entries(CURATED)) {
      if (key.includes(k) || k.includes(key)) return url;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword extraction via Gemini
// ─────────────────────────────────────────────────────────────────────────────

async function extractKeywords(prompt: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      role: "user",
      parts: [{ text: `Extract 2-5 concrete visual keywords from this English test item prompt that would describe what an appropriate image should show. Return ONLY a JSON array of lowercase English words, e.g. ["dog","park"]. Prompt: "${prompt.slice(0, 200)}"` }],
    }],
    config: { temperature: 0.1, topP: 0.8 },
  });

  const raw = (response.text ?? "[]").replace(/```json|```/g, "").trim();
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(String).filter(s => s.length > 0);
  } catch {
    // fall through
  }
  // Fallback: split by commas or spaces
  return raw.replace(/[[\]"']/g, "").split(/[\s,]+/).filter(s => s.length > 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Unsplash search
// ─────────────────────────────────────────────────────────────────────────────

async function unsplashSearch(keywords: string[]): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  const query = keywords.slice(0, 3).join(" ");
  const url   = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res   = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_KEY}`,
      "Accept-Version": "v1",
    },
  });
  if (!res.ok) return null;
  const json = await res.json() as { results?: Array<{ urls?: { regular?: string } }> };
  const first = json.results?.[0];
  if (!first?.urls?.regular) return null;
  // Add sizing parameters to make it consistent
  return first.urls.regular.replace(/&?ixid=[^&]*/g, "") + "&w=800&q=80&fit=crop&auto=format";
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual item heuristic (same as audit script)
// ─────────────────────────────────────────────────────────────────────────────

function isVisualItem(c: Record<string, any>): boolean {
  const prompt: string = c.prompt ?? c.question ?? c.stem ?? "";
  const lower = prompt.toLowerCase();
  return (
    lower.includes("picture") ||
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("look at") ||
    lower.includes("chart") ||
    lower.includes("graph") ||
    lower.includes("diagram") ||
    lower.includes("figure") ||
    c.imageUrl !== undefined
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DB patch
// ─────────────────────────────────────────────────────────────────────────────

async function patchImageUrl(id: string, imageUrl: string) {
  const item = await prisma.item.findUnique({ where: { id }, select: { content: true } });
  if (!item) return;
  const updated = { ...(item.content as Record<string, any>), imageUrl };
  await prisma.item.update({ where: { id }, data: { content: updated } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  LinguAdapt — Generate Missing Image URLs");
  console.log("=".repeat(70));
  console.log(`  Mode:     ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Force:    ${FORCE}`);
  console.log(`  Unsplash: ${UNSPLASH_KEY ? "ENABLED" : "DISABLED (curated map fallback)"}`);
  if (SKILL_FILTER) console.log(`  Skill:    ${SKILL_FILTER}`);
  if (LEVEL_FILTER) console.log(`  Level:    ${LEVEL_FILTER}`);
  console.log(`  Log:      ${logPath}\n`);

  const skillFilter = SKILL_FILTER
    ? [SKILL_FILTER]
    : ["VOCABULARY", "GRAMMAR"];

  const where: Record<string, any> = { skill: { in: skillFilter } };
  if (LEVEL_FILTER) where.cefrLevel = LEVEL_FILTER;

  const items = await prisma.item.findMany({
    where,
    select: { id: true, skill: true, cefrLevel: true, content: true },
  });

  // Filter to visual items that need imageUrl
  const needsImage = items.filter(item => {
    const c = (item.content ?? {}) as Record<string, any>;
    if (!isVisualItem(c)) return false;
    const hasUrl = typeof c.imageUrl === "string" && c.imageUrl.trim().length > 0
      && !c.imageUrl.includes("placeholder") && !c.imageUrl.includes("example.com");
    return !hasUrl || FORCE;
  });

  console.log(`  Total VOCAB/GRAMMAR items:  ${items.length}`);
  console.log(`  Visual items needing image: ${needsImage.length}\n`);

  if (needsImage.length === 0) {
    console.log("  All visual items already have image URLs.\n");
    await prisma.$disconnect();
    return;
  }

  let patched   = 0;
  let fromApi   = 0;
  let fromMap   = 0;
  let notFound  = 0;
  let errors    = 0;

  for (let i = 0; i < needsImage.length; i++) {
    const item = needsImage[i];
    const c    = (item.content ?? {}) as Record<string, any>;
    const prompt = c.prompt ?? c.question ?? c.stem ?? "";

    process.stdout.write(`  [${i + 1}/${needsImage.length}] ${item.id} [${item.skill}/${item.cefrLevel}] ... `);

    if (DRY_RUN) {
      console.log(`DRY_RUN — prompt: "${prompt.slice(0, 60)}"`);
      patched++;
      continue;
    }

    try {
      // 1. Extract keywords via Gemini
      const keywords = await extractKeywords(prompt);

      // 2. Try Unsplash live search first
      let imageUrl: string | null = null;
      if (UNSPLASH_KEY) {
        imageUrl = await unsplashSearch(keywords);
        if (imageUrl) fromApi++;
      }

      // 3. Fallback to curated map
      if (!imageUrl) {
        imageUrl = findCuratedUrl(keywords);
        if (imageUrl) fromMap++;
      }

      if (!imageUrl) {
        // Last resort: use a generic "classroom/education" image
        imageUrl = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80&fit=crop&auto=format";
        fromMap++;
      }

      await patchImageUrl(item.id, imageUrl);
      console.log(`OK — ${keywords.join(", ")} → ${imageUrl.slice(0, 60)}…`);
      patched++;
      log({ event: "image_patched", itemId: item.id, skill: item.skill, cefr: item.cefrLevel, keywords, imageUrl, source: UNSPLASH_KEY ? "unsplash" : "curated" });
    } catch (err) {
      console.log(`ERROR — ${String(err).slice(0, 80)}`);
      errors++;
      log({ event: "error", itemId: item.id, error: String(err) });
    }

    // Pace the API calls
    if (i < needsImage.length - 1) await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  Patched: ${patched}  (Unsplash API: ${fromApi}, Curated: ${fromMap})  Errors: ${errors}`);
  console.log(`  Log: ${logPath}`);
  console.log("=".repeat(70) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[FATAL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
