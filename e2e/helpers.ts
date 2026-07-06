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

export function storyDetailPath(story: { id: string; title: string }) {
  return `/stories/${slugify(story.title)}-${story.id}`;
}

export async function pickReadableStory(page: Page, chapterNumber = 1) {
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
    window.localStorage.setItem("reader:mobile-skill-poll", "off");
  });
}

/** Same perf gates as reader tests — use on non-reader app pages. */
export async function primeAppTestStorage(page: Page) {
  await primeReaderTestStorage(page);
}

export async function seedFollows(
  page: Page,
  story: { id: string; title: string; totalChapters?: number; coverImageUrl?: string | null }
) {
  const item = {
    storyId: story.id,
    storyTitle: story.title,
    coverImageUrl: story.coverImageUrl ?? null,
    author: null,
    primaryCategoryName: null,
    totalChapters: story.totalChapters ?? 10,
    lastKnownChapterNumber: story.totalChapters ?? 10,
    updatedAt: new Date().toISOString(),
    followedAt: new Date().toISOString()
  };

  await page.addInitScript((entry) => {
    window.localStorage.setItem("reader:follows", JSON.stringify([entry]));
  }, item);
}

export async function gotoHomeReady(page: Page) {
  await primeAppTestStorage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".page-wrap")).toBeVisible({ timeout: 15_000 });
}

export async function gotoRankingsReady(page: Page, query = "tab=betterbox") {
  await primeAppTestStorage(page);
  await page.goto(`/rankings?${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".rankings-page")).toBeVisible({ timeout: 15_000 });
}

export async function expectRankingsBoard(page: Page) {
  const board = page.locator(".rankings-board, .reader-leaderboard-board, .xianxia-empty-state");
  await expect(board.first()).toBeVisible({ timeout: 15_000 });
}

export async function seedReadingHistory(
  page: Page,
  item: {
    storyId: string;
    storyTitle: string;
    chapterNumber: number;
    chapterTitle?: string;
    paragraphIndex?: number;
    maxReadChapterNumber?: number;
  }
) {
  const historyItem = {
    storyId: item.storyId,
    storyTitle: item.storyTitle,
    coverImageUrl: null,
    chapterId: null,
    chapterNumber: item.chapterNumber,
    chapterTitle: item.chapterTitle ?? `Chương ${item.chapterNumber}`,
    scrollPosition: 640,
    paragraphIndex: item.paragraphIndex ?? 3,
    progressPercent: 42,
    maxReadChapterNumber: item.maxReadChapterNumber ?? item.chapterNumber,
    totalChapters: Math.max(item.chapterNumber + 2, 10),
    lastReadAt: new Date().toISOString()
  };

  await page.addInitScript((entry) => {
    window.localStorage.setItem("reader:history", JSON.stringify([entry]));
    window.localStorage.setItem(`reader:story:${entry.storyId}`, JSON.stringify(entry));
  }, historyItem);
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

export type ReaderHealthPayload = {
  ok: boolean;
  websocket: boolean;
  wsClients?: number;
  nodeEnv?: string;
  timestamp: string;
};

export async function fetchReaderHealth(page: Page): Promise<ReaderHealthPayload> {
  const response = await page.request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ReaderHealthPayload;
}

export function readerRealtimeToken() {
  return process.env.PLAYWRIGHT_READER_REALTIME_TOKEN ?? process.env.READER_REALTIME_TOKEN ?? "";
}

export function broadcastAuthHeaders(token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const resolved = token ?? readerRealtimeToken();
  if (resolved) headers.Authorization = `Bearer ${resolved}`;
  return headers;
}

export async function openNotificationPanel(page: Page) {
  await page.getByRole("button", { name: "Thông báo chương mới" }).first().click();
  await expect(page.locator(".notification-panel")).toBeVisible();
}

export async function expectNotificationLive(page: Page, live = true) {
  const bell = page.locator(".notification-bell").first();
  await expect(bell).toHaveAttribute("data-notification-live", live ? "true" : "false", { timeout: 15_000 });
  await openNotificationPanel(page);
  await expect(page.locator(".notification-live")).toContainText(live ? "Live" : "Polling");
  if (live) await expect(page.locator(".notification-live-on")).toBeVisible();
}

const OFFLINE_DB_NAME = "linh-quyen-offline";
const OFFLINE_DB_VERSION = 1;

export async function clearOfflineChapterCache(page: Page) {
  await page.evaluate(
    async ({ dbName }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Failed to delete offline DB"));
        request.onblocked = () => reject(new Error("Offline DB delete blocked"));
      });
    },
    { dbName: OFFLINE_DB_NAME }
  );
}

export async function seedOfflineChapterCache(
  page: Page,
  story: { id: string; title: string; totalChapters?: number },
  chapterNumbers: number[]
) {
  await page.evaluate(
    async ({ dbName, dbVersion, storyId, storyTitle, totalChapters, chapterNumbers: numbers }) => {
      const openDb = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName, dbVersion);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (db.objectStoreNames.contains("chapters")) return;
            const store = db.createObjectStore("chapters", { keyPath: "key" });
            store.createIndex("storyId", "storyId", { unique: false });
            store.createIndex("chapterNumber", "chapterNumber", { unique: false });
            store.createIndex("cachedAt", "cachedAt", { unique: false });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error("Failed to open offline DB"));
        });

      const db = await openDb();
      const tx = db.transaction("chapters", "readwrite");
      const store = tx.objectStore("chapters");
      const cachedAt = new Date().toISOString();
      const total = totalChapters ?? Math.max(...numbers, 1);

      for (const chapterNumber of numbers) {
        store.put({
          key: `${storyId}:${chapterNumber}`,
          storyId,
          storyTitle,
          chapterNumber,
          chapterTitle: `Chương ${chapterNumber}`,
          cachedAt,
          payload: {
            story: { id: storyId, title: storyTitle, totalChapters: total },
            chapter: {
              id: `offline-${storyId}-${chapterNumber}`,
              chapterNumber,
              title: `Chương ${chapterNumber}`,
              content: "Offline chapter body for automated tests.\n\nSecond paragraph."
            },
            nextChapter:
              chapterNumber < total
                ? { id: `offline-${storyId}-${chapterNumber + 1}`, chapterNumber: chapterNumber + 1, title: `Chương ${chapterNumber + 1}` }
                : null,
            previousChapter:
              chapterNumber > 1
                ? { id: `offline-${storyId}-${chapterNumber - 1}`, chapterNumber: chapterNumber - 1, title: `Chương ${chapterNumber - 1}` }
                : null
          }
        });
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Offline cache write failed"));
      });
      db.close();
    },
    {
      dbName: OFFLINE_DB_NAME,
      dbVersion: OFFLINE_DB_VERSION,
      storyId: story.id,
      storyTitle: story.title,
      totalChapters: story.totalChapters,
      chapterNumbers
    }
  );
}
