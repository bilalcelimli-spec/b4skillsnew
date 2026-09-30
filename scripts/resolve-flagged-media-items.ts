/**
 * Resolves the quarantined multi-participant listening items and the missing
 * PRE-A1 visual stimulus. Dry-run by default; use APPLY=1 to write.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  collapseDialogueToTwoVoices,
  generateListeningAudio,
  resolveListeningScript,
} from "../src/lib/audio/tts-generator.js";

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === "1";
const REPORT_DIR = path.join(process.cwd(), "reports");
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const VISUAL_ITEM_ID = "cmoukelbo000bnu8bybm60pn8";
const LISTENING_IDS = [
  "cmor7bagk00004ydn55pfour1",
  "cmor7bann00014ydnyir5ijbs",
  "cmor7baxo00044ydnvcaqs3pp",
  "cmor7bb1k00054ydns51wlef7",
  "cmor7bh6200004yhh1uqmo9nr",
  "cmor7bhae00014yhhjzk99qrl",
  "cmor7bhcy00024yhhns7bseee",
  "cmos6ds6i000gnu1fvqfbc5qw",
  "cmox3qguo001cnuqn72ylb05v",
  "cmpirgazk0010nufa9tji8j8y",
];

function objectOf(value: Prisma.JsonValue | null): Record<string, any> {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, any>;
}

function outputKey(item: any, content: Record<string, any>): string {
  const audioUrl = typeof content.audioUrl === "string" ? content.audioUrl : "";
  const fileName = audioUrl.startsWith("/audio/") ? path.basename(audioUrl, path.extname(audioUrl)) : "";
  return String(fileName || content.moduleId || `listening-${item.id}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

async function main() {
  const items = await prisma.item.findMany({
    where: { id: { in: [...LISTENING_IDS, VISUAL_ITEM_ID] } },
    select: {
      id: true,
      itemCode: true,
      cefrLevel: true,
      status: true,
      pipelineStage: true,
      content: true,
      metadata: true,
    },
  });
  const listeningItems = items.filter((item) => LISTENING_IDS.includes(item.id));
  const visualItem = items.find((item) => item.id === VISUAL_ITEM_ID);
  const groups = new Map<string, { source: string; items: typeof listeningItems; productLine?: string }>();

  for (const item of listeningItems) {
    const content = objectOf(item.content);
    const source = resolveListeningScript(content);
    const key = outputKey(item, content);
    const existing = groups.get(key);
    if (existing && existing.source !== source) throw new Error(`Conflicting source scripts for ${key}`);
    if (!existing) groups.set(key, { source, items: [], productLine: content.productLine });
    groups.get(key)!.items.push(item);
  }

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    listeningGroups: groups.size,
    listeningItems: listeningItems.length,
    visualItemFound: Boolean(visualItem),
    groups: [...groups.entries()].map(([key, group]) => ({
      key,
      itemCount: group.items.length,
      mapping: collapseDialogueToTwoVoices(group.source).voiceMapping,
    })),
  }, null, 2));
  if (!APPLY) return;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(REPORT_DIR, `audio-backup-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, `flagged-media-backup-${stamp}.json`),
    `${JSON.stringify({ createdAt: new Date().toISOString(), items }, null, 2)}\n`,
  );

  let repairedListeningItems = 0;
  for (const [key, group] of groups) {
    const targetPath = path.join(PUBLIC_AUDIO_DIR, `${key}.wav`);
    if (fs.existsSync(targetPath)) fs.copyFileSync(targetPath, path.join(backupDir, `${key}.wav`));
    const dialogue = collapseDialogueToTwoVoices(group.source);
    const result = await generateListeningAudio({
      moduleId: key,
      ttsScript: dialogue.script,
      cefrLevel: group.items[0].cefrLevel,
      productLine: group.productLine,
      outputDir: PUBLIC_AUDIO_DIR,
    });
    const resolvedAt = new Date().toISOString();
    await prisma.$transaction(group.items.map((item) => {
      const content = objectOf(item.content);
      const metadata = objectOf(item.metadata);
      const audit = objectOf(metadata.contentAudit ?? null);
      return prisma.item.update({
        where: { id: item.id },
        data: {
          status: (audit.previousStatus || "ACTIVE") as any,
          pipelineStage: (audit.previousPipelineStage || "AI_DRAFT") as any,
          content: {
            ...content,
            ttsScript: dialogue.script,
            audioUrl: result.audioUrl,
            audioMetadata: {
              originalSpeakerCount: dialogue.originalSpeakers.length,
              generatedVoiceCount: 2,
              originalSpeakers: dialogue.originalSpeakers,
              voiceMapping: dialogue.voiceMapping,
              voiceName: result.voiceName,
              durationSeconds: result.durationSeconds,
              generatedAt: resolvedAt,
            },
          },
          metadata: {
            ...metadata,
            contentAudit: {
              ...audit,
              action: "MULTI_PARTICIPANT_AUDIO_RESOLVED",
              resolvedAt,
            },
          },
        },
      });
    }));
    repairedListeningItems += group.items.length;
    console.log(`[OK] ${key}: ${group.items.length} item(s), ${dialogue.originalSpeakers.length} participants → 2 voices`);
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }

  if (visualItem) {
    const content = objectOf(visualItem.content);
    const metadata = objectOf(visualItem.metadata);
    const audit = objectOf(metadata.contentAudit ?? null);
    await prisma.item.update({
      where: { id: visualItem.id },
      data: {
        status: (audit.previousStatus || "ACTIVE") as any,
        pipelineStage: (audit.previousPipelineStage || "AI_DRAFT") as any,
        content: {
          ...content,
          imageUrl: "/images/assessment/cat-pre-a1.svg",
          imageAlt: "A friendly orange cat sitting on a pale blue background",
        },
        metadata: {
          ...metadata,
          contentAudit: { ...audit, action: "VISUAL_STIMULUS_RESOLVED", resolvedAt: new Date().toISOString() },
        },
      },
    });
  }

  console.log(JSON.stringify({ repairedListeningItems, repairedVisualItems: visualItem ? 1 : 0 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
