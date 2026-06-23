import { test, expect } from "@playwright/test";
import {
  dismissReaderChrome,
  loadReaderFixture,
  pickReadableStory,
  primeReaderTestStorage,
  seedReadingHistory,
  storyDetailPath
} from "./helpers";

test.describe("reader polish", () => {
  test("story detail shows resume bar for in-progress story", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 3,
      chapterTitle: "Chương 3",
      maxReadChapterNumber: 3
    });
    await primeReaderTestStorage(page);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });

    const resumeBar = page.locator(".resume-mini-bar");
    await expect(resumeBar).toBeVisible({ timeout: 12_000 });
    await expect(resumeBar).toContainText("Đọc tiếp");
    await expect(resumeBar).toContainText("Chương 3");
  });

  test("story detail shows chapter heatmap when progress exists", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 2,
      maxReadChapterNumber: 4
    });
    await primeReaderTestStorage(page);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });

    await expect(page.locator(".story-detail-hero-progress .chapter-sidebar-heatmap-grid")).toBeVisible({
      timeout: 12_000
    });
    await expect(page.locator(".chapter-sidebar-heatmap-cell-read").first()).toBeVisible();
  });

  test("account page lists offline cache panel", async ({ page }) => {
    await primeReaderTestStorage(page);
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    const panel = page.getByRole("region", { name: "Cache offline" });
    await expect(panel).toBeVisible({ timeout: 12_000 });
    await expect(panel).toContainText("Chương đã tải về");
    await expect(panel).toContainText("Chưa có chương offline");
  });

  test("keyboard help opens with question-mark shortcut", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop keyboard shortcut");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await page.locator('[aria-label="Chapter content"]').click();
    await page.keyboard.press("Shift+/");

    await expect(page.getByRole("dialog", { name: "Phím tắt reader" })).toBeVisible();
    await expect(page.getByText("J / K")).toBeVisible();
  });

  test("chapter sidebar heatmap is visible in desktop TOC", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop chapter sidebar");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await page.getByRole("button", { name: "Mở mục lục" }).click({ force: true });

    await expect(page.locator(".chapter-sidebar-heatmap-grid")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Mục lục").first()).toBeVisible();
  });
});
