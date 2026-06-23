import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearReaderAudioSleepTimer,
  readReaderAudioSleepTimerEndsAt,
  readReaderAudioSleepTimerPreset,
  scheduleReaderAudioSleepTimer
} from "../lib/reader-audio-sleep-timer.ts";

function withMockWindow(run: () => void) {
  const storage = new Map<string, string>();
  const mock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    }
  };
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: mock }
  });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
}

describe("reader audio sleep timer", () => {
  it("schedules and restores active timer", () => {
    withMockWindow(() => {
      const now = 1_700_000_000_000;
      const endsAt = scheduleReaderAudioSleepTimer(30, now);
      assert.equal(endsAt, now + 30 * 60_000);
      assert.equal(readReaderAudioSleepTimerPreset(), 30);
      assert.equal(readReaderAudioSleepTimerEndsAt(now + 1), endsAt);
    });
  });

  it("clears expired timers", () => {
    withMockWindow(() => {
      const now = 1_700_000_000_000;
      scheduleReaderAudioSleepTimer(15, now);
      assert.equal(readReaderAudioSleepTimerEndsAt(now + 16 * 60_000), null);
      clearReaderAudioSleepTimer();
      assert.equal(readReaderAudioSleepTimerPreset(), 0);
    });
  });
});
