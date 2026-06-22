import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { dismissStoryDetailPush, isStoryDetailPushDismissed } from "../lib/story-detail-push.ts";

const STORY_ID = "00000000-0000-4000-8000-000000000099";

describe("story detail push dismiss", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const mockWindow = { localStorage: createStorage() };
    (globalThis as { window?: typeof mockWindow }).window = mockWindow;

    function createStorage(): Storage {
      return {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
        clear: () => storage.clear(),
        key: () => null,
        length: 0
      };
    }
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("is not dismissed before user closes hint", () => {
    assert.equal(isStoryDetailPushDismissed(STORY_ID), false);
  });

  it("stays dismissed within seven-day window", () => {
    dismissStoryDetailPush(STORY_ID);
    assert.equal(isStoryDetailPushDismissed(STORY_ID), true);
  });

  it("expires after dismiss window", () => {
    const now = Date.now();
    storage.set(`reader:detail-push-dismiss:${STORY_ID}`, String(now - 1));
    assert.equal(isStoryDetailPushDismissed(STORY_ID), false);
  });
});
