#!/usr/bin/env tsx
/**
 * validate-seeds.ts
 *
 * CI validation gate: ensures all items in the database pass structural
 * validation before any deployment or migration proceeds.
 *
 * Usage:
 *   npx tsx scripts/validate-seeds.ts              # validate all items
 *   npx tsx scripts/validate-seeds.ts --strict     # strict mode (fail on warnings)
 *   npx tsx scripts/validate-seeds.ts --skill GRAMMAR
 *   npx tsx scripts/validate-seeds.ts --limit 200
 *
 * Exit codes:
 *   0  — all items valid
 *   1  — validation failures found
 *   2  — DB connection error
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const skillArg = args.find((_, i, a) => a[i - 1] === "--skill");
const limitArg = args.find((_, i, a) => a[i - 1] === "--limit");
const LIMIT = limitArg ? parseInt(limitArg) : 5000;
const SKILL_FILTER = skillArg ?? null;

// ---------------------------------------------------------------------------
// Validation rules (structural, no external deps)
// ---------------------------------------------------------------------------

interface ValidationError {
  itemId: string;
  itemCode: string;
  skill: string;
  error: string;
  severity: "error" | "warning";
}

function validateMCQ(content: any, itemCode: string, skill: string): ValidationError[] {
  const errs: ValidationError[] = [];
  const id = itemCode;
  const promptField = content.prompt ?? content.question ?? content.stem;

  if (!promptField) errs.push({ itemId: id, itemCode, skill, error: "Missing prompt/question/stem field", severity: "error" });
  if (!Array.isArray(content.options)) {
    errs.push({ itemId: id, itemCode, skill, error: "Missing options array", severity: "error" });
    return errs;
  }
  if (content.options.length < 2 || content.options.length > 6) {
    errs.push({ itemId: id, itemCode, skill, error: `Options count must be 2–6, got ${content.options.length}`, severity: "error" });
  }
  const correctCount = content.options.filter((o: any) => o.isCorrect === true).length;
  if (correctCount !== 1) {
    errs.push({ itemId: id, itemCode, skill, error: `Exactly 1 correct option required, found ${correctCount}`, severity: "error" });
  }
  for (const opt of content.options) {
    if (!opt.text && !opt.label) {
      errs.push({ itemId: id, itemCode, skill, error: "Option missing text/label field", severity: "error" });
      break;
    }
  }
  if (!content.correctAnswer && STRICT) {
    errs.push({ itemId: id, itemCode, skill, error: "Missing correctAnswer field (required for shuffle)", severity: "warning" });
  }
  return errs;
}

function validateWriting(content: any, itemCode: string, skill: string): ValidationError[] {
  const errs: ValidationError[] = [];
  const promptField = content.prompt ?? content.task ?? content.question;
  if (!promptField) errs.push({ itemId: itemCode, itemCode, skill, error: "Missing prompt/task", severity: "error" });
  if (!content.wordLimit && !content.minWords) {
    errs.push({ itemId: itemCode, itemCode, skill, error: "Missing wordLimit or minWords", severity: "warning" });
  }
  return errs;
}

function validateSpeaking(content: any, itemCode: string, skill: string): ValidationError[] {
  const errs: ValidationError[] = [];
  const promptField = content.prompt ?? content.task ?? content.question;
  if (!promptField) errs.push({ itemId: itemCode, itemCode, skill, error: "Missing prompt/task", severity: "error" });
  return errs;
}

function validateListening(content: any, itemCode: string, skill: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!content.audioUrl && !content.script && !content.transcript) {
    errs.push({ itemId: itemCode, itemCode, skill, error: "Missing audioUrl, script, or transcript", severity: "warning" });
  }
  return [...errs, ...validateMCQ(content, itemCode, skill)];
}

function validateItem(skill: string, content: any, itemCode: string): ValidationError[] {
  if (!content || typeof content !== "object") {
    return [{ itemId: itemCode, itemCode, skill, error: "content is null or not an object", severity: "error" }];
  }
  switch (skill) {
    case "GRAMMAR":
    case "VOCABULARY":
    case "READING":
      return validateMCQ(content, itemCode, skill);
    case "WRITING":
      return validateWriting(content, itemCode, skill);
    case "SPEAKING":
      return validateSpeaking(content, itemCode, skill);
    case "LISTENING":
      return validateListening(content, itemCode, skill);
    default:
      return [{ itemId: itemCode, itemCode, skill, error: `Unknown skill type: ${skill}`, severity: "warning" }];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🔍 b4skills Seed Validation Gate`);
  console.log(`   Mode: ${STRICT ? "STRICT" : "STANDARD"}`);
  if (SKILL_FILTER) console.log(`   Skill filter: ${SKILL_FILTER}`);
  console.log(`   Limit: ${LIMIT}\n`);

  // Probe DB
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("❌ Database connection failed:", (err as Error).message);
    process.exit(2);
  }

  const where: Record<string, unknown> = {};
  if (SKILL_FILTER) where.skill = SKILL_FILTER;

  const items = await prisma.item.findMany({
    where: where as any,
    select: { id: true, itemCode: true, skill: true, content: true },
    take: LIMIT,
  });

  console.log(`📦 Loaded ${items.length} items from database\n`);

  const allErrors: ValidationError[] = [];
  const bySkill: Record<string, { valid: number; invalid: number }> = {};

  for (const item of items) {
    const errs = validateItem(
      item.skill,
      item.content as any,
      item.itemCode ?? item.id
    );

    if (!bySkill[item.skill]) bySkill[item.skill] = { valid: 0, invalid: 0 };

    const hasErrors = errs.some((e) => e.severity === "error");
    const hasWarnings = errs.some((e) => e.severity === "warning");

    if (hasErrors || (STRICT && hasWarnings)) {
      bySkill[item.skill].invalid++;
      allErrors.push(...errs);
    } else {
      bySkill[item.skill].valid++;
    }
  }

  // ── Summary by skill ───────────────────────────────────────────────────────
  console.log("Results by skill:");
  for (const [skill, counts] of Object.entries(bySkill).sort()) {
    const total = counts.valid + counts.invalid;
    const pct = Math.round((counts.valid / total) * 100);
    const icon = counts.invalid === 0 ? "✅" : "❌";
    console.log(`  ${icon} ${skill.padEnd(12)} ${counts.valid}/${total} valid (${pct}%)`);
  }

  // ── Error details ──────────────────────────────────────────────────────────
  if (allErrors.length > 0) {
    console.log(`\n⚠️  Found ${allErrors.length} issue(s):\n`);
    const errorItems = [...new Set(allErrors.map((e) => e.itemCode))];
    for (const code of errorItems.slice(0, 50)) {
      const itemErrs = allErrors.filter((e) => e.itemCode === code);
      const skill = itemErrs[0].skill;
      console.log(`  [${skill}] ${code}:`);
      for (const err of itemErrs) {
        const badge = err.severity === "error" ? "  ✗" : "  ⚠";
        console.log(`    ${badge} ${err.error}`);
      }
    }
    if (errorItems.length > 50) {
      console.log(`  … and ${errorItems.length - 50} more items`);
    }

    const errorCount = allErrors.filter((e) => e.severity === "error").length;
    if (errorCount > 0) {
      console.log(`\n❌ Validation FAILED: ${errorCount} error(s) found`);
      await prisma.$disconnect();
      process.exit(1);
    } else {
      // Only warnings in non-strict mode
      console.log(`\n✅ Validation PASSED with ${allErrors.length} warning(s) (non-strict mode)`);
    }
  } else {
    console.log(`\n✅ All ${items.length} items passed validation`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
