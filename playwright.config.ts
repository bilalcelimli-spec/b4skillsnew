import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Install: npm install -D @playwright/test
 * Run:     npx playwright test
 * Report:  npx playwright show-report
 *
 * CI: add a separate workflow step with `npx playwright install --with-deps`
 * before running. Tests are excluded from the standard Vitest suite.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  // Start the dev server when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
