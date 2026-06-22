import { expect, type Page } from "@playwright/test";

export type StoryFixture = {
  id: string;
  title: string;
  totalChapters: number;
  readerPath: string;
};

const FIXED_READER_PATH =
  process.env.PLAYWRIGHT_READER_PATH ??
  "/stories/chuyen-phu-tro-lai-cua-bang-phai-hoa-son-f488df21-0928-45e7-ac5e-9b08274a1a38/chapters/1";

function slugify(value: string) {
  const withoutMarks = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  return (
    withoutMarks
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "story"
  );
}

export function storyReaderPath(story: { id: string; title: string }, chapterNumber = 1) {
  return `/stories/${slugify(story.title)}-${story.id}/chapters/${chapterNumber}`;
}

async function pickReadableStory(page: Page, chapterNumber = 1) {
  if (FIXED_READER_PATH) {
    const storyId = FIXED_READER_PATH.match(/[0-9a-f-]{36}/i)?.[0];
    if (storyId) {
      const response = await page.request.get(`/api/stories/${storyId}/chapters/${chapterNumber}`);
      if (response.ok()) {
        const payload = (await response.json()) as { story?: { id: string; title: string; totalChapters?: number } };
        if (payload.story) {
          return {
            id: payload.story.id,
            title: payload.story.title,
            totalChapters: payload.story.totalChapters ?? chapterNumber
          };
        }
      }
    }
  }

  const response = await page.request.get("/api/stories?minChapters=1&limit=40");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items?: Array<{ id: string; title: string; totalChapters: number }>;
  };

  for (const story of payload.items ?? []) {
    if (story.totalChapters < chapterNumber) continue;
    const chapterResponse = await page.request.get(`/api/stories/${story.id}/chapters/${chapterNumber}`);
    if (!chapterResponse.ok()) continue;
    const chapterPayload = (await chapterResponse.json()) as { chapter?: { content?: string } };
    const content = chapterPayload.chapter?.content ?? "";
    if (content.trim().length > 200) return story;
  }

  const fallback = payload.items?.find((item) => item.totalChapters >= chapterNumber) ?? payload.items?.[0];
  expect(fallback, "Need at least one story with readable chapter in DB").toBeTruthy();
  return fallback!;
}

export async function primeReaderTestStorage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("reader:performance-mode", "battery_saver");
    window.localStorage.setItem("reader:skill-effects-enabled", "0");
  });
}

export async function loadReaderFixture(page: Page, chapterNumber = 1): Promise<StoryFixture> {
  await primeReaderTestStorage(page);

  const story = await pickReadableStory(page, chapterNumber);
  const readerPath = FIXED_READER_PATH ?? storyReaderPath(story, chapterNumber);
  await page.goto(readerPath, { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Không mở được trang đọc")).toHaveCount(0);
  await expect(page.locator(".reader-shell")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[aria-label="Chapter content"]')).toBeVisible();
  await expect(page.locator(".reader-paragraph").first()).toBeVisible();

  return {
    id: story.id,
    title: story.title,
    totalChapters: story.totalChapters,
    readerPath
  };
}

export async function dismissReaderChrome(page: Page) {
  const overlayClose = page.getByRole("button", { name: "Close chapter navigation" });
  if (await overlayClose.isVisible()) {
    await overlayClose.click({ force: true });
    await page.waitForTimeout(200);
  }

  const closeSidebar = page.getByRole("button", { name: "Đóng mục lục" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!(await closeSidebar.isVisible())) return;
    await closeSidebar.click({ force: true });
    await page.waitForTimeout(300);
  }

  if (await closeSidebar.isVisible()) {
    throw new Error("Chapter sidebar still open — blocks topbar interactions");
  }
}

export async function openMobileReaderSheet(page: Page) {
  await page.getByRole("button", { name: "Mở công cụ đọc" }).click({ force: true });
  const sheet = page.locator("#reader-mobile-sheet, .reader-mobile-sheet-panel");
  await expect(sheet.first()).toBeVisible({ timeout: 12_000 });
  return sheet.first();
}

export async function openFormatControls(page: Page) {
  await dismissReaderChrome(page);
  await page.getByRole("button", { name: "Cài đặt chữ và bố cục" }).click();
  await expect(page.locator("#format-controls")).toHaveClass(/format-controls-open/);
  await page.locator(".reader-layout-mode, #format-controls").first().scrollIntoViewIfNeeded();
}

export async function openInChapterSearch(page: Page) {
  await dismissReaderChrome(page);
  await page.locator('[aria-label="Chapter content"]').click();
  await page.keyboard.press("Control+f");
  const panel = page.getByRole("searchbox", { name: "Tìm trong chương" });
  if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
    throw new Error("In-chapter search panel missing — restart dev server with latest reader bundle");
  }
  await expect(panel).toBeVisible();
}

export async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|401|404|hydration|devtools/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}

export async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, `${label}: horizontal overflow ${overflow}px`).toBeLessThanOrEqual(2);
}

export async function smallestInteractiveTarget(page: Page) {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input, [role="button"], [role="tab"], label.reader-sheet-toggle'
      )
    ).filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });

    let smallest = Number.POSITIVE_INFINITY;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      smallest = Math.min(smallest, Math.min(rect.width, rect.height));
    }
    return Number.isFinite(smallest) ? smallest : null;
  });
}
