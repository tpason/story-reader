import { test, expect } from "@playwright/test";
import { gotoHomeReady, pickReadableStory, primeAppTestStorage, seedFollows, seedReadingHistory } from "./helpers";

test.describe("home UX", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppTestStorage(page);
  });

  test("shows resume bar when reading history exists", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedReadingHistory(page, {
      storyId: story.id,
      storyTitle: story.title,
      chapterNumber: 2,
      chapterTitle: "Chương 2"
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const resumeBar = page.locator(".resume-mini-bar");
    await expect(resumeBar).toBeVisible({ timeout: 12_000 });
    await expect(resumeBar).toContainText(story.title);
    await expect(resumeBar).toContainText("Chương 2");
  });

  test("topbar includes Thiên bảng and Tủ truyện", async ({ page }) => {
    await gotoHomeReady(page);
    await expect(page.getByRole("link", { name: "Thiên bảng" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tủ truyện" })).toBeVisible();
  });

  test("trending period chips update homepage URL", async ({ page }) => {
    await gotoHomeReady(page);
    const periodTabs = page.locator(".trending-period-tabs");
    await expect(periodTabs).toBeVisible({ timeout: 12_000 });

    await periodTabs.getByRole("link", { name: /^Nhật$/i }).click();
    await expect(page).toHaveURL(/trendPeriod=day/);

    await periodTabs.getByRole("link", { name: /^Nguyệt$/i }).click();
    await expect(page).toHaveURL(/trendPeriod=month/);
  });

  test("trending section links to full rankings", async ({ page }) => {
    await gotoHomeReady(page);
    const trending = page.locator(".trending-section");
    await expect(trending).toBeVisible({ timeout: 12_000 });
    await trending.getByRole("link", { name: /Xem thiên bảng/i }).click();
    await expect(page).toHaveURL(/\/rankings\?tab=trending/);
  });

  test("follow shelf shows header link when follows exist", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedFollows(page, story);
    await gotoHomeReady(page);

    await expect(page.locator(".followed-section .followed-card")).toHaveCount(1, { timeout: 12_000 });
    await expect(page.getByRole("link", { name: /Cập nhật/i }).first()).toBeVisible();
  });
});
