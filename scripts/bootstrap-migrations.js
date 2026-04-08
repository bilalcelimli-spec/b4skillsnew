#!/usr/bin/env node
/**
 * bootstrap-migrations.js
 *
 * Run this ONCE against the production database BEFORE the next Render deploy
 * that uses `prisma migrate deploy`.
 *
 * What it does:
 *   1. Creates the `_prisma_migrations` table if it doesn't exist.
 *   2. Marks the "baseline" migration as already applied (the DB was provisioned
 *      via db push, so all existing tables are accounted for — no DDL needs to run).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/bootstrap-migrations.js
 *
 * After running this, push the new prisma/migrations folder to git and trigger
 * a Render deploy. `prisma migrate deploy` will skip the baseline and apply only
 * the `20260101000001_add_exam_code` migration, creating the missing ExamCode table.
 */

import pg from 'pg';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const BASELINE_MIGRATION_NAME = '20260101000000_baseline';
const BASELINE_CHECKSUM = crypto
  .createHash('sha256')
  .update(
    '-- Baseline migration\n' +
    '-- All tables up to this point were created outside of Prisma migrations (via prisma db push or raw SQL).\n' +
    '-- This migration is intentionally empty. It was marked as applied in production via:\n' +
    '--   prisma migrate resolve --applied "20260101000000_baseline"\n' +
    '-- before the first deploy that uses prisma migrate deploy.\n'
  )
  .digest('hex');

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  // 1. Ensure _prisma_migrations table exists (Prisma normally creates this, but we create it manually here)
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    VARCHAR(36)  NOT NULL PRIMARY KEY,
      "checksum"              VARCHAR(64)  NOT NULL,
      "finished_at"           TIMESTAMPTZ,
      "migration_name"        VARCHAR(255) NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        TIMESTAMPTZ,
      "started_at"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count"   INTEGER      NOT NULL DEFAULT 0
    );
  `);
  console.log('✓ _prisma_migrations table ready');

  // 2. Check if baseline is already registered
  const { rows } = await client.query(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    [BASELINE_MIGRATION_NAME]
  );

  if (rows.length > 0) {
    console.log('✓ Baseline migration already registered — nothing to do.');
  } else {
    await client.query(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES
         ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [crypto.randomUUID(), BASELINE_CHECKSUM, BASELINE_MIGRATION_NAME]
    );
    console.log(`✓ Baseline migration "${BASELINE_MIGRATION_NAME}" registered as applied.`);
  }

  console.log('\nAll done. You can now push the migrations folder to git and redeploy on Render.');
  await client.end();
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  client.end();
  process.exit(1);
});
