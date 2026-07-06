import { test, expect } from "@playwright/test";
import {
  dismissReaderChrome,
  loadReaderFixture,
  openMobileReaderSheet,
  gotoHomeReady,
  openIdentityModalFromTopbar,
  expectModalPanelOnTop,
  isReaderChapterApiReady
} from "./helpers";

test.describe("identity modal", () => {
  test("guest modal on homepage is above chrome and not clipped", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop centering check");
    await gotoHomeReady(page);
    const panel = await openIdentityModalFromTopbar(page);
    await expectModalPanelOnTop(page);

    const viewport = page.viewportSize()!;
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(240);

    const panelCenterY = box!.y + box!.height / 2;
    expect(Math.abs(panelCenterY - viewport.height / 2)).toBeLessThan(viewport.height * 0.32);

    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.locator(".identity-modal-backdrop")).toBeVisible();
  });

  test("guest modal is viewport-centered and not clipped on reader", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop centering check");
    test.skip(!(await isReaderChapterApiReady(page)), "Chapter API/DB not ready for reader E2E");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);

    await page.locator(".identity-chip-button").first().click();
    const panel = page.locator(".identity-modal-panel");
    await expect(panel).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(240);

    const panelCenterY = box!.y + box!.height / 2;
    expect(Math.abs(panelCenterY - viewport.height / 2)).toBeLessThan(viewport.height * 0.28);

    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.locator(".identity-modal-backdrop")).toBeVisible();
  });

  test("guest modal opens as bottom sheet on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "Mobile bottom sheet check");
    await loadReaderFixture(page);
    await openMobileReaderSheet(page);
    const identityButton = page.locator(".reader-sheet-account-row .identity-chip-button");
    await identityButton.scrollIntoViewIfNeeded();
    await identityButton.click({ force: true });
    const panel = page.locator(".identity-modal-panel");
    await expect(panel).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y + box!.height).toBeGreaterThan(viewport.height * 0.72);
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
  });

  test("login page auth panel is visible above background", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const authPanel = page.locator(".auth-panel");
    await expect(authPanel).toBeVisible();
    await expectModalPanelOnTop(page, ".auth-panel");
    const box = await authPanel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(220);
    await expect(page.getByRole("heading", { name: "Đăng nhập động phủ" })).toBeVisible();
  });
});
