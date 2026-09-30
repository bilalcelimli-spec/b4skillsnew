import { test, expect } from "@playwright/test";

for (const width of [320, 1280]) {
  test(`spoken answer survives mode changes and submits recorded audio at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.route("https://fonts.googleapis.com/**", route => route.abort());
    await page.goto("/test/e2e/fixtures/item-renderer.html?mode=integrated");
    await page.getByRole("radio", { name: "Record your answer" }).check();
    await page.getByRole("button", { name: "Start Recording" }).click();
    const stop = page.getByRole("button", { name: "Stop Recording" });
    await expect(stop).toBeVisible();
    await expect(page.getByRole("radio", { name: "Write your answer" })).toBeDisabled();
    // Wait for a real MediaRecorder data event from Chromium's synthetic microphone.
    await page.waitForTimeout(1200);
    await stop.click();
    await expect(page.getByRole("button", { name: "Submit Response" })).toBeVisible();
    await page.getByRole("radio", { name: "Write your answer" }).check();
    await expect(page.getByRole("textbox", { name: "Writing response" })).toBeVisible();
    await page.getByRole("radio", { name: "Record your answer" }).check();
    await expect(page.getByText("Recording Captured")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Submit Response" }).click();
    const answer = JSON.parse(await page.getByLabel("Submitted answer").innerText());
    expect(answer.size).toBeGreaterThan(0);
    expect(answer.type).toMatch(/^audio\//);
  });
  for (const mode of ["reading", "grammar", "vocabulary", "open", "writing", "matching", "ordering", "placement", "integrated"]) {
    test(`${mode} renders and answers at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.route("https://fonts.googleapis.com/**", route => route.abort());
      await page.goto(`/test/e2e/fixtures/item-renderer.html?mode=${mode}`);
      await expect(page.getByLabel("Submitted answer")).toHaveText("Not submitted");
      if (mode === "reading") {
        await page.getByRole("radio").first().focus();
        await page.keyboard.press("Space");
      } else if (mode === "grammar" || mode === "vocabulary") {
        await page.getByRole("combobox", { name: "Blank 1" }).selectOption(mode === "grammar" ? "walks" : "enormous");
        if (mode === "grammar") await page.getByRole("combobox", { name: "Blank 2" }).selectOption("cooks");
      } else if (mode === "open") {
        await page.getByRole("textbox", { name: "Blank 1" }).fill("longanswer".repeat(12));
      } else if (mode === "writing" || mode === "integrated") {
        await page.getByRole("textbox", { name: "Writing response" }).fill("The garden brings neighbours together.");
      } else if (mode === "placement") {
        await page.getByRole("combobox", { name: "Blank 1" }).selectOption("0");
        await page.getByRole("combobox", { name: "Blank 2" }).selectOption("1");
      } else if (mode === "matching") {
        await page.getByRole("combobox", { name: "garden" }).selectOption("0");
        await page.getByRole("combobox", { name: "neighbours" }).selectOption("1");
      } else {
        await page.getByRole("button", { name: "Move First plant the seeds. up" }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: mode === "writing" || mode === "integrated" ? "Submit Essay" : "Confirm Answer" }).click();
      await expect(page.getByLabel("Submitted answer")).not.toHaveText("Not submitted");
    });
  }
}
