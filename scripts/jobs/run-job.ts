#!/usr/bin/env tsx
/**
 * External job runner — run one maintenance job from a cron / scheduler.
 *
 *   npm run job -- pretest-calibration
 *   npm run job -- dif-detection | item-retirement | parameter-drift |
 *                  ai-scoring-qwk | exposure-auto-retire | distractor-health
 *   npm run job -- --list
 *
 * Every run takes the job's advisory-lock lease (job-lease.ts), so a run that
 * overlaps another instance's run exits with code 3 instead of duplicating work.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SCHEDULED_JOBS, type ScheduledJobName } from "../../src/lib/jobs/scheduled-jobs.js";
import { withJobLease } from "../../src/lib/jobs/job-lease.js";

const name = process.argv[2];
const names = Object.keys(SCHEDULED_JOBS) as ScheduledJobName[];

if (!name || name === "--list" || !names.includes(name as ScheduledJobName)) {
  console.log(`usage: npm run job -- <${names.join("|")}>`);
  process.exitCode = name && name !== "--list" ? 2 : 0;
} else {
  const prisma = new PrismaClient();
  const job = SCHEDULED_JOBS[name as ScheduledJobName];
  withJobLease(prisma, name, job)
    .then((outcome) => {
      if (outcome.status === "skipped") {
        console.error(`${name}: lease held by another run; skipped`);
        process.exitCode = 3;
      } else {
        console.log(`${name}: done in ${outcome.durationMs} ms`);
      }
    })
    .catch((error) => {
      console.error(`${name}: failed`, error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
