import fs from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * In the Vite dev server, an import of a pre-bundled dependency (react) is
 * rewritten to a `const` at the import's position. Top-level code placed
 * above that line which uses its names (e.g. `lazy`) throws "Cannot access
 * 'lazy' before initialization" in the browser, although Vitest and
 * production builds run fine. Keep top-level code below the react import.
 */
describe("App.tsx module order", () => {
  it("runs no top-level code before the react import", () => {
    const lines = fs.readFileSync("src/App.tsx", "utf8").split("\n");
    const reactImport = lines.findIndex((line) => /^import\s.*from\s+["']react["'];?\s*$/.test(line));
    expect(reactImport).toBeGreaterThanOrEqual(0);
    const offending = lines
      .slice(0, reactImport)
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /^(const|let|var|function|class|export)\b/.test(line));
    expect(offending).toEqual([]);
  });
});
