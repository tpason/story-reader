import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  gotoHomeReady,
  loadReaderFixture,
  pickReadableStory,
  primeAppTestStorage,
  storyDetailPath
} from "./helpers";

/** When baseURL is Docker (:3002) without rebuilt CSS, inject local sweep appends. */
async function maybeInjectSweepCss(page: Page) {
  if (process.env.PLAYWRIGHT_INJECT_SWEEP !== "1") return;
  const root = process.cwd();
  const globals = readFileSync(path.join(root, "app/globals.css"), "utf8");
  const reader = readFileSync(
    path.join(root, "app/stories/[storyId]/chapters/[chapterNumber]/reader.css"),
    "utf8"
  );
  const gMark = "UI sweep 2026-07-24 — P0 token floors";
  const rMark = "UI sweep 2026-07-24 — P1 reader chrome";
  const gStart = globals.lastIndexOf("/*", globals.indexOf(gMark));
  const rStart = reader.lastIndexOf("/*", reader.indexOf(rMark));
  const css = `${globals.slice(gStart)}\n${reader.slice(rStart)}`;
  await page.addStyleTag({ content: css });
}

/** Relative luminance 0–1 for sRGB channel 0–255. */
function relLum(r: number, g: number, b: number) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function contrastRatio(fg: string, bg: string): number | null {
  const a = parseRgb(fg);
  const b = parseRgb(bg);
  if (!a || !b) return null;
  const L1 = relLum(...a);
  const L2 = relLum(...b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

async function sampleTextContrast(
  page: Page,
  selector: string
): Promise<{ color: string; fill: string; bg: string; opacity: string; ratio: number | null }> {
  return page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    let node: Element | null = el;
    let bg = "rgba(0, 0, 0, 0)";
    while (node && node !== document.documentElement) {
      const b = getComputedStyle(node).backgroundColor;
      if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") {
        bg = b;
        break;
      }
      node = node.parentElement;
    }
    if (bg === "rgba(0, 0, 0, 0)") {
      bg = getComputedStyle(document.body).backgroundColor || "rgb(255,255,255)";
    }
    return {
      color: cs.color,
      fill: cs.webkitTextFillColor || cs.color,
      bg,
      opacity: cs.opacity
    };
  }).then((sample) => {
    const ink = sample.fill.startsWith("rgb") ? sample.fill : sample.color;
    return { ...sample, ratio: contrastRatio(ink, sample.bg) };
  });
}

