import { test, expect } from "@playwright/test";
import { assertNoHorizontalOverflow, gotoRankingsReady, primeAppTestStorage } from "./helpers";

test.describe("rankings UX", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppTestStorage(page);
  });

  test("defaults to Thiên bảng tab", async ({ page }) => {
    await gotoRankingsReady(page, "tab=betterbox");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Thiên Bảng Linh Quyển");
    await expect(page.locator(".rankings-tabs .chip-active")).toContainText(/Thiên bảng/i);
  });

  test("switches between ranking tabs", async ({ page }) => {
    await gotoRankingsReady(page);

    await page.getByRole("link", { name: /Phong vân/i }).first().click();
    await expect(page).toHaveURL(/tab=trending/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Phong Vân Bảng");

    await page.getByRole("link", { name: /Tu giả/i }).first().click();
    await expect(page).toHaveURL(/tab=readers/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu Giả Bảng");

    await page.getByRole("link", { name: /Cổ nguyên/i }).first().click();
    await expect(page).toHaveURL(/tab=source/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cổ Nguyên Bảng");
  });

  test("trending tab shows board, empty state, or Thiên bảng fallback", async ({ page }) => {
    await gotoRankingsReady(page, "tab=trending&period=week");

    const listItems = page.locator(".rankings-list .rankings-item, .rankings-podium-card");
    const emptyState = page.locator(".xianxia-empty-state");
    const fallback = page.getByText(/Thiên bảng gợi ý/i);

    await expect(listItems.first().or(emptyState).or(fallback)).toBeVisible({ timeout: 15_000 });

    if (await emptyState.isVisible()) {
      await expect(page.getByRole("link", { name: /Khám phá thư viện/i })).toBeVisible();
    }
  });

  test("period chips update URL on Phong vân tab", async ({ page }) => {
    await gotoRankingsReady(page, "tab=trending&period=week");
    await page.locator(".rankings-period-tabs").getByRole("link", { name: /^Nhật$/i }).click();
    await expect(page).toHaveURL(/period=day/);
    await page.locator(".rankings-period-tabs").getByRole("link", { name: /^Nguyệt$/i }).click();
    await expect(page).toHaveURL(/period=month/);
  });

  test("ranking story cards link to story detail", async ({ page }) => {
    await gotoRankingsReady(page, "tab=betterbox");
    const storyLink = page.locator(".rankings-card, .rankings-podium-link").first();
    test.skip(!(await storyLink.isVisible().catch(() => false)), "No ranked stories in DB");

    const href = await storyLink.getAttribute("href");
    expect(href).toMatch(/^\/stories\//);
    await storyLink.click();
    await expect(page.locator(".story-detail-hero, .story-detail-shell")).toBeVisible({ timeout: 15_000 });
  });

  test("mobile rankings tabs scroll without page overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile layout check");
    await gotoRankingsReady(page, "tab=trending&period=week");
    await assertNoHorizontalOverflow(page, "rankings mobile");
    await expect(page.locator(".rankings-tabs, .rankings-period-tabs").first()).toBeVisible();
  });
});
