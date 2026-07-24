import { test, expect } from "@playwright/test";
import {
  clearOfflineChapterCache,
  dismissReaderChrome,
  loadReaderFixture,
  pickReadableStory,
  primeReaderTestStorage,
  seedOfflineChapterCache,
  seedReadingHistory,
  storyDetailPath,
  storyReaderPath
} from "./helpers";

test.describe("reader polish", () => {
  test.afterEach(async ({ page }) => {
    await clearOfflineChapterCache(page).catch(() => undefined);
  });

  test("story detail shows resume bar for in-progress story", async ({ page }, testInfo) => {
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

    if (testInfo.project.name === "mobile") {
      // Mobile hides duplicate resume bar — sticky CTA covers continue.
      const cta = page.locator(".story-mobile-cta-primary");
      await expect(cta.first()).toBeVisible({ timeout: 12_000 });
      await expect(cta.first()).toContainText(/Đọc|Tiếp|Chương/i);
      return;
    }

    const resumeBar = page.locator(".resume-mini-bar");
    await expect(resumeBar).toBeVisible({ timeout: 12_000 });
    await expect(resumeBar).toContainText("Đọc tiếp");
    await expect(resumeBar).toContainText("Chương 3");
  });

  test("story detail shows chapter progress when history exists", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 2,
      maxReadChapterNumber: 4
    });
    await primeReaderTestStorage(page);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });

    // Progress lives inside a closed <details> disclosure by default.
    const disclosure = page.locator(".story-detail-shell:not(.xi-route-loading) .story-detail-progress-disclosure");
    await expect(disclosure).toBeVisible({ timeout: 12_000 });
    // Summary should reflect seeded history even before expand.
    await expect(disclosure.locator("summary")).toContainText(/\d+\s*\/\s*\d+/, { timeout: 12_000 });
    await disclosure.locator("summary").click();
    await expect(disclosure).toHaveJSProperty("open", true);
    const progress = disclosure.locator(".chapter-sidebar-progress-bar");
    await expect(progress).toBeAttached();
    // Prefer role check scoped to open disclosure (bar can be zero-width at 0% round).
    await expect(disclosure.getByRole("progressbar", { name: /Tiến độ đọc/i })).toBeAttached();
  });

  test("account page lists offline cache panel", async ({ page }) => {
    await primeReaderTestStorage(page);
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    const panel = page.getByRole("region", { name: "Cache offline" });
    await expect(panel).toBeVisible({ timeout: 12_000 });
    await expect(panel).toContainText("Chương đã tải về");
    await expect(panel).toContainText("Chưa có chương offline");
  });

  test("account section nav jumps to cultivation section", async ({ page }) => {
    await primeReaderTestStorage(page);
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: "Mục động phủ" });
    await expect(nav).toBeVisible({ timeout: 12_000 });
    await nav.getByRole("link", { name: "Tu vi" }).click();
    await expect(page).toHaveURL(/#account-cultivation/);
    await expect(page.locator("#account-cultivation")).toBeVisible();
  });

  test("account page summarizes seeded offline chapters", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await primeReaderTestStorage(page);
    await seedOfflineChapterCache(page, story, [1, 2, 3]);
    await page.goto("/account", { waitUntil: "domcontentloaded" });

    const panel = page.getByRole("region", { name: "Cache offline" });
    await expect(panel).toBeVisible({ timeout: 12_000 });
    await expect(panel).toContainText(story.title);
    await expect(panel).toContainText(/3 chương|Chương 1/i);
  });

  test("reader shows offline badge when chapter is cached", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await primeReaderTestStorage(page);
    await seedOfflineChapterCache(page, story, [1]);
    await page.goto(storyReaderPath(story, 1), { waitUntil: "domcontentloaded" });

    await expect(page.locator(".reader-shell")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".reader-offline-badge")).toContainText("Offline", { timeout: 12_000 });
  });

  test("story detail chapter list jumps to chapter", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 1,
      maxReadChapterNumber: Math.min(5, story.totalChapters)
    });
    await primeReaderTestStorage(page);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });

    const targetChapter = Math.min(3, story.totalChapters);
    // Heatmap cells retired — jump via chapter list link instead.
    const chapterLink = page
      .locator(`a[href*="/chapters/${targetChapter}"]`)
      .filter({ hasText: new RegExp(`Chương\\s*${targetChapter}|${targetChapter}`, "i") })
      .first();
    if ((await chapterLink.count()) === 0) {
      const anyChapter = page.locator('a[href*="/chapters/"]').first();
      await anyChapter.click();
      await expect(page).toHaveURL(/\/chapters\/\d+/, { timeout: 12_000 });
      return;
    }

    await chapterLink.click();
    await expect(page).toHaveURL(new RegExp(`/chapters/${targetChapter}(?:/|$)`), { timeout: 12_000 });
  });

  test("keyboard help opens with question-mark shortcut", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop keyboard shortcut");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await page.locator('[aria-label="Chapter content"]').click();
    // Prefer literal "?" — Shift+/ is layout-dependent in headless Chromium.
    await expect(async () => {
      await page.keyboard.press("?");
      await expect(page.getByRole("dialog", { name: "Phím tắt reader" })).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 12_000 });
    await expect(page.getByText("J / K")).toBeVisible();
  });

  test("chapter sidebar progress is visible in desktop TOC", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop chapter sidebar");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await page.getByRole("button", { name: "Mở mục lục" }).click({ force: true });

    await expect(page.locator(".chapter-sidebar-progress-bar")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Mục lục").first()).toBeVisible();
  });
});
