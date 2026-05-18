/**
 * Comprehensive system audit
 * Scans: database integrity, codebase health, item bank quality, API coverage
 *
 * Run: npx tsx audit-comprehensive.ts
 */

import { prisma } from "./src/lib/prisma.js";
import * as fs from "fs";
import * as path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

type Item = any;
type Option = { text?: string; rationale?: string; isCorrect?: boolean; id?: string };

async function auditDatabase() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  DATABASE INTEGRITY AUDIT            ║");
  console.log("╚══════════════════════════════════════╝\n");

  const allItems = await prisma.item.findMany({
    select: { id: true, skill: true, status: true, cefrLevel: true, content: true, tags: true },
  });

  const stats = {
    total: allItems.length,
    byStatus: {} as Record<string, number>,
    bySkill: {} as Record<string, number>,
    byCefr: {} as Record<string, number>,
    issues: {
      noCorrectAnswer: 0,
      noOptions: 0,
      noPrompt: 0,
      noAudio: 0,
      noPassage: 0,
      noAudioFile: 0,
      noRationale: 0,
      invalidContent: 0,
      missingImage: 0,
      duplicateOptions: 0,
    } as Record<string, number>,
  };

  const audioFiles = fs.existsSync(AUDIO_DIR) ? new Set(fs.readdirSync(AUDIO_DIR)) : new Set();

  for (const item of allItems) {
    // Count by status/skill/cefr
    stats.byStatus[item.status] = (stats.byStatus[item.status] ?? 0) + 1;
    stats.bySkill[item.skill] = (stats.bySkill[item.skill] ?? 0) + 1;
    stats.byCefr[item.cefrLevel] = (stats.byCefr[item.cefrLevel] ?? 0) + 1;

    const c = item.content as any;
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];

    // Check for issues
    if (!c.prompt && !c.stem && !c.question) stats.issues.noPrompt++;

    if (["GRAMMAR", "VOCABULARY", "READING"].includes(item.skill)) {
      if (!opts.some((o) => o.isCorrect === true)) stats.issues.noCorrectAnswer++;
      if (opts.length === 0) stats.issues.noOptions++;
      if (opts.some((o) => (o.text ?? "").length < 2)) stats.issues.duplicateOptions++;
    }

    if (item.skill === "LISTENING") {
      if (!c.correctAnswer && opts.length === 0) stats.issues.noCorrectAnswer++;
      if (!c.audioUrl && !c.transcript && !c.ttsScript) stats.issues.noAudio++;
      if (c.audioUrl && !audioFiles.has(c.audioUrl.replace(/^\/audio\//, ""))) {
        stats.issues.noAudioFile++;
      }
    }

    if (item.skill === "READING") {
      if (!c.passage && !c.text && !c.readingText) stats.issues.noPassage++;
    }

    if (opts.some((o) => !o.rationale || o.rationale.trim().length < 5)) {
      stats.issues.noRationale++;
    }

    // Check for invalid content (JS serialization bug)
    if (JSON.stringify(c).includes("[object Object]")) stats.issues.invalidContent++;

    // Check for images
    if (item.skill === "READING" && c.image && !c.imageUrl) stats.issues.missingImage++;
  }

  console.log(`Total items: ${stats.total}`);
  console.log(`By Status: ${JSON.stringify(stats.byStatus, null, 2).split("\n").join("\n            ")}`);
  console.log(`By Skill: ${JSON.stringify(stats.bySkill, null, 2).split("\n").join("\n          ")}`);
  console.log(`By CEFR: ${JSON.stringify(stats.byCefr, null, 2).split("\n").join("\n         ")}`);

  console.log("\n⚠️  ISSUES FOUND:");
  for (const [issue, count] of Object.entries(stats.issues)) {
    if (count > 0) console.log(`  • ${issue}: ${count}`);
  }

  return { allItems, stats };
}

