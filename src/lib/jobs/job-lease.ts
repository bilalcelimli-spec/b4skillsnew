/**
 * Job lease — one run of a maintenance job at a time across every instance
 * (roadmap Faz 5).
 *
 * Maintenance jobs are triggered externally (GitHub Actions → API endpoints,
 * or `npm run job -- <name>`), so two triggers can overlap. A Postgres
 * transaction-level advisory lock keyed by the job name is held for the whole
 * run; a second caller sees the lock taken and returns `skipped` instead of
 * running the job twice. No Redis and no extra table needed.
 */

import type { PrismaClient } from "@prisma/client";

export type LeaseClient = Pick<PrismaClient, "$transaction">;

// A string discriminant: the project compiles without strictNullChecks, where a
// boolean-literal discriminant does not narrow on truthiness.
export type LeaseOutcome<T> =
  | { status: "ran"; result: T; durationMs: number }
  | { status: "skipped"; reason: "LOCK_HELD"; durationMs: number };

export interface LeaseOptions {
  /** Upper bound for the whole run; the lock is released when it ends (default 2 h). */
  timeoutMs?: number;
}

/** Stable 32-bit key for pg advisory locks from the job name. */
export function leaseKey(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Run `fn` while holding the advisory lock for `name`. The job itself may use
 * the regular Prisma client; only the lock lives in the wrapping transaction.
 */
export async function withJobLease<T>(
  db: LeaseClient,
  name: string,
  fn: () => Promise<T>,
  options: LeaseOptions = {},
): Promise<LeaseOutcome<T>> {
  const started = Date.now();
  const timeout = options.timeoutMs ?? 2 * 60 * 60 * 1000;
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${leaseKey(name)}) AS locked`;
    if (!rows[0]?.locked) {
      return { status: "skipped" as const, reason: "LOCK_HELD" as const, durationMs: Date.now() - started };
    }
    const result = await fn();
    return { status: "ran" as const, result, durationMs: Date.now() - started };
  }, { timeout, maxWait: 10_000 });
}
