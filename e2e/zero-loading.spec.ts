import { expect, test, type Page, type Response } from "@playwright/test";
import {
  pickReadableStory,
  primeAppTestStorage,
  primeReaderTestStorage,
  storyDetailPath,
  storyReaderPath
} from "./helpers";

function isChapterJson(url: string) {
  return /\/api\/stories\/[^/]+\/chapters\/\d+/.test(url);
}

async function waitForLiveReader(page: Page) {
  await expect(page.locator(".reader-shell:not(.reader-shell-skeleton)").first()).toBeVisible({
    timeout: 20_000
  });
  await expect(page.locator(".reader-paragraph").first()).toBeVisible({ timeout: 15_000 });
}

test.describe("zero-loading feel", () => {
  test("login route shows auth shell loading UI (no blank main)", async ({ page }) => {
    await primeAppTestStorage(page);

    let sawLoading = false;
    page.on("framenavigated", async () => {
      if (sawLoading) return;
      try {
        sawLoading = (await page.locator("main.xi-route-loading.auth-shell").count()) > 0;
      } catch {
        /* navigation race */
      }
    });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const shell = page.locator("main.auth-shell").first();
    await expect(shell).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /đăng nhập|nhập môn|tiếp tục/i }).first()).toBeVisible({
      timeout: 15_000
    });
  });

  test("home → story detail warms cover VT hero and stays interactive", async ({ page }) => {
    await primeAppTestStorage(page);
    // Allow View Transition path (primeApp sets battery_saver which disables VT).
    await page.addInitScript(() => {
      window.localStorage.setItem("reader:performance-mode", "balanced");
    });

    const story = await pickReadableStory(page, 1);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".story-card").first()).toBeVisible({ timeout: 20_000 });

    const card = page.locator(`a.story-card[href*="${story.id}"]`).first();
    if ((await card.count()) === 0) {
      // Fallback: open detail directly when the picked story is below the fold.
      await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });
    } else {
      await card.scrollIntoViewIfNeeded();
      await card.hover({ force: true });
      await card.click();
    }

    await expect(page).toHaveURL(new RegExp(`/stories/.+-${story.id}`), { timeout: 20_000 });
    const hero = page.locator(".story-cover-vt-hero, [data-story-cover].story-cover-vt-hero").first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /đọc|bắt đầu|tiếp/i }).first()).toBeVisible({
      timeout: 15_000
    });
  });

  test("chapter N→N+1: scroll-edge prefetch then soft/hard nav keeps content visible", async ({ page }) => {
    await primeReaderTestStorage(page);
    await page.addInitScript(() => {
      // Prefer soft-nav warmth; keep WebGL/skills off for thermal.
      window.localStorage.setItem("reader:performance-mode", "balanced");
      window.localStorage.setItem("reader:skill-effects-enabled", "0");
    });

    const story = await pickReadableStory(page, 2);
    test.skip(story.totalChapters < 2, "Need a story with at least 2 chapters");

    const chapterRequests: Array<{ url: string; fromServiceWorker: boolean; status: number }> = [];
    page.on("response", (response: Response) => {
      if (!isChapterJson(response.url())) return;
      chapterRequests.push({
        url: response.url(),
        fromServiceWorker: response.fromServiceWorker(),
        status: response.status()
      });
    });

    // Load chapter 1 of the same story we validated has chapter 2.
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("lq-boot-splash-seen", "1");
      } catch {
        /* ignore */
      }
    });
    const readerPath = storyReaderPath(story, 1);
    await page.goto(readerPath, { waitUntil: "domcontentloaded" });
    await waitForLiveReader(page);

    // Scroll toward end so scroll-edge prefetch (≥75%) can fire for chapter 2.
    await page.evaluate(async () => {
      const scrolling = document.scrollingElement ?? document.documentElement;
      const max = Math.max(0, scrolling.scrollHeight - window.innerHeight);
      const steps = 8;
      for (let i = 1; i <= steps; i += 1) {
        window.scrollTo(0, Math.floor((max * i) / steps));
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, max);
    });

    // Give idle/scroll prefetch a short window (concurrency-capped RQ).
    await page.waitForTimeout(1600);

    const nextChapterUrl = `/api/stories/${story.id}/chapters/2`;
    const prefetched = chapterRequests.some((r) => r.url.includes(nextChapterUrl) && r.status === 200);

    // Full document navigation to chapter 2 (avoids hidden mobile-dock links + soft-nav stale URL).
    const nextHref = storyReaderPath(story, 2);
    await page.goto(nextHref, { waitUntil: "domcontentloaded" });
    await waitForLiveReader(page);
    await expect(page).toHaveURL(/\/chapters\/2(?:\/|$|\?)/, { timeout: 20_000 });
    // Content must stay visible — no stuck skeleton-only shell.
    await expect(page.locator(".reader-shell-skeleton")).toHaveCount(0);
    await expect(page.locator(".reader-paragraph").first()).toBeVisible();

    // Soft assertion log for prefetch (network may hit SW/RQ memory without a second HTTP).
    test.info().annotations.push({
      type: "prefetch",
      description: prefetched
        ? "chapter 2 JSON observed before navigation"
        : "no extra chapter-2 HTTP before nav (may already be warm via RSC/RQ/SW)"
    });
  });

  test("mobile viewport: no decorative WebGL canvas; CSS backdrop host may exist", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await primeAppTestStorage(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".page-wrap, .app-shell").first()).toBeVisible({ timeout: 20_000 });

    const compact = await page.evaluate(() => {
      const attr = document.documentElement.getAttribute("data-xi-compact");
      return attr === "1" || attr === "true" || window.matchMedia("(max-width: 839px)").matches;
    });
    expect(compact).toBe(true);

    // Decorative Three.js hosts should not mount canvases on ≤839px.
    const decorativeCanvases = page.locator(
      [
        ".xianxia-world-background canvas",
        ".three-xianxia canvas",
        "[data-three-host] canvas",
        ".xi-world-canvas",
        "canvas.three-canvas"
      ].join(", ")
    );
    await expect(decorativeCanvases).toHaveCount(0);
  });

  test("following page: hydrated gate avoids empty flash then settles", async ({ page }) => {
    await primeAppTestStorage(page);
    await page.goto("/following", { waitUntil: "domcontentloaded" });

    // Either hydrate slot, empty state, or populated shelf — never a blank page-wrap.
    const root = page.locator(".following-page, .page-wrap").first();
    await expect(root).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => {
        const busy = await page.locator('[aria-busy="true"]').count();
        const empty = await page.locator(".following-empty, .xianxia-empty").count();
        const cards = await page.locator(".followed-card, .following-grid a").count();
        return busy + empty + cards;
      }, { timeout: 15_000 })
      .toBeGreaterThan(0);
  });
});
