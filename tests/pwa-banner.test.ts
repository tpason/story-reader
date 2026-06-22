import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { isInstallBannerDismissed, isPushBannerDismissed, INSTALL_DISMISS_KEY, PUSH_BANNER_DISMISS_KEY } from "../lib/pwa-banner.ts";

describe("pwa banner dismiss", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const mockWindow = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        key: () => null,
        length: 0
      }
    };
    (globalThis as { window?: typeof mockWindow }).window = mockWindow;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("returns false before dismiss watermark", () => {
    assert.equal(isPushBannerDismissed(), false);
    assert.equal(isInstallBannerDismissed(), false);
  });

  it("respects future dismiss timestamp", () => {
    storage.set(PUSH_BANNER_DISMISS_KEY, String(Date.now() + 60_000));
    assert.equal(isPushBannerDismissed(), true);
    storage.set(INSTALL_DISMISS_KEY, String(Date.now() - 1));
    assert.equal(isInstallBannerDismissed(), false);
  });
});
