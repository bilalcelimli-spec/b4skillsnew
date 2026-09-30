#!/usr/bin/env node
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdtempSync, chmodSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const apply = process.argv.includes("--apply");
const verifyOnly = process.argv.includes("--verify");
const source = process.env.SOURCE_DATABASE_URL;
const target = process.env.TARGET_DATABASE_URL;
if (!source || !target) throw new Error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL securely; passwords are never command-line arguments.");

function connectionEnv(raw) {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Expected a PostgreSQL connection URL");
  if (!url.hostname || !url.pathname.slice(1) || !url.username) throw new Error("Incomplete database connection URL");
  if (url.port === "6543") throw new Error("Use a direct or session-pooler connection (5432), not a transaction pooler, for migration");
  return {
    ...process.env,
    PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get("sslmode") || (["localhost", "127.0.0.1"].includes(url.hostname) ? "prefer" : "require"),
    PGCONNECT_TIMEOUT: "15",
    // Keep TLS enabled while avoiding inherited GSS/client-certificate settings
    // that can make libpq fail against managed PostgreSQL proxies.
    PGGSSENCMODE: "disable",
    PGSSLNEGOTIATION: "postgres",
    PGSSLCERTMODE: "disable",
    PGOPTIONS: "-c timezone=UTC -c datestyle=ISO,YMD -c extra_float_digits=3",
  };
}
const sourceEnv = connectionEnv(source);
const targetEnv = connectionEnv(target);
if (["PGHOST", "PGPORT", "PGDATABASE"].every(name => sourceEnv[name] === targetEnv[name])) throw new Error("Source and target must be different databases");
if (!targetEnv.PGHOST.includes("supabase.co") && !process.env.ALLOW_LOCAL_MIGRATION_TEST) throw new Error("Target must be the Supabase direct/session-pooler host");

function run(tool, args, env) {
  const result = spawnSync(tool, args, { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  // Do not print command stderr: connection errors can include credentials/PII.
  if (result.error || result.status !== 0) throw new Error(`${tool} failed. Check connectivity, PostgreSQL client version and permissions (details withheld to protect secrets).`);
  return result.stdout.trim();
}
function sql(query, env) {
  // Supavisor may ignore startup PGOPTIONS. Apply canonical serialization in
  // this connection explicitly; otherwise identical floats can hash differently.
  return run("psql", ["-X", "--no-password", "-q", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c",
    "SET timezone='UTC'; SET datestyle='ISO,YMD'; SET extra_float_digits=3; " + query], env);
}
const tablesQuery = `SELECT coalesce(json_agg(tablename ORDER BY tablename), '[]'::json) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (SELECT c.relname FROM pg_class c JOIN pg_depend d ON d.objid = c.oid WHERE d.deptype = 'e' AND d.classid = 'pg_class'::regclass)`;
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const sourceTables = JSON.parse(sql(tablesQuery, sourceEnv));
const targetTables = JSON.parse(sql(tablesQuery, targetEnv));
if (!["User", "Organization", "Item", "Session", "Response"].every(name => sourceTables.includes(name))) throw new Error("Source does not contain the expected application tables");

function counts(tables, env) {
  const rows = tables.map(name => `SELECT '${name.replaceAll("'", "''")}' AS name, count(*)::text AS total FROM public.${quote(name)}`).join(" UNION ALL ");
  return JSON.parse(sql(`SELECT json_object_agg(name,total) FROM (${rows}) counts`, env));
}
function fingerprints(tables, env) {
  const rows = tables.map(name => `SELECT '${name.replaceAll("'", "''")}' AS name, count(*)::text AS total,
    md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text COLLATE "C"), '')) AS hash
    FROM public.${quote(name)} t`).join(" UNION ALL ");
  return JSON.parse(sql(`SELECT json_object_agg(name,json_build_object('total',total,'hash',hash)) FROM (${rows}) fingerprints`, env));
}
function verify() {
  const currentTargetTables = JSON.parse(sql(tablesQuery, targetEnv));
  if (JSON.stringify(sourceTables) !== JSON.stringify(currentTargetTables)) throw new Error("Table inventory mismatch; do not switch production");
  const expected = fingerprints(sourceTables, sourceEnv);
  const actual = fingerprints(sourceTables, targetEnv);
  const mismatches = sourceTables.filter(name => expected[name].total !== actual[name].total);
  if (mismatches.length) throw new Error(`Row counts differ: ${mismatches.join(", ")}; do not switch production`);
  // Canonical row fingerprints verify content, not just counts. Suitable for the
  // current application size; use a streaming checksum for very large tables.
  for (const name of sourceTables) {
    if (expected[name].hash !== actual[name].hash) throw new Error(`Content mismatch in ${name}; do not switch production`);
  }
  console.log(`Verified ${sourceTables.length} application tables: row counts and content fingerprints match.`);
}

if (verifyOnly) {
  verify();
} else if (!apply) {
  const manifest = counts(sourceTables, sourceEnv);
  console.log(JSON.stringify({ mode: "read-only plan", sourceTables: manifest, targetTableCount: targetTables.length }, null, 2));
  console.log("No data changed. Apply requires an empty target, paused writes and the Supabase Data API disabled.");
} else {
  if (targetTables.length) throw new Error("Target public schema is not empty; refusing to overwrite existing data");
  if (process.env.MIGRATION_WRITES_PAUSED !== "true" || process.env.MIGRATION_DATA_API_DISABLED !== "true") {
    throw new Error("Pause all application/jobs writes and disable the Supabase Data API; confirm with MIGRATION_WRITES_PAUSED=true and MIGRATION_DATA_API_DISABLED=true");
  }
  const folder = mkdtempSync(join(tmpdir(), "b4skills-supabase-migration-"));
  chmodSync(folder, 0o700);
  const backup = join(folder, "application.dump");
  run("pg_dump", ["--no-password", "--format=custom", "--schema=public", "--no-owner", "--no-privileges", `--file=${backup}`], sourceEnv);
  chmodSync(backup, 0o600);
  console.log(`Source backup retained privately at ${backup}. Source database is unchanged.`);
  // Supabase already owns public; do not recreate or change that schema's owner.
  const restoreList = join(folder, "restore.list");
  const entries = run("pg_restore", ["--list", backup], targetEnv).split("\n").filter(line => !/; \d+ \d+ SCHEMA - public /.test(line));
  writeFileSync(restoreList, entries.join("\n"), { mode: 0o600 });
  run("pg_restore", ["--no-password", "--single-transaction", "--exit-on-error", "--no-owner", "--no-privileges", `--use-list=${restoreList}`, `--dbname=${targetEnv.PGDATABASE}`, backup], targetEnv);
  // Existing app auth lives in Express/Prisma, not Supabase Auth. Prevent the
  // default Data API roles from reaching imported private application tables.
  sql(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;`, targetEnv);
  verify();
  console.log("Restore verified. Run migrations against the target and verify again before changing the runtime DATABASE_URL. Keep the source and backup for rollback.");
}
