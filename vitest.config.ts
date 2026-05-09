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
      thresholds: {
        lines: 75,
        functions: 78,
        branches: 65,
        statements: 76,
      },
    },
    testTimeout: 30_000,
  },
});
