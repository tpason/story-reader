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

/**
 * UX audit checklist — failures become test attachments for triage.
 * Extend this file as new reader features ship.
 */
test.describe("reader UX findings", () => {
  test("desktop checklist captures UX gaps", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop audit");

    const findings: Array<{ id: string; severity: "fail" | "warn"; note: string }> = [];
    const consoleErrors = await collectConsoleErrors(page);
    await loadReaderFixture(page);
    try {
      await dismissReaderChrome(page);
    } catch (error) {
      findings.push({ id: "sidebar", severity: "warn", note: String(error) });
    }
    await page.waitForTimeout(800);

    try {
      await assertNoHorizontalOverflow(page, "desktop");
    } catch (error) {
      findings.push({ id: "layout-overflow", severity: "fail", note: String(error) });
    }

    const readerControls = page.locator('[aria-label="Reader controls"]');
    if ((await readerControls.count()) === 0) {
      findings.push({ id: "topbar-controls", severity: "warn", note: "Reader controls bar missing on desktop" });
    }

    const statsPill = page.locator(".reader-stats-pill");
    if ((await statsPill.count()) === 0) {
      findings.push({ id: "stats-pill", severity: "warn", note: "Reading stats pill not visible in topbar" });
    }

    const themeGroup = page.locator('[aria-label="Theme"]');
    if ((await themeGroup.count()) === 0) {
      findings.push({ id: "theme-controls", severity: "warn", note: "Theme segmented control hidden on desktop" });
    } else if ((await themeGroup.locator('button[title="OLED"]').count()) === 0) {
      findings.push({ id: "oled-theme", severity: "warn", note: "OLED theme button missing — deploy latest reader bundle" });
    }

    try {
      await openInChapterSearch(page);
      const storyTab = page.getByRole("tab", { name: "Truyện" });
      if ((await storyTab.count()) === 0) {
        findings.push({ id: "story-search-tab", severity: "warn", note: "Story-wide search tab missing" });
      }
      await page.getByRole("button", { name: "Đóng tìm kiếm" }).click();
    } catch (error) {
      findings.push({ id: "in-chapter-search", severity: "warn", note: String(error) });
    }

    const notesButton = page.getByRole("button", { name: "Ghi chú đoạn" });
    if ((await notesButton.count()) === 0) {
      findings.push({ id: "notes-sidebar", severity: "warn", note: "Notes sidebar button missing on desktop" });
    }

    const commentsSplitButton = page.getByRole("button", { name: "Luận đạo cạnh nội dung" });
    if ((await commentsSplitButton.count()) === 0) {
      findings.push({ id: "comments-split", severity: "warn", note: "Comments split toggle missing on desktop" });
    }

    try {
      await page.getByRole("button", { title: "Phím tắt và tùy chọn" }).click();
      const continuousItem = page.getByRole("button", { name: /Cuộn liên tục nối chương|Tắt cuộn liên tục/ });
      if ((await continuousItem.count()) === 0) {
        findings.push({ id: "continuous-chapter", severity: "warn", note: "Continuous chapter toggle missing in overflow" });
      }
      await page.keyboard.press("Escape");
    } catch (error) {
      findings.push({ id: "overflow-continuous", severity: "warn", note: String(error) });
    }

    try {
      await openFormatControls(page);
      const layoutGroup = page.locator('[aria-label="Chế độ đọc"]');
      if ((await layoutGroup.count()) === 0) {
        findings.push({ id: "layout-mode", severity: "warn", note: "Paginated mode controls not in format panel" });
      }
    } catch (error) {
      findings.push({ id: "format-panel", severity: "warn", note: String(error) });
    }

    const minTarget = await smallestInteractiveTarget(page);
    if (minTarget !== null && minTarget < 40) {
      findings.push({
        id: "touch-target-size",
        severity: "warn",
        note: `Smallest tap target ${Math.round(minTarget)}px (< 40px comfort zone)`
      });
    }

    if (consoleErrors.length > 0) {
      findings.push({ id: "console-errors", severity: "warn", note: consoleErrors.slice(0, 4).join(" | ") });
    }

    await testInfo.attach("ux-findings-desktop.json", {
      body: JSON.stringify(findings, null, 2),
      contentType: "application/json"
    });

    expect(findings.filter((item) => item.severity === "fail"), JSON.stringify(findings, null, 2)).toHaveLength(0);
  });

  test("mobile checklist captures UX gaps", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "Mobile audit");

    const findings: Array<{ id: string; severity: "fail" | "warn"; note: string }> = [];
    await loadReaderFixture(page);

    const dock = page.getByRole("navigation", { name: "Mobile reader quick actions" });
    if (!(await dock.isVisible())) {
      findings.push({ id: "mobile-dock", severity: "fail", note: "Mobile dock hidden" });
    }

    await page.getByRole("button", { name: "Mở công cụ đọc" }).click({ force: true });
    const sheet = page.locator("#reader-mobile-sheet, .reader-mobile-sheet-panel").first();
    if (!(await sheet.isVisible({ timeout: 12_000 }).catch(() => false))) {
      findings.push({ id: "mobile-sheet", severity: "warn", note: "Settings sheet did not open" });
    }

    try {
      await assertNoHorizontalOverflow(page, "mobile-sheet");
    } catch (error) {
      findings.push({ id: "layout-overflow", severity: "warn", note: String(error) });
    }

    const chapterFooter = page.locator(".reader-chapter-footer");
    await page.locator('[aria-label="Chapter content"]').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await page.waitForTimeout(400);
    if ((await chapterFooter.count()) === 0) {
      findings.push({ id: "chapter-footer", severity: "warn", note: "Rating/recommendations footer not found at chapter end" });
    }

    await testInfo.attach("ux-findings-mobile.json", {
      body: JSON.stringify(findings, null, 2),
      contentType: "application/json"
    });

    expect(findings.filter((item) => item.severity === "fail"), JSON.stringify(findings, null, 2)).toHaveLength(0);
  });
});
