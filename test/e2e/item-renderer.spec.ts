import { test, expect } from "@playwright/test";

for (const width of [320, 1280]) {
  for (const mode of ["reading", "grammar", "vocabulary", "open", "writing", "matching", "ordering"]) {
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
      } else if (mode === "writing") {
        await page.getByRole("textbox", { name: "Writing response" }).fill("The garden brings neighbours together.");
      } else if (mode === "matching") {
        await page.getByRole("combobox", { name: "garden" }).selectOption("0");
        await page.getByRole("combobox", { name: "neighbours" }).selectOption("1");
      } else {
        await page.getByRole("button", { name: "Move First plant the seeds. up" }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: mode === "writing" ? "Submit Essay" : "Confirm Answer" }).click();
      await expect(page.getByLabel("Submitted answer")).not.toHaveText("Not submitted");
    });
  }
}
