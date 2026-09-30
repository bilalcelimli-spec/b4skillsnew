import { spawnSync } from "node:child_process";
import { describe, it, expect } from "vitest";

function invoke(source: string, target: string) {
  return spawnSync(process.execPath, ["scripts/supabase-database-migration.mjs", "--apply"], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATABASE_URL: source, TARGET_DATABASE_URL: target, ALLOW_LOCAL_MIGRATION_TEST: "" },
  });
}
describe("Supabase migration fail-safe validation", () => {
  it("requires explicit source and target credentials", () => {
    const result = invoke("", "");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL securely");
  });
  it("refuses to overwrite the source even when usernames differ", () => {
    const result = invoke("postgresql://one:private@db.project.supabase.co:5432/postgres", "postgresql://two:private@db.project.supabase.co:5432/postgres");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Source and target must be different databases");
    expect(result.stderr).not.toContain("one:private");
  });
  it("rejects transaction-pooler migration connections before opening a database", () => {
    const result = invoke("postgresql://user@old.example:5432/app", "postgresql://user@pooler.supabase.co:6543/postgres");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("not a transaction pooler");
  });
});
