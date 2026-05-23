/**
 * Full Item Audit — checks every item in the DB for:
 * 1. Missing / malformed content fields (prompt, options, passage, etc.)
 * 2. Wrong / unsupported item type for skill
 * 3. Listening items: missing audioUrl in assets or content
 * 4. Dialogue items: single-voice TTS (missing speaker metadata)
 * 5. MCQ items: missing options, bad correctIndex / correctAnswer
 * 6. FILL_IN_BLANKS: missing blank markers
 * 7. DRAG_DROP: unsupported by current UI renderers
 * 8. Speaking prompts: missing rubric or prompt
 * 9. Writing prompts: missing prompt
 * 10. Duplicate / identical prompts within same skill+level
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface Issue {
  itemId: string;
  itemCode?: string;
  skill: string;
  type: string;
  cefrLevel: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  detail: string;
}

const issues: Issue[] = [];

function flag(
  item: any,
  severity: Issue["severity"],
  category: string,
  detail: string
) {
  issues.push({
    itemId: item.id,
    itemCode: item.itemCode,
    skill: item.skill,
    type: item.type,
    cefrLevel: item.cefrLevel,
    severity,
    category,
    detail,
  });
}

async function main() {
  console.log("🔍 Fetching all items...");
  const items = await prisma.item.findMany({
    select: {
      id: true,
      itemCode: true,
      skill: true,
      type: true,
      cefrLevel: true,
      content: true,
      status: true,
      assets: { select: { id: true, type: true, url: true, metadata: true } },
      metadata: true,
    },
    where: { status: { not: "RETIRED" } },
    orderBy: [{ skill: "asc" }, { cefrLevel: "asc" }],
  });

  console.log(`📦 Total items (non-retired): ${items.length}`);

  // --- SUPPORTED types per skill ---
  const SUPPORTED_TYPES: Record<string, string[]> = {
    READING: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
    LISTENING: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
    WRITING: ["WRITING_PROMPT"],
    SPEAKING: ["SPEAKING_PROMPT"],
    GRAMMAR: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
    VOCABULARY: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
  };

  const promptSeen: Record<string, string> = {}; // prompt → itemId

  for (const item of items) {
    const c: any = item.content ?? {};
    const meta: any = item.metadata ?? {};

    // ── 1. Unsupported type for UI ──────────────────────────────────────────
    const supported = SUPPORTED_TYPES[item.skill] ?? [];
    if (!supported.includes(item.type)) {
      flag(
        item,
        "HIGH",
        "UI_TYPE_MISMATCH",
        `Type "${item.type}" has NO renderer for skill "${item.skill}". Test-takers will see a blank/broken screen.`
      );
    }

    // ── 2. Missing prompt ───────────────────────────────────────────────────
    if (!c.prompt || String(c.prompt).trim().length < 5) {
      flag(item, "CRITICAL", "MISSING_PROMPT", `Content.prompt is empty or too short: "${c.prompt}"`);
    }

    // ── 3. MCQ: options / correctIndex ──────────────────────────────────────
    if (item.type === "MULTIPLE_CHOICE") {
      const opts: any[] = c.options ?? c.choices ?? [];
      if (!Array.isArray(opts) || opts.length < 2) {
        flag(item, "CRITICAL", "MCQ_BAD_OPTIONS", `Only ${opts.length} option(s) — needs ≥ 2.`);
      } else if (opts.length < 4 && item.skill !== "WRITING") {
        flag(item, "MEDIUM", "MCQ_FEW_OPTIONS", `Only ${opts.length} options — standard is 4.`);
      }

      const hasCorrect =
        c.correctAnswer !== undefined ||
        c.correctIndex !== undefined ||
        c.correct !== undefined ||
        opts.some((o: any) => o.isCorrect === true || o.correct === true);

      if (!hasCorrect) {
        flag(item, "CRITICAL", "MCQ_NO_CORRECT_ANSWER", "No correct answer marked (correctAnswer / correctIndex / isCorrect missing).");
      }

      // correctIndex out of bounds
      if (c.correctIndex !== undefined) {
        const idx = Number(c.correctIndex);
        if (isNaN(idx) || idx < 0 || idx >= opts.length) {
          flag(item, "CRITICAL", "MCQ_CORRECT_INDEX_OOB", `correctIndex=${c.correctIndex} is out of bounds (${opts.length} options).`);
        }
      }
    }

    // ── 4. READING: needs a passage ─────────────────────────────────────────
    if (item.skill === "READING" && item.type === "MULTIPLE_CHOICE") {
      if (!c.passage && !c.text && !c.context) {
        flag(item, "HIGH", "READING_NO_PASSAGE", "Reading MCQ has no passage/text/context field — test-taker has nothing to read.");
      }
    }

    // ── 5. LISTENING: needs audio ───────────────────────────────────────────
    if (item.skill === "LISTENING") {
      const hasAudioAsset = item.assets.some(
        (a: any) => a.type === "AUDIO" && a.url && a.url.trim().length > 0
      );
      const hasAudioUrl =
        (c.audioUrl && c.audioUrl.trim().length > 0) ||
        (c.audio && c.audio.trim().length > 0);

      if (!hasAudioAsset && !hasAudioUrl) {
        flag(item, "CRITICAL", "LISTENING_NO_AUDIO", "No audio asset or audioUrl — test-taker has nothing to listen to.");
      } else {
        // ── 5a. Dialogue: single-voice check ──────────────────────────────
        const audioAsset = item.assets.find((a: any) => a.type === "AUDIO");
        const assetMeta: any = audioAsset?.metadata ?? {};

        const isDialogue =
          assetMeta.isDialogue === true ||
          assetMeta.speakers ||
          (c.speakers && Array.isArray(c.speakers)) ||
          (c.script && Array.isArray(c.script)) ||
          (c.transcript && c.transcript.toLowerCase().includes(":")) ||
          (c.prompt &&
            (c.prompt.toLowerCase().includes("conversation") ||
              c.prompt.toLowerCase().includes("dialogue") ||
              c.prompt.toLowerCase().includes("two people") ||
              c.prompt.toLowerCase().includes("speakers")));

        if (isDialogue) {
          const hasSpeakerMeta =
            assetMeta.speakers ||
            assetMeta.speakerA ||
            (c.speakers && c.speakers.length >= 2) ||
            (c.script && c.script.length >= 2);

          if (!hasSpeakerMeta) {
            flag(
              item,
              "HIGH",
              "DIALOGUE_SINGLE_VOICE",
              "Item appears to be a dialogue but has no multi-speaker TTS metadata (assetMeta.speakers / content.speakers). Both speakers will sound identical."
            );
          }
        }

        // ── 5b. Audio URL validity (relative path check) ──────────────────
        const url = c.audioUrl || c.audio || audioAsset?.url || "";
        if (url && !url.startsWith("/") && !url.startsWith("http") && !url.startsWith("data:")) {
          flag(item, "MEDIUM", "AUDIO_URL_SUSPICIOUS", `Audio URL doesn't look valid: "${url.slice(0, 80)}"`);
        }
      }
    }

    // ── 6. FILL_IN_BLANKS: blank marker ─────────────────────────────────────
    if (item.type === "FILL_IN_BLANKS") {
      const text = c.prompt || c.sentence || c.text || "";
      const hasBlank = /_{2,}|\[_+\]|\[\s*BLANK\s*\]/i.test(text) || text.includes("___") || text.includes("{{blank}}");
      if (!hasBlank) {
        flag(item, "HIGH", "FIB_NO_BLANK_MARKER", `Fill-in-the-blank item has no blank marker (____ / [BLANK] / {{blank}}) in prompt.`);
      }
      if (!c.correctAnswer && !c.answers && !(c.options?.length)) {
        flag(item, "CRITICAL", "FIB_NO_ANSWER", "Fill-in-the-blank item has no correctAnswer or answers array.");
      }
    }

    // ── 7. SPEAKING: needs rubric ────────────────────────────────────────────
    if (item.type === "SPEAKING_PROMPT") {
      if (!c.rubric && !c.criteria) {
        flag(item, "MEDIUM", "SPEAKING_NO_RUBRIC", "Speaking prompt has no rubric/criteria — AI scorer has no guidelines.");
      }
    }

    // ── 8. WRITING: needs minimum word count or rubric ───────────────────────
    if (item.type === "WRITING_PROMPT") {
      if (!c.minWords && !c.wordLimit && !c.rubric) {
        flag(item, "LOW", "WRITING_NO_CONSTRAINTS", "Writing prompt has no minWords, wordLimit, or rubric.");
      }
    }

    // ── 9. Duplicate prompt ──────────────────────────────────────────────────
    const promptKey = `${item.skill}|${item.cefrLevel}|${String(c.prompt || "").trim().slice(0, 120)}`;
    if (c.prompt && promptSeen[promptKey]) {
      flag(item, "MEDIUM", "DUPLICATE_PROMPT",
        `Identical prompt to item ${promptSeen[promptKey]} within same skill+level.`
      );
    } else if (c.prompt) {
      promptSeen[promptKey] = item.id;
    }

    // ── 10. Status / active mismatch ─────────────────────────────────────────
    if (item.status === "RETIRED") {
      // Retired items are expected to not be served — no action needed unless they lack content
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const bySeverity = {
    CRITICAL: issues.filter((i) => i.severity === "CRITICAL"),
    HIGH: issues.filter((i) => i.severity === "HIGH"),
    MEDIUM: issues.filter((i) => i.severity === "MEDIUM"),
    LOW: issues.filter((i) => i.severity === "LOW"),
  };

  const byCategory: Record<string, number> = {};
  for (const issue of issues) {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  const bySkill: Record<string, number> = {};
  for (const issue of issues) {
    bySkill[issue.skill] = (bySkill[issue.skill] || 0) + 1;
  }

  console.log("\n========================================================");
  console.log("                  ITEM AUDIT REPORT");
  console.log("========================================================");
  console.log(`Total items audited : ${items.length}`);
  console.log(`Total issues found  : ${issues.length}`);
  console.log(`  🔴 CRITICAL : ${bySeverity.CRITICAL.length}`);
  console.log(`  🟠 HIGH     : ${bySeverity.HIGH.length}`);
  console.log(`  🟡 MEDIUM   : ${bySeverity.MEDIUM.length}`);
  console.log(`  🟢 LOW      : ${bySeverity.LOW.length}`);

  console.log("\n── By Category ──────────────────────────────────────────");
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(30)} ${count}`);
  }

  console.log("\n── By Skill ─────────────────────────────────────────────");
  for (const [skill, count] of Object.entries(bySkill).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${skill.padEnd(20)} ${count}`);
  }

  console.log("\n── CRITICAL Issues ──────────────────────────────────────");
  for (const issue of bySeverity.CRITICAL.slice(0, 80)) {
    console.log(`  [${issue.skill}/${issue.type}/${issue.cefrLevel}] ${issue.itemCode || issue.itemId.slice(0,12)} — ${issue.category}: ${issue.detail}`);
  }
  if (bySeverity.CRITICAL.length > 80) console.log(`  ... and ${bySeverity.CRITICAL.length - 80} more`);

  console.log("\n── HIGH Issues ──────────────────────────────────────────");
  for (const issue of bySeverity.HIGH.slice(0, 60)) {
    console.log(`  [${issue.skill}/${issue.type}/${issue.cefrLevel}] ${issue.itemCode || issue.itemId.slice(0,12)} — ${issue.category}: ${issue.detail}`);
  }
  if (bySeverity.HIGH.length > 60) console.log(`  ... and ${bySeverity.HIGH.length - 60} more`);

  console.log("\n── MEDIUM Issues (first 40) ─────────────────────────────");
  for (const issue of bySeverity.MEDIUM.slice(0, 40)) {
    console.log(`  [${issue.skill}/${issue.type}/${issue.cefrLevel}] ${issue.itemCode || issue.itemId.slice(0,12)} — ${issue.category}: ${issue.detail}`);
  }
  if (bySeverity.MEDIUM.length > 40) console.log(`  ... and ${bySeverity.MEDIUM.length - 40} more`);

  // ── Sample bad items for each category ────────────────────────────────────
  console.log("\n── DRAG_DROP items (UI unsupported) ─────────────────────");
  for (const issue of issues.filter(i => i.category === "UI_TYPE_MISMATCH").slice(0, 20)) {
    console.log(`  ${issue.itemCode || issue.itemId.slice(0,12)} [${issue.skill}/${issue.cefrLevel}] — ${issue.detail}`);
  }

  console.log("\n── DIALOGUE items with single voice ─────────────────────");
  for (const issue of issues.filter(i => i.category === "DIALOGUE_SINGLE_VOICE").slice(0, 30)) {
    console.log(`  ${issue.itemCode || issue.itemId.slice(0,12)} [${issue.cefrLevel}]`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
