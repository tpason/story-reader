import { test, expect } from "@playwright/test";
import {
  broadcastAuthHeaders,
  expectNotificationLive,
  fetchReaderHealth,
  openNotificationPanel,
  readerRealtimeToken
} from "./helpers";

test.describe("reader realtime API", () => {
  test("health endpoint returns ok and websocket flag", async ({ page }) => {
    const health = await fetchReaderHealth(page);
    expect(health.ok).toBe(true);
    expect(typeof health.websocket).toBe("boolean");
    expect(typeof health.timestamp).toBe("string");
  });

  test("broadcast returns 503 when websocket server is not running", async ({ page }) => {
    const health = await fetchReaderHealth(page);
    test.skip(health.websocket, "Only applies to plain next dev without dev:ws");

    const response = await page.request.post("/api/realtime/broadcast", {
      headers: broadcastAuthHeaders(),
      data: { type: "notification_update" }
    });
    expect(response.status()).toBe(503);
  });

  test("broadcast accepts notification_update when websocket server is running", async ({ page }) => {
    const health = await fetchReaderHealth(page);
    test.skip(!health.websocket, "Requires npm run dev:ws or Docker story-reader with start:ws");

    const response = await page.request.post("/api/realtime/broadcast", {
      headers: broadcastAuthHeaders(),
      data: { type: "notification_update" }
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { ok?: boolean; delivered?: number };
    expect(body.ok).toBe(true);
    expect(typeof body.delivered).toBe("number");
  });

  test("broadcast rejects missing token when PLAYWRIGHT_READER_REALTIME_TOKEN is set", async ({ page }) => {
    const token = readerRealtimeToken();
    test.skip(!token, "Set PLAYWRIGHT_READER_REALTIME_TOKEN to match server READER_REALTIME_TOKEN");

    const health = await fetchReaderHealth(page);
    test.skip(!health.websocket, "Requires websocket server");

    const response = await page.request.post("/api/realtime/broadcast", {
      headers: { "Content-Type": "application/json" },
      data: { type: "notification_update" }
    });
    expect(response.status()).toBe(401);
  });

  test("broadcast accepts bearer token when PLAYWRIGHT_READER_REALTIME_TOKEN is set", async ({ page }) => {
    const token = readerRealtimeToken();
    test.skip(!token, "Set PLAYWRIGHT_READER_REALTIME_TOKEN to match server READER_REALTIME_TOKEN");

    const health = await fetchReaderHealth(page);
    test.skip(!health.websocket, "Requires websocket server");

    const response = await page.request.post("/api/realtime/broadcast", {
      headers: broadcastAuthHeaders(token),
      data: { type: "chapter_update", storyId: "00000000-0000-0000-0000-000000000001", chapterNumber: 1 }
    });
    expect(response.status()).toBe(200);
  });
});

test.describe("reader realtime UI", () => {
  test.beforeEach(async ({ page }) => {
    const health = await fetchReaderHealth(page);
    test.skip(!health.websocket, "Requires npm run dev:ws or Docker story-reader with start:ws");
  });

  test("notification bell connects on home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Thông báo chương mới" })).toBeVisible();
    await expectNotificationLive(page, true);
  });

  test("opening notification panel keeps live indicator", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".notification-bell").first()).toHaveAttribute("data-notification-live", "true", {
      timeout: 15_000
    });
    await openNotificationPanel(page);
    await expect(page.locator(".notification-live-on")).toBeVisible();
    await expect(page.locator(".notification-live")).toContainText("Live");
  });
});
