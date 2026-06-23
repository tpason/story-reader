import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readReaderAudioPlaybackRate,
  READER_AUDIO_PLAYBACK_RATES,
  writeReaderAudioPlaybackRate
} from "../lib/reader-audio-playback-rate.ts";

describe("reader audio playback rate", () => {
  it("persists allowed playback rates", () => {
    const storage = new Map<string, string>();
    const mock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    };
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: mock }
    });

    try {
      writeReaderAudioPlaybackRate(1.15);
      assert.equal(readReaderAudioPlaybackRate(), 1.15);
      writeReaderAudioPlaybackRate(9);
      assert.equal(readReaderAudioPlaybackRate(), 1);
      assert.deepEqual([...READER_AUDIO_PLAYBACK_RATES], [0.85, 1, 1.15, 1.3]);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow
      });
    }
  });
});
