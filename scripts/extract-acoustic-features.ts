#!/usr/bin/env ts-node
/**
 * Batch Acoustic Feature Extraction Script
 *
 * Processes historical SPEAKING responses to extract and cache acoustic features.
 * Supports dry-run mode, date filtering, and resumption from last processed response.
 *
 * Usage:
 *   npx ts-node scripts/extract-acoustic-features.ts [options]
 *
 * Options:
 *   --dry-run              Preview changes without database modifications
 *   --from YYYY-MM-DD      Start date for response filtering
 *   --to YYYY-MM-DD        End date for response filtering
 *   --batch-size N         Process N responses at a time (default: 10)
 *   --resume-after ID      Resume processing after response with given ID
 *   --max-errors N         Stop after N errors (default: 5)
 */

import { prisma } from "../src/lib/prisma.js";
import { AcousticAnalyzer, type AudioFeatures } from "../src/lib/scoring/acoustic-analyzer.js";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10);
const MAX_ERRORS = Number(process.env.MAX_ERRORS || 5);
const RESUME_AFTER = process.env.RESUME_AFTER || null;
const FROM_DATE = process.env.FROM_DATE || process.argv.find(arg => arg.startsWith("--from="))?.split("=")[1] || null;
const TO_DATE = process.env.TO_DATE || process.argv.find(arg => arg.startsWith("--to="))?.split("=")[1] || null;

const STATE_FILE = path.join(process.cwd(), ".acoustic-extraction-state.json");

interface ExtractionState {
  lastProcessedId: string | null;
  totalProcessed: number;
  totalErrors: number;
  lastError?: string;
  startTime: string;
  endTime?: string;
}

// ─── State Management ─────────────────────────────────────────────────────

function loadState(): ExtractionState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch (e) {
      console.warn("Could not load state file, starting fresh");
    }
  }
  return {
    lastProcessedId: RESUME_AFTER || null,
    totalProcessed: 0,
    totalErrors: 0,
    startTime: new Date().toISOString(),
  };
}

function saveState(state: ExtractionState) {
  if (!DRY_RUN) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  }
}

// ─── Logging ──────────────────────────────────────────────────────────────

function log(msg: string, type: "info" | "warn" | "error" | "success" = "info") {
  const prefix = {
    info: "ℹ️ ",
    warn: "⚠️  ",
    error: "❌ ",
    success: "✅ ",
  }[type];

  console.log(`${prefix} ${msg}`);
}

// ─── Main Processing ─────────────────────────────────────────────────────

async function extractAcousticFeatures() {
  const state = loadState();

  log(`Starting acoustic feature extraction (dry-run: ${DRY_RUN})`);
  log(`Batch size: ${BATCH_SIZE}, Max errors: ${MAX_ERRORS}`);

  if (FROM_DATE) log(`Date range: ${FROM_DATE} to ${TO_DATE || "now"}`);
  if (state.lastProcessedId) log(`Resuming from: ${state.lastProcessedId}`);

  try {
    // Query responses with audio data and transcript
    const whereClause: any = {
      type: "SPEAKING",
      audio: { not: null },
    };

    // Add date filtering if provided
    if (FROM_DATE || TO_DATE) {
      whereClause.createdAt = {};
      if (FROM_DATE) whereClause.createdAt.gte = new Date(FROM_DATE);
      if (TO_DATE) whereClause.createdAt.lte = new Date(TO_DATE);
    }

    // Query with pagination support
    let cursor = state.lastProcessedId ? { id: state.lastProcessedId } : undefined;
    let skip = cursor ? 1 : 0; // Skip the resume point itself

    let continueProcessing = true;

    while (continueProcessing) {
      const responses = await prisma.response.findMany({
        where: whereClause,
        cursor,
        skip,
        take: BATCH_SIZE,
        select: {
          id: true,
          audio: true,
          transcript: true,
          createdAt: true,
          sessionId: true,
        } as any,
      });

      if (responses.length === 0) {
        log("No more responses to process", "success");
        continueProcessing = false;
        break;
      }

      for (const response of responses) {
        try {
          const audioBuffer = Buffer.from((response as any).audio as Buffer);
          const audioBase64 = audioBuffer.toString("base64");
          const transcript = ((response as any).transcript || "").trim();

          // Skip if no transcript
          if (!transcript) {
            log(
              `Skipping ${response.id} (no transcript)`,
              "warn"
            );
            state.lastProcessedId = response.id;
            saveState(state);
            continue;
          }

          // Extract acoustic features
          const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

          // Store features in database
          if (!DRY_RUN) {
            await prisma.response.update({
              where: { id: response.id },
              data: {
                acousticFeatures: features,
              } as any,
            });
          }

          state.totalProcessed++;
          state.lastProcessedId = response.id;
          saveState(state);

          log(
            `[${state.totalProcessed}] Processed ${response.id} | ` +
            `SR: ${Math.round(features.speechRate)} wpm | ` +
            `Pitch: ${features.pitchVariation} | ` +
            `Quality: ${features.audioQuality}`,
            "success"
          );
        } catch (error) {
          state.totalErrors++;
          state.lastError = String(error);
          saveState(state);

          log(
            `Error processing ${response.id}: ${error instanceof Error ? error.message : String(error)}`,
            "error"
          );

          if (state.totalErrors >= MAX_ERRORS) {
            log(`Hit max error limit (${MAX_ERRORS}), stopping`, "error");
            continueProcessing = false;
            break;
          }
        }
      }

      // Check if there are more responses
      if (responses.length < BATCH_SIZE) {
        continueProcessing = false;
      } else {
        // Set cursor for next batch
        cursor = { id: responses[responses.length - 1].id };
        skip = 1;
      }
    }

    // Final summary
    state.endTime = new Date().toISOString();
    saveState(state);

    log("", "info");
    log("═".repeat(60), "info");
    log("EXTRACTION SUMMARY", "success");
    log("═".repeat(60), "info");
    log(`Total processed: ${state.totalProcessed}`, "success");
    log(`Total errors: ${state.totalErrors}`, state.totalErrors > 0 ? "warn" : "success");
    log(`Duration: ${calculateDuration(state.startTime, state.endTime || new Date().toISOString())}`, "info");
    log(`Mode: ${DRY_RUN ? "DRY-RUN (no changes)" : "LIVE (changes saved)"}`, "info");

    if (state.lastError) {
      log(`Last error: ${state.lastError}`, "warn");
    }

  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, "error");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function calculateDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const seconds = Math.round((end - start) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

// ─── Entry Point ──────────────────────────────────────────────────────────

extractAcousticFeatures().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
