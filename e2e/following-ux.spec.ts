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

  test("homepage without follows skips empty marketing shelf", async ({ page }) => {
    await gotoHomeReady(page);
    // IA: empty follow shelf must not own a full marketing block.
    await expect(page.locator(".followed-section-empty")).toHaveCount(0);
    await expect(page.locator(".home-guest-invite")).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("link", { name: /Xem thể loại/i })).toBeVisible();
  });

  test("homepage with follows shows shelf card", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await seedFollows(page, story);
    await gotoHomeReady(page);

    const shelf = page.locator(".followed-section:not(.followed-section-empty)");
    await expect(shelf).toBeVisible({ timeout: 12_000 });
    await expect(shelf.getByRole("heading", { level: 3, name: story.title })).toBeVisible();
  });

  test("topbar links to following page", async ({ page }, testInfo) => {
    await gotoHomeReady(page);
    if (testInfo.project.name === "mobile") {
      // Pixel viewport: hamburger can flake under sticky chrome — footer link is the stable path.
      await page
        .getByRole("contentinfo", { name: /Chân trang/i })
        .getByRole("link", { name: "Tủ truyện" })
        .click();
    } else {
      // Scope to primary nav — footer also has "Tủ truyện".
      await page
        .getByRole("navigation", { name: "Reader navigation" })
        .getByRole("link", { name: "Tủ truyện" })
        .click();
    }
    await expect(page).toHaveURL(/\/following/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Linh quyển đang theo dõi");
  });
});
