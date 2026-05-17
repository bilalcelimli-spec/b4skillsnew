import { prisma } from "./src/lib/prisma.js";
import * as fs from "fs";
import * as path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const availableAudio = new Set(fs.readdirSync(AUDIO_DIR).map(f => f.toLowerCase()));

type Option = { text?: string; id?: string; isCorrect?: boolean; rationale?: string };

interface AuditIssue {
  code: string;
  detail: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
}

interface ItemAuditResult {
  itemCode: string;
  skill: string;
  cefrLevel: string;
  type: string;
  status: string;
  issues: AuditIssue[];
}

function audAtMcqOptions(options: Option[], skill: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!Array.isArray(options) || options.length === 0) {
    return [{ code: "NO_OPTIONS", detail: "options array missing or empty", severity: "CRITICAL" }];
  }

  // Count correct answers
  const correctCount = options.filter(o => o.isCorrect === true).length;
  if (correctCount === 0) {
    issues.push({ code: "NO_CORRECT_ANSWER", detail: "no option has isCorrect:true", severity: "CRITICAL" });
  } else if (correctCount > 1) {
    issues.push({ code: "MULTIPLE_CORRECT", detail: `${correctCount} options marked isCorrect:true (should be exactly 1)`, severity: "CRITICAL" });
  }

  // Number of options
  if (options.length < 3) {
    issues.push({ code: "WEAK_DISTRACTORS", detail: `only ${options.length} options — minimum 3 required`, severity: "MAJOR" });
  }

  // Duplicate option texts
  const texts = options.map(o => (o.text ?? "").trim().toLowerCase());
  const unique = new Set(texts);
  if (unique.size < texts.length) {
    issues.push({ code: "DUPLICATE_OPTIONS", detail: "two or more options have identical text", severity: "CRITICAL" });
  }

  // Very short options (placeholder-like)
  const shortOpts = options.filter(o => (o.text ?? "").trim().length < 2);
  if (shortOpts.length > 0) {
    issues.push({ code: "PLACEHOLDER_OPTIONS", detail: `${shortOpts.length} option(s) with text shorter than 2 chars`, severity: "MAJOR" });
  }

  // Missing rationale (important for distractor quality)
  const noRationale = options.filter(o => !o.rationale || o.rationale.trim().length < 10);
  if (noRationale.length > 0) {
    issues.push({ code: "MISSING_RATIONALE", detail: `${noRationale.length} option(s) have no meaningful rationale`, severity: "MINOR" });
  }

  return issues;
}

function auditListeningOptions(options: Option[], correctAnswer: string | undefined): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!Array.isArray(options) || options.length === 0) {
    return [{ code: "NO_OPTIONS", detail: "options array missing or empty", severity: "CRITICAL" }];
  }
  if (!correctAnswer) {
    issues.push({ code: "NO_CORRECT_ANSWER", detail: "correctAnswer field missing", severity: "CRITICAL" });
  } else {
    const ids = options.map(o => o.id ?? "");
    if (!ids.includes(correctAnswer)) {
      issues.push({ code: "CORRECT_ANSWER_MISMATCH", detail: `correctAnswer="${correctAnswer}" does not match any option id: [${ids.join(",")}]`, severity: "CRITICAL" });
    }
  }
  if (options.length < 3) {
    issues.push({ code: "WEAK_DISTRACTORS", detail: `only ${options.length} options`, severity: "MAJOR" });
  }
  return issues;
}

