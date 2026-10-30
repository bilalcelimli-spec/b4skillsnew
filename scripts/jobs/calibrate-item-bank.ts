#!/usr/bin/env tsx
/**
 * Batch item calibration (Faz 2) — the only process that moves item parameters.
 *
 *   npm run db:job:calibrate                       # sweep → DRAFT versions, report
 *   npm run db:job:calibrate -- --publish-eligible --yes --by ops@b4skills.com
 *                                                  # also publish drafts that pass the gate
 *   npm run db:job:calibrate -- --output scripts/jobs/.out/calibration-report.json
 *
 * The sweep (pretest-calibration-pipeline.ts) estimates PRETEST items and
 * prior-parameter ACTIVE items from completed sessions and records DRAFT
 * ItemParameterVersions with the publish-gate verdict from calibration-policy.ts.
 * Nothing in Item changes unless `--publish-eligible --yes` is given, in which
 * case every DRAFT with an empty gateReasons list is published (previous
 * published version superseded, Item a/b/c refreshed, PRETEST → ACTIVE).
 * Drafts that failed the gate are never published by this job; they need an
 * operator decision through POST /api/psychometrics/calibration/versions/:id/publish.
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PretestCalibrationPipeline } from "../../src/lib/psychometrics/pretest-calibration-pipeline.js";
import { CALIBRATION_POLICY, describeCalibrationPolicy } from "../../src/lib/psychometrics/calibration-policy.js";
import { calibratedShare, publishVersion } from "../../src/lib/psychometrics/item-parameter-versions.js";
import { invalidateItemCache } from "../../src/lib/assessment-engine/item-bank-cache.js";
import { withJobLease } from "../../src/lib/jobs/job-lease.js";

const flag = (name: string) => process.argv.includes(`--${name}`);
const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
};

const publishEligible = flag("publish-eligible");
const confirmed = flag("yes");
const publishedBy = arg("by", "job:calibrate-item-bank");
const output = arg("output", "");

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log("calibration policy:", describeCalibrationPolicy());
    const leased = await withJobLease(prisma, "pretest-calibration", () =>
      PretestCalibrationPipeline.runCalibrationSweep({ triggerSource: "CLI_JOB" }));
    if (leased.status === "skipped") {
      console.error("another calibration sweep holds the lease; nothing was run");
      process.exitCode = 3;
      return;
    }
    const sweep = leased.result;
    console.log("sweep:", sweep);

    const published: Array<{ versionId: string; itemId: string; promotedToActive: boolean }> = [];
    const failed: Array<{ versionId: string; error: string }> = [];
    if (publishEligible) {
      if (!confirmed) {
        console.error("--publish-eligible changes live item parameters; add --yes to confirm.");
        process.exitCode = 2;
      } else {
        const drafts = await prisma.itemParameterVersion.findMany({
          where: { status: "DRAFT", gateReasons: { isEmpty: true } },
          orderBy: { createdAt: "asc" },
          select: { id: true, itemId: true },
        });
        // One publish per item: the newest eligible draft wins, older ones stay DRAFT.
        const newestPerItem = new Map<string, string>();
        for (const draft of drafts) newestPerItem.set(draft.itemId, draft.id);
        for (const [itemId, versionId] of newestPerItem) {
          try {
            const result = await publishVersion(prisma, versionId, { publishedBy, promotePretest: true });
            published.push({ versionId, itemId, promotedToActive: result.promotedToActive });
          } catch (error) {
            failed.push({ versionId, error: error instanceof Error ? error.message : String(error) });
          }
        }
        invalidateItemCache();
        console.log(`published ${published.length} version(s), ${failed.length} failed`);
      }
    }

    const share = await calibratedShare(prisma);
    const report = {
      generatedAt: new Date().toISOString(),
      policy: CALIBRATION_POLICY,
      sweep,
      publishEligible,
      published,
      failed,
      coverage: share,
      gateB: {
        requiredCalibratedPercent: 80,
        calibratedPercent: share.activeItems ? Number(((share.publishedCalibrated / share.activeItems) * 100).toFixed(2)) : 0,
      },
    };
    console.log("coverage:", share);
    if (output) {
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, JSON.stringify(report, null, 2), { mode: 0o600 });
      console.log(`written: ${output}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("calibrate-item-bank failed:", error);
  process.exitCode = 1;
});