test.describe("UI sweep contrast + layout regression", () => {
  test.beforeEach(async ({ page }) => {
    await primeAppTestStorage(page);
  });

  test("home light: headings/chips not transparent-fill sunk", async ({ page }) => {
    await gotoHomeReady(page);
    await page.waitForLoadState("domcontentloaded");
    await maybeInjectSweepCss(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-xi-theme", "light"));

    const h2 = await sampleTextContrast(page, ".section-heading-row h2");
    expect(h2.fill.toLowerCase()).not.toContain("transparent");
    expect(Number(h2.opacity)).toBeGreaterThan(0.9);
    if (h2.ratio !== null) expect(h2.ratio).toBeGreaterThan(3);

    const brand = await sampleTextContrast(page, ".brand > span:last-child");
    expect(brand.fill.toLowerCase()).not.toContain("transparent");

    const steel = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--steel").trim()
    );
    // Built CSS or inject: light floor #5c564e
    expect(steel).toMatch(/#5c564e|#7a746b/i);

    await assertNoHorizontalOverflow(page, "home-light");
  });

  test("home dark: primary text stays light on dark tokens", async ({ page }) => {
    // Seed redux-persist before first paint — ThemeToggle click alone races PersistGate.
    await page.addInitScript(() => {
      try {
        const key = "persist:story-reader";
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        parsed.globalTheme = JSON.stringify("dark");
        window.localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        /* ignore */
      }
    });
    await gotoHomeReady(page);
    await page.waitForLoadState("domcontentloaded");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.getAttribute("data-xi-theme")), {
        timeout: 8_000
      })
      .toBe("dark");
    await maybeInjectSweepCss(page);
    await page.waitForTimeout(150);

    const ink = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--ink").trim()
    );
    expect(ink.toLowerCase()).toMatch(/#f5f1e8|#efeae2|#fff|#f[0-9a-f]{5}/);

    const title = await sampleTextContrast(page, ".story-card-title, .story-card h2");
    expect(title.fill.toLowerCase()).not.toContain("transparent");
    if (title.ratio !== null) expect(title.ratio).toBeGreaterThan(2.5);

    await assertNoHorizontalOverflow(page, "home-dark");
  });

  test("login portal: heading solid + submit readable", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await maybeInjectSweepCss(page);
    const panel = page.locator(".auth-panel, .auth-shell--portal").first();
    await expect(panel).toBeVisible({ timeout: 18_000 });

    const h1 = await sampleTextContrast(page, ".auth-heading h1, h1");
    expect(h1.fill.toLowerCase()).not.toContain("transparent");

    const submit = page.locator(".auth-submit").first();
    await expect(submit).toBeVisible();
    // Ensure enabled for opacity probe (empty form may leave button disabled with opacity tricks)
    await page.locator('input[name="identifier"], input[name="username"], input[type="email"]').first().fill("dao_huu_test");
    await page.locator('input[type="password"]').first().fill("password123");
    const submitSample = await submit.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        color: cs.color,
        fill: cs.webkitTextFillColor || cs.color,
        bg: cs.backgroundImage || cs.backgroundColor,
        opacity: cs.opacity,
        disabled: (el as HTMLButtonElement).disabled
      };
    });
    expect(submitSample.fill.toLowerCase()).not.toContain("transparent");
    expect(Number(submitSample.opacity)).toBeGreaterThan(0.5);

    const shell = page.locator(".auth-shell--portal");
    if ((await shell.count()) > 0) {
      const overflowY = await shell.evaluate((el) => getComputedStyle(el).overflowY);
      expect(["auto", "scroll", "overlay", "hidden", "clip"]).toContain(overflowY);
    }

    await assertNoHorizontalOverflow(page, "login");
  });

  test("story detail mobile CTA contrast when dock present", async ({ page }, testInfo) => {
    const story = await pickReadableStory(page, 1);
    await page.goto(storyDetailPath(story), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await maybeInjectSweepCss(page);
    await expect(page.locator(".story-detail-hero, .story-detail-shell").first()).toBeVisible({
      timeout: 18_000
    });

    const cta = page.locator(".story-mobile-cta-primary");
    // Dock is CSS-gated to ≤839px — only assert contrast on mobile project.
    if (testInfo.project.name === "mobile") {
      await expect(cta.first()).toBeVisible({ timeout: 8_000 });
      const sample = await cta.first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, fill: cs.webkitTextFillColor || cs.color, bg: cs.backgroundImage || cs.backgroundColor };
      });
      expect(sample.fill.toLowerCase()).not.toContain("transparent");
      const rgb = parseRgb(sample.fill.startsWith("rgb") ? sample.fill : sample.color);
      if (rgb) {
        const lum = relLum(...rgb);
        expect(lum).toBeGreaterThan(0.55);
      }
    }

    await assertNoHorizontalOverflow(page, "story-detail");
  });

  test("reader chrome: title ink + continue FAB contrast", async ({ page }, testInfo) => {
    await loadReaderFixture(page);
    await maybeInjectSweepCss(page);
    const shell = page.locator(".reader-shell:not(.reader-shell-skeleton)").first();
    await expect(shell).toBeVisible({ timeout: 25_000 });
    await expect(page.locator(".reader-paragraph, .reader-content").first()).toBeVisible({ timeout: 25_000 });

    const title = page.locator(".reader-story-title").first();
    if ((await title.count()) > 0 && (await title.isVisible())) {
      const sample = await sampleTextContrast(page, ".reader-story-title");
      expect(sample.fill.toLowerCase()).not.toContain("transparent");
      expect(Number(sample.opacity)).toBeGreaterThan(0.9);
    }

    const toc = page.getByRole("button", { name: /Mục lục/i }).first();
    if (await toc.isVisible()) {
      await toc.click();
      await expect(page.locator(".chapter-sidebar, [data-mobile-toc='open']").first()).toBeVisible({
        timeout: 8_000
      });
      // close if possible
      const close = page.getByRole("button", { name: /Close chapter navigation|Đóng/i }).first();
      if (await close.isVisible()) await close.click().catch(() => undefined);
    }

    const fab = page.locator(".reader-continue-fab").first();
    if ((await fab.count()) > 0) {
      await fab.evaluate((el) => {
        el.classList.add("reader-continue-fab-visible", "reader-continue-fab-active");
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.pointerEvents = "auto";
      });
      const sample = await fab.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          color: cs.color,
          fill: cs.webkitTextFillColor || cs.color,
          bg: cs.backgroundImage || cs.backgroundColor
        };
      });
      expect(sample.fill.toLowerCase()).not.toContain("transparent");
      // Prefer solid/gradient fill rather than fully transparent bg
      expect(sample.bg).not.toBe("rgba(0, 0, 0, 0)");
    }

    if (testInfo.project.name !== "mobile") {
      await assertNoHorizontalOverflow(page, "reader-desktop");
    }
  });
});
