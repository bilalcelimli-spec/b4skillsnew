#!/usr/bin/env node

/**
 * Safe Prisma migration deployment for both new and legacy databases.
 *
 * New databases apply the baseline and every later migration normally.
 * Existing pre-baseline databases are recognized by a complete set of core
 * tables; only the baseline is then recorded as already applied before Prisma
 * runs the idempotent follow-up migrations.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const BASELINE = "00000000000000_baseline";
const CORE_TABLES = ["User", "Organization", "Item", "Session", "Response"];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for migration deployment");
}

// A direct/session-pooler connection can be supplied independently of the
// transaction-pooler URL used by the app. No change to the runtime URL.
const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: migrationUrl } } });

function runPrisma(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(executable, ["prisma", ...args], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: migrationUrl },
  });
}

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const tableNames = new Set(tables.map((row) => row.tableName));
  const hasAnyCoreTable = CORE_TABLES.some((name) => tableNames.has(name));
  const hasAllCoreTables = CORE_TABLES.every((name) => tableNames.has(name));

  if (hasAnyCoreTable && !hasAllCoreTables) {
    throw new Error(
      "Refusing automatic baseline: the database contains only part of the expected core schema. " +
      "Inspect and reconcile it before deployment."
    );
  }

  let baselineRecorded = false;
  if (tableNames.has("_prisma_migrations")) {
    const rows = await prisma.$queryRaw`
      SELECT migration_name AS "migrationName"
      FROM "_prisma_migrations"
      WHERE migration_name = ${BASELINE} AND finished_at IS NOT NULL
      LIMIT 1
    `;
    baselineRecorded = rows.length > 0;
  }

  if (hasAllCoreTables && !baselineRecorded) {
    console.log(`Existing schema detected; recording ${BASELINE} as applied.`);
    runPrisma(["migrate", "resolve", "--applied", BASELINE]);
  }
} finally {
  await prisma.$disconnect();
}

runPrisma(["migrate", "deploy"]);
