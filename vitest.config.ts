import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts", "test/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "dev-dist"],
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
