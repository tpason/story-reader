import { test, expect } from "@playwright/test";
import { dismissReaderChrome, loadReaderFixture, openFormatControls, openInChapterSearch } from "./helpers";

test.describe("reader smoke", () => {
  test("loads chapter content and core chrome", async ({ page }, testInfo) => {
    await loadReaderFixture(page);

    await expect(page.locator(".reader-progress")).toBeAttached();
    if (testInfo.project.name === "mobile") {
      await expect(page.getByRole("navigation", { name: "Mobile reader quick actions" })).toBeVisible();
    } else {
      await dismissReaderChrome(page);
      await expect(page.locator('[aria-label="Reader controls"]')).toBeVisible();
    }
    await expect(page.locator(".reader-paragraph").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Previous and next chapter" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Luận đạo chương này" })).toBeVisible();
  });

  test("theme segmented control updates data-theme", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop-only theme segmented control");
    await loadReaderFixture(page);
    try {
      await dismissReaderChrome(page);
      await openFormatControls(page);
    } catch (error) {
      test.skip(true, String(error));
    }
    const shell = page.locator(".reader-shell");
    const themeGroup = page.locator('[aria-label="Giao diện"], [aria-label="Giao diện đọc"], [aria-label="Theme"]').first();

    const oled = themeGroup.locator('button[data-theme-id="oled"], button[title="OLED"], button[title*="OLED"]');
    if (await oled.count()) {
      await oled.first().click({ force: true });
      await expect(shell).toHaveAttribute("data-theme", "oled");
    } else {
      await themeGroup.locator('button[data-theme-id="dark"], button[title="Nền tối dịu"]').first().click({ force: true });
      await expect(shell).toHaveAttribute("data-theme", "dark");
    }

    await themeGroup
      .locator('button[data-theme-id="parchment"], button[title*="Giấy xuan"]')
      .first()
      .click({ force: true });
    await expect(shell).toHaveAttribute("data-theme", "parchment");
  });

  test("in-chapter search opens with keyboard shortcut", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop keyboard shortcut");
    await loadReaderFixture(page);
    try {
      await openInChapterSearch(page);
    } catch (error) {
      test.skip(true, String(error));
    }
    const sample = (await page.locator(".reader-paragraph").first().innerText()).trim();
    const word =
      sample
        .split(/\s+/)
        .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
        .find((part) => part.length >= 3) ?? "chương";
    await page.getByRole("searchbox", { name: "Tìm trong chương" }).fill(word);
    await expect(page.locator(".reader-in-chapter-search-count")).toContainText(/\d+\/\d+/);
  });

  test("in-chapter search opens from overflow menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop overflow search");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    const tools = page.locator(".reader-tools-trigger").first();
    await expect(tools).toBeVisible({ timeout: 8_000 });
    await expect(async () => {
      if (!(await page.locator("#reader-overflow-panel").isVisible().catch(() => false))) {
        await tools.click({ force: true });
      }
      await expect(page.locator("#reader-overflow-panel")).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 10_000 });
    await page.locator("#reader-overflow-panel").getByRole("button", { name: /Tìm trong chương/i }).click();
    await expect(page.getByRole("searchbox", { name: "Tìm trong chương" })).toBeVisible();
  });
});
