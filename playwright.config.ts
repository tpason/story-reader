import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3003";
const startServer = process.env.PLAYWRIGHT_START_SERVER === "1";
const desktopOnly = process.env.PLAYWRIGHT_DESKTOP_ONLY === "1";

/** Low-RAM / shared-GPU hosts: disable WebGL in Chromium, single worker, desktop-only. */
const chromiumLowResourceArgs = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--disable-accelerated-2d-canvas",
  "--disable-accelerated-video-decode",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--js-flags=--max-old-space-size=768"
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  maxFailures: process.env.CI ? undefined : 8,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "e2e-report" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    launchOptions: {
      args: chromiumLowResourceArgs
    }
  },
  webServer: startServer
    ? {
        command: "PORT=3003 NODE_OPTIONS='--max-old-space-size=4096' npm run dev",
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 180_000
      }
    : undefined,
  projects: desktopOnly
    ? [
        {
          name: "desktop",
          use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }
        }
      ]
    : [
        {
          name: "desktop",
          use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }
        },
        {
          name: "mobile",
          use: { ...devices["Pixel 7"] }
        }
      ]
});
