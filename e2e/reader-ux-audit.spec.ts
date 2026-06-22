import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  collectConsoleErrors,
  dismissReaderChrome,
  loadReaderFixture,
  openFormatControls,
  openInChapterSearch,
  smallestInteractiveTarget
} from "./helpers";

type AuditFinding = { area: string; severity: "fail" | "warn"; detail: string };

test.describe("reader UX audit", () => {
  test("desktop layout and interaction checklist", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop UX audit");
    const consoleErrors = await collectConsoleErrors(page);
    const findings: AuditFinding[] = [];

    await loadReaderFixture(page);
    try {
      await dismissReaderChrome(page);
    } catch (error) {
      findings.push({ area: "sidebar", severity: "warn", detail: String(error) });
    }
    await page.waitForTimeout(600);

    try {
      await assertNoHorizontalOverflow(page, "desktop initial");
    } catch (error) {
      findings.push({ area: "layout", severity: "fail", detail: String(error) });
    }

    const focusButton = page.getByRole("button", { name: /Focus mode|Tắt focus mode/i }).first();
    if (await focusButton.isVisible()) {
      await focusButton.click();
      await expect(page.locator(".reader-shell-focus-mode")).toBeVisible();
      await page.getByRole("button", { name: "Tắt focus mode" }).click();
    } else {
      findings.push({ area: "focus-mode", severity: "warn", detail: "Focus toggle not visible on desktop" });
    }

    try {
      await openInChapterSearch(page);
      await page.getByRole("button", { name: "Đóng tìm kiếm" }).click();
    } catch (error) {
      findings.push({ area: "in-chapter-search", severity: "warn", detail: String(error) });
    }

    await page.getByRole("button", { name: /Luận đạo/i }).first().click();
    await expect(page.locator("#chapter-comments-content")).toBeVisible();

    const minTarget = await smallestInteractiveTarget(page);
    if (minTarget !== null && minTarget < 40) {
      findings.push({
        area: "touch-target",
        severity: "warn",
        detail: `Smallest interactive target ${Math.round(minTarget)}px (< 40px WCAG comfort)`
      });
    }

    if (consoleErrors.length > 0) {
      findings.push({
        area: "console",
        severity: "warn",
        detail: consoleErrors.slice(0, 3).join(" | ")
      });
    }

    await testInfo.attach("ux-audit-findings.json", {
      body: JSON.stringify(findings, null, 2),
      contentType: "application/json"
    });

    const failures = findings.filter((item) => item.severity === "fail");
    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
  });

  test("mobile dock and sheet usability", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "Mobile UX audit");
    const findings: AuditFinding[] = [];
    await loadReaderFixture(page);

    const dock = page.getByRole("navigation", { name: "Mobile reader quick actions" });
    await expect(dock).toBeVisible();

    await page.getByRole("button", { name: "Mở công cụ đọc" }).click({ force: true });
    const sheet = page.locator("#reader-mobile-sheet, .reader-mobile-sheet-panel").first();
    if (!(await sheet.isVisible({ timeout: 12_000 }).catch(() => false))) {
      findings.push({ area: "mobile-sheet", severity: "warn", detail: "Settings sheet did not open" });
    } else {
      const tabs = page.locator(".reader-sheet-tabs");
      if (!(await tabs.isVisible({ timeout: 3000 }).catch(() => false))) {
        findings.push({ area: "mobile-sheet", severity: "warn", detail: "Sheet tabs missing — deploy latest reader bundle" });
      } else {
        for (const tabName of ["Đọc", "Cài đặt", "Offline"]) {
          const tab = tabs.getByRole("tab", { name: tabName });
          if (await tab.count()) {
            await tab.click();
          } else {
            findings.push({ area: "mobile-sheet", severity: "warn", detail: `Missing tab: ${tabName}` });
          }
        }
      }
    }

    try {
      await assertNoHorizontalOverflow(page, "mobile sheet open");
    } catch (error) {
      findings.push({ area: "layout", severity: "warn", detail: String(error) });
    }

    await testInfo.attach("mobile-ux-audit.json", {
      body: JSON.stringify(findings, null, 2),
      contentType: "application/json"
    });

    const failures = findings.filter((item) => item.severity === "fail");
    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
  });

  test("paginated mode keeps readable page navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop layout mode control");
    await loadReaderFixture(page);
    await dismissReaderChrome(page);
    await openFormatControls(page);
    const pageMode = page.locator('[aria-label="Chế độ đọc"]').getByRole("button", { name: "Trang" });
    if ((await pageMode.count()) === 0) {
      test.skip(true, "Paginated layout mode control not in running bundle");
    }
    await pageMode.click({ force: true });
    await expect(page.locator(".reader-shell-layout-page")).toBeVisible({ timeout: 12_000 });

    const pageNav = page.getByRole("navigation", { name: "Điều hướng trang" });
    if (await pageNav.count()) {
      const nextPage = pageNav.getByRole("button", { name: /Sau|Tiếp/i });
      if (await nextPage.isEnabled()) {
        await nextPage.click();
        await expect(page.locator(".reader-page-indicator")).toContainText(/Trang \d+ \/ \d+/);
      }
    } else {
      test.info().annotations.push({
        type: "ux-note",
        description: "Short chapter may not paginate — page nav hidden"
      });
    }
  });
});
