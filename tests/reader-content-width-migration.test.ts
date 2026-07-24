import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  applyReaderContentWidthMigration,
  DEFAULT_READER_STYLE_CONFIG,
  mergeRemoteReaderStyle,
  sanitizeReaderStyleConfig
} from "../lib/reader-preferences.ts";

const BUMP_KEY = "reader:content-width-bump-v6";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear()
  };
}

describe("reader content width migration", () => {
  afterEach(() => {
    // @ts-expect-error test shim
    delete globalThis.window;
  });

  it("bumps narrow widths (incl. mobile 680) once to the current default", () => {
    const storage = memoryStorage();
    // @ts-expect-error test shim
    globalThis.window = { localStorage: storage };

    const first = applyReaderContentWidthMigration(sanitizeReaderStyleConfig({ contentWidth: 680 }));
    assert.equal(first.contentWidth, DEFAULT_READER_STYLE_CONFIG.contentWidth);
    assert.equal(storage.getItem(BUMP_KEY), "1");

    const second = applyReaderContentWidthMigration(sanitizeReaderStyleConfig({ contentWidth: 720 }));
    assert.equal(second.contentWidth, 720);
  });

  it("does not burn the flag for already-wide widths", () => {
    const storage = memoryStorage();
    // @ts-expect-error test shim
    globalThis.window = { localStorage: storage };

    const kept = applyReaderContentWidthMigration(sanitizeReaderStyleConfig({ contentWidth: 1100 }));
    assert.equal(kept.contentWidth, 1100);
    assert.equal(storage.getItem(BUMP_KEY), null);

    const later = applyReaderContentWidthMigration(sanitizeReaderStyleConfig({ contentWidth: 820 }));
    assert.equal(later.contentWidth, DEFAULT_READER_STYLE_CONFIG.contentWidth);
    assert.equal(storage.getItem(BUMP_KEY), "1");
  });

  it("keeps default when legacy content-width key is absent (not 0→min)", () => {
    const sanitized = sanitizeReaderStyleConfig({ contentWidth: undefined });
    assert.equal(sanitized.contentWidth, DEFAULT_READER_STYLE_CONFIG.contentWidth);
  });

  it("mergeRemoteReaderStyle does not shrink a wide local column", () => {
    const storage = memoryStorage();
    // @ts-expect-error test shim
    globalThis.window = { localStorage: storage };

    const merged = mergeRemoteReaderStyle(
      sanitizeReaderStyleConfig({ contentWidth: 720 }),
      sanitizeReaderStyleConfig({ contentWidth: 1100 })
    );
    assert.equal(merged.contentWidth, 1100);
  });
});
