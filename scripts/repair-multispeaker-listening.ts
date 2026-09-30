/**
 * Repairs active/pretest listening audio that was generated from a dialogue
 * after speaker labels had been stripped from ttsScript.
 *
 * Safe defaults:
 *   npx tsx scripts/repair-multispeaker-listening.ts          # dry run
 *   APPLY=1 LIMIT=1 npx tsx scripts/repair-multispeaker-listening.ts
 *   APPLY=1 npx tsx scripts/repair-multispeaker-listening.ts  # all eligible groups
 *
 * Existing database content and overwritten WAV files are backed up in reports/.
 * Material with more than two speakers is reported but not generated because
 * Gemini multi-speaker TTS currently accepts at most two speaker configurations.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  detectSpeakers,
  generateListeningAudio,
  resolveListeningScript,
} from "../src/lib/audio/tts-generator.js";

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === "1";
const LIMIT = Math.max(0, Number(process.env.LIMIT) || 0);
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const REPORT_DIR = path.join(process.cwd(), "reports");

function contentOf(value: Prisma.JsonValue): Record<string, any> {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, any>;
}

function sourceSpeakerCount(content: Record<string, any>): number {
  const declared = Number(content.numberOfSpeakers) || 0;
  const listed = Array.isArray(content.speakers) ? content.speakers.length : 0;
  const source = resolveListeningScript(content);
  return Math.max(declared, listed, detectSpeakers(source).length);
}

function outputKey(item: any, content: Record<string, any>): string {
  const audioUrl = typeof content.audioUrl === "string" ? content.audioUrl : "";
  const fileName = audioUrl.startsWith("/audio/") ? path.basename(audioUrl, path.extname(audioUrl)) : "";
  const raw = fileName || content.moduleId || `listening-${item.id}`;
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const items = await prisma.item.findMany({
    where: { skill: "LISTENING", status: { in: ["ACTIVE", "PRETEST"] } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      itemCode: true,
      cefrLevel: true,
      status: true,
      pipelineStage: true,
      content: true,
    },
  });

  const skippedTooManySpeakers: any[] = [];
  const groups = new Map<string, { source: string; items: any[]; productLine?: string }>();

  for (const item of items) {
    const content = contentOf(item.content);
    const source = resolveListeningScript(content);
    const expected = sourceSpeakerCount(content);
    const currentTtsSpeakers = detectSpeakers(String(content.ttsScript || "")).length;
    if (expected < 2 || currentTtsSpeakers >= 2) continue;

    const sourceSpeakers = detectSpeakers(source);
    if (sourceSpeakers.length !== 2) {
      skippedTooManySpeakers.push({
        id: item.id,
        itemCode: item.itemCode,
        expected,
        detectedInSource: sourceSpeakers,
      });
      continue;
    }

    const key = outputKey(item, content);
    const existing = groups.get(key);
    if (existing && existing.source !== source) {
      skippedTooManySpeakers.push({
        id: item.id,
        itemCode: item.itemCode,
        expected,
        detectedInSource: sourceSpeakers,
        reason: `Conflicting scripts share output key ${key}`,
      });
      continue;
    }
    if (!existing) groups.set(key, { source, items: [], productLine: content.productLine });
    groups.get(key)!.items.push(item);
  }

  const orderedGroups = [...groups.entries()].sort(([, left], [, right]) => {
    const leftMissing = left.items.some((item) => !contentOf(item.content).audioUrl) ? 0 : 1;
    const rightMissing = right.items.some((item) => !contentOf(item.content).audioUrl) ? 0 : 1;
    return leftMissing - rightMissing;
  });
  const selectedGroups = LIMIT > 0 ? orderedGroups.slice(0, LIMIT) : orderedGroups;

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    eligibleGroups: orderedGroups.length,
    eligibleItems: orderedGroups.reduce((sum, [, group]) => sum + group.items.length, 0),
    selectedGroups: selectedGroups.length,
    skippedItems: skippedTooManySpeakers.length,
  }, null, 2));

  if (!APPLY) {
    for (const [key, group] of selectedGroups) {
      console.log(`[DRY] ${key}: ${group.items.length} item(s), speakers=${detectSpeakers(group.source).join(" + ")}`);
    }
    if (skippedTooManySpeakers.length > 0) {
      console.log("Skipped for editorial/multi-voice production:", skippedTooManySpeakers);
    }
    return;
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const audioBackupDir = path.join(REPORT_DIR, `audio-backup-${stamp}`);
  fs.mkdirSync(audioBackupDir, { recursive: true });
  const selectedItems = selectedGroups.flatMap(([, group]) => group.items);
  fs.writeFileSync(
    path.join(REPORT_DIR, `listening-repair-backup-${stamp}.json`),
    `${JSON.stringify({ createdAt: new Date().toISOString(), items: selectedItems }, null, 2)}\n`,
  );

  let repairedGroups = 0;
  let repairedItems = 0;
  const failures: Array<{ key: string; error: string }> = [];

  for (const [key, group] of selectedGroups) {
    const targetPath = path.join(PUBLIC_AUDIO_DIR, `${key}.wav`);
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, path.join(audioBackupDir, `${key}.wav`));
    }

    try {
      const result = await generateListeningAudio({
        moduleId: key,
        ttsScript: group.source,
        cefrLevel: group.items[0].cefrLevel,
        productLine: group.productLine,
        outputDir: PUBLIC_AUDIO_DIR,
      });
      const generatedAt = new Date().toISOString();
      await prisma.$transaction(
        group.items.map((item) => {
          const content = contentOf(item.content);
          return prisma.item.update({
            where: { id: item.id },
            data: {
              content: {
                ...content,
                ttsScript: group.source,
                audioUrl: result.audioUrl,
                audioMetadata: {
                  speakerCount: 2,
                  speakers: detectSpeakers(group.source),
                  voiceName: result.voiceName,
                  durationSeconds: result.durationSeconds,
                  generatedAt,
                },
              },
            },
          });
        }),
      );
      repairedGroups++;
      repairedItems += group.items.length;
      console.log(`[OK] ${key}: ${group.items.length} item(s), ${result.voiceName}, ${result.durationSeconds}s`);
    } catch (error: any) {
      failures.push({ key, error: error?.message || String(error) });
      console.error(`[ERROR] ${key}: ${error?.message || error}`);
    }
    await sleep(4_000);
  }

  fs.writeFileSync(
    path.join(REPORT_DIR, `listening-repair-result-${stamp}.json`),
    `${JSON.stringify({ repairedGroups, repairedItems, failures, skippedTooManySpeakers }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ repairedGroups, repairedItems, failures, skippedTooManySpeakers }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
