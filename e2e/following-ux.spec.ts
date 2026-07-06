import { test, expect } from "@playwright/test";
import { gotoHomeReady, pickReadableStory, primeAppTestStorage, seedFollows } from "./helpers";

test.describe("following UX", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppTestStorage(page);
  });

  test("following page empty state offers discovery CTAs", async ({ page }) => {
    await page.goto("/following", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Linh quyển đang theo dõi");
    await expect(page.getByRole("link", { name: /Top thiên bảng/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Khám phá truyện/i })).toBeVisible();
  });

  test("following page lists seeded follow shelf", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedFollows(page, story);
    await page.goto("/following", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".following-grid .followed-card")).toHaveCount(1, { timeout: 12_000 });
    await expect(page.getByRole("heading", { level: 3, name: story.title })).toBeVisible();
    await expect(page.getByRole("link", { name: "mục Cập nhật" })).toBeVisible();
  });

  test("homepage empty follow shelf links to rankings", async ({ page }) => {
    await gotoHomeReady(page);
    const shelf = page.locator(".followed-section-empty");
    await expect(shelf).toBeVisible({ timeout: 12_000 });
    await expect(shelf.getByRole("link", { name: /Xem top thiên bảng/i })).toBeVisible();
  });

  test("homepage with follows shows shelf card", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedFollows(page, story);
    await gotoHomeReady(page);

    const shelf = page.locator(".followed-section:not(.followed-section-empty)");
    await expect(shelf).toBeVisible({ timeout: 12_000 });
    await expect(shelf.getByRole("heading", { level: 3, name: story.title })).toBeVisible();
  });

  test("topbar links to following page", async ({ page }) => {
    await gotoHomeReady(page);
    await page.getByRole("link", { name: "Tủ truyện" }).click();
    await expect(page).toHaveURL(/\/following/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Linh quyển đang theo dõi");
  });
});
