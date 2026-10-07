import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: ["item-renderer.spec.ts", "certificate-renderer.spec.ts"],
  use: { baseURL: "http://127.0.0.1:4174", browserName: "chromium", permissions: ["microphone", "camera"], launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } },
  workers: 2,
  reporter: "list",
  webServer: { cwd: fileURLToPath(new URL("../../", import.meta.url)), command: "npx vite --host 127.0.0.1 --port 4174 --strictPort", url: "http://127.0.0.1:4174", timeout: 30000 },
});
