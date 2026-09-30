import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", "dev-dist", "test/e2e/**"],
    // Phase 2 a11y DOM tests declare `// @vitest-environment jsdom` inline.
    // All other tests run in node (default above).
    //
    // Setup file wires vitest-axe matchers (safe no-op in node env).
    setupFiles: ["./test/setup-axe.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/lib/assessment-engine/**/*.ts",
        "src/lib/psychometrics/**/*.ts",
        "src/lib/cefr/**/*.ts",
        "src/lib/ai/**/*.ts",
        "src/lib/scoring/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/types.ts"],
      // Ratchet from the measured repository baseline. Raise these thresholds
      // as uncovered service/orchestration modules gain focused tests; keeping
      // an unattainable aspirational number here makes every CI run fail and
      // provides no regression protection.
      thresholds: {
        lines: 53,
        functions: 55,
        branches: 40,
        statements: 52,
      },
    },
    testTimeout: 30_000,
  },
});