async function runAudit() {
  console.log("Fetching all items from database...\n");
  const items = await prisma.item.findMany({
    select: {
      id: true, itemCode: true, type: true, skill: true, cefrLevel: true,
      difficulty: true, discrimination: true, guessing: true,
      content: true, assets: { select: { id: true, url: true, type: true } },
      status: true, isPretest: true, pVal: true,
    },
  });

  console.log(`Total items: ${items.length}\n`);
  const results: ItemAuditResult[] = [];
  
  const counts = {
    total: items.length,
    withIssues: 0,
    critical: 0, major: 0, minor: 0,
    by: {} as Record<string, number>,
  };

  for (const item of items) {
    const c = item.content as Record<string, unknown>;
    const issues: AuditIssue[] = [];
    const label = item.itemCode ?? item.id.slice(0, 12);

    if (!c || typeof c !== "object") {
      issues.push({ code: "NULL_CONTENT", detail: "content field is null or not an object", severity: "CRITICAL" });
      results.push({ itemCode: label, skill: item.skill, cefrLevel: item.cefrLevel, type: item.type, status: item.status, issues });
      continue;
    }

    const prompt = ((c.prompt ?? c.stem ?? c.question ?? "") as string).trim();
    const options = (c.options ?? c.choices ?? null) as Option[] | null;
    const correctAnswer = (c.correctAnswer ?? null) as string | undefined;

    // ── Prompt checks ──────────────────────────────────────────────────────────
    if (!prompt) {
      issues.push({ code: "EMPTY_PROMPT", detail: "no prompt/stem text", severity: "CRITICAL" });
    } else if (prompt.length < 10) {
      issues.push({ code: "SHORT_PROMPT", detail: `prompt is only ${prompt.length} chars: "${prompt}"`, severity: "MAJOR" });
    }

    // ── Skill-specific checks ──────────────────────────────────────────────────
    const skill = item.skill;

    if (["GRAMMAR", "VOCABULARY"].includes(skill)) {
      if (options) {
        issues.push(...audAtMcqOptions(options, skill));
      } else {
        issues.push({ code: "NO_OPTIONS", detail: "GRAMMAR/VOCABULARY item has no options", severity: "CRITICAL" });
      }
      // VOCABULARY: visual items referencing pictures need imageUrl
      if (skill === "VOCABULARY") {
        const promptLower = prompt.toLowerCase();
        const needsImage = promptLower.includes("picture") || promptLower.includes("image") || promptLower.includes("photo") || promptLower.includes("look at");
        const imageUrl = (c.imageUrl ?? c.image ?? null) as string | null;
        const hasImageAsset = item.assets.some(a => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a.url ?? ""));
        if (needsImage && !imageUrl && !hasImageAsset) {
          issues.push({ code: "MISSING_IMAGE", detail: "prompt references a picture but no imageUrl or image asset found", severity: "CRITICAL" });
        }
        if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
          issues.push({ code: "BAD_IMAGE_URL", detail: `imageUrl is not a valid URL: ${imageUrl.slice(0, 60)}`, severity: "MAJOR" });
        }
      }
    }

    if (skill === "READING") {
      const passage = (c.passage ?? c.text ?? c.readingText ?? null) as string | null;
      if (!passage || passage.trim().length < 30) {
        issues.push({ code: "MISSING_PASSAGE", detail: "READING item has no passage or passage is too short", severity: "CRITICAL" });
      }
      if (options) {
        issues.push(...audAtMcqOptions(options, skill));
      } else {
        issues.push({ code: "NO_OPTIONS", detail: "READING MCQ item has no options", severity: "CRITICAL" });
      }
    }

    if (skill === "LISTENING") {
      const audioUrl = (c.audioUrl ?? c.audio ?? c.mediaUrl ?? null) as string | null;
      const passage = (c.passage ?? c.transcript ?? null) as string | null;
      const hasAudioAsset = item.assets.some(a => /\.(mp3|wav|ogg|aac|m4a)$/i.test(a.url ?? ""));
      
      if (!audioUrl && !hasAudioAsset) {
        issues.push({ code: "MISSING_AUDIO_URL", detail: "LISTENING item has no audioUrl in content and no audio asset", severity: "CRITICAL" });
      } else if (audioUrl) {
        // Check if the audio file actually exists on disk
        const filename = audioUrl.replace(/^\/audio\//, "").toLowerCase();
        if (!availableAudio.has(filename)) {
          issues.push({ code: "AUDIO_FILE_MISSING", detail: `audioUrl="${audioUrl}" — file not found in /public/audio/`, severity: "CRITICAL" });
        }
      }
      if (!passage || passage.trim().length < 20) {
        issues.push({ code: "MISSING_TRANSCRIPT", detail: "LISTENING item has no transcript/passage", severity: "MINOR" });
      }
      if (options) {
        issues.push(...auditListeningOptions(options, correctAnswer));
      } else {
        issues.push({ code: "NO_OPTIONS", detail: "LISTENING MCQ item has no options", severity: "CRITICAL" });
      }
    }

    if (skill === "WRITING") {
      const rubric = c.scoringRubric ?? c.rubric ?? c.markingCriteria ?? null;
      const sampleAnswer = c.sampleAnswer ?? c.modelAnswer ?? null;
      const wordRange = c.wordRange as { min?: number; max?: number } | null;
      if (!rubric || (Array.isArray(rubric) && (rubric as unknown[]).length === 0)) {
        issues.push({ code: "NO_RUBRIC", detail: "WRITING item has no scoringRubric", severity: "CRITICAL" });
      }
      if (!sampleAnswer) {
        issues.push({ code: "NO_SAMPLE_ANSWER", detail: "WRITING item has no sampleAnswer/modelAnswer", severity: "MAJOR" });
      }
      if (!wordRange || !wordRange.min || !wordRange.max) {
        issues.push({ code: "NO_WORD_RANGE", detail: "WRITING item has no wordRange (min/max)", severity: "MAJOR" });
      } else if (wordRange.min >= wordRange.max) {
        issues.push({ code: "INVALID_WORD_RANGE", detail: `wordRange.min (${wordRange.min}) ≥ wordRange.max (${wordRange.max})`, severity: "MAJOR" });
      }
    }

    if (skill === "SPEAKING") {
      const rubric = c.scoringRubric ?? c.rubric ?? null;
      const prepTime = c.prepTime ?? null;
      const responseTime = c.responseTime ?? null;
      if (!rubric || (Array.isArray(rubric) && (rubric as unknown[]).length === 0)) {
        issues.push({ code: "NO_RUBRIC", detail: "SPEAKING item has no scoringRubric", severity: "CRITICAL" });
      }
      if (!prepTime && prepTime !== 0) {
        issues.push({ code: "NO_PREP_TIME", detail: "SPEAKING item has no prepTime", severity: "MINOR" });
      }
      if (!responseTime) {
        issues.push({ code: "NO_RESPONSE_TIME", detail: "SPEAKING item has no responseTime", severity: "MINOR" });
      }
    }

    // ── IRT parameter checks ────────────────────────────────────────────────────
    if (item.discrimination < 0.2) {
      issues.push({ code: "LOW_DISCRIMINATION", detail: `a = ${item.discrimination.toFixed(3)} (< 0.20 — item barely discriminates)`, severity: "MAJOR" });
    } else if (item.discrimination > 3.5) {
      issues.push({ code: "HIGH_DISCRIMINATION", detail: `a = ${item.discrimination.toFixed(3)} (> 3.50 — suspiciously high, may indicate overfit)`, severity: "MINOR" });
    }
    if (item.difficulty < -4.0 || item.difficulty > 4.0) {
      issues.push({ code: "EXTREME_DIFFICULTY", detail: `b = ${item.difficulty.toFixed(3)} — outside reasonable range [-4.0, 4.0]`, severity: "MAJOR" });
    }
    if (item.guessing < 0 || item.guessing > 0.40) {
      issues.push({ code: "BAD_GUESSING_PARAM", detail: `c = ${item.guessing.toFixed(3)} — should be in [0.0, 0.40]`, severity: "MINOR" });
    }
    // Mismatch: WRITING/SPEAKING shouldn't have guessing param > 0
    if (["WRITING", "SPEAKING"].includes(skill) && item.guessing > 0) {
      issues.push({ code: "SPURIOUS_GUESSING", detail: `c = ${item.guessing.toFixed(3)} — constructed-response items should have c=0`, severity: "MINOR" });
    }

    // ── ACTIVE items that are RETIRED items (inconsistency check) ───────────────
    // Skipped (status field already shown)

    if (issues.length > 0) {
      results.push({ itemCode: label, skill: item.skill, cefrLevel: item.cefrLevel, type: item.type, status: item.status, issues });
    }
  }

  // ── Print report ──────────────────────────────────────────────────────────────
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              ITEM BANK QUALITY AUDIT REPORT                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Aggregate by issue code
  const issueTally: Record<string, { count: number; severity: string }> = {};
  for (const r of results) {
    for (const iss of r.issues) {
      if (!issueTally[iss.code]) issueTally[iss.code] = { count: 0, severity: iss.severity };
      issueTally[iss.code].count++;
      if (iss.severity === "CRITICAL") counts.critical++;
      else if (iss.severity === "MAJOR") counts.major++;
      else counts.minor++;
    }
  }
  counts.withIssues = results.length;

  // SUMMARY TABLE
  console.log(`Total items in bank:   ${items.length}`);
  console.log(`Items with issues:     ${results.length} (${((results.length/items.length)*100).toFixed(1)}%)`);
  console.log(`Critical issues:       ${counts.critical}`);
  console.log(`Major issues:          ${counts.major}`);
  console.log(`Minor issues:          ${counts.minor}`);
  console.log("\n─── Issue breakdown ──────────────────────────────────────────────\n");
  
  const sortedTally = Object.entries(issueTally).sort((a, b) => {
    const sevOrder = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
    const sevDiff = (sevOrder[a[1].severity as keyof typeof sevOrder] ?? 2) - (sevOrder[b[1].severity as keyof typeof sevOrder] ?? 2);
    return sevDiff !== 0 ? sevDiff : b[1].count - a[1].count;
  });

  for (const [code, { count, severity }] of sortedTally) {
    const icon = severity === "CRITICAL" ? "🔴" : severity === "MAJOR" ? "🟠" : "🟡";
    console.log(`  ${icon} ${code.padEnd(30)} ${String(count).padStart(5)} items`);
  }

  // DETAIL: only CRITICAL and MAJOR items, grouped by skill
  console.log("\n\n─── Detailed findings (CRITICAL + MAJOR only) ────────────────────\n");
  
  const criticalMajor = results.filter(r => r.issues.some(i => i.severity === "CRITICAL" || i.severity === "MAJOR"));
  
  const bySkill: Record<string, ItemAuditResult[]> = {};
  for (const r of criticalMajor) {
    if (!bySkill[r.skill]) bySkill[r.skill] = [];
    bySkill[r.skill].push(r);
  }

  for (const [skill, skillItems] of Object.entries(bySkill).sort()) {
    console.log(`\n▸ ${skill} — ${skillItems.length} items with critical/major issues`);
    console.log("─".repeat(60));
    for (const r of skillItems) {
      const icon = r.status === "ACTIVE" ? "❌" : r.status === "RETIRED" ? "⚰️" : "📝";
      const critIssues = r.issues.filter(i => i.severity === "CRITICAL" || i.severity === "MAJOR");
      console.log(`  ${icon} [${r.itemCode}] ${r.cefrLevel} (${r.status})`);
      for (const iss of critIssues) {
        const bullet = iss.severity === "CRITICAL" ? "  🔴" : "  🟠";
        console.log(`${bullet} ${iss.code}: ${iss.detail}`);
      }
    }
  }

  console.log("\n\n─── Items with only MINOR issues ─────────────────────────────────\n");
  const minorOnly = results.filter(r => r.issues.every(i => i.severity === "MINOR"));
  console.log(`  ${minorOnly.length} items have minor-only issues (listed below):\n`);
  for (const r of minorOnly) {
    console.log(`  🟡 [${r.itemCode}] ${r.skill} ${r.cefrLevel}: ${r.issues.map(i => i.code).join(", ")}`);
  }

  await prisma.$disconnect();
  
  // Return counts for CI use
  console.log(`\n\nEXIT_CRITICAL=${counts.critical}`);
  console.log(`EXIT_MAJOR=${counts.major}`);
  console.log(`EXIT_MINOR=${counts.minor}`);
}

runAudit().catch(e => { console.error(e); process.exit(1); });
