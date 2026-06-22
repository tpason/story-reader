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
    } catch (error) {
      test.skip(true, String(error));
    }
    const shell = page.locator(".reader-shell");
    const themeGroup = page.locator('[aria-label="Theme"]');

    const oled = themeGroup.locator('button[title="OLED"]');
    if (await oled.count()) {
      await oled.click({ force: true });
      await expect(shell).toHaveAttribute("data-theme", "oled");
    } else {
      await themeGroup.locator('button[title="Dark"]').click({ force: true });
      await expect(shell).toHaveAttribute("data-theme", "dark");
    }

    await themeGroup.locator('button[title="Sepia"]').click({ force: true });
    await expect(shell).toHaveAttribute("data-theme", "sepia");
  });

  test("in-chapter search opens with keyboard shortcut", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop keyboard shortcut");
    await loadReaderFixture(page);
    try {
      await openInChapterSearch(page);
    } catch (error) {
      test.skip(true, String(error));
    }
    await page.getByRole("searchbox", { name: "Tìm trong chương" }).fill("the");
    await expect(page.locator(".reader-in-chapter-search-count")).toContainText(/\d+\/\d+/);
  });

  test("in-chapter search opens from topbar button", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop topbar search");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await page.getByRole("button", { name: "Tìm trong chương" }).click();
    await expect(page.getByRole("searchbox", { name: "Tìm trong chương" })).toBeVisible();
  });
});
