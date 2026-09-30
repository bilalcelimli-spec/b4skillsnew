/**
 * Read-only editorial audit for ACTIVE/PRETEST items.
 *
 * Checks every deliverable item for:
 * - multi-speaker listening scripts collapsed into a single TTS voice
 * - missing/broken local listening audio references
 * - single-response items that ask more than one explicit question
 * - response prompts whose requested information load is high for the limit
 * - basic option/key integrity
 *
 * Usage: npx tsx scripts/audit-active-item-content.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PAGE_SIZE = 40;
const REPORT_DIR = path.join(process.cwd(), "reports");

type Severity = "BLOCKER" | "REVIEW";

interface Finding {
  severity: Severity;
  rule: string;
  itemCode: string;
  itemId: string;
  skill: string;
  cefrLevel: string;
  moduleId: string;
  mediaUrl: string;
  prompt: string;
  evidence: string;
}

const responseVerbs = [
  "compare", "describe", "discuss", "evaluate", "explain", "give", "identify",
  "justify", "mention", "outline", "provide", "recommend", "state", "suggest",
  "summarize", "summarise",
];
const responseVerbPattern = responseVerbs.join("|");

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function promptOf(content: Record<string, any>): string {
  return text(content.prompt || content.question || content.stem || content.task);
}

function speakerLabels(value: unknown): string[] {
  const labels = new Set<string>();
  for (const line of text(value).split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Za-z.' -]{0,48}):\s+\S/);
    if (match) labels.add(match[1].trim());
  }
  return [...labels];
}

function expectedSpeakerCount(content: Record<string, any>): number {
  const declared = Number(content.numberOfSpeakers) || 0;
  const listed = Array.isArray(content.speakers) ? content.speakers.length : 0;
  const source = content.transcript || content.passage || content.script || "";
  const labelled = speakerLabels(source).length;
  const annotation = /\b(?:two|2)\s+(?:people|speakers|voices)\b/i.test(text(source)) ? 2 : 0;
  return Math.max(declared, listed, labelled, annotation);
}

function explicitDemandCount(prompt: string): number {
  const questionCount = (prompt.match(/\?/g) || []).length;
  const followUpCount = (prompt.match(
    new RegExp(`\\b(?:and|then)\\s+(?:${responseVerbPattern})\\b`, "gi"),
  ) || []).length;
  const bulletCount = (prompt.match(/(?:^|\n)\s*(?:[-•]|\d+[.)])\s+/g) || []).length;
  return Math.max(1, questionCount) + followUpCount + Math.max(0, bulletCount - 1);
}

function addFinding(
  findings: Finding[],
  item: any,
  rule: string,
  severity: Severity,
  evidence: string,
) {
  const content = (item.content || {}) as Record<string, any>;
  findings.push({
    severity,
    rule,
    itemCode: item.itemCode || "(no-code)",
    itemId: item.id,
    skill: item.skill,
    cefrLevel: item.cefrLevel,
    moduleId: text(content.moduleId),
    mediaUrl: text(content.audioUrl || content.imageUrl),
    prompt: promptOf(content),
    evidence,
  });
}

async function fetchAllItems(): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await prisma.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] } },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        itemCode: true,
        type: true,
        skill: true,
        cefrLevel: true,
        status: true,
        content: true,
      },
    });
    if (page.length === 0) break;
    items.push(...page);
    cursor = page.at(-1)!.id;
    process.stderr.write(`Audited source rows: ${items.length}\r`);
    if (page.length < PAGE_SIZE) break;
  }

  process.stderr.write("\n");
  return items;
}

function audit(items: any[]): Finding[] {
  const findings: Finding[] = [];

  for (const item of items) {
    const content = (item.content || {}) as Record<string, any>;
    const prompt = promptOf(content);
    const options = Array.isArray(content.options) ? content.options : [];

    if (!prompt) {
      addFinding(findings, item, "MISSING_PROMPT", "BLOCKER", "No prompt, question, stem, or task field.");
    }

    if (options.length > 0) {
      const correctCount = options.filter((option: any) => option?.isCorrect === true).length;
      if (correctCount !== 1 && !/select all|choose (?:two|three|all)/i.test(prompt)) {
        addFinding(
          findings,
          item,
          "SINGLE_SELECT_KEY_COUNT",
          "BLOCKER",
          `Single-response item has ${correctCount} explicitly correct options.`,
        );
      }
    }

    if (item.skill === "LISTENING") {
      const expected = expectedSpeakerCount(content);
      const ttsLabels = speakerLabels(content.ttsScript);
      if (expected >= 2 && ttsLabels.length < 2) {
        addFinding(
          findings,
          item,
          "MULTI_SPEAKER_TTS_COLLAPSED",
          "BLOCKER",
          `Source declares/detects ${expected} speakers, but ttsScript preserves ${ttsLabels.length} speaker labels; the TTS pipeline will select one voice.`,
        );
      }

      const audioUrl = text(content.audioUrl);
      if (!audioUrl) {
        addFinding(findings, item, "LISTENING_AUDIO_MISSING", "BLOCKER", "No audioUrl is present.");
      } else if (audioUrl.startsWith("/audio/")) {
        const audioPath = path.join(process.cwd(), "public", audioUrl);
        if (!fs.existsSync(audioPath)) {
          addFinding(
            findings,
            item,
            "LISTENING_AUDIO_FILE_MISSING",
            "BLOCKER",
            `Referenced local file does not exist: ${audioUrl}`,
          );
        }
      }
    }

    if (prompt) {
      const demands = explicitDemandCount(prompt);
      if (["SPEAKING", "WRITING"].includes(item.skill)) {
        const responseTime = Number(content.responseTime || content.responseTimeSec || 0);
        const maxWords = Number(content.maxWords || content.wordLimit || 0);
        const speakingOverload = item.skill === "SPEAKING"
          && ((responseTime > 0 && responseTime <= 45 && demands >= 4)
            || (responseTime > 45 && responseTime <= 60 && demands >= 5));
        const writingOverload = item.skill === "WRITING"
          && ((item.cefrLevel === "PRE_A1" && maxWords > 0 && maxWords <= 30 && demands >= 4)
            || (item.cefrLevel === "A1" && maxWords > 0 && maxWords <= 60 && demands >= 5)
            || (item.cefrLevel === "A2" && maxWords > 0 && maxWords <= 80 && demands >= 6)
            || (item.cefrLevel === "B1" && maxWords > 0 && maxWords <= 120 && demands >= 6));
        if (speakingOverload || writingOverload) {
          addFinding(
            findings,
            item,
            "RESPONSE_LOAD_EXCEEDS_LIMIT",
            "REVIEW",
            `Prompt requests ${demands} pieces of information within ${responseTime ? `${responseTime}s` : `${maxWords} words`}.`,
          );
        }

        const examinerTurns = (prompt.match(/(?:^|\n)\s*Examiner(?:\s*\([^)]*\))?\s*:/gim) || []).length;
        if (item.skill === "SPEAKING" && examinerTurns >= 2) {
          addFinding(
            findings,
            item,
            "INTERACTIVE_DIALOGUE_IN_SINGLE_RECORDING",
            "REVIEW",
            `Prompt contains ${examinerTurns} examiner turns, but delivery captures one uninterrupted candidate recording.`,
          );
        }
      }


      const requiresVisual = /\[(?:image|picture)(?:\s+description)?\s*:/i.test(prompt)
        || /\blook at (?:this|the|these (?:two )?)pictures?\b/i.test(prompt);
      const optionHasImage = options.some((option: any) => text(option?.imageUrl));
      if (requiresVisual && !text(content.imageUrl) && !optionHasImage) {
        addFinding(
          findings,
          item,
          "VISUAL_STIMULUS_NOT_RENDERABLE",
          "BLOCKER",
          "Prompt refers to a picture or contains an image placeholder, but no renderable imageUrl is present.",
        );
      }
    }
  }

  return findings;
}

function markdown(items: any[], findings: Finding[]): string {
  const bySkill = [...new Set(items.map((item) => item.skill))]
    .sort()
    .map((skill) => `- ${skill}: ${items.filter((item) => item.skill === skill).length}`)
    .join("\n");
  const byRule = [...new Set(findings.map((finding) => finding.rule))]
    .sort()
    .map((rule) => `- ${rule}: ${findings.filter((finding) => finding.rule === rule).length}`)
    .join("\n");
  const details = findings.map((finding) => [
    `### ${finding.severity} · ${finding.rule} · ${finding.itemCode}`,
    "",
    `- ID: \`${finding.itemId}\``,
    `- Skill / CEFR: ${finding.skill} / ${finding.cefrLevel}`,
    `- Module: ${finding.moduleId || "(none)"}`,
    `- Media: ${finding.mediaUrl || "(none)"}`,
    `- Evidence: ${finding.evidence}`,
    `- Prompt: ${finding.prompt || "(missing)"}`,
  ].join("\n")).join("\n\n");

  return [
    "# Active Item Content Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Scope: ${items.length} ACTIVE/PRETEST items`,
    `Findings: ${findings.length} (${findings.filter((f) => f.severity === "BLOCKER").length} blockers, ${findings.filter((f) => f.severity === "REVIEW").length} reviews)`,
    "",
    "## Inventory",
    "",
    bySkill,
    "",
    "## Findings by rule",
    "",
    byRule || "- No findings",
    "",
    "## Item-level evidence",
    "",
    details || "No findings.",
    "",
  ].join("\n");
}

async function main() {
  const items = await fetchAllItems();
  const findings = audit(items);
  const multiSpeakerFindings = findings.filter((finding) => finding.rule === "MULTI_SPEAKER_TTS_COLLAPSED");
  const affectedListeningRecordings = new Set(
    multiSpeakerFindings.map((finding) => finding.mediaUrl || finding.moduleId || finding.itemId),
  );
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, "active-item-content-audit.json");
  const markdownPath = path.join(REPORT_DIR, "active-item-content-audit.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), itemCount: items.length, findings }, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdown(items, findings));

  console.log(JSON.stringify({
    itemCount: items.length,
    blockerCount: findings.filter((finding) => finding.severity === "BLOCKER").length,
    reviewCount: findings.filter((finding) => finding.severity === "REVIEW").length,
    affectedListeningItemCount: multiSpeakerFindings.length,
    affectedListeningRecordingCount: affectedListeningRecordings.size,
    byRule: Object.fromEntries(
      [...new Set(findings.map((finding) => finding.rule))]
        .sort()
        .map((rule) => [rule, findings.filter((finding) => finding.rule === rule).length]),
    ),
    reports: { jsonPath, markdownPath },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
