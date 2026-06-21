import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { isDefaultReaderStyleConfig, sanitizeReaderStyleConfig, DEFAULT_READER_STYLE_CONFIG } from "../lib/reader-preferences.ts";
import {
  markMobilePresetBootstrapped,
  markSwipeHintShown,
  readReaderSkillEffectsEnabled,
  shouldShowSwipeHint,
  swipeHintStorageKey,
  wasMobilePresetBootstrapped,
  writeReaderSkillEffectsEnabled
} from "../lib/reader-onboarding.ts";

describe("reader-preferences isDefaultReaderStyleConfig", () => {
  it("returns true for factory defaults", () => {
    assert.equal(isDefaultReaderStyleConfig(DEFAULT_READER_STYLE_CONFIG), true);
    assert.equal(isDefaultReaderStyleConfig(sanitizeReaderStyleConfig({})), true);
  });

  it("returns false when any field differs", () => {
    assert.equal(
      isDefaultReaderStyleConfig({
        ...DEFAULT_READER_STYLE_CONFIG,
        fontSize: 20
      }),
      false
    );
  });
});

describe("reader-onboarding storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const mockStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0
    } as Storage;

    (globalThis as { window?: Window & typeof globalThis }).window = {
      localStorage: mockStorage
    } as Window & typeof globalThis;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  });

  it("tracks swipe hint per story", () => {
    assert.equal(shouldShowSwipeHint("story-1"), true);
    markSwipeHintShown("story-1");
    assert.equal(storage.get(swipeHintStorageKey("story-1")), "1");
    assert.equal(shouldShowSwipeHint("story-1"), false);
    assert.equal(shouldShowSwipeHint("story-2"), true);
  });

  it("tracks mobile preset bootstrap flag", () => {
    assert.equal(wasMobilePresetBootstrapped(), false);
    markMobilePresetBootstrapped();
    assert.equal(wasMobilePresetBootstrapped(), true);
  });

  it("defaults skill effects to off", () => {
    assert.equal(readReaderSkillEffectsEnabled(), false);
    writeReaderSkillEffectsEnabled(true);
    assert.equal(readReaderSkillEffectsEnabled(), true);
    writeReaderSkillEffectsEnabled(false);
    assert.equal(readReaderSkillEffectsEnabled(), false);
  });
});
