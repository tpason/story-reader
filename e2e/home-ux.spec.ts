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

  test("topbar includes Thiên bảng and Tủ truyện", async ({ page }, testInfo) => {
    await gotoHomeReady(page);
    if (testInfo.project.name === "mobile") {
      await expect(async () => {
        const menuBtn = page.getByRole("button", { name: /Mở menu điều hướng|Đóng menu/i });
        if ((await menuBtn.getAttribute("aria-expanded")) !== "true") {
          await page.getByRole("button", { name: "Mở menu điều hướng" }).click({ force: true });
        }
        const drawer = page.locator("#site-header-drawer");
        await expect(drawer).toBeVisible({ timeout: 2_000 });
        await expect(drawer.getByRole("link", { name: "Tủ truyện" })).toBeVisible({ timeout: 1_500 });
        await expect(drawer.getByRole("link", { name: "Thiên bảng" })).toBeVisible({ timeout: 1_500 });
      }).toPass({ timeout: 12_000 });
      return;
    }

    const nav = page.getByRole("navigation", { name: "Reader navigation" });
    await expect(nav.getByRole("link", { name: "Tủ truyện" })).toBeVisible();
    // Thiên bảng lives under secondary “Thêm” menu on desktop.
    await expect(async () => {
      await nav.getByRole("button", { name: "Thêm" }).click();
      await expect(nav.getByRole("menuitem", { name: "Thiên bảng" })).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 10_000 });
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

  test("trending section links to rankings", async ({ page }) => {
    await gotoHomeReady(page);
    const trending = page.locator(".trending-section");
    await expect(trending).toBeVisible({ timeout: 12_000 });
    const cta = trending.getByRole("link", { name: /Xem thiên bảng|Thiên bảng|Phong vân đầy đủ/i }).first();
    await cta.click();
    await expect(page).toHaveURL(/\/rankings\?tab=(trending|betterbox)/);
  });

  test("follow shelf shows header link when follows exist", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedFollows(page, story);
    await gotoHomeReady(page);

    await expect(page.locator(".followed-section .followed-card")).toHaveCount(1, { timeout: 12_000 });
    await expect(page.locator(".followed-section .discovery-more")).toBeVisible();
  });
});