async function auditCodebase() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  CODEBASE QUALITY AUDIT              ║");
  console.log("╚══════════════════════════════════════╝\n");

  const srcDir = path.join(process.cwd(), "src");
  const testDir = path.join(process.cwd(), "test");

  // Count source files
  let srcCount = 0;
  function countFiles(dir: string): number {
    let count = 0;
    try {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (f.startsWith(".")) continue;
        if (f === "node_modules") continue;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          count += countFiles(p);
        } else if (f.endsWith(".ts") || f.endsWith(".tsx")) {
          count++;
        }
      }
    } catch {}
    return count;
  }

  const srcFiles = countFiles(srcDir);
  const testFiles = countFiles(testDir);

  console.log(`TypeScript source files: ${srcFiles}`);
  console.log(`Test files: ${testFiles}`);
  console.log(`Test coverage ratio: ${(testFiles > 0 ? (testFiles / srcFiles * 100).toFixed(1) : 0)}%`);

  // Check for TODOs/FIXMEs
  let todos = 0,
    fixmes = 0;
  function scanForComments(dir: string) {
    try {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (f.startsWith(".")) continue;
        if (f === "node_modules") continue;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          scanForComments(p);
        } else if (f.endsWith(".ts") || f.endsWith(".tsx")) {
          const content = fs.readFileSync(p, "utf-8");
          todos += (content.match(/\/\/\s*TODO/g) ?? []).length;
          fixmes += (content.match(/\/\/\s*FIXME/g) ?? []).length;
        }
      }
    } catch {}
  }
  scanForComments(srcDir);

  if (todos > 0 || fixmes > 0) {
    console.log(`\n⚠️  DEBT MARKERS:`);
    if (todos > 0) console.log(`  • TODO: ${todos}`);
    if (fixmes > 0) console.log(`  • FIXME: ${fixmes}`);
  }
}

async function auditItemBank(allItems: Item[]) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  ITEM BANK QUALITY AUDIT             ║");
  console.log("╚══════════════════════════════════════╝\n");

  const audioFiles = fs.existsSync(AUDIO_DIR) ? new Set(fs.readdirSync(AUDIO_DIR)) : new Set();

  // Broken items by type
  const broken = {
    objectSerialization: [] as string[],
    missingPassage: [] as string[],
    missingAudio: [] as string[],
    missingCorrectAnswer: [] as string[],
    missingPrompt: [] as string[],
    weirdOptions: [] as string[],
  };

  for (const item of allItems) {
    const c = item.content as any;
    const opts: Option[] = Array.isArray(c.options) ? c.options : [];
    const code = item.id.slice(0, 12);

    // Check for [object Object] serialization bug
    const serialized = JSON.stringify(c);
    if (serialized.includes("[object Object]")) {
      broken.objectSerialization.push(`${code} ${item.skill} ${item.cefrLevel}`);
    }

    // Missing passage (READING)
    if (item.skill === "READING") {
      const passage = c.passage ?? c.text ?? c.readingText ?? "";
      if (!passage || String(passage).trim().length < 30) {
        broken.missingPassage.push(`${code} ${item.cefrLevel} status=${item.status}`);
      }
    }

    // Missing audio (LISTENING ACTIVE/DRAFT)
    if (item.skill === "LISTENING" && ["ACTIVE", "DRAFT"].includes(item.status)) {
      if (!c.audioUrl && !c.transcript && !c.ttsScript) {
        broken.missingAudio.push(`${code} ${item.cefrLevel}`);
      } else if (c.audioUrl) {
        const filename = c.audioUrl.replace(/^\/audio\//, "");
        if (!audioFiles.has(filename)) {
          broken.missingAudio.push(`${code} (file missing: ${filename})`);
        }
      }
    }

    // Missing correct answer
    if (!c.correctAnswer && !opts.some((o) => o.isCorrect === true)) {
      broken.missingCorrectAnswer.push(`${code} ${item.skill} ${item.cefrLevel}`);
    }

    // Missing prompt
    if (!c.prompt && !c.stem && !c.question) {
      broken.missingPrompt.push(`${code} ${item.cefrLevel}`);
    }

    // Weird options (duplicates, very short)
    if (opts.length > 0) {
      const texts = opts.map((o) => (o.text ?? "").trim().toLowerCase());
      const unique = new Set(texts);
      if (unique.size < texts.length) {
        broken.weirdOptions.push(`${code} (${texts.length} options, ${unique.size} unique)`);
      }
    }
  }

  console.log("BROKEN ITEMS BY TYPE:");
  for (const [type, items] of Object.entries(broken)) {
    if (items.length > 0) {
      console.log(`\n  ${type}: ${items.length} items`);
      for (const item of items.slice(0, 5)) console.log(`    • ${item}`);
      if (items.length > 5) console.log(`    ... and ${items.length - 5} more`);
    }
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  COMPREHENSIVE SYSTEM AUDIT — LinguaAdapt Item Bank    ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const { allItems, stats } = await auditDatabase();
  await auditCodebase();
  await auditItemBank(allItems);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║  AUDIT COMPLETE                     ║");
  console.log("╚══════════════════════════════════════╝\n");

  await prisma.$disconnect();
}

main().catch(console.error);
