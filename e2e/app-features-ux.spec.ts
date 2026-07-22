import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  gotoHomeReady,
  openIdentityModalFromTopbar,
  pickReadableStory,
  primeAppTestStorage,
  expectModalPanelOnTop,
  storyDetailPath
} from "./helpers";

type RouteCase = {
  path: string;
  heading: RegExp | string;
  shell?: string;
};

const APP_ROUTES: RouteCase[] = [
  { path: "/", heading: /Tu tiên từng chương/i, shell: ".page-wrap" },
  { path: "/discover", heading: /Truyện mới tinh luyện|Truyện vừa cập nhật/i, shell: ".page-wrap" },
  { path: "/categories", heading: /Chọn môn phái truyện/i, shell: ".page-wrap" },
  { path: "/rankings?tab=betterbox", heading: /Thiên Bảng/i, shell: ".rankings-page" },
  { path: "/following", heading: /Linh quyển đang theo dõi/i, shell: ".page-wrap" },
  { path: "/updates", heading: /Linh tin chương mới/i, shell: ".page-wrap" },
  { path: "/reading-history", heading: /Hành trình tu luyện/i, shell: ".page-wrap" },
  { path: "/account", heading: /Định danh đạo hữu/i, shell: ".account-page-wrap" },
  { path: "/login", heading: /Đăng nhập động phủ/i, shell: ".auth-panel" },
  { path: "/signup", heading: /Nhập môn/i, shell: ".auth-panel" }
];

test.describe("app features UX audit", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppTestStorage(page);
  });

  for (const route of APP_ROUTES) {
    test(`route ${route.path} loads with key heading`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      if (route.shell) {
        await expect(page.locator(route.shell).first()).toBeVisible({ timeout: 18_000 });
      }
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(route.heading);
      await assertNoHorizontalOverflow(page, route.path);
    });
  }

  test("story detail page loads from API fixture", async ({ page }) => {
    const story = await pickReadableStory(page, 1);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });
    await expect(page.locator(".story-detail-hero, .story-detail-shell").first()).toBeVisible({ timeout: 18_000 });
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(story.title);
    await assertNoHorizontalOverflow(page, "story-detail");
  });

  test("identity modal sits above aura and topbar on homepage", async ({ page }) => {
    await gotoHomeReady(page);
    await openIdentityModalFromTopbar(page);
    await expectModalPanelOnTop(page);
    await expect(page.locator(".identity-modal-backdrop")).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nhập môn" })).toBeVisible();

    const topbarBox = await page.locator(".topbar-modern").boundingBox();
    const panelBox = await page.locator(".identity-modal-panel").boundingBox();
    expect(topbarBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(panelBox!.y).toBeGreaterThan(topbarBox!.y);
  });

  test("login auth panel is readable above decorative background", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const panel = page.locator(".auth-panel");
    await expect(panel).toBeVisible();
    await expectModalPanelOnTop(page, ".auth-panel");

    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(220);

    const opacity = await panel.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return Number.parseFloat(style.opacity || "1");
    });
    expect(opacity).toBeGreaterThan(0.85);
  });

  test("account section nav anchors exist", async ({ page }) => {
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".account-section-nav")).toBeVisible({ timeout: 12_000 });
    await expect(page.locator("#account-identity")).toBeAttached();
    await expect(page.locator("#account-offline")).toBeAttached();
    await expect(page.locator("#account-cultivation")).toBeAttached();
    await expect(page.getByRole("navigation", { name: "Mục động phủ" }).getByRole("link", { name: "Tu vi" })).toBeVisible();
  });
});
